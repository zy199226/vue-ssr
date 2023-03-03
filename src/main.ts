import { createSSRApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter } from './router';
import App from './App.vue';
import { ClientOnly } from './utils/baseUtils';

export function createApp() {
    const app = createSSRApp(App);
    const pinia = createPinia();
    const router = createRouter();
    app.use(router).use(pinia).component('ClientOnly', ClientOnly);
    if (!import.meta.env.SSR && (<any>window).__INITIAL_STATE__) pinia.state.value = (<any>window).__INITIAL_STATE__;
    return { app, router, pinia };
}

const { app, router } = createApp();

// wait until router is ready before mounting to ensure hydration match
router.isReady().then(() => {
    app.mount('#app');
});
