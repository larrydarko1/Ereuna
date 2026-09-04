import js from '@eslint/js';
import ts from 'typescript-eslint';
import vue from 'eslint-plugin-vue';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import apiStandards, {
    apiSourceSelectors,
    apiRoutesOnlySelectors,
    outboundCallSelectors,
    apiBannedImports,
    frontendSelectors,
} from './eslint/api.js';
import dbStandards, {
    dbApiWorkerSelectors,
    dbDbTsSelectors,
    dbWorkerIndexSelectors,
    dbBannedImports,
} from './eslint/db.js';
import securityStandards, { bannedCryptoModules } from './eslint/security.js';
import loggingStandards, { loggerCallSelectors, noDirectErrorResponse } from './eslint/logging.js';
import typescriptStandards, { tsSourceSelectors, sharedPackageBannedImports } from './eslint/typescript.js';
import htmlStandards from './eslint/html.js';
import i18nStandards from './eslint/i18n.js';
import vueStandards, { noStoreLibraryPatterns, aliasOnlyImportPatterns } from './eslint/vue.js';
import envStandards, { configModuleSelectors, noImportMetaEnv } from './eslint/env.js';
import {
    wsGatewaySelectors,
    wsEventNameSelectors,
    wsGatewayBannedImports,
    wsSocketClientBannedImports,
} from './eslint/ws.js';
import { noSingleLetterDeclaration, utilsBannedImportPatterns, libBannedImportPatterns } from './eslint/code-style.js';
import { errorHandlingSelectors } from './eslint/error-handling.js';
import refactoringStandards from './eslint/refactoring.js';
import testingStandards from './eslint/testing.js';
import { functionContractsPlugin } from './eslint/function-contracts.js';

const TYPED_SOURCE = [
    'frontend/src/**/*.{ts,vue}',
    'api/src/**/*.ts',
    'worker/src/**/*.ts',
    'ingestor/src/**/*.ts',
    'packages/shared/src/**/*.ts',
    'e2e/**/*.ts',
];

const typedOnly = (preset) => preset.map((block) => ({ ...block, files: TYPED_SOURCE }));

export default [
    { ignores: ['**/dist/', '**/node_modules/', 'backups/', 'coverage/', 'playwright-report/'] },
    {
        files: ['scripts/**/*.{js,mjs}', 'db/**/*.js'],
        languageOptions: {
            globals: globals.node,
            sourceType: 'module',
        },
    },

    js.configs.recommended,
    ...ts.configs.recommended,
    ...typedOnly(ts.configs.recommendedTypeChecked),
    ...typedOnly(ts.configs.strict),
    ...typedOnly(ts.configs.stylistic),
    ...vue.configs['flat/recommended'],
    {
        files: ['**/*.vue'],
        languageOptions: {
            parserOptions: { parser: ts.parser },
        },
    },
    {
        files: TYPED_SOURCE,
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
                extraFileExtensions: ['.vue'],
            },
        },
    },
    {
        files: TYPED_SOURCE,
        rules: {
            '@typescript-eslint/strict-boolean-expressions': [
                'error',
                { allowString: false, allowNumber: false, allowNullableObject: false },
            ],
        },
    },
    {
        files: TYPED_SOURCE,
        ignores: ['**/__tests__/**', '**/*.test.ts', '**/*.spec.ts', 'e2e/**'],
        rules: {
            '@typescript-eslint/explicit-function-return-type': [
                'error',
                { allowTypedFunctionExpressions: false, allowIIFEs: true },
            ],
        },
    },
    {
        files: TYPED_SOURCE,
        rules: {
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
            ],
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-empty-function': ['error', { allow: ['arrowFunctions'] }],
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'default',
                    format: ['camelCase'],
                    leadingUnderscore: 'allow',
                    trailingUnderscore: 'forbid',
                },
                {
                    selector: 'variable',
                    format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
                    leadingUnderscore: 'allow',
                    trailingUnderscore: 'forbid',
                },
                { selector: 'import', format: ['camelCase', 'PascalCase'] },
                { selector: 'function', format: ['camelCase', 'PascalCase'] },
                {
                    selector: 'parameter',
                    format: ['camelCase'],
                    leadingUnderscore: 'allow',
                    trailingUnderscore: 'forbid',
                },
                {
                    selector: 'property',
                    format: ['camelCase', 'UPPER_CASE'],
                    leadingUnderscore: 'allow',
                    trailingUnderscore: 'forbid',
                },
                { selector: 'property', modifiers: ['requiresQuotes'], format: null },
                {
                    selector: 'objectLiteralProperty',
                    format: ['camelCase', 'UPPER_CASE', 'PascalCase', 'snake_case'],
                    leadingUnderscore: 'allow',
                    trailingUnderscore: 'forbid',
                },
                { selector: 'objectLiteralProperty', modifiers: ['requiresQuotes'], format: null },
                { selector: 'typeLike', format: ['PascalCase'] },
                { selector: 'enumMember', format: ['UPPER_CASE'] },
                { selector: 'typeParameter', format: ['PascalCase'], prefix: ['T'] },
            ],
        },
    },
    {
        files: ['frontend/src/api/**/*.ts', 'e2e/support/**/*.ts'],
        rules: {
            '@typescript-eslint/no-invalid-void-type': 'off',
        },
    },
    {
        files: ['frontend/src/main.ts'],
        rules: {
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
        },
    },
    {
        files: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts', '**/*.setup.ts', 'e2e/**/*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/unbound-method': 'off',
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/await-thenable': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-unnecessary-type-assertion': 'off',
            '@typescript-eslint/no-dynamic-delete': 'off',
            '@typescript-eslint/consistent-type-imports': 'off',
            '@typescript-eslint/no-extraneous-class': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/strict-boolean-expressions': 'off',
        },
    },
    {
        files: ['api/src/**/*.ts', 'worker/src/**/*.ts', '**/*.setup.ts'],
        languageOptions: {
            globals: globals.node,
        },
    },
    {
        files: ['e2e/**/*.ts'],
        languageOptions: {
            globals: { ...globals.node, ...globals.browser },
        },
    },
    {
        files: ['frontend/src/**/*.{ts,vue}'],
        languageOptions: {
            globals: globals.browser,
        },
    },
    {
        rules: {
            '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
            '@typescript-eslint/no-empty-object-type': 'error',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'default',
                    format: ['camelCase'],
                    leadingUnderscore: 'allow', 
                    trailingUnderscore: 'forbid',
                },
                {
                    selector: 'variable',
                    format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
                    leadingUnderscore: 'allow',
                    trailingUnderscore: 'forbid',
                },
                {
                    selector: 'import',
                    format: ['camelCase', 'PascalCase'],
                },
                {
                    selector: 'function',
                    format: ['camelCase', 'PascalCase'],
                },
                {
                    selector: 'parameter',
                    format: ['camelCase'],
                    leadingUnderscore: 'allow',
                    trailingUnderscore: 'forbid',
                },
                {
                    selector: 'property',
                    format: ['camelCase', 'UPPER_CASE'],
                    leadingUnderscore: 'allow',
                    trailingUnderscore: 'forbid',
                },
                {
                    selector: 'property',
                    modifiers: ['requiresQuotes'],
                    format: null,
                },
                {
                    selector: 'objectLiteralProperty',
                    format: ['camelCase', 'UPPER_CASE', 'PascalCase', 'snake_case'],
                    leadingUnderscore: 'allow',
                    trailingUnderscore: 'forbid',
                },
                {
                    selector: 'objectLiteralProperty',
                    modifiers: ['requiresQuotes'],
                    format: null,
                },
                {
                    selector: 'typeLike',
                    format: ['PascalCase'],
                },
                {
                    selector: 'enumMember',
                    format: ['UPPER_CASE'],
                },
                {
                    selector: 'typeParameter',
                    format: ['PascalCase'],
                    prefix: ['T'],
                },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
            'vue/multi-word-component-names': 'off',
            'vue/require-v-for-key': 'error',
        },
    },
    ...apiStandards,
    ...dbStandards,
    ...securityStandards,
    ...loggingStandards,
    ...typescriptStandards,
    {
        files: ['api/src/middleware/error-handler.ts'],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...apiSourceSelectors,
                ...loggerCallSelectors,
                ...errorHandlingSelectors,
                ...dbApiWorkerSelectors,
                ...tsSourceSelectors,
                noSingleLetterDeclaration,
            ],
        },
    },
    {
        files: ['api/src/routes/**/*.ts'],
        ignores: ['**/__tests__/**'],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...apiSourceSelectors,
                ...apiRoutesOnlySelectors,
                ...loggerCallSelectors,
                ...errorHandlingSelectors,
                noDirectErrorResponse,
                ...dbApiWorkerSelectors,
                ...tsSourceSelectors,
                noSingleLetterDeclaration,
            ],
        },
    },
    {
        files: ['api/src/lib/db.ts'],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...apiSourceSelectors,
                ...loggerCallSelectors,
                ...errorHandlingSelectors,
                noDirectErrorResponse,
                ...dbDbTsSelectors,
                ...tsSourceSelectors,
                noSingleLetterDeclaration,
            ],
        },
    },
    {
        files: ['api/src/**/*.ts'],
        ignores: [
            '**/__tests__/**',
            'api/src/lib/config.ts',
            'api/src/lib/db.ts',
            'api/src/routes/**/*.ts',
            'api/src/middleware/error-handler.ts',
            'api/src/gateway/**/*.ts',
        ],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...apiSourceSelectors,
                ...loggerCallSelectors,
                ...errorHandlingSelectors,
                noDirectErrorResponse,
                ...dbApiWorkerSelectors,
                ...tsSourceSelectors,
                noSingleLetterDeclaration,
            ],
        },
    },
    {
        files: ['api/src/gateway/**/*.ts'],
        ignores: ['**/__tests__/**'],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...wsGatewaySelectors,
                ...wsEventNameSelectors,
                ...apiSourceSelectors,
                ...loggerCallSelectors,
                ...errorHandlingSelectors,
                noDirectErrorResponse,
                ...dbApiWorkerSelectors,
                ...tsSourceSelectors,
                noSingleLetterDeclaration,
            ],
        },
    },
    {
        files: ['worker/src/index.ts'],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...outboundCallSelectors,
                ...loggerCallSelectors,
                ...errorHandlingSelectors,
                ...dbWorkerIndexSelectors,
                ...tsSourceSelectors,
                noSingleLetterDeclaration,
            ],
        },
    },
    {
        files: ['worker/src/**/*.ts'],
        ignores: ['**/__tests__/**', 'worker/src/lib/config.ts', 'worker/src/index.ts'],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...outboundCallSelectors,
                ...loggerCallSelectors,
                ...errorHandlingSelectors,
                ...dbApiWorkerSelectors,
                ...tsSourceSelectors,
                noSingleLetterDeclaration,
            ],
        },
    },
    {
        files: ['frontend/src/**/*.{ts,vue}'],
        ignores: ['**/__tests__/**'],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...frontendSelectors,
                noImportMetaEnv,
                ...wsEventNameSelectors,
                ...tsSourceSelectors,
                noSingleLetterDeclaration,
            ],
        },
    },
    {
        files: ['packages/shared/src/**/*.ts', 'e2e/**/*.ts'],
        ignores: ['**/__tests__/**'],
        rules: {
            'no-restricted-syntax': ['error', ...tsSourceSelectors, noSingleLetterDeclaration],
        },
    },
    {
        files: ['api/src/**/*.ts', 'worker/src/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                { paths: [...bannedCryptoModules, ...dbBannedImports, ...apiBannedImports] },
            ],
        },
    },
    {
        files: ['api/src/gateway/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [...bannedCryptoModules, ...dbBannedImports, ...apiBannedImports, ...wsGatewayBannedImports],
                },
            ],
        },
    },
    {
        files: ['packages/shared/src/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                { paths: bannedCryptoModules, patterns: sharedPackageBannedImports.patterns },
            ],
        },
    },
    ...envStandards,
    {
        files: ['scripts/**/*.{js,mjs}', 'db/**/*.js'],
        rules: {
            '@typescript-eslint/no-require-imports': 'error',
            '@typescript-eslint/naming-convention': 'off',
        },
    },
    {
        files: ['**/lib/config.ts'],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...configModuleSelectors,
                ...tsSourceSelectors,
                noSingleLetterDeclaration,
            ],
        },
    },
    ...i18nStandards,
    ...vueStandards,
    {
        files: ['frontend/src/**/*.{ts,vue}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [...bannedCryptoModules, ...wsSocketClientBannedImports],
                    patterns: [...noStoreLibraryPatterns, ...aliasOnlyImportPatterns],
                },
            ],
        },
    },
    {
        files: ['frontend/src/api/socket.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: bannedCryptoModules,
                    patterns: [...noStoreLibraryPatterns, ...aliasOnlyImportPatterns],
                },
            ],
        },
    },
    {
        files: ['frontend/src/**/__tests__/**/*.{ts,vue}', 'frontend/src/**/*.test.ts'],
        rules: {
            'no-restricted-imports': ['error', { paths: bannedCryptoModules, patterns: noStoreLibraryPatterns }],
            'vue/require-typed-ref': 'off',
            'vue/no-ref-object-reactivity-loss': 'off',
        },
    },
    {
        files: ['api/src/lib/**/*.ts', 'worker/src/lib/**/*.ts'],
        ignores: ['**/__tests__/**'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [...bannedCryptoModules, ...dbBannedImports, ...apiBannedImports],
                    patterns: libBannedImportPatterns,
                },
            ],
        },
    },
    {
        files: ['frontend/src/utils/**/*.{ts,vue}'],
        ignores: ['**/__tests__/**'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [...bannedCryptoModules, ...wsSocketClientBannedImports],
                    patterns: [...noStoreLibraryPatterns, ...aliasOnlyImportPatterns, ...utilsBannedImportPatterns],
                },
            ],
        },
    },
    ...htmlStandards,
    ...refactoringStandards,
    ...testingStandards,
    {
        files: TYPED_SOURCE,
        ignores: ['**/__tests__/**', '**/*.test.ts', '**/*.spec.ts', 'e2e/**'],
        plugins: { contracts: functionContractsPlugin },
        rules: {
            'contracts/name-contract': 'error',
            'contracts/one-failure-channel': 'error',
            'contracts/no-undefined-hole': 'error',
            'contracts/no-boolean-flag': 'error',
            'contracts/no-db-await-in-loop': 'error',
            'no-nested-ternary': 'error',
        },
    },
    {
        files: ['eslint/function-contracts.js'],
        rules: { '@typescript-eslint/naming-convention': 'off' },
    },
    prettier, // Prettier last — disables formatting rules that conflict
];
