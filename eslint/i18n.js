import vueI18n from '@intlify/eslint-plugin-vue-i18n';
import * as jsoncParser from 'jsonc-eslint-parser';

/**
 * Namespaces addressed by a COMPUTED key, which `no-unused-keys` cannot follow.
 * Without these, the rule reports 432 violations of which 432 are false
 * positives. With them it reports 0 and still polices the other 51 namespaces —
 * which is the whole reason it is worth enabling. Anything added here is
 * genuinely unguarded, so keep the list short and keep each entry justified.
 */
const DYNAMICALLY_ADDRESSED_KEYS = [
    '/^errors\\./',
    '/^legal\\./',
    '/^reportModal\\.(media|user|comment)Reasons/',
    '/^themePicker\\.contrast\\./',
    '/^home\\.trendingWindows\\./',
    '/^watchActionBar\\.visibility/',
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
                    ignorePattern: '^[\\s\\d\\p{P}\\p{S}]*$',  // Ignore pure whitespace/number/punctuation/symbol runs and empty-string ternary branches (e.g. `cond ? t('k') : ''`).
                    ignoreText: ['Lotus'],
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