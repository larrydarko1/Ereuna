import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { sharedTest } from '../../vitest.shared.mts';

export default defineConfig({
    test: {
        ...sharedTest,
        name: 'shared',
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
    resolve: {
        alias: { '#': fileURLToPath(new URL('./src', import.meta.url)) },
    },
});
