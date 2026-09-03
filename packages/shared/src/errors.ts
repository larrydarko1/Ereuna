/**
 * API error codes — the contract between the Ereuna API and the frontend.
 * The API sends a stable, machine-readable `code` on the wire and never
 * user-facing English; the human `message` stays server-side for logs. The
 * frontend maps each code to a localised string via its `errors.*` i18n
 * namespace, so adding a code here requires a translation in every locale.
 * Codes are thrown from the API via `AppError` (api/src/lib/app-error.ts),
 * except `VALIDATION_FAILED` (validate middleware) and `RATE_LIMITED` (rate
 * limiter), which are emitted directly but are still part of this contract.
 * One code means one HTTP status. The first throw of a code fixes its status;
 * a case that deserves a different status deserves a different code.
 */
export type ErrorCode = (typeof ERROR_CODES)[number];

export const ERROR_CODES = [
    // Infrastructure
    'VALIDATION_FAILED',
    'RATE_LIMITED',
    'INTERNAL',
    'NOT_FOUND',
    'FORBIDDEN',

    // Authentication
    'MISSING_TOKEN',
    'INVALID_TOKEN',
    'INVALID_TOKEN_TYPE',
    'NO_REFRESH_TOKEN',
    'INVALID_REFRESH_TOKEN',
    'REFRESH_TOKEN_EXPIRED',
    'INVALID_CREDENTIALS',
    'INCORRECT_PASSWORD',
    'USERNAME_TAKEN',
    'USER_NOT_FOUND',

    // Two-factor authentication
    'TWO_FA_REQUIRED',
    'TWO_FA_TOKEN_INVALID',
    'TWO_FA_ALREADY_ENABLED',
    'TWO_FA_NOT_ENABLED',
    'TWO_FA_NOT_PENDING',
    'INVALID_TWO_FA_CODE',
    'INVALID_RECOVERY_CODE',
    'PASSWORD_RESET_NOT_ALLOWED',

    // Screeners
    'SCREENER_NOT_FOUND',
    'SCREENER_NAME_TAKEN',
    'SCREENER_LIMIT_REACHED',
    'UNKNOWN_SCREENER_FILTER',
    'FILTER_RANGE_INVALID',
    'FILTER_BOUND_UNAVAILABLE',
    'INVALID_FILTER_OPTION',

    // Watchlists
    'WATCHLIST_NOT_FOUND',
    'WATCHLIST_NAME_TAKEN',
    'WATCHLIST_LIMIT_REACHED',
    'WATCHLIST_TICKER_EXISTS',
    'WATCHLIST_TICKER_NOT_FOUND',
    'WATCHLIST_FULL',

    // Portfolio
    'PORTFOLIO_NOT_FOUND',
    'TRADE_NOT_FOUND',
    'INSUFFICIENT_BUYING_POWER',
    'INSUFFICIENT_SHARES',
    'POSITION_SIDE_CONFLICT',
    'INVALID_TRADE_DATE',
    'BENCHMARK_LIMIT_REACHED',
    'TRADE_LIMIT_REACHED',
    'POSITION_LIMIT_REACHED',

    // Notes
    'NOTE_NOT_FOUND',
    'NOTE_LIMIT_REACHED',

    // Market data
    'ASSET_NOT_FOUND',

] as const;

/** Runtime guard — true when `value` is a known error code. */
export function isErrorCode(value: unknown): value is ErrorCode {
    return typeof value === 'string' && (ERROR_CODES as readonly string[]).includes(value);
}
