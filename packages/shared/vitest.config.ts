import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { sharedEsbuild, sharedTest } from '../../vitest.shared.mts';

export default defineConfig({
    test: {
        ...sharedTest,
        name: 'shared',
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
    esbuild: sharedEsbuild,
    resolve: {
        alias: { '#': fileURLToPath(new URL('./src', import.meta.url)) },
    },
});
