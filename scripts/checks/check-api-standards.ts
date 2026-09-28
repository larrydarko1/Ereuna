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
    schemas: 'api/src/lib/schemas.ts',
    apiClient: 'frontend/src/api/client.ts',
    packageJson: 'api/package.json',
    tiers: ['strictLimiter', 'standardLimiter', 'relaxedLimiter', 'assetLimiter'],
    optionalAuth: 'optionalAuth',
});
