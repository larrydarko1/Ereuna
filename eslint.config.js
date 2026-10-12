/**
 * Ereuna's ESLint config. The shared base — JS/TS/Vue presets, globals, strict type
 * rules, naming, test relaxations — and the full-stack standards come from
 * @larrydarko/lint-config. What stays here is the wiring that is genuinely about
 * Ereuna's folders: which selectors apply to routes, to the gateway, to the worker
 * and the ingestor, and the handful of files with a reason to differ.
 *
 * `no-restricted-syntax` is last-match-wins, not additive, so each area names the
 * whole list it wants rather than adding to an inherited one.
 */
import { larry, PRESETS, NAMING_CONVENTION, fullstackLayout, resolvePaths } from '@larrydarko/lint-config/eslint';
import {
    fullstackStandards,
    apiSourceSelectors,
    apiRoutesOnlySelectors,
    outboundCallSelectors,
    apiBannedImports,
    frontendSelectors,
    dbApiWorkerSelectors,
    dbDbTsSelectors,
    dbWorkerIndexSelectors,
    dbBannedImports,
    bannedCryptoModules,
    loggerCallSelectors,
    noDirectErrorResponse,
    errorHandlingSelectors,
    tsSourceSelectors,
    sharedPackageBannedImports,
    configModuleSelectors,
    noImportMetaEnv,
    noSingleLetterDeclaration,
    noFileURLToPath,
    utilsBannedImportPatterns,
    libBannedImportPatterns,
    noStoreLibraryPatterns,
    noToastLibraryPatterns,
    aliasOnlyImportPatterns,
    wsGatewaySelectors,
    wsEventNameSelectors,
    wsGatewayBannedImports,
    wsSocketClientBannedImports,
    functionContractsPlugin,
} from '@larrydarko/lint-config/eslint/fullstack';

/**
 * The ingestor is the fifth workspace: one socket to the vendor's feed, outside the request
 * cycle like the worker, so it takes the services role and every rule that role carries.
 * Declared once; the preset's paths, the shared standards and the blocks below all read it.
 */
const WORKSPACES = { services: ['worker', 'ingestor'] };
const { workspaces, services, backend } = fullstackLayout(WORKSPACES);
const TYPED_SOURCE = resolvePaths('fullstack', {}, WORKSPACES).typedSource;
/** Each backend's lib/, where the layering ban on services/ applies. */
const BACKEND_LIBS = [workspaces.api, ...workspaces.services].map((dir) => `${dir}/src/lib/**/*.ts`);

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

export default larry({
    preset: 'fullstack',
    rootDir: import.meta.dirname,
    workspaces: WORKSPACES,
    paths: { ignores: [...PRESETS.fullstack.ignores, 'test-results/'] },
    /**
     * The charting fork arrived carrying `// eslint-disable-next-line deprecation/deprecation`
     * on two calls. That plugin is not installed here, so the directives were
     * reporting "rule not found" rather than protecting anything, and deleting
     * them would have dropped the only marker on a deprecated API. This is the
     * live replacement: typescript-eslint's own rule, which reads the same
     * `@deprecated` tags the plugin did.
     */
    rules: { '@typescript-eslint/no-deprecated': 'error' },
    // Test doubles are routinely a class of static methods standing in for a module.
    testRules: { '@typescript-eslint/no-extraneous-class': 'off' },

    standards: fullstackStandards({
        refactoring: {
            // These quote the markers they ban, so the ban must not fire on them.
            markerFiles: ['eslint.config.js', 'scripts/checks/check-refactoring.ts'],
        },
        i18n: {
            // A brand name reads the same in every locale.
            ignoreText: ['Ereuna'],
            // Namespaces `no-unused-keys` cannot follow, in three shapes. Most are a
            // template literal at the call site (`t(\`screener.fields.${field}\`)`).
            // `errors.*` is looked up from the `code` an AppError carries, so the key
            // only exists on the server. And the three `screener.*Failed` keys are
            // passed to `runNamed()` as a string argument, which no static analysis
            // follows either. Each entry goes unchecked, so keep the list short.
            unscannedKeys: [
                '/^errors\\./',
                '/^charts\\.(market|panes|quote|signals|styles|timeframes|tools)\\./',
                '/^charts\\.settings\\.marker\\./',
                '/^charts\\.patterns\\.types\\./',
                '/^dashboard\\.(breadth|calendar|indexes|outlook|universe)\\./',
                '/^financials\\./',
                '/^panels\\./',
                '/^portfolio\\.actions\\./',
                '/^screener\\.(direction|fields|groups|modes|panes|tips)\\./',
                '/^screener\\.(create|rename|delete)Failed$/',
                '/^sidebar\\./',
                '/^summary\\./',
                '/^user\\.(nav|themes)\\./',
            ],
        },
    }),

    overrides: [
        {
            // EreunaDB's documents are PascalCase, and a document type's property names
            // are its field names, not names TypeScript gets to choose. Will either be
            // fixed by a future migration or stay.
            files: TYPED_SOURCE,
            rules: {
                '@typescript-eslint/naming-convention': [
                    ...NAMING_CONVENTION,
                    {
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
            // Generated API clients and the e2e helpers return `void` deliberately.
            files: ['frontend/src/api/**/*.ts', 'e2e/support/**/*.ts'],
            rules: { '@typescript-eslint/no-invalid-void-type': 'off' },
        },
        {
            // Ambient declarations: `declare global` wants an interface to merge into,
            // and `var` is how a global is declared.
            files: ['**/*.d.ts'],
            rules: {
                '@typescript-eslint/consistent-type-definitions': 'off',
                'no-var': 'off',
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
            files: ['scripts/**/*.ts', 'db/**/*.js'],
            rules: {
                '@typescript-eslint/no-require-imports': 'error',
                '@typescript-eslint/naming-convention': 'off',
            },
        },

        // ── Restricted syntax, composed per area ─────────────────────────────
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
            // clients, same vendor.
            files: services,
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
            // Each service's lib/db.ts is that process's singleton, as api/src/lib/db.ts
            // is the api's — constructing the client is its job. The shared db standard
            // expects a service's client in its index.ts, so the exemption is spelled out
            // here. Neither applies indexes (worker/src/index.ts does), so createIndex
            // stays banned in them, unlike the api's.
            files: workspaces.services.map((dir) => `${dir}/src/lib/db.ts`),
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
                    noFileURLToPath,
                ],
            },
        },
        {
            files: ['packages/shared/src/**/*.ts', 'e2e/**/*.ts'],
            ignores: ['**/__tests__/**'],
            rules: {
                'no-restricted-syntax': ['error', ...tsSourceSelectors, noSingleLetterDeclaration, noFileURLToPath],
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

        // ── Restricted imports, composed per area ────────────────────────────
        {
            files: backend,
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
                        paths: [
                            ...bannedCryptoModules,
                            ...dbBannedImports,
                            ...apiBannedImports,
                            ...wsGatewayBannedImports,
                        ],
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
        {
            files: ['frontend/src/**/*.{ts,vue}'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        paths: [...bannedCryptoModules, ...wsSocketClientBannedImports],
                        patterns: [...noStoreLibraryPatterns, ...noToastLibraryPatterns, ...aliasOnlyImportPatterns],
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
                        patterns: [...noStoreLibraryPatterns, ...noToastLibraryPatterns, ...aliasOnlyImportPatterns],
                    },
                ],
            },
        },
        {
            files: ['frontend/src/**/__tests__/**/*.{ts,vue}', 'frontend/src/**/*.test.ts'],
            rules: {
                'no-restricted-imports': ['error', { paths: bannedCryptoModules, patterns: noStoreLibraryPatterns }],
                'no-restricted-syntax': ['error', noFileURLToPath],
                'vue/require-typed-ref': 'off',
                'vue/no-ref-object-reactivity-loss': 'off',
            },
        },
        {
            files: BACKEND_LIBS,
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
                            ...noToastLibraryPatterns,
                            ...aliasOnlyImportPatterns,
                            ...runtimeOnly(utilsBannedImportPatterns),
                        ],
                    },
                ],
            },
        },

        // ── Function contracts — the name must match what the signature promises ─
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

        // ── Files with a reason to differ ────────────────────────────────────
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
            // The CSV writer emits a literal U+FEFF so Excel reads the file as UTF-8
            // rather than as the local codepage. It is data, not stray whitespace, and it
            // has to sit inside the template literal that builds the file.
            files: ['frontend/src/utils/csv.ts'],
            rules: { 'no-irregular-whitespace': ['error', { skipTemplates: true }] },
        },
    ],
});
