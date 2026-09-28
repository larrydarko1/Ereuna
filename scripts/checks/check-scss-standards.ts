#!/usr/bin/env node
/**
 * SCSS architecture gate. The rules — the barrel forwarded and imported once, the
 * token layer injected by Vite, theme parity, no Sass colour maths on a runtime
 * token, no `@extend` inside an SFC, and self-hosted fonts — live in
 * @larrydarko/lint-config/gates/scss-standards.
 *
 * What stays here is this repo's answers.
 *
 * `injectionGuard` — Vite prepends `_variables.scss` to every stylesheet but
 * index.scss. The barrel `@use`s the partials that EMIT CSS, and every SFC <style>
 * block is its own Sass compilation, so injecting the barrel would re-emit the whole
 * global stylesheet once per component.
 *
 * `themes` — six palettes, each a `$name` map of the same token keys, registered in
 * `$themes` beside the colour scheme its background implies. A key missing from one
 * map is a `var(--color-x)` with no value in that theme — an invisible element, only
 * for whoever picked it. A map defined but never registered is the mirror case: a
 * theme nobody can select. `emit-theme` lives in _variables.scss with the other
 * mixins; the maps are turned into CSS in _themes.scss.
 *
 * No `fontFaceFile`: the app uses a system font stack, so the font rules reduce to
 * "no CDN and no `@fontsource` package".
 */
import { checkScssStandards } from '@larrydarko/lint-config/gates/scss-standards';

checkScssStandards({
    styles: 'frontend/src/styles',
    src: 'frontend/src',
    mainScript: 'frontend/src/main.ts',
    viteConfigs: ['frontend/vite.config.ts'],
    injectedSpecifier: '@/styles/variables',
    injectionGuard: 'index.scss',
    emitters: [
        {
            module: 'themes',
            why: '_themes.scss is what turns the maps into custom properties. Un-@used, every `var(--color-*)` in the app resolves to nothing.',
        },
        {
            module: 'base',
            why: '_base.scss carries the reset, element defaults and the keyframes. Un-@used, none of it reaches the bundle.',
        },
        {
            module: 'components',
            why: 'components/ holds the classes shared across unrelated SFCs. Un-@used, every template naming one of them renders unstyled.',
        },
        {
            module: 'layout',
            why: '_layout.scss carries the page shells and grid helpers. Un-@used, every page loses its frame.',
        },
    ],
    themes: {
        source: 'scss-maps',
        file: 'frontend/src/styles/_themes.scss',
        reference: 'default',
        registryName: 'themes',
        mixinFile: 'frontend/src/styles/_variables.scss',
    },
    html: ['frontend/index.html'],
    packageJson: 'frontend/package.json',
});
