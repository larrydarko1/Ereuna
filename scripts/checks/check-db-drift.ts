#!/usr/bin/env node
/**
 * Database drift gate. Every rule is here because of a failure that is invisible in
 * a diff — the registry and the bootstrap migration disagreeing about which
 * collections exist, the registry importing something at runtime and breaking the
 * migrate-mongo CLI rather than the build, docs describing a schema the code
 * stopped having, a collection with no index and no recorded reason, a migration
 * merged without a test or edited after it ran, an index dropped from a service
 * instead of a migration. The rules live in @larrydarko/lint-config/gates/db-drift.
 *
 * What stays here is this repo's answers.
 *
 * The registry keeps three index lists rather than one: `INDEXES` for the
 * collections the API owns, and the OHLCV and reference-data lists the worker
 * applies at its own boot — the reference ones only in the role that organizes.
 *
 * NOT CONFIGURED, deliberately, so that their absence is a recorded decision rather
 * than an oversight:
 *   - `ops`. The repo has no wipe, backup or restore script.
 *   - `backups`. There is no backup pipeline and no host to restore onto; when one
 *     lands, the drill log and the manifest come back with it.
 *   - `drainOrder`. The worker reads a Redis stream, not BullMQ queues, so there are
 *     no queue stages to drain in order; every service closes its Mongo client on
 *     SIGTERM, which `services` checks.
 */
import { checkDbDrift } from '@larrydarko/lint-config/gates/db-drift';

await checkDbDrift({
    manifest: 'packages/shared/src/db/indexes.ts',
    manifestSpecifier: '@ereuna/shared/db/indexes',
    collectionsExport: 'ALL_COLLECTIONS',
    indexExports: ['INDEXES', 'OHLCV_INDEXES', 'REFERENCE_INDEXES'],
    typesFile: 'packages/shared/src/db/collections.ts',
    collectionTypes: {
        Users: 'UserDoc',
        RefreshTokens: 'RefreshTokenDoc',
        Screeners: 'ScreenerDoc',
        Watchlists: 'WatchlistDoc',
        Portfolios: 'PortfolioDoc',
        Positions: 'PositionDoc',
        Trades: 'TradeDoc',
        Notes: 'NoteDoc',
        ChartDrawings: 'ChartDrawingDoc',
        OHCLVData: 'OhlcvDoc',
        OHCLVData2: 'OhlcvDoc',
        OHCLVData1m: 'OhlcvDoc',
        OHCLVData5m: 'OhlcvDoc',
        OHCLVData15m: 'OhlcvDoc',
        OHCLVData30m: 'OhlcvDoc',
        OHCLVData1hr: 'OhlcvDoc',
        AssetInfo: 'AssetInfoDoc',
        News: 'NewsDoc',
        Calendar: 'CalendarEventDoc',
        Stats: 'StatsDoc',
    },
    noIndexByDesign: {
        Stats: 'Three singleton documents addressed by a string `_id`, which is indexed by MongoDB itself.',
    },
    bootstrap: 'db/migrations/20260904000000-bootstrap-ereuna-collections.js',
    architecture: 'db/docs/architecture.md',
    examplesDir: 'db/docs/examples',
    migrationsDir: 'db/migrations',
    testsDir: 'db/__tests__',
    checksums: 'db/migrations/.checksums.json',
    appDirs: ['api/src', 'worker/src', 'ingestor/src', 'packages/shared/src'],
    services: [
        { name: 'api', entry: 'api/src/index.ts' },
        { name: 'worker', entry: 'worker/src/index.ts' },
        { name: 'ingestor', entry: 'ingestor/src/index.ts' },
    ],
    indexAppliers: [
        { file: 'api/src/lib/db.ts', applies: ['INDEXES'] },
        { file: 'worker/src/index.ts', applies: ['OHLCV_INDEXES', 'REFERENCE_INDEXES'] },
    ],
    packageManifests: ['package.json', 'db/package.json'],
});
