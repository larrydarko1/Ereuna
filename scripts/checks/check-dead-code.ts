#!/usr/bin/env node
/**
 * Dead-code gate — the reachability half of "unused", which ESLint cannot see: it
 * reasons inside one file, and this asks knip whether anything in the repository
 * reaches a module at all. Two passes, twelve categories and the reasoning behind
 * each live in @larrydarko/lint-config/gates/dead-code.
 *
 * Nothing about this gate is repo-specific except the closing hint and the examples
 * in the footer, which is why the options object is three lines. Budgets are all
 * zero and stay there.
 *
 * What this repo learned from it, so the findings are not re-derived: the first run
 * reported every one of the 143 frontend files unreachable, because `index.html`
 * pointed at `/src/main.js` and the entry point is `main.ts` — nothing else in the
 * repo noticed. Most of the `exports` findings were the shape left by the rewrite: a
 * service split into `-tokens`, `-crud`, `-rebuild` files where every helper was
 * exported on the way out and only some were ever imported back. And `prom-client`
 * sat in api, worker and ingestor while the only file importing it is
 * packages/shared/src/service/probes.ts — three declarations that only ever
 * resolved through npm's hoisting.
 *
 * The charting fork under frontend/src/lib/ is NOT excluded. It is this app's own
 * code, so an export nothing imports is dead here exactly as it is anywhere else —
 * and a fork is precisely where unreachable code accumulates, because upstream's
 * public API is this codebase's internals.
 */
import { checkDeadCode } from '@larrydarko/lint-config/gates/dead-code';

checkDeadCode({
    /**
     * The one budget above zero, and a backlog rather than a licence. The charting
     * fork's Crosshair model constructs its four views, and each view imports the
     * `CrosshairMode` enum back from the model — upstream's layout, brought in whole.
     * Moving the enum and the types the views read into their own module breaks all
     * four; until then the count may only go down.
     */
    budgets: { cycles: 4 },
    checksDir: 'scripts/checks',
    notMachineChecked:
        'code reachable from an entry point but never reached at RUNTIME — a route nothing links to, a branch no config enables, a Redis channel with no publisher.',
});
