import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: false,
        clearMocks: true,
        name: 'db',
        environment: 'node',
        include: ['__tests__/**/*.test.ts'],
    },
});
