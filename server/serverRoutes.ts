import { Application, Request, Response } from 'express';
import renderPage from './controller/renderPage';

export default function (app: Application) {
    app.get('/prerender', async (req: Request, res: Response) => {
        if (req.query.path) await renderPage(req.query.path);
        res.send({ code: 0 });
    });
}
