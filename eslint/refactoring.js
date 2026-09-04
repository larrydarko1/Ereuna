export default [
    {
        files: [
            'api/src/**/*.ts',
            'worker/src/**/*.ts',
            'frontend/src/**/*.{ts,vue}',
            'packages/shared/src/**/*.ts',
            'e2e/**/*.ts',
        ],
        rules: {
            'max-depth': ['error', 4],
            '@typescript-eslint/max-params': ['error', { max: 6 }],
        },
    },
    {
        files: ['api/src/**/*.ts', 'worker/src/**/*.ts', 'frontend/src/**/*.{ts,vue}', 'packages/shared/src/**/*.ts'],
        ignores: ['**/__tests__/**', '**/*.test.ts', '**/*.spec.ts'],
        rules: { 'max-depth': ['error', 3] },
    },
    {
        rules: {
            'no-else-return': ['error', { allowElseIf: false }],
            'no-warning-comments': [
                'error',
                {
                    terms: ['todo', 'fixme', 'fix me', 'hack', 'xxx', 'wip', 'tbd'],
                    location: 'anywhere',
                },
            ],
        },
    },
    {
        files: ['eslint/refactoring.js', 'eslint.config.js', 'scripts/checks/check-refactoring.mjs'],
        rules: { 'no-warning-comments': 'off' },
    },
];