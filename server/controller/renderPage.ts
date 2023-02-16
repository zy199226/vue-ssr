// Pre-render the app into static HTML.
// run `npm run generate` and then `dist/static` can be served as a static site.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const toAbsolute = (p: string) => path.resolve(__dirname, p);

const manifest = JSON.parse(fs.readFileSync(toAbsolute('../../dist/client/ssr-manifest.json'), 'utf-8'));
const template = fs.readFileSync(toAbsolute('../../dist/client/ssrBase.html'), 'utf-8');
const { render } = await import('../../dist/server/entry-server.js');

/**
 * 生成文件，自动生成路径，如果有 content 则以路径最后一个值写入文件，没有则全部生成路径
 *
 * @param   {string}  filePath  目标文件路径
 * @param   {string}  content   需要写入的值
 */
const writeFile = (filePath: string, content?: string) => {
    let dir = '';
    if (!fs.existsSync(filePath)) {
        const arr = filePath.split('/');
        for (let i = 1; i < arr.length; i++) {
            if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir);
            dir += '/' + arr[i];
        }
    }
    content ? fs.writeFileSync(dir || filePath, content) : fs.mkdirSync(dir || filePath);
};

export default async function renderPage(url: unknown) {
    const [appHtml, preloadLinks] = await render(url, manifest);
    if (appHtml === '<!---->' && !preloadLinks) return console.log('pre-rendered:', url, '此路由没有内容');

    const html = template.replace(`<!--preload-links-->`, preloadLinks).replace(`<!--ssr-outlet-->`, appHtml);

    const filePath = `../../dist/client${url === '/' ? '/index' : url}.html`;
    writeFile(toAbsolute(filePath), html);
    console.log('pre-rendered:', filePath);
}
