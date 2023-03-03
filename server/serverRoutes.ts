import express from 'express';
import renderPage from './controller/renderPage';

const routes = express.Router();
const isDev = process.env.NODE_ENV === 'development';

routes.get('/prerender', async (req, res) => {
    if (isDev) return res.send({ code: -1, message: 'development 模式不支持此功能' });
    try {
        const url = (<string>req.query.path).replace(req.baseUrl, '');
        if (url) await renderPage(url);
        res.send({ code: 0 });
    } catch (error) {
        console.error(error);
        res.send({ code: -1 });
    }
});

export default routes;
