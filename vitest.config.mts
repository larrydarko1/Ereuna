import { defineConfig } from 'vitest/config';

/**
 * Root test config: the workspaces to run, and the coverage policy they share.
 * Thresholds are deliberately absent until every workspace has tests — a gate
 * that fails on day one gets switched off rather than met.
 */
export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            include: [
                'packages/shared/src/**/*.ts',
                'api/src/**/*.ts',
                'ingestor/src/**/*.ts',
                'worker/src/**/*.ts',
            ],
            exclude: ['**/__tests__/**', '**/*.test.ts', '**/*.d.ts'],
            reporter: ['text-summary', 'html', 'json-summary'],
            reportsDirectory: './coverage',
        },
        projects: ['packages/shared', 'api', 'worker'],
    },
});
