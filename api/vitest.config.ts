import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { sharedTest } from '../vitest.shared.mts';

export default defineConfig({
    test: {
        ...sharedTest,
        name: 'api',
        environment: 'node',
        include: ['src/**/*.test.ts'],
        // Seeds the secrets lib/config.ts requires, before it is first imported.
        setupFiles: ['./vitest.setup.ts'],
        // Fails a full coverage run on a route no route test got a success from
        globalSetup: ['./src/__tests__/contract-coverage.ts'],
    },
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
});
