#!/usr/bin/env node
/**
 * REST API architecture gate. The rules — route documentation parity, middleware
 * order, a rate-limit tier on every mount, the token-bucket contract, thin routes,
 * path shape, the CORS/cookie pair and the pagination cap — live in
 * @larrydarko/lint-config/gates/api-standards.
 *
 * What stays here is this repo's answers. The first run of this gate found 13 routes
 * live in production and absent from their router header, plus one documenting
 * Express 4 syntax the code had stopped using; the header is only worth reading
 * because this keeps it true.
 *
 * `tiers` names a fourth tier on top of the standard's three. `assetLimiter` is for
 * /api/logos: one screener page paints fifty logos at once and a table scroll paints
 * hundreds, so its ceiling is there to bound a scraper, not to pace a browser (see
 * the header of rate-limiters.ts).
 *
 * `optionalAuth` — `app.use(optionalAuth)` sits above every `/api/*` mount so the
 * limiters key by user when a token is present. Registered below them, `req.userId`
 * would never be set when a limiter reads it, every signed-in client would be
 * limited as its IP, and everybody behind one NAT would share a bucket. Nothing
 * would break; the limits would just be wrong for the case nobody tests.
 *
 * `packageJson` points at the API's manifest so a fixed-window limiter library is
 * caught in the dependency list, not only at an import.
 *
 * `responses` — every route answers through `send()` in api/src/lib/send.ts,
 * which parses the data with a schema from packages/shared/src/responses/ and so
 * drops every field the schema does not list, and turns one that does not fit
 * into a 500. `devFlag` makes a dropped field loud: outside production `send()`
 * fails on one, so a test meets the mapper that handed it over; in production
 * the user keeps a working page and the error log names the field. Turning it on
 * found nine routes handing `send()` more than their schema lists — five auth
 * answers carrying the refresh token and its lifetime, three screener filter
 * writes and the base value carrying the stored document — each stripped
 * silently until then.
 *
 * `schemas` is the shared package's `requests/fields.ts`, because no request
 * schema lives in the API any more: the API validates with the ones in
 * `@ereuna/shared` and the frontend builds its request types from the same ones.
 *
 * `requestId` is stated because its position decides whether a bad body is a 400
 * or a crash: registered after the JSON parser, a body that will not parse
 * reaches the error handler with no `req.log`, the handler throws, and Express
 * answers a bare 500. It sat after the parser here until this gate said so.
 *
 * `contract` — packages/shared/src/contract.ts lists every route with the schemas
 * its router validates and answers with. The gate owns what a test cannot see:
 * that the table's keys are exactly the routes the routers serve, that no router
 * writes a request schema of its own, that each route hands the validator and
 * `send()` exactly the schemas its entry names (`handlers`), that no frontend
 * module calls the axios instance around `call()`, where a response type would
 * be written by hand again, and that the validator refuses a key no schema
 * declares (`droppedKeys`) instead of stripping it into a 2xx. `testChecks` are
 * the two places every exchange is held to the table: the frontend's MSW server
 * and the API's `serve()` harness. Delete their calls and every test still
 * passes, against mocks nothing holds to the API any more. Holding the suites to
 * it found fixtures with ids the API refuses, mocks sending a slash in a symbol
 * and a three-letter password, and a mock inventing `LEVERAGE_TOO_LOW`.
 *
 * `contract.coverage` is the other half: a check only sees the routes a test
 * calls. Both setups record each route they checked, and each suite's global
 * setup fails a full coverage run on the routes nobody did. The frontend's
 * exemption is the logo route, which an `<img>` loads and `call()` never does.
 *
 * `contract.fuzz` holds the API fuzz run (`npm run test:fuzz`) to the same
 * table: the OpenAPI document Schemathesis reads is built from API_ROUTES on
 * every run, the runner hands it e2e/fuzz/schemathesis.toml by path, every
 * exception there says why and none forgives a 5xx, the version is pinned, and
 * what a run writes is git-ignored. `isolate` is the Redis pair: the run starts
 * its own, and the API would otherwise fill both from api/.env and write its
 * buckets and cache into the dev Redis. There is no object storage to isolate.
 *
 * There is no `jobs`: nothing here is a BullMQ queue. The worker reads a Redis
 * stream and runs a nightly line, and the names it shares with the API are in
 * packages/shared/src/market/realtime.ts.
 *
 * Rules this gate does not own, deliberately: helmet's directives and HSTS belong
 * to check-security-drift.ts, the error shape to check-error-handling.ts, the socket
 * handshake to check-ws-standards.ts, and declaration order to
 * check-declaration-order.ts. A rule with two owners drifts.
 */
import { checkApiStandards } from '@larrydarko/lint-config/gates/api-standards';

checkApiStandards({
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
});
