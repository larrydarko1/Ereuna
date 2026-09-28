#!/usr/bin/env node
/**
 * Code style gate. The rules — filename casing, the ~400-line softcap as a ratchet,
 * public before private, headers by file type, the comment formats in `<template>`
 * and `<style>`, no JSDoc type tags, SFC block order, scoped styles, and no relative
 * import where an alias resolves — live in @larrydarko/lint-config/gates/code-style.
 *
 * What stays here is this repo's answers:
 *   - kebab-case across every backend source root, the shared package included, and
 *     under services/, lib/ and routes/ anywhere else. Composables (`useThing.ts`)
 *     and SFCs (`PascalCase.vue`) are the two named exceptions and live outside
 *     those directories, so the rule can be flat.
 *   - lib/ and middleware/ owe a JSDoc block, services/ at least a one-line `//`,
 *     frontend api/ modules a line naming the domain they wrap — and Vue SFCs none
 *     at all, because `defineProps` is the contract.
 *   - `@/` resolves in every workspace but packages/shared, which declares no alias,
 *     so relative is right there.
 *
 * The charting fork under frontend/src/lib is NOT excluded. It is how THIS codebase
 * is written, whatever it was forked from, and the files it could not get under the
 * cap are in the baseline below with their reasons rather than behind a skip nobody
 * reads.
 */
import { checkCodeStyle } from '@larrydarko/lint-config/gates/code-style';

/** Named by the tools that look for them, not by this convention. */
const FRAMEWORK_NAMED = /(^|\/)(index|App)(\.test)?\.ts$/;

/**
 * Files over the softcap when the ratchet was set, at the size they were, counted
 * as non-blank lines outside `<style>`. A file may shrink freely; growing past its
 * entry, or a new file crossing the cap, fails. Lower a number when you refactor,
 * never raise it.
 *
 * The charting fork's entries came in together when the fork stopped being skipped
 * by this gate, and they split into two kinds.
 *
 * Nine of them are one class each — the widget or the model object named by the
 * filename, and nothing else. They are long because the object is: a chart widget
 * owns its panes, its two axes, its canvases and its event wiring, and every method
 * reaches the same private fields. Cutting one in half means inventing a
 * collaborator to hold the other half and a protocol between them, which is more
 * code and a worse object than the one that is there. The tail of free functions
 * under each class was measured and moving it out leaves the class over the cap
 * anyway, so it stays next to its only caller.
 *
 * The other two are `series-options.ts` and `series-style-options.ts`, which are
 * type declarations carrying upstream's per-field documentation. Counted as code
 * they are 130 and 91 lines; the rest is the JSDoc that says what each option does
 * and what it defaults to, which is the only place that is written down. They were
 * one 918-line file and splitting them is what the cap bought.
 */
const LENGTH_BASELINE: Record<string, number> = {
    'frontend/src/components/charts/PriceChart.vue': 694,
    'packages/shared/src/screener/filters.ts': 464,
    'frontend/src/lib/charting/engine/gui/chart-widget.ts': 764,
    'frontend/src/lib/charting/engine/gui/mouse-event-handler.ts': 710,
    'frontend/src/lib/charting/engine/gui/pane-widget.ts': 703,
    'frontend/src/lib/charting/engine/gui/price-axis-widget.ts': 646,
    'frontend/src/lib/charting/engine/gui/time-axis-widget.ts': 495,
    'frontend/src/lib/charting/engine/model/chart/chart-model.ts': 923,
    'frontend/src/lib/charting/engine/model/price/price-scale.ts': 908,
    'frontend/src/lib/charting/engine/model/series/series.ts': 712,
    'frontend/src/lib/charting/engine/model/series/series-options.ts': 469,
    'frontend/src/lib/charting/engine/model/series/series-style-options.ts': 466,
    'frontend/src/lib/charting/engine/model/time/time-scale.ts': 861,
};

checkCodeStyle({
    scan: ['api/src', 'worker/src', 'ingestor/src', 'frontend/src', 'packages/shared/src'],
    baseline: LENGTH_BASELINE,
    casing: [
        { files: /^(api|worker|ingestor|packages\/shared)\/src\/.*\.ts$/, style: 'kebab', exempt: FRAMEWORK_NAMED },
        { files: /\/(services|lib|routes)\/.*\.ts$/, style: 'kebab', exempt: FRAMEWORK_NAMED },
    ],
    headers: [
        { files: /\/(lib|middleware)\/.*\.ts$/, require: 'jsdoc' },
        { files: /\/services\/.*\.ts$/, require: 'comment' },
        { files: /^frontend\/src\/api\/.*\.ts$/, require: 'comment' },
        { files: /\.vue$/, require: 'none' },
    ],
    aliasedRoots: ['api/src', 'worker/src', 'ingestor/src', 'frontend/src'],
});
