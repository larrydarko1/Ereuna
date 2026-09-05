import vueI18n from '@intlify/eslint-plugin-vue-i18n';
import * as jsoncParser from 'jsonc-eslint-parser';

/**
 * Namespaces addressed by a COMPUTED key, which `no-unused-keys` cannot follow.
 * Without them the rule reports 491 keys per locale — 8,838 across the 18 files,
 * every one of them a false positive. With them it reports 0 and still polices
 * the namespaces that are addressed literally, which is the whole reason it is
 * worth enabling. Anything added here is genuinely unguarded, so keep the list
 * short and keep each entry justified.
 * Three shapes end up here. Most are a template literal at the call site
 * (`t(\`screener.fields.${field}\`)`). `errors.*` is looked up from the `code`
 * an AppError carries, so the key only exists on the server. And the three
 * `screener.*Failed` keys are passed to `runNamed()` as a string argument,
 * which no static analysis follows either.
 */
const DYNAMICALLY_ADDRESSED_KEYS = [
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
];

export default [
    {
        settings: {
            'vue-i18n': {
                localeDir: './frontend/src/locales/*.json',
                messageSyntaxVersion: '^11.0.0',
            },
        },
    },
    {
        files: ['frontend/src/**/*.vue'],
        plugins: { '@intlify/vue-i18n': vueI18n },
        rules: {
            '@intlify/vue-i18n/no-raw-text': [
                'error',
                {
                    ignorePattern: '^[\\s\\d\\p{P}\\p{S}]*$', // Ignore pure whitespace/number/punctuation/symbol runs and empty-string ternary branches (e.g. `cond ? t('k') : ''`).
                    ignoreText: ['Ereuna'],
                },
            ],
            'vue/no-restricted-block': [
                'error',
                {
                    element: 'i18n',
                    message:
                        'No per-component <i18n> blocks — every key lives in frontend/src/locales/<locale>.json. A block splits a key away from its siblings, and no locale-parity check can see it.',
                },
            ],
            '@intlify/vue-i18n/no-i18n-t-path-prop': 'error',
        },
    },
    {
        files: ['frontend/src/**/*.{ts,vue}'],
        plugins: { '@intlify/vue-i18n': vueI18n },
        rules: {
            '@intlify/vue-i18n/no-missing-keys': 'error',
            '@intlify/vue-i18n/valid-message-syntax': 'error',
            '@intlify/vue-i18n/valid-plural-forms': 'error',
            '@intlify/vue-i18n/no-unknown-locale': 'error',
            '@intlify/vue-i18n/prefer-linked-key-with-paren': 'error',
        },
    },
    {
        files: ['frontend/src/locales/*.json'],
        plugins: { '@intlify/vue-i18n': vueI18n },
        languageOptions: { parser: jsoncParser },
        rules: {
            '@typescript-eslint/naming-convention': 'off',
            '@intlify/vue-i18n/no-missing-keys-in-other-locales': 'error',
            '@intlify/vue-i18n/no-duplicate-keys-in-locale': 'error',
            '@intlify/vue-i18n/valid-message-syntax': 'error',
            '@intlify/vue-i18n/valid-plural-forms': 'error',
            '@intlify/vue-i18n/no-unknown-locale': 'error',
            '@intlify/vue-i18n/prefer-linked-key-with-paren': 'error',
            '@intlify/vue-i18n/no-unused-keys': [
                'error',
                {
                    src: 'frontend/src',
                    extensions: ['.ts', '.vue'],
                    ignores: DYNAMICALLY_ADDRESSED_KEYS,
                },
            ],
        },
    },
];
