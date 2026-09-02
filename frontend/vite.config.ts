import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import autoprefixer from 'autoprefixer';
import path from 'path';

export default defineConfig({
    plugins: [vue()],
    // @ereuna/shared is consumed as TypeScript source and its tsconfig targets
    // ES2025 for Node, which esbuild does not recognise. The browser target is
    // this app's to decide, not the shared package's, so state it here — and
    // state it to match the browserslist field rather than leaving it implied.
    esbuild: { target: 'es2020' },
    build: { target: ['es2020', 'safari14'] },
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, 'src'),
        },
    },
    css: {
        postcss: {
            plugins: [autoprefixer()],
        },
        preprocessorOptions: {
            scss: {
                // Tokens only. `@/styles` (index.scss) also `@use`s themes,
                // base, components and layout, all of which EMIT CSS — and
                // since every SFC <style> block is its own Sass compilation,
                // injecting the barrel would re-emit the entire global
                // stylesheet, all 52 themes included, once per component.
                // index.scss is loaded once from main.ts; SFCs need the vars.
                additionalData: (source: string, filename: string) =>
                    filename.endsWith('index.scss')
                        ? source
                        : `@use 'sass:color';\n@use '@/styles/variables' as *;\n${source}`,
            },
        },
    },
    server: {
        port: 3500,
        proxy: {
            // No rewrite: the API mounts everything under /api itself, so the
            // path the browser asks for is the path the server serves.
            '/api': {
                target: 'http://localhost:5500',
                changeOrigin: true,
            },
            // The live candle feed is served by the Python aggregator, not by
            // the Node API: it is the only process holding the trade stream.
            '/ws': {
                target: 'ws://localhost:8000',
                ws: true,
                changeOrigin: true,
            },
        },
    },
});
