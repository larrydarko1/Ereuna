import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { sharedEsbuild, sharedTest } from '../vitest.shared.mts';

export default defineConfig({
    test: {
        ...sharedTest,
        name: 'worker',
        environment: 'node',
        include: ['src/**/*.test.ts'],
        env: { WORKER_ROLE: 'all', TIINGO_KEY: 'test-key' },
    },
    esbuild: sharedEsbuild,
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
});
