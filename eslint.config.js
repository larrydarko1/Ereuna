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

/**
 * A layering ban that only applies to a runtime import.
 * The three groups below police which layer may depend on which — shared on a
 * driver, `utils/` on `lib/`, `lib/` on `services/`. A dependency is what the
 * ban is about, and `import type` is not one: it is erased before anything runs,
 * so the shared package still ships without mongodb and a pure function that
 * names a type from `lib/` still does no I/O. The base `no-restricted-imports`
 * cannot tell the two apart, so these three blocks use the typescript-eslint
 * variant and switch the base rule off to avoid a double report. The module
 * bans (crypto, pinia) and the relative-path ban stay absolute — a `../` path
 * breaks on a move whether or not the symbol survives to runtime.
 */
const runtimeOnly = (entries) => entries.map((entry) => ({ ...entry, allowTypeImports: true }));

export default [
    {
        // The vendored lightweight-charts fork is 208 files of upstream code held
        // frozen, so linting it reports 3,460 problems about someone else's house
        // style and 25 outright parse errors. Every custom gate in scripts/checks
        // excludes it for the same reason; this is that exclusion.
        ignores: [
            '**/dist/',
            '**/node_modules/',
            'backups/',
            'coverage/',
            'playwright-report/',
            'frontend/src/lib/lightweight-charts/',
        ],
    },
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
                {
                    // EreunaDB docs are PascalCase, will either fix on a future migration or leave it
                    selector: 'typeProperty',
                    format: ['camelCase', 'PascalCase', 'UPPER_CASE', 'snake_case'],
                    leadingUnderscore: 'allow',
                    trailingUnderscore: 'forbid',
                },
                { selector: 'typeProperty', modifiers: ['requiresQuotes'], format: null },
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
                {
                    // See the typed block above: a document type's property names are the
                    // field names in EreunaDB, not names TypeScript gets to choose.
                    selector: 'typeProperty',
                    format: ['camelCase', 'PascalCase', 'UPPER_CASE', 'snake_case'],
                    leadingUnderscore: 'allow',
                    trailingUnderscore: 'forbid',
                },
                {
                    selector: 'typeProperty',
                    modifiers: ['requiresQuotes'],
                    format: null,
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
        // The ingestor rides with the worker: same shape, same Mongo and Redis
        // clients, same vendor. It was left out when it was added to TYPED_SOURCE,
        // which meant every selector below simply did not run against it.
        files: ['worker/src/**/*.ts', 'ingestor/src/**/*.ts'],
        ignores: [
            '**/__tests__/**',
            'worker/src/lib/config.ts',
            'worker/src/index.ts',
            'ingestor/src/lib/config.ts',
            // The one module in each backend allowed to construct the client,
            // which is what makes "one connection per process" true. Same
            // exemption api/src/lib/db.ts already has.
            'worker/src/lib/db.ts',
            'ingestor/src/lib/db.ts',
        ],
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
        // worker/src/lib/db.ts is the worker's singleton, exactly as
        // api/src/lib/db.ts is the api's — constructing the client is its job, and
        // that is what makes "one connection per process" true. eslint/db.js only
        // knows about the api's, so the worker's exemption is spelled out here.
        files: ['worker/src/lib/db.ts'],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...outboundCallSelectors,
                ...loggerCallSelectors,
                ...errorHandlingSelectors,
                ...dbDbTsSelectors,
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
            'no-restricted-imports': 'off',
            '@typescript-eslint/no-restricted-imports': [
                'error',
                { paths: bannedCryptoModules, patterns: runtimeOnly(sharedPackageBannedImports.patterns) },
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
            'no-restricted-imports': 'off',
            '@typescript-eslint/no-restricted-imports': [
                'error',
                {
                    paths: [...bannedCryptoModules, ...dbBannedImports, ...apiBannedImports],
                    patterns: runtimeOnly(libBannedImportPatterns),
                },
            ],
        },
    },
    {
        files: ['frontend/src/utils/**/*.{ts,vue}'],
        ignores: ['**/__tests__/**'],
        rules: {
            'no-restricted-imports': 'off',
            '@typescript-eslint/no-restricted-imports': [
                'error',
                {
                    paths: [...bannedCryptoModules, ...wsSocketClientBannedImports],
                    patterns: [
                        ...noStoreLibraryPatterns,
                        ...aliasOnlyImportPatterns,
                        ...runtimeOnly(utilsBannedImportPatterns),
                    ],
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
    {
        // Two ARIA patterns this rule cannot see the rest of.
        // SymbolSearch is a combobox: the input keeps focus and drives the
        // highlight through `aria-activedescendant`, so its options must NOT be
        // focusable — giving them a tabindex would break the pattern the rule is
        // trying to protect. AppDialog's backdrop is a mouse convenience on top
        // of a real Escape handler and a focusable close button, so there is no
        // keyboard path missing for it to add.
        files: ['frontend/src/components/charts/SymbolSearch.vue', 'frontend/src/components/ui/AppDialog.vue'],
        rules: {
            'a11y/interactive-supports-focus': 'off',
            'a11y/mouse-events-have-key-events': 'off',
            'a11y/no-static-element-interactions': 'off',
        },
    },
    {
        // typescript-eslint resolves a `.vue` module's exports as `any`, so
        // `InstanceType<typeof TwoFactorPrompt>` on a template ref and a lazily
        // imported SFC both come back unresolvable — even though `vue-tsc`, which
        // is what actually gates the build, types them fully. A type that two
        // components share is moved to `types/` for this reason; a component's own
        // instance type has nowhere else to live.
        files: ['frontend/src/views/Login.vue', 'frontend/src/components/user/SecurityPanel.vue'],
        rules: {
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
        },
    },
    {
        // A modal opens because the user asked for it, and the first field is
        // where the keyboard then has to be — without autofocus the caret stays
        // behind the overlay on the page underneath. That is the opposite of the
        // hijacked focus this rule guards against, which is why it was removed
        // from Login, SignUp and Recovery instead: those load without being asked.
        // AppField is here because it forwards the caller's choice, and the only
        // callers passing it are the two dialogs above.
        files: [
            'frontend/src/components/portfolio/CashDialog.vue',
            'frontend/src/components/portfolio/TradeDialog.vue',
            'frontend/src/components/ui/AppField.vue',
        ],
        rules: { 'a11y/no-autofocus': 'off' },
    },
    {
        // Declaration merging is the whole mechanism here: `declare module 'vue-router'`
        // adds `meta.public` to vue-router's own RouteMeta, and only an interface merges
        // with an interface. Rewriting it as a type alias compiles to TS2300, which is
        // exactly what this rule's autofix did before the exception existed.
        files: ['frontend/src/router/index.ts'],
        rules: { '@typescript-eslint/consistent-type-definitions': 'off' },
    },
    {
        // `declare global { namespace Express }` is the only way to add `req.id` and
        // `req.validated` to Express's own Request type. Module syntax cannot augment
        // a global interface, so the rule's advice does not apply here.
        files: ['api/src/middleware/request-id.ts', 'api/src/middleware/validate.ts'],
        rules: {
            '@typescript-eslint/no-namespace': 'off',
            // Same reason: `Request` is merged into, and only an interface merges.
            '@typescript-eslint/consistent-type-definitions': 'off',
        },
    },
    {
        // The router and the SFC shim are read by tooling that requires a default
        // export — vue-router's `createRouter` result and TypeScript's `*.vue` module
        // declaration. Neither is a module whose export shape we get to choose.
        files: ['frontend/src/router/index.ts'],
        rules: {
            'no-restricted-exports': 'off',
            // The route table's lazy components have no writable return type: the
            // honest one is `Promise<typeof import('@/views/X.vue')>`, and an
            // `import()` type annotation is what consistent-type-imports forbids.
            // `RouteRecordRaw` already constrains every one of them.
            '@typescript-eslint/explicit-function-return-type': 'off',
            // And the same SFC-resolution gap: `import('@/views/X.vue')` is `any`
            // to typescript-eslint, though vue-tsc types it fully.
            '@typescript-eslint/no-unsafe-return': 'off',
        },
    },
    {
        // The CSV writer emits a literal U+FEFF so Excel reads the file as UTF-8
        // rather than as the local codepage. It is data, not stray whitespace, and it
        // has to sit inside the template literal that builds the file.
        files: ['frontend/src/utils/csv.ts'],
        rules: { 'no-irregular-whitespace': ['error', { skipTemplates: true }] },
    },
    prettier, // Prettier last — disables formatting rules that conflict
];
