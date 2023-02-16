import path from 'path';
import { defineConfig } from 'vite';
import autoprefixer from 'autoprefixer';
import vue from '@vitejs/plugin-vue';

/** @type {import('vite').UserConfig} */
export default defineConfig(context => ({
    base: '/',
    plugins: [vue()],
    build: {
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, './ssrBase.html'),
            },
        },
    },
    css: {
        postcss: {
            plugins: [
                autoprefixer({
                    overrideBrowserslist: ['Android >= 4.0', 'iOS >= 7', 'last 1 version', '> 0.5%'],
                    grid: true,
                }),
                // pxtoviewport({
                //     viewportWidth: 375,
                //     // selectorBlackList: ['ignore'],
                // }),
            ],
        },
        preprocessorOptions: {
            less: {
                javascriptEnabled: true,
            },
        },
    },
    resolve: {
        alias: {
            '~': path.resolve(__dirname, './'), // 根路径
            '@': path.resolve(__dirname, 'src'), // src 路径
        },
    },
}));
