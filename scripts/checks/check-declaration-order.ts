#!/usr/bin/env node
/**
 * Declaration order. The canonical order of a module's top-level statements, the
 * topological sort that computes the one legitimate exception to it, the separate
 * table a test file is read against, and the import-sorting pass behind `--fix`
 * all live in @larrydarko/lint-config/gates/declaration-order.
 *
 * What stays here is the scope, which is the only thing this project knows:
 *   - The five workspace source roots below, the ingestor included.
 *   - db/migrations and e2e/ are out deliberately. A migration is a sequence whose
 *     order IS its meaning, and reordering one that has already been applied is
 *     what check-db-drift.ts exists to catch.
 *   - `@ereuna/*` is this monorepo's own scope, so imports get four groups rather
 *     than three: builtin → external → workspace → local. The `#…` subpath imports
 *     packages/shared declares in its package.json are local, which the shared
 *     gate already knows.
 *
 * Run `node scripts/checks/check-declaration-order.ts --fix` to rewrite the import
 * block in place. That is the only pass with a fixer, because it is the only one
 * whose fix cannot change what a module does.
 */
import { checkDeclarationOrder } from '@larrydarko/lint-config/gates/declaration-order';

checkDeclarationOrder({
    sourceRoots: ['api/src', 'worker/src', 'ingestor/src', 'frontend/src', 'packages/shared/src'],
    importOrder: { workspaceScope: '@ereuna/' },
});
