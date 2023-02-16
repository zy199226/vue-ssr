import { createRouter as _createRouter, createMemoryHistory, createWebHistory } from 'vue-router';

// Auto generates routes from vue files under ./pages
// https://vitejs.dev/guide/features.html#glob-import
const pages = import.meta.glob('./pages/**/*.vue');
const routes: any = Object.keys(pages).map(path => {
    const name = path.match(/\.\/pages(.*)\.vue$/)?.[1]?.replace(/\[\w+\]/g, (rs) => (':' + rs.slice(1, -1)));
    return {
        path: name === '/index' ? '/' : name,
        component: pages[path], // () => import('./pages/*.vue')
    };
});

export function createRouter() {
    const { BASE_URL } = import.meta.env;
    return _createRouter({
        // use appropriate history implementation for server/client
        // import.meta.env.SSR is injected by Vite.
        history: import.meta.env.SSR ? createMemoryHistory(BASE_URL) : createWebHistory(BASE_URL),
        routes,
    });
}
