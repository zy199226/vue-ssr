import { createSSRApp } from 'vue'
import { createRouter } from './router'
import App from './App.vue'

export function createApp() {
    const app = createSSRApp(App);
    const router = createRouter();
    app.use(router);
    return { app, router };
}

const { app, router } = createApp();

// wait until router is ready before mounting to ensure hydration match
router.isReady().then(() => {
    app.mount('#app');
});
