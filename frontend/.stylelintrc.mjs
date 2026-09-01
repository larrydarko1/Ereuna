export default {
    extends: ['stylelint-config-standard-scss'],
    plugins: ['stylelint-scss', 'stylelint-declaration-strict-value'],
    rules: {
        // –– BEM ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
        // block, block__element, block--modifier. The default pattern rejects
        // the `--modifier` half, which is the part that carries the meaning.
        'selector-class-pattern': [
            '^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z][a-z0-9]*(-[a-z0-9]+)*)?(--[a-z][a-z0-9]*(-[a-z0-9]+)*)?$',
            { message: 'Expected class selector to be kebab-case BEM (block__element--modifier)' },
        ],

        // –– COLOR FUNCTIONS –––––––––––––––––––––––––––––––––––––––––––––––
        'color-function-notation': 'modern',

        // –– UNITS –––––––––––––––––––––––––––––––––––––––––––––––––––––––––
        'declaration-property-unit-allowed-list': {
            'font-size': ['rem'],
            'line-height': [],
            'margin': ['em'],
            'margin-top': ['em'],
            'margin-bottom': ['em'],
            'margin-left': ['em'],
            'margin-right': ['em'],
            'padding': ['em'],
            'padding-top': ['em'],
            'padding-bottom': ['em'],
            'padding-left': ['em'],
            'padding-right': ['em'],
            'gap': ['em'],
            'row-gap': ['em'],
            'column-gap': ['em'],
            'border-radius': ['em'],
            'min-width': ['%', 'px', 'vh', 'vw', 'dvh', 'dvw', 'ch'],
            'max-width': ['%', 'px', 'vh', 'vw', 'dvh', 'dvw', 'ch'],
            'min-height': ['%', 'px', 'vh', 'vw', 'dvh', 'dvw'],
            'max-height': ['%', 'px', 'vh', 'vw', 'dvh', 'dvw'],
            'width': ['px', '%', 'vh', 'vw', 'dvh', 'dvw'],
            'height': ['px', '%', 'vh', 'vw', 'dvh', 'dvw'],
            'top': ['px', '%'],
            'right': ['px', '%'],
            'bottom': ['px', '%'],
            'left': ['px', '%'],
            'blur': ['px'],
            'grid-template-columns': ['fr', 'rem', '%'],
            'grid-template-rows': ['fr', 'rem', '%'],
        },

        // –– NO VENDOR PREFIXES –––––––––––––––––––––––––––––––––––––––––––––––
        'property-no-vendor-prefix': true,
        'value-no-vendor-prefix': true,
        'selector-no-vendor-prefix': true,
        'at-rule-no-vendor-prefix': true,

        // –– SCSS VARIABLES –––––––––––––––––––––––––––––––––––––––––––––––
        'scss/dollar-variable-pattern': '^[a-z][a-z0-9-]*$',
        'scss/dollar-variable-empty-line-before': null,

        // –– LAYOUT –––––––––––––––––––––––––––––––––––––––––––––––––––––––––
        'property-no-unknown': [
            true,
            {
                ignoreProperties: ['/^composes/'],
            },
        ],

        // –– SCSS NESTED PROPERTIES –––––––––––––––––––––––––––––––––––––––––––
        'scss/declaration-nested-properties': 'never',

        // –– DESIGN TOKENS –––––––––––––––––––––––––––––––––––––––––––––––
        // `no-unknown-custom-properties` is off, which it is not in Lotus. The
        // `--color-*` properties are never written literally: emit-theme()
        // generates them by looping over 52 SCSS maps, and no static analyser
        // can follow that. Left on, the rule flags all 18 token aliases in
        // _variables.scss as unknown — exactly backwards, since those aliases
        // are the one place the tokens are declared.
        'no-unknown-custom-properties': null,
        // Every design value references a token, never a raw literal.
        //
        // The unit rules above constrain the UNIT (`font-size` must be rem) but
        // not the NUMBER — `font-size: 0.875rem` passes them while being exactly
        // the hard-coded value the standard forbids. This closes that: the
        // typography and radius scales join colour in requiring a `$token`.
        //
        // The token DEFINITIONS live in _variables.scss and _themes.scss, which
        // are necessarily raw values — that is what a token file is — and carry
        // scoped disables where the rule would otherwise flag the definition
        // rather than a use of it.
        'scale-unlimited/declaration-strict-value': [
            ['/color$/', 'fill', 'stroke', 'font-size', 'font-weight', 'font-family', 'border-radius'],
            {
                // `0` is a reset, not a design value — `border-radius: 0` to
                // square off a corner is not a token waiting to be named.
                ignoreValues: ['transparent', 'currentColor', 'inherit', 'initial', 'unset', 'revert', 'none', '0'],
                disableFix: true,
            },
        ],

        // –– THEMING: NO SCSS COLOR FUNCTIONS ON RUNTIME TOKENS ––––––––––––
        // Every `$color-*` alias resolves to `var(--color-*)`, whose value only
        // exists at runtime. Handing one to a Sass colour function asks the
        // compiler to compute with a string it cannot see — `rgba($color-accent,
        // .12)` compiles to garbage or throws, and the failure is silent enough
        // to ship. `color-mix(in srgb, $color-accent 12%, transparent)` is the
        // runtime-computed, theme-aware equivalent. Ereuna has 52 themes, so a
        // colour computed at build time is wrong under 51 of them.
        'declaration-property-value-disallowed-list': [
            {
                '/.*/': [
                    '/(rgba|rgb|hsla|hsl|darken|lighten|saturate|desaturate|transparentize|opacify|fade-in|fade-out|adjust-color|scale-color|change-color|mix)\\(\\s*\\$color-/',
                ],
            },
            {
                message:
                    'Do not pass a $color-* alias to a SCSS colour function — it is `var(--color-*)`, which Sass cannot resolve at build time. Use CSS color-mix() instead.',
            },
        ],

        // –– MODULE SYSTEM ––––––––––––––––––––––––––––––––––––––––––––––––
        // `@import` is deprecated in Sass and slated for removal; it also dumps
        // everything into one global namespace, which is what `@use`/`@forward`
        // exist to prevent. The style architecture depends on that boundary:
        // variables.scss is auto-injected per-SFC by Vite, so a stray @import
        // would silently duplicate the whole token layer into the bundle.
        'at-rule-disallowed-list': ['import'],

        // –– SCOPED STYLES –––––––––––––––––––––––––––––––––––––––––––––––
        'selector-max-specificity': ['1,4,1'],
        'selector-max-id': 1,

        // –– GENERAL BEST PRACTICES –––––––––––––––––––––––––––––––––––––
        'color-no-invalid-hex': true,
        'declaration-no-important': true,
        'declaration-block-no-duplicate-properties': true,
        'no-descending-specificity': null,
        'selector-pseudo-element-no-unknown': true,
        'media-feature-name-no-unknown': true,

        // –– MOBILE-FIRST –––––––––––––––––––––––––––––––––––––––––––––––
        // Base styles target the smallest viewport; breakpoints only ever layer
        // UP with min-width. A max-width query means someone started from the
        // desktop layout and shrank it, which is the pattern this forbids.
        // Ereuna is currently the other way round: 58 of its 63 media queries
        // are max-width, i.e. written desktop-first and shrunk. This rule is
        // scoped to src/styles for now and widens as each domain is migrated,
        // so the count is a burn-down rather than a wall of noise.
        // (This constrains the media FEATURE only; `max-width` as a property is
        // untouched and still governed by the unit allow-list above.)
        'media-feature-name-disallowed-list': ['max-width'],
        'at-rule-no-unknown': null,

        // –– IGNORE SCOPED STYLES SPECIFICITY FOR VUE –––––––––––––––––––––––––––––––––––––––––––
        'selector-pseudo-class-no-unknown': [
            true,
            {
                ignorePseudoClasses: ['deep', 'global', 'v-deep', 'v-global'],
            },
        ],
    },
    overrides: [
        {
            files: ['**/*.vue'],
            customSyntax: 'postcss-html',
        },
    ],
};
