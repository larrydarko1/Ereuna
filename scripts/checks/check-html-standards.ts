#!/usr/bin/env node
/**
 * Document-level HTML standards gate. `frontend/index.html` is the one file ESLint's
 * Vue parser never reads, so no rule can assert the required meta tags exist or that
 * the entry script points at a file that is really there, and stylelint has the same
 * blind spot one level down: it can police how a rule is written but not that a rule
 * still EXISTS. The rules live in @larrydarko/lint-config/gates/html-standards.
 *
 * What stays here is this repo's answers.
 *
 * `require` — the full web list from the standard's "required metatags" section.
 * This document is crawled, shared as a link and opened on a phone, so it owes all
 * of them.
 *
 * `baseScss` — the transition and animation declarations in this app are spread
 * across components, and the single `@media (prefers-reduced-motion: reduce)` block
 * in `_base.scss` is what makes every one of them honour the OS setting at once
 * (WCAG 2.3.3). Deleting it is invisible in review and silent at runtime.
 *
 * `csp` is off. The policy here is a header helmet sends, not a meta tag, and the
 * header is the security gate's business. Requiring a tag would fail a correct
 * document.
 *
 * `placeholderOrigin` warns, never fails — the canonical and og: URLs still point at
 * the pre-launch domain, and the warning carries the launch checklist.
 */
import { checkHtmlStandards } from '@larrydarko/lint-config/gates/html-standards';

checkHtmlStandards({
    indexHtml: 'frontend/index.html',
    baseScss: 'frontend/src/styles/_base.scss',
    require: [
        'lang',
        'charset',
        'viewport',
        'title',
        'description',
        'ogTitle',
        'ogDescription',
        'ogImage',
        'canonical',
        'twitterCard',
        'themeColor',
        'icon',
    ],
    placeholderOrigin: 'example.com',
});
