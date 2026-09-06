import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { sharedTest } from '../vitest.shared.mts';

export default defineConfig({
    plugins: [vue()],
    test: {
        ...sharedTest,
        name: 'frontend',
        environment: 'jsdom',
        include: ['src/**/*.test.ts'],
        // Registers the i18n instance and the DOM APIs jsdom does not implement,
        // before the first component mounts.
        setupFiles: ['./vitest.setup.ts'],
        // The vendored fork is 200 files of upstream code nothing here wrote.
        exclude: ['src/lib/lightweight-charts/**'],
    },
    // No `css` block on purpose: Vitest leaves <style> untransformed, so the
    // SCSS that vite.config.ts injects for the dev build is never needed here.
    resolve: {
        alias: { '@': path.resolve(import.meta.dirname, 'src') },
    },
});
