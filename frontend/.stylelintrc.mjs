import { stylelint } from '@larrydarko/lint-config/stylelint';

export default stylelint({
    // The type and radius scales are tokenised here, not colour alone, so a literal
    // `font-size: 0.875rem` is as much a hard-coded value as a literal hex is.
    tokenProperties: ['/color$/', 'fill', 'stroke', 'font-size', 'font-weight', 'font-family', 'border-radius'],
    // `0` is a reset (`border-radius: 0` to square off a corner), not a design value
    // still waiting to be named.
    ignoreZero: true,
    // Every `$color-*` alias resolves to `var(--color-*)`, whose value only exists at
    // runtime, so a colour Sass computes at build time is right under one theme at most.
    // `color-mix()` is the theme-aware equivalent.
    noScssColorFunctions: true,
    // variables.scss is auto-injected per-SFC by Vite, so a stray `@import` would
    // silently duplicate the whole token layer into the bundle.
    noScssImport: true,
    // Every breakpoint layers up with `min-width`; a `max-width` query means someone
    // started from the desktop layout and shrank it.
    mobileFirst: true,
    // block, block__element, block--modifier — the `--modifier` half carries the meaning.
    bem: true,
    // The `--color-*` properties are never written literally: emit-theme() generates
    // them by looping over the theme maps, and no static analyser can follow that. Left
    // on, the rule flags the aliases in _variables.scss as unknown — exactly backwards,
    // since those aliases are the one place the tokens are declared.
    unknownCustomProperties: false,
    // `min-height: 100vh` then `100dvh`, so a browser that does not know the second
    // keeps the first. A same-value duplicate is still an error.
    duplicateFallbacks: true,
});
