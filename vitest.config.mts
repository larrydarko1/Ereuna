import { defineConfig } from 'vitest/config';

/**
 * Root test config: the workspaces to run, and the coverage policy they share.
 * The thresholds are a ratchet, not a target: `check-testing.mjs` fails if one
 * is lowered, so the only way past a coverage gap is to close it.
 */
export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            include: [
                'packages/shared/src/**/*.ts',
                'frontend/src/**/*.{ts,vue}',
                'api/src/**/*.ts',
                'ingestor/src/**/*.ts',
                'worker/src/**/*.ts',
            ],
            exclude: [
                '**/__tests__/**',
                '**/*.test.ts',
                '**/*.d.ts',
                // The vendored charting fork: 200 files of upstream code nobody
                // here wrote, held frozen. Every custom gate skips it for the
                // same reason, and testing it would be testing a dependency.
                'frontend/src/lib/lightweight-charts/**',
            ],
            reporter: ['text-summary', 'html', 'json-summary'],
            reportsDirectory: './coverage',
            thresholds: {
                statements: 80,
                branches: 80,
                functions: 80,
                lines: 80,
            },
        },
        projects: ['packages/shared', 'api', 'worker', 'db', 'frontend', 'ingestor'],
    },
});
