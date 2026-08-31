/**
 * api test bootstrap — seeds the secrets `lib/config.ts` requires.
 *
 * config.ts validates env through Zod at import time, and JWT_SECRET and
 * TOTP_ENCRYPTION_KEY have no dev fallback by design. Without these the very
 * first `import { config }` in any test would throw before the test runs.
 *
 * `||=` so an individual test can still set its own value before re-importing.
 */
process.env.NODE_ENV ||= 'test';
process.env.JWT_SECRET ||= 'test-jwt-secret-0123456789abcdef0123456789';
process.env.TOTP_ENCRYPTION_KEY ||= '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
