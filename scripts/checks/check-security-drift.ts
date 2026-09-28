#!/usr/bin/env node
/**
 * Security-standards drift gate. Every rule is a control that can be removed in a
 * one-line diff that still passes every test: JWT algorithms and expiry, CORS,
 * helmet's headers, the refresh cookie, Argon2 parameters against the timing-safe
 * dummy hash, the password schema, raw-HTML sinks, the proxy hop count, the NoSQL
 * sanitizer, body and header timeouts, the dev-placeholder denylist, the login
 * throttle, refresh rotation, and regexes built from input. The rules live in
 * @larrydarko/lint-config/gates/security-drift.
 *
 * What stays here is this repo's answers.
 *
 * `unauthenticatedMounts` and `fileRoutes` — /api/logos is the one mount without
 * requireAuth besides /api/auth. An `<img>` carries no token, so three controls
 * stand in for authentication there: both path segments allow-listed by a pattern
 * that cannot express a separator or a dot segment, `sendFile` confined to its root
 * with dotfiles denied, and the request origin checked. SVG responses are
 * sandboxed by CSP, because an SVG served from this origin is a document.
 *
 * NOT CONFIGURED, deliberately, so that their absence is a recorded decision rather
 * than an oversight:
 *   - nginx and Traefik. There is no deployment manifest in this repo; when one
 *     lands, these come back with it.
 *   - `escapeHtmlFile`. Nothing on this server renders HTML — no email, no template,
 *     no server-rendered page. The escaping that matters here is `escapeRegex`,
 *     which the regex rule covers.
 *   - `passwordReset`. There is no email address on an account: recovery is a
 *     single-use code, gated by the same refresh-token rules as everything else.
 *
 * Gated elsewhere, deliberately not duplicated (a rule with two owners drifts):
 * secrets with no dev default in check-env-drift.ts, the Socket.IO hop count and
 * upgrade origin in check-ws-standards.ts, rate limits and the pagination cap in
 * check-api-standards.ts, `securityEvent` in check-error-handling.ts.
 */
import { checkSecurityDrift } from '@larrydarko/lint-config/gates/security-drift';

checkSecurityDrift({
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
        schemasFile: 'api/src/lib/schemas.ts',
        sanitizer: { file: 'api/src/middleware/sanitizer.ts', fn: 'sanitizeRequest', strip: 'stripUnsafeKeys' },
    },
    unauthenticatedMounts: ['/api/auth', '/api/logos'],
    fileRoutes: [
        {
            file: 'api/src/routes/asset/logos.ts',
            why: 'Ticker logos are loaded by <img>, which carries no token.',
            originCheck: /isSameOrigin\(req\)/,
        },
    ],
});
