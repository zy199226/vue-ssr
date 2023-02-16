import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import serverRoutes from './serverRoutes';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { BASE_URL, VITE_PORT } = (<any>import.meta).env;

async function createServer() {
    const isProd = process.env.NODE_ENV === 'production';
    const indexProd = isProd ? fs.readFileSync(path.resolve(__dirname, '../dist/client/ssrBase.html'), 'utf-8') : '';
    const manifest = isProd ? JSON.parse(fs.readFileSync(path.resolve(__dirname, '../dist/client/ssr-manifest.json'), 'utf-8')) : {};
    const app = express();
    serverRoutes(app);

    /**
     * @type {import('vite').ViteDevServer}
     */
    let vite: any = undefined;
    if (isProd) {
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
    } else {
        // 以中间件模式创建 Vite 应用，这将禁用 Vite 自身的 HTML 服务逻辑
        // 并让上级服务器接管控制
        vite = await (await import('vite')).createServer({
            base: BASE_URL,
            root: process.cwd(),
            server: {
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
    }

    app.use('*', async (req, res) => {
        const url = req.originalUrl.replace(BASE_URL, '/');
        
        try {
            let template, render;
            if (isProd) {
                template = indexProd;
                render = (await import('../dist/server/entry-server.js')).render;
            } else {
                template = fs.readFileSync(path.resolve(__dirname, '../ssrBase.html'), 'utf-8');
    
                // 2. 应用 Vite HTML 转换。这将会注入 Vite HMR 客户端，
                //    同时也会从 Vite 插件应用 HTML 转换。
                //    例如：@vitejs/plugin-react 中的 global preambles
                template = await vite.transformIndexHtml(url, template);
    
                // 3. 加载服务器入口。vite.ssrLoadModule 将自动转换
                //    你的 ESM 源码使之可以在 Node.js 中运行！无需打包
                //    并提供类似 HMR 的根据情况随时失效。
                render = (await vite.ssrLoadModule('/server/entry-server.ts')).render;
            }
            
            // 4. 渲染应用的 HTML。这假设 entry-server.js 导出的 `render`
            //    函数调用了适当的 SSR 框架 API。
            //    例如 ReactDOMServer.renderToString()
            const [appHtml, preloadLinks] = await render(url, manifest);
            const html = template.replace(`<!--preload-links-->`, preloadLinks).replace(`<!--ssr-outlet-->`, appHtml);
            res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
        } catch (e: any) {
            // 如果捕获到了一个错误，让 Vite 来修复该堆栈，这样它就可以映射回
            // 你的实际源码中。
            vite && vite.ssrFixStacktrace(e);
            console.log(e.stack);
            res.status(500).end(e.stack);
        }
    });

    const server = app.listen(VITE_PORT, () => console.log(`http://localhost:${VITE_PORT}`));

    if (import.meta.hot) import.meta.hot.on("vite:beforeFullReload", () => server.close());
}

createServer();

