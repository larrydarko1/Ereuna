#!/usr/bin/env node
/**
 * tsconfig drift gate. Every rule exists because a config can be wrong in a way
 * that makes MORE code compile, not less — so the build stays green and the
 * mistake is invisible until something ships. The rules live in
 * @larrydarko/lint-config/gates/tsconfigs.
 *
 * What stays here is this repo's answers.
 *
 * `nodeTyped` — the three services. Each takes `["node"]` and nothing else: no DOM
 * lib, no test globals in the shipped program.
 *
 * `nonEmitting` — packages/shared. Every consumer reads it as TypeScript source,
 * which is why an `outDir` here would create a dist/ that is stale from the moment
 * it is written.
 *
 * `browserProjects` — the frontend's app config. No `node` in `types` without a
 * reason written next to it, ES and DOM libs only.
 *
 * `browserSources` — what the frontend code DOES rather than what its config
 * declares. A type import from a package whose typings reference `node` puts Node
 * globals in scope whatever the config asks for, and then `process.env` in a
 * component compiles clean. Tests are exempt: they run under Vitest in Node.
 */
import { checkTsconfigs } from '@larrydarko/lint-config/gates/tsconfigs';

checkTsconfigs({
    nodeTyped: ['api/tsconfig.json', 'worker/tsconfig.json', 'ingestor/tsconfig.json'],
    nonEmitting: ['packages/shared/tsconfig.json'],
    browserProjects: ['frontend/tsconfig.app.json'],
    browserSources: ['frontend/src'],
});
