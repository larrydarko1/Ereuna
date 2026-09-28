#!/usr/bin/env node
/**
 * Env & config drift gate. Env is the one input nothing type-checks and no diff
 * shows: a key in the schema but in no `.env.example` is a key the next deploy
 * is handed without, and a secret with a `.default()` boots on its placeholder
 * instead of crashing. The rules live in
 * @larrydarko/lint-config/gates/env-drift.
 *
 * What stays here is this repo's answers.
 *
 * `services` is the whole shape of the gate. Every rule is derived from it —
 * which schema to read, which example documents it, which entry file dotenv
 * must come first in, which local env to advise on, what .gitignore must and
 * must not ignore — so adding a service is one entry and cannot half-apply.
 *
 * `canonicalGroups` is not a style rule. The exported `config` tree is a
 * cross-standard interface: the database layer reads `config.mongo`, the API
 * reads `config.corsOrigin` and `config.jwt`, the market-data clients read
 * `config.tiingo`. Renaming a group here breaks every consumer at once, and none
 * of them at compile time, because they each reach it through their own import.
 *
 * `exampleFiles` lists the examples this repo commits. The gate sweeps them for
 * values that look real rather than placeholder — a committed secret is in the
 * history permanently, so the rule has to catch it before the commit, not after.
 *
 * `businessDirs` — `process.env` is read nowhere but each service's config module
 * and entry file. Env has one validated boundary and it is the Zod schema; a key
 * read around it is coerced by hand, typed `string | undefined`, and invisible to
 * the drift check above. Tests are exempt — setting env is how you test a config
 * module.
 */
import { checkEnvDrift } from '@larrydarko/lint-config/gates/env-drift';

checkEnvDrift({
    services: [
        { name: 'api', config: 'api/src/lib/config.ts', example: 'api/.env.example', entry: 'api/src/index.ts', local: 'api/.env' },
        { name: 'worker', config: 'worker/src/lib/config.ts', example: 'worker/.env.example', entry: 'worker/src/index.ts', local: 'worker/.env' },
        { name: 'ingestor', config: 'ingestor/src/lib/config.ts', example: 'ingestor/.env.example', entry: 'ingestor/src/index.ts', local: 'ingestor/.env' },
    ],
    sharedEnv: 'packages/shared/src/config/env.ts',
    canonicalGroups: {
        'api/src/lib/config.ts': ['jwt', 'mongo', 'redis', 'corsOrigin', 'logos'],
        'worker/src/lib/config.ts': ['mongo', 'redis', 'tiingo'],
        'ingestor/src/lib/config.ts': ['mongo', 'redis', 'tiingo'],
    },
    exampleFiles: ['api/.env.example', 'worker/.env.example', 'ingestor/.env.example', 'db/.env.example'],
    businessDirs: ['api/src', 'worker/src', 'ingestor/src'],
});
