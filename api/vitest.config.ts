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
    },
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
});
