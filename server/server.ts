import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import LRU from 'lru-cache'
import serverRoutes from './serverRoutes';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { BASE_URL, MODE } = (<any>import.meta).env;
let port = process.env.PORT ?? 5137;

async function createServer() {
    const isDev = process.env.NODE_ENV === 'development';
    const cache = new LRU({ max: 100, ttl: 1000 });
    const indexProd = isDev ? '' : fs.readFileSync(path.resolve(__dirname, '../dist/client/ssrBase.html'), 'utf-8');
    const manifest = isDev ? {} : JSON.parse(fs.readFileSync(path.resolve(__dirname, '../dist/client/ssr-manifest.json'), 'utf-8'));
    const app = express();
    app.use(BASE_URL, serverRoutes);

    /**
     * @type {import('vite').ViteDevServer}
     */
    let vite: any = undefined;
    if (isDev) {
        // 以中间件模式创建 Vite 应用，这将禁用 Vite 自身的 HTML 服务逻辑
        // 并让上级服务器接管控制
        const { createServer: _createServer, loadConfigFromFile } = await import('vite');
        const { config: viteConfig } = await loadConfigFromFile(MODE) ?? {};
        if (viteConfig?.server?.port) port = viteConfig.server.port;
        
        vite = await _createServer({
            base: BASE_URL,
            root: process.cwd(),
            server: {
                ...viteConfig?.server,
                middlewareMode: true,
                watch: {
                    // During tests we edit the files too fast and sometimes chokidar
                    // misses change events, so enforce polling for consistency
                    usePolling: true,
                    interval: 100,
                },
            },
            appType: 'custom',
        });
    
        // 使用 vite 的 Connect 实例作为中间件
        // 如果你使用了自己的 express 路由（express.Router()），你应该使用 router.use
        app.use(vite.middlewares);
    } else {
        app.use((await import('compression')).default());
        app.use(
            BASE_URL,
            async (req, res, next) => {
                if (!/\/$|\/.+(?=\.\w+)/.test(req.url)) req.url = `${req.url}.html`;
                return (await import('serve-static')).default(path.resolve(__dirname, '../dist/client'), {
                    index: false,
                })(req, res, next);
            }
        );
    }

    app.use('*', async (req, res) => {
        const url = req.originalUrl.replace(BASE_URL, '');
        if (cache.has(url)) return res.status(200).set({ 'Content-Type': 'text/html' }).end(cache.get(url));
        
        try {
            let template, render;
            
            if (isDev) {
                template = fs.readFileSync(path.resolve(__dirname, '../ssrBase.html'), 'utf-8');
    
                // 2. 应用 Vite HTML 转换。这将会注入 Vite HMR 客户端，
                //    同时也会从 Vite 插件应用 HTML 转换。
                //    例如：@vitejs/plugin-react 中的 global preambles
                template = await vite.transformIndexHtml(url, template);
    
                // 3. 加载服务器入口。vite.ssrLoadModule 将自动转换
                //    你的 ESM 源码使之可以在 Node.js 中运行！无需打包
                //    并提供类似 HMR 的根据情况随时失效。
                render = (await vite.ssrLoadModule('/server/entry-server.ts')).render;
            } else {
                template = indexProd;
                render = (await import('../dist/server/entry-server.js')).render;
            }
            
            // 4. 渲染应用的 HTML。这假设 entry-server.js 导出的 `render`
            //    函数调用了适当的 SSR 框架 API。
            //    例如 ReactDOMServer.renderToString()
            const [appHtml, preloadLinks] = await render(url, manifest);
            
            const html = template.replace(`<!--preload-links-->`, preloadLinks).replace(`<!--ssr-outlet-->`, appHtml);
            res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
            cache.set(url, html);
        } catch (e: any) {
            // 如果捕获到了一个错误，让 Vite 来修复该堆栈，这样它就可以映射回
            // 你的实际源码中。
            vite && vite.ssrFixStacktrace(e);
            console.log(e.stack);
            res.status(500).end(e.stack);
        }
    });

    const server = app.listen(port, () => console.log(`http://localhost:${port}`));

    if (import.meta.hot) import.meta.hot.on("vite:beforeFullReload", () => server.close());
}

createServer();
