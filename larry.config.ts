// The gates `larry check` runs, and each one's options. The editor lists every option a gate takes.
import { defineConfig } from '@larrydarko/lint-config/config';

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
    'frontend/src/components/charts/PriceChart.vue': 690,
    'packages/shared/src/screener/filters.ts': 464,
    'frontend/src/lib/charting/engine/gui/chart-widget.ts': 764,
    'frontend/src/lib/charting/engine/gui/mouse-event-handler.ts': 709,
    'frontend/src/lib/charting/engine/gui/pane-widget.ts': 695,
    'frontend/src/lib/charting/engine/gui/price-axis-widget.ts': 645,
    'frontend/src/lib/charting/engine/gui/time-axis-widget.ts': 487,
    'frontend/src/lib/charting/engine/model/chart/chart-model.ts': 642,
    'frontend/src/lib/charting/engine/model/price/price-scale.ts': 904,
    'frontend/src/lib/charting/engine/model/series/series.ts': 670,
    'frontend/src/lib/charting/engine/model/series/series-options.ts': 466,
    'frontend/src/lib/charting/engine/model/series/series-style-options.ts': 466,
    'frontend/src/lib/charting/engine/model/time/time-scale.ts': 861,
};

export default defineConfig({
    family: 'fullstack',
    gates: {
        'audit': {
            allowlist: [
                // Each entry: { id, package, reason, expires }. The reason must say BOTH
                // why it cannot be fixed here and why it is unreachable in this code.
            ],
        },
        // This repo's answers:
        //   - kebab-case across every backend source root, the shared package included, and
        //     under services/, lib/ and routes/ anywhere else. Composables (`useThing.ts`)
        //     and SFCs (`PascalCase.vue`) are the two named exceptions and live outside
        //     those directories, so the rule can be flat.
        //   - lib/ and middleware/ owe a JSDoc block, services/ at least a one-line `//`,
        //     frontend api/ modules a line naming the domain they wrap — and Vue SFCs none
        //     at all, because `defineProps` is the contract.
        //   - `@/` resolves in every workspace but packages/shared, which declares no alias,
        //     so relative is right there.
        //
        // The charting fork under frontend/src/lib is NOT excluded. It is how THIS codebase
        // is written, whatever it was forked from, and the files it could not get under the
        // cap are in the baseline below with their reasons rather than behind a skip nobody
        // reads.
        'code-style': {
            scan: ['api/src', 'worker/src', 'ingestor/src', 'frontend/src', 'packages/shared/src'],
            baseline: LENGTH_BASELINE,
            casing: [
                {
                    files: /^(api|worker|ingestor|packages\/shared)\/src\/.*\.ts$/,
                    style: 'kebab',
                    exempt: FRAMEWORK_NAMED,
                },
                { files: /\/(services|lib|routes)\/.*\.ts$/, style: 'kebab', exempt: FRAMEWORK_NAMED },
            ],
            headers: [
                { files: /\/(lib|middleware)\/.*\.ts$/, require: 'jsdoc' },
                { files: /\/services\/.*\.ts$/, require: 'comment' },
                { files: /^frontend\/src\/api\/.*\.ts$/, require: 'comment' },
                { files: /\.vue$/, require: 'none' },
            ],
            aliasedRoots: ['api/src', 'worker/src', 'ingestor/src', 'frontend/src'],
        },
        'contrast': { skip: 'No script ran it before larry upgrade.' },
        // There are no budgets: every category is at zero and stays there.
        //
        // What this repo learned from it, so the findings are not re-derived: the first run
        // reported every one of the 143 frontend files unreachable, because `index.html`
        // pointed at `/src/main.js` and the entry point is `main.ts` — nothing else in the
        // repo noticed. Most of the `exports` findings were the shape left by the rewrite: a
        // service split into `-tokens`, `-crud`, `-rebuild` files where every helper was
        // exported on the way out and only some were ever imported back. And `prom-client`
        // sat in api, worker and ingestor while the only file importing it is
        // packages/shared/src/service/probes.ts — three declarations that only ever
        // resolved through npm's hoisting.
        //
        // The charting fork under frontend/src/lib/ is NOT excluded. It is this app's own
        // code, so an export nothing imports is dead here exactly as it is anywhere else —
        // and a fork is precisely where unreachable code accumulates, because upstream's
        // public API is this codebase's internals.
        'dead-code': {
            notMachineChecked:
                'code reachable from an entry point but never reached at RUNTIME — a route nothing links to, a branch no config enables, a Redis channel with no publisher.',
        },
        // The scope, which is the only thing this project knows:
        //   - The five workspace source roots below, the ingestor included.
        //   - db/migrations and e2e/ are out deliberately. A migration is a sequence whose
        //     order IS its meaning, and reordering one that has already been applied is
        //     what the db-drift gate exists to catch.
        //   - `@ereuna/*` is this monorepo's own scope, so imports get four groups rather
        //     than three: builtin → external → workspace → local. The `#…` subpath imports
        //     packages/shared declares in its package.json are local, which the shared
        //     gate already knows.
        //
        // Run `npx larry check declaration-order --fix` to rewrite the import
        // block in place. That is the only pass with a fixer, because it is the only one
        // whose fix cannot change what a module does.
        'declaration-order': {
            sourceRoots: ['api/src', 'worker/src', 'ingestor/src', 'frontend/src', 'packages/shared/src'],
            importOrder: { workspaceScope: '@ereuna/' },
        },
        // The failure this is for is the one refactoring keeps producing here: a service is
        // split into per-concern files, the same guard or the same mapping is pasted into
        // each of them, and every subsequent fix lands in one copy. It is invisible in a diff
        // because no single diff contains both halves.
        //
        // What this repo decided:
        //   - All five source trees in ONE jscpd run, the charting fork included, because the
        //     clones that matter most here cross a workspace boundary — a DTO restated in
        //     `frontend/src/api/` against the service that produces it, or a connection
        //     bootstrap pasted into each service instead of living in
        //     `packages/shared/src/service/`. A per-workspace run cannot see either.
        //   - `typescript: 5` and nothing else. The SCSS and template figures are mostly the
        //     same handful of declarations and markup inside different SFCs. `@extend` cannot
        //     cross the SFC boundary, so de-duplicating those means promoting each one to a
        //     real global class in `styles/components/` — a design call about what deserves
        //     to be shared, not something a percentage should force. Both are still printed
        //     by this gate run with `--all`.
        //   - No `maxCloneTokens` yet.
        'duplication': {
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
        },
        // `require` — the full web list from the standard's "required metatags" section.
        // This document is crawled, shared as a link and opened on a phone, so it owes all
        // of them.
        //
        // `baseScss` — the transition and animation declarations in this app are spread
        // across components, and the single `@media (prefers-reduced-motion: reduce)` block
        // in `_base.scss` is what makes every one of them honour the OS setting at once
        // (WCAG 2.3.3). Deleting it is invisible in review and silent at runtime.
        //
        // `csp` is off. The policy here is a header helmet sends, not a meta tag, and the
        // header is the security gate's business. Requiring a tag would fail a correct
        // document.
        //
        // `placeholderOrigin` warns, never fails — the canonical and og: URLs still point at
        // the pre-launch domain, and the warning carries the launch checklist.
        'html-standards': {
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
        },
        'i18n': {
            localeDir: 'frontend/src/i18n/locales',
            configFile: 'frontend/src/i18n/index.ts',
        },
        'licenses': { skip: 'No script ran it before larry upgrade.' },
        // `rootRequired` vs `workspaceRequired` — the standard's "Required package.json
        // Metadata" table, split by role. The root manifest is the project's identity and
        // carries the full set. Workspace manifests are private and never published, and
        // they inherit the toolchain facts — `engines`, `packageManager` — from the root,
        // so re-stating those per workspace is duplication that can silently drift.
        //
        // `tildeAllowed` — TypeScript only. Its minor releases introduce new type errors,
        // which makes a minor bump a code change rather than a dependency bump. Every
        // other package takes `^`: an exact pin opts out of security patches while adding
        // nothing, because package-lock.json is what actually pins the installed tree.
        //
        // The Electron rules in the shared gate — entry point, `build.files`, `os` parity
        // — need no switch here. They fire on a `build` block and an electron-vite config,
        // and this repo has neither, so they stay silent on their own.
        'package-json': {
            rootRequired: [
                'name',
                'version',
                'description',
                'homepage',
                'license',
                'author',
                'repository',
                'engines',
                'private',
                'packageManager',
                'type',
            ],
            workspaceRequired: ['name', 'version', 'description', 'license', 'private', 'type'],
            tildeAllowed: {
                typescript:
                    'Its minor releases introduce new type errors, so a minor bump is a code change, not a dependency bump.',
            },
        },
        'pipeline': { skip: 'No script ran it before larry upgrade.' },
        // `requireCheckboxes` is deliberately off. This repo's todo.md is prose grouped by
        // section, not a task list, and imposing `- [ ]` on it would be a formatting rule
        // pretending to be a process rule.
        'refactoring': {},
        // `injectionGuard` — Vite prepends `_variables.scss` to every stylesheet but
        // index.scss. The entry `@use`s the partials that EMIT CSS, and every SFC <style>
        // block is its own Sass compilation, so injecting the entry would re-emit the whole
        // global stylesheet once per component.
        //
        // `themes` — six palettes, each a `$name` map of the same token keys, registered in
        // `$themes` beside the colour scheme its background implies. A key missing from one
        // map is a `var(--color-x)` with no value in that theme — an invisible element, only
        // for whoever picked it. A map defined but never registered is the mirror case: a
        // theme nobody can select. `emit-theme` lives in _variables.scss with the other
        // mixins; the maps are turned into CSS in _themes.scss.
        //
        // No `fontFaceFile`: the app uses a system font stack, so the font rules reduce to
        // "no CDN and no `@fontsource` package".
        'scss-standards': {
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
        },
        'secrets': { skip: 'No script ran it before larry upgrade.' },
        // `layout: colocated` — the standard offers two patterns and says to pick one and
        // stay consistent. This repo picked co-located `__tests__/`, and consistency is the
        // whole value: a suite in the other pattern is not wrong so much as unfindable.
        //
        // `e2e` — Playwright specs live in `e2e/` with their own config, away from the unit
        // suites. They boot the real API and frontend, and a `.spec.ts` that drifts into
        // `src/` is picked up by no runner at all: Vitest matches `*.test.ts`, Playwright
        // only looks under its own testDir, so the suite silently stops running while still
        // looking like a test.
        //
        // `thresholds` and `excludes` are the two numbers-only rules: thresholds may rise
        // and never fall, and the exclude list may not grow — a file at 0% is the signal to
        // write the missing test, not to add another exclude. Without them the cheapest way
        // to make a coverage failure go away is to edit the number that defines failure.
        //
        // `domEnvironment` names the frontend Vitest project, because this config has one
        // project per workspace and only the frontend one runs in a DOM.
        //
        // `vmBaseline: 0` — "test behaviour, not implementation". `wrapper.vm.someRef` is
        // the mechanical form of the violation, but it is a legitimate escape hatch often
        // enough that a ban would be wrong, so it is counted rather than forbidden. Zero
        // today; raise it deliberately, here, with the reason.
        //
        // `serverErrors` — a test that checks what it came to check walks past a 500 on
        // the side. The fixtures fail the test that received a 5xx, with what the API
        // logged for that request id; the global teardown fails the run on any error the
        // API logged at all, a field `send()` refused to put on the wire included. The
        // gate checks the wiring nobody would notice coming apart: the recorder created
        // with the log file, the teardown registered, the API booted with `LOG_FILE`, and
        // every spec taking `test` from the fixtures.
        //
        // `apiClient` names the two exports every frontend request goes through to the
        // mock server: `call()` and the axios `api` instance under it. The mock server
        // checks each exchange against the API contract, so a suite replacing either
        // checks nothing. `main.test.ts` mocks the module for `initAuth` alone, which
        // the rule allows.
        'testing': {
            config: 'vitest.config.mts',
            layout: { kind: 'colocated' },
            e2e: { dir: 'e2e', config: 'e2e/playwright.config.ts' },
            thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
            excludes: {
                '**/__tests__/**': 'the tests themselves',
                '**/*.test.ts': 'the tests themselves',
                '**/*.d.ts': 'declarations, no runtime',
            },
            domEnvironment: { name: 'jsdom', config: 'frontend/vitest.config.ts', project: 'frontend' },
            vmBaseline: 0,
            serverErrors: { fixtures: 'e2e/support/fixtures.ts', teardown: 'e2e/support/global-teardown.ts' },
            apiClient: { module: '@/api/client', exports: ['call', 'api'] },
        },
        // `nodeTyped` — the three services. Each takes `["node"]` and nothing else: no DOM
        // lib, no test globals in the shipped program.
        //
        // `nonEmitting` — packages/shared. Every consumer reads it as TypeScript source,
        // which is why an `outDir` here would create a dist/ that is stale from the moment
        // it is written.
        //
        // `browserProjects` — the frontend's app config. No `node` in `types` without a
        // reason written next to it, ES and DOM libs only.
        //
        // `browserSources` — what the frontend code DOES rather than what its config
        // declares. A type import from a package whose typings reference `node` puts Node
        // globals in scope whatever the config asks for, and then `process.env` in a
        // component compiles clean. Tests are exempt: they run under Vitest in Node.
        'tsconfigs': {
            nodeTyped: ['api/tsconfig.json', 'worker/tsconfig.json', 'ingestor/tsconfig.json'],
            nonEmitting: ['packages/shared/tsconfig.json'],
            browserProjects: ['frontend/tsconfig.app.json'],
            browserSources: ['frontend/src'],
        },
        // The first run of this gate found 13 routes
        // live in production and absent from their router header, plus one documenting
        // Express 4 syntax the code had stopped using; the header is only worth reading
        // because this keeps it true.
        //
        // `tiers` names a fourth tier on top of the standard's three. `assetLimiter` is for
        // /api/logos: one screener page paints fifty logos at once and a table scroll paints
        // hundreds, so its ceiling is there to bound a scraper, not to pace a browser (see
        // the header of rate-limiters.ts).
        //
        // `optionalAuth` — `app.use(optionalAuth)` sits above every `/api/*` mount so the
        // limiters key by user when a token is present. Registered below them, `req.userId`
        // would never be set when a limiter reads it, every signed-in client would be
        // limited as its IP, and everybody behind one NAT would share a bucket. Nothing
        // would break; the limits would just be wrong for the case nobody tests.
        //
        // `packageJson` points at the API's manifest so a fixed-window limiter library is
        // caught in the dependency list, not only at an import.
        //
        // `responses` — every route answers through `send()` in api/src/lib/send.ts,
        // which parses the data with a schema from packages/shared/src/responses/ and so
        // drops every field the schema does not list, and turns one that does not fit
        // into a 500. `devFlag` makes a dropped field loud: outside production `send()`
        // fails on one, so a test meets the mapper that handed it over; in production
        // the user keeps a working page and the error log names the field. Turning it on
        // found nine routes handing `send()` more than their schema lists — five auth
        // answers carrying the refresh token and its lifetime, three screener filter
        // writes and the base value carrying the stored document — each stripped
        // silently until then.
        //
        // `schemas` is the shared package's `requests/fields.ts`, because no request
        // schema lives in the API any more: the API validates with the ones in
        // `@ereuna/shared` and the frontend builds its request types from the same ones.
        //
        // `requestId` is stated because its position decides whether a bad body is a 400
        // or a crash: registered after the JSON parser, a body that will not parse
        // reaches the error handler with no `req.log`, the handler throws, and Express
        // answers a bare 500. It sat after the parser here until this gate said so.
        //
        // `contract` — packages/shared/src/contract.ts lists every route with the schemas
        // its router validates and answers with. The gate owns what a test cannot see:
        // that the table's keys are exactly the routes the routers serve, that no router
        // writes a request schema of its own, that each route hands the validator and
        // `send()` exactly the schemas its entry names (`handlers`), that no frontend
        // module calls the axios instance around `call()`, where a response type would
        // be written by hand again, and that the validator refuses a key no schema
        // declares (`droppedKeys`) instead of stripping it into a 2xx. `testChecks` are
        // the two places every exchange is held to the table: the frontend's MSW server
        // and the API's `serve()` harness. Delete their calls and every test still
        // passes, against mocks nothing holds to the API any more. Holding the suites to
        // it found fixtures with ids the API refuses, mocks sending a slash in a symbol
        // and a three-letter password, and a mock inventing `LEVERAGE_TOO_LOW`.
        //
        // `contract.coverage` is the other half: a check only sees the routes a test
        // calls. Both setups record each route they checked, and each suite's global
        // setup fails a full coverage run on the routes nobody did. The frontend's
        // exemption is the logo route, which an `<img>` loads and `call()` never does.
        //
        // `contract.fuzz` holds the API fuzz run (`npm run test:fuzz`) to the same
        // table: the OpenAPI document Schemathesis reads is built from API_ROUTES on
        // every run, the runner hands it e2e/fuzz/schemathesis.toml by path, every
        // exception there says why and none forgives a 5xx, the version is pinned, and
        // what a run writes is git-ignored. `isolate` is the Redis pair: the run starts
        // its own, and the API would otherwise fill both from api/.env and write its
        // buckets and cache into the dev Redis. There is no object storage to isolate.
        //
        // There is no `jobs`: nothing here is a BullMQ queue. The worker reads a Redis
        // stream and runs a nightly line, and the names it shares with the API are in
        // packages/shared/src/market/realtime.ts.
        //
        // Rules this gate does not own, deliberately: helmet's directives and HSTS belong
        // to the security-drift gate, the error shape to the error-handling/fullstack gate, the socket
        // handshake to the ws-standards gate, and declaration order to
        // the declaration-order gate. A rule with two owners drifts.
        'api-standards': {
            routesDir: 'api/src/routes',
            indexFile: 'api/src/index.ts',
            rateLimiters: 'api/src/lib/rate-limiters.ts',
            tokenBucket: 'api/src/lib/token-bucket.ts',
            schemas: 'packages/shared/src/requests/fields.ts',
            apiClient: 'frontend/src/api/client.ts',
            packageJson: 'api/package.json',
            tiers: ['strictLimiter', 'standardLimiter', 'relaxedLimiter', 'assetLimiter'],
            optionalAuth: 'optionalAuth',
            responses: {
                helper: 'api/src/lib/send.ts',
                schemasDir: 'packages/shared/src/responses',
                devFlag: 'config.isDev',
            },
            requestId: 'requestId',
            contract: {
                file: 'packages/shared/src/contract.ts',
                sharedPackage: '@ereuna/shared',
                caller: { instance: 'api', dir: 'frontend/src' },
                validator: 'api/src/middleware/validate.ts',
                testChecks: ['frontend/src/__tests__/support/msw.ts', 'api/src/__tests__/support/http.ts'],
                coverage: {
                    module: '@ereuna/shared/contract-coverage',
                    suites: [
                        { config: 'api/vitest.config.ts', setup: 'api/src/__tests__/contract-coverage.ts' },
                        { config: 'frontend/vitest.config.ts', setup: 'frontend/src/__tests__/contract-coverage.ts' },
                    ],
                },
                fuzz: {
                    document: { file: 'packages/shared/src/openapi.ts', name: 'openApiDocument' },
                    runner: 'e2e/fuzz/run.ts',
                    config: 'e2e/fuzz/schemathesis.toml',
                    requirements: 'e2e/fuzz/requirements.txt',
                    outputs: ['e2e/fuzz/.venv', 'e2e/fuzz/report', 'e2e/fuzz/.hypothesis'],
                    isolate: ['REDIS_HOST', 'REDIS_PORT'],
                },
                handlers: { validate: 'validated', send: 'send' },
            },
        },
        // The registry keeps three index lists rather than one: `INDEXES` for the
        // collections the API owns, and the OHLCV and reference-data lists the worker
        // applies at its own boot — the reference ones only in the role that organizes.
        //
        // `ops` covers the backup script and the env loader, and not the restore. The
        // package's restore rule demands a `flushdb()`, written for a Redis that holds
        // nothing but caches and queues. Here it also holds the trade stream and its
        // consumer group, and on a development machine other projects' keys, so the
        // restore clears the API's two cache prefixes instead. When the rule learns to
        // take a scoped clear, `restore` goes back in.
        //
        // NOT CONFIGURED, deliberately, so that their absence is a recorded decision rather
        // than an oversight:
        //   - `ops.wipe` and `productionRefusals`. The repo has no wipe or seed script.
        //   - `drainOrder`. The worker reads a Redis stream, not BullMQ queues, so there are
        //     no queue stages to drain in order; every service closes its Mongo client on
        //     SIGTERM, which `services` checks.
        'db-drift': {
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
            ops: {
                backup: { file: 'scripts/backup.ts' },
                envLoaderConsumers: ['scripts/backup.ts', 'scripts/restore.ts', 'db/migrate-mongo-config.js'],
                envLoader: 'lib/env',
            },
            backups: { drills: 'db/docs/restore-drills.md', latest: 'backups/latest.json', dir: 'backups/' },
        },
        'docker': { skip: 'No script ran it before larry upgrade.' },
        // `services` is the whole shape of the gate. Every rule is derived from it —
        // which schema to read, which example documents it, which entry file dotenv
        // must come first in, which local env to advise on, what .gitignore must and
        // must not ignore — so adding a service is one entry and cannot half-apply.
        //
        // `canonicalGroups` is not a style rule. The exported `config` tree is a
        // cross-standard interface: the database layer reads `config.mongo`, the API
        // reads `config.corsOrigin` and `config.jwt`, the market-data clients read
        // `config.tiingo`. Renaming a group here breaks every consumer at once, and none
        // of them at compile time, because they each reach it through their own import.
        //
        // `exampleFiles` lists the examples this repo commits. The gate sweeps them for
        // values that look real rather than placeholder — a committed secret is in the
        // history permanently, so the rule has to catch it before the commit, not after.
        //
        // `businessDirs` — `process.env` is read nowhere but each service's config module
        // and entry file. Env has one validated boundary and it is the Zod schema; a key
        // read around it is coerced by hand, typed `string | undefined`, and invisible to
        // the drift check above. Tests are exempt — setting env is how you test a config
        // module.
        'env-drift': {
            services: [
                {
                    name: 'api',
                    config: 'api/src/lib/config.ts',
                    example: 'api/.env.example',
                    entry: 'api/src/index.ts',
                    local: 'api/.env',
                },
                {
                    name: 'worker',
                    config: 'worker/src/lib/config.ts',
                    example: 'worker/.env.example',
                    entry: 'worker/src/index.ts',
                    local: 'worker/.env',
                },
                {
                    name: 'ingestor',
                    config: 'ingestor/src/lib/config.ts',
                    example: 'ingestor/.env.example',
                    entry: 'ingestor/src/index.ts',
                    local: 'ingestor/.env',
                },
            ],
            sharedEnv: 'packages/shared/src/config/env.ts',
            canonicalGroups: {
                'api/src/lib/config.ts': ['jwt', 'mongo', 'redis', 'corsOrigin', 'logos'],
                'worker/src/lib/config.ts': ['mongo', 'redis', 'tiingo'],
                'ingestor/src/lib/config.ts': ['mongo', 'redis', 'tiingo'],
            },
            exampleFiles: ['api/.env.example', 'worker/.env.example', 'ingestor/.env.example', 'db/.env.example'],
            businessDirs: ['api/src', 'worker/src', 'ingestor/src'],
        },
        'error-handling/fullstack': {
            /**
             * There is no BullMQ here: the worker is an XREADGROUP consumer and a nightly
             * dependency line, and the ingestor is one socket. What they share with a queue
             * is that nothing catches for them — there is no middleware out there — so both
             * are scanned for swallows and barred from the HTTP error type.
             */
            serviceDirs: ['worker/src', 'ingestor/src'],
            /** AppError is an HTTP concept, and the shared package is imported by all four services. */
            appErrorBanDirs: ['packages/shared/src'],

            /**
             * Codes that legitimately answer 400 — a request that never parsed. Empty of
             * AppError throws: this API takes no multipart uploads and no free-form JSON
             * blobs, so every request that parses is Zod's to refuse with a 422. A body
             * that does not parse at all is the JSON parser's, and the error handler
             * answers it with the parser's own status as MALFORMED_REQUEST or
             * REQUEST_TOO_LARGE. Before that branch it fell through to a bare 500, which
             * blamed the server for the client's bytes.
             */
            parseLevel400: [],

            /** No Multer branch: this API takes no uploads, so a deliberate throw and a Zod parse are the two typed failures. A refused body is matched by shape, not by class, so it is not a branch the gate can name. */
            handlerBranches: ['AppError', 'ZodError'],

            /**
             * Security events whose names carry no signal, so no pattern can reach them.
             * Keep this short: a name that has to be listed here is usually a name that
             * could say what it means instead.
             */
            securityEventCodes: [
                'FORBIDDEN', // the logo route: a request from another origin
            ],

            /** The two sanctioned emitters of a code without going through AppError. */
            directCodeEmitters: ['api/src/middleware/validate.ts', 'api/src/lib/rate-limiters.ts'],
        },
        'metrics': { skip: 'No script ran it before larry upgrade.' },
        // `unauthenticatedMounts` and `fileRoutes` — /api/logos is the one mount without
        // requireAuth besides /api/auth. An `<img>` carries no token, so three controls
        // stand in for authentication there: both path segments allow-listed by a pattern
        // that cannot express a separator or a dot segment, `sendFile` confined to its root
        // with dotfiles denied, and the request origin checked. SVG responses are
        // sandboxed by CSP, because an SVG served from this origin is a document. The
        // patterns are `logoParams` in shared's `requests/params.ts` (`params`), because
        // the contract keeps every request schema out of the route files.
        //
        // NOT CONFIGURED, deliberately, so that their absence is a recorded decision rather
        // than an oversight:
        //   - nginx and Traefik. There is no deployment manifest in this repo; when one
        //     lands, these come back with it.
        //   - `escapeHtmlFile`. Nothing on this server renders HTML — no email, no template,
        //     no server-rendered page. The escaping that matters here is `escapeRegex`,
        //     which the regex rule covers.
        //   - `passwordReset`. There is no email address on an account: recovery is a
        //     single-use code, gated by the same refresh-token rules as everything else.
        //
        // Gated elsewhere, deliberately not duplicated (a rule with two owners drifts):
        // secrets with no dev default in the env-drift gate, the Socket.IO hop count and
        // upgrade origin in the ws-standards gate, rate limits and the pagination cap in
        // the api-standards gate, `securityEvent` in the error-handling/fullstack gate.
        'security-drift': {
            entry: 'api/src/index.ts',
            config: 'api/src/lib/config.ts',
            envModule: 'packages/shared/src/config/env.ts',
            backendDirs: ['api/src', 'worker/src', 'ingestor/src'],
            frontendDirs: ['frontend/src'],
            regexDirs: ['api/src', 'worker/src', 'ingestor/src', 'packages/shared/src'],
            auth: {
                cookieFile: 'api/src/routes/identity/auth.ts',
                tokensFile: 'api/src/services/auth/auth-tokens.ts',
                throttleFile: 'api/src/services/auth/login-throttle.ts',
                schemasFile: 'packages/shared/src/requests/fields.ts',
                sanitizer: { file: 'api/src/middleware/sanitizer.ts', fn: 'sanitizeRequest', strip: 'stripUnsafeKeys' },
            },
            unauthenticatedMounts: ['/api/auth', '/api/logos'],
            fileRoutes: [
                {
                    file: 'api/src/routes/asset/logos.ts',
                    why: 'Ticker logos are loaded by <img>, which carries no token.',
                    originCheck: /isSameOrigin\(req\)/,
                    // The contract keeps every request schema in shared, so the segment patterns live there
                    params: { file: 'packages/shared/src/requests/params.ts', schema: 'logoParams' },
                },
            ],
        },
        // `redisAdapter: forbidden` is the one rule inverted from the standard, so it is the
        // one most likely to be "fixed" by someone who knows the standard and not this
        // gateway. The adapter exists to route an emit raised on one pod to a socket held by
        // another; here every pod runs its own `psubscribe aggr:*` and so already holds every
        // bucket its own sockets need. The argument has to stay in the gateway header, where
        // the next person looks, and the gate fails if it goes.
        //
        // `rooms: helpers` — sockets join quote and candle rooms for what they are watching,
        // not a personal room, and the room names come from helpers so the join site and the
        // emit site cannot spell them differently.
        //
        // `authModule` points the auth rules at `verifyAccessToken` in the REST middleware,
        // because the handshake calls that rather than `jwt.verify`. It used to verify inline,
        // and an inline verify accepted the 2FA challenge token, which is signed with the
        // same secret: a password alone held a live market feed. The shared function refuses
        // any token carrying a `type`, so REST and the socket now agree on what a session is,
        // and the gate checks the secret and the pinned algorithm in that function's body.
        //
        // `sessionTeardown` — the client registers `disconnectSocket` with
        // `onSessionCleared`, so the connection dies with the session rather than outliving
        // the sign-out.
        //
        // `events` is the shared table of what the gateway pushes, each event with the
        // schema its payload is held to (packages/shared/src/events.ts). The gateway pushes
        // only through `checkedPayload()`, which parses with it, and the frontend's socket is
        // typed from it. The same file carries `CLIENT_EVENTS`, the two inbound watches,
        // which the gateway parses with and the client's emits are typed by; the gate reads
        // only the outbound table.
        'ws-standards': {
            gateway: 'api/src/gateway/socket.ts',
            gatewayDir: 'api/src/gateway',
            serverDirs: 'api/src',
            client: 'frontend/src/api/socket.ts',
            clientDirs: 'frontend/src',
            redisAdapter: {
                mode: 'forbidden',
                headerPhrase: 'no Redis adapter',
                why: 'Every pod already runs its own `psubscribe aggr:*`, so it holds every bucket its own sockets need; the adapter would republish each message across the cluster for every other pod to discard. If the fan-out model ever changes, change the header first.',
            },
            authModule: { file: 'api/src/middleware/auth.ts', fn: 'verifyAccessToken' },
            rooms: { join: 'helpers' },
            sessionTeardown: 'onSessionCleared',
            events: { file: 'packages/shared/src/events.ts', table: 'SERVER_EVENTS' },
        },
    },
});
