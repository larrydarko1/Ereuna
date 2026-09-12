import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { sharedTest } from '../vitest.shared.mts';

export default defineConfig({
    test: {
        ...sharedTest,
        name: 'ingestor',
        environment: 'node',
        include: ['src/**/*.test.ts'],
        env: { TIINGO_KEY: 'test-key' },
    },
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
});
