#!/usr/bin/env node
/**
 * Duplication (DRY) gate. The rules — the per-format ceilings, the ban on a block
 * copied between two workspaces, and the ban on one exported type name declared in
 * two of them — live in @larrydarko/lint-config/gates/duplication.
 *
 * The failure this is for is the one refactoring keeps producing here: a service is
 * split into per-concern files, the same guard or the same mapping is pasted into
 * each of them, and every subsequent fix lands in one copy. It is invisible in a diff
 * because no single diff contains both halves.
 *
 * What stays here is what this repo decided:
 *   - All five source trees in ONE jscpd run, the charting fork included, because the
 *     clones that matter most here cross a workspace boundary — a DTO restated in
 *     `frontend/src/api/` against the service that produces it, or a connection
 *     bootstrap pasted into each service instead of living in
 *     `packages/shared/src/service/`. A per-workspace run cannot see either.
 *   - `typescript: 5` and nothing else. The SCSS and template figures are mostly the
 *     same handful of declarations and markup inside different SFCs. `@extend` cannot
 *     cross the SFC boundary, so de-duplicating those means promoting each one to a
 *     real global class in `styles/components/` — a design call about what deserves
 *     to be shared, not something a percentage should force. Both are still printed
 *     by this gate run with `--all`.
 *   - No `maxCloneTokens` yet.
 */
import { checkDuplication } from '@larrydarko/lint-config/gates/duplication';

checkDuplication({
    scan: ['frontend/src', 'api/src', 'worker/src', 'ingestor/src', 'packages/shared/src'],
    ceilings: { typescript: 5 },
    /**
     * Cross-workspace clones that are composition roots, not logic. Each file binds a
     * factory from `@ereuna/shared/service/connections` to `@/lib/config.js` and
     * `@/lib/logger.js`, which resolve to a different file in every workspace, so the
     * lines cannot move into shared without shared importing its consumers. A fix to
     * the connection itself lands once, in shared. Remove, never add without a reason.
     */
    crossCloneAllowed: [
        {
            files: ['ingestor/src/lib/db.ts', 'worker/src/lib/db.ts'],
            why: "mongoConnection() bound to each workspace's own config and logger",
        },
        {
            files: ['api/src/lib/redis.ts', 'ingestor/src/lib/redis.ts'],
            why: 'redisConnection() with opposite retry policies — the API fails open, the ingestor does not; only the imports match',
        },
    ],
});
