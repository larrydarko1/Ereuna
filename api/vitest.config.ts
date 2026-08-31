import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        name: 'api',
        environment: 'node',
        include: ['src/**/*.test.ts'],
        // Seeds the secrets lib/config.ts requires, before it is first imported.
        setupFiles: ['./vitest.setup.ts'],
    },
    // The api tsconfig targets ES2025, which the bundled esbuild does not yet
    // accept as a target name and warns about on every transformed file.
    // Overriding tsconfigRaw keeps that out of the transform; the compiler
    // still typechecks against the real ES2025 target via `npm run typecheck`.
    esbuild: { tsconfigRaw: { compilerOptions: { target: 'ES2022', useDefineForClassFields: false } } },
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
});
