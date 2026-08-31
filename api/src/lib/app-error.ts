/**
 * AppError — the one way to raise a client-facing HTTP error.
 * Carries three things:
 *   status  — the HTTP status code
 *   code    — a stable machine-readable ErrorCode sent to the client on the
 *             wire; the frontend translates it via its `errors.*` i18n namespace
 *   message — English, for server logs only; NEVER sent to the client
 * Because `code` is typed as `ErrorCode`, a typo will not compile. Because it
 * is a real Error it carries a stack, narrows with `instanceof`, and serialises
 * properly through pino — none of which a thrown object literal does.
 *   throw new AppError(404, 'SCREENER_NOT_FOUND', `screener ${name} not found`);
 * `params` are interpolation values for codes whose translation has
 * placeholders. They go on the wire next to the code, so keep them primitive
 * and non-sensitive, and never put raw user input in them — that is the
 * reflected-XSS vector. User input in `message` is fine; it stays in the logs.
 * `logContext` is the server-side counterpart: structured fields (`op`,
 * `userId`, `attempt`) merged into the error handler's boundary log line and
 * never sent to the client. Use it when the throwing layer knows something the
 * boundary log needs, so the event is still logged exactly once instead of
 * logged-and-rethrown at every layer.
 * `securityEvent` marks a credential or authorisation failure worth
 * investigating; the handler then attaches ip and user-agent to the log. It is
 * an explicit flag rather than a status-code guess, because most 401s and 403s
 * are routine and collecting client PII for them is needless noise.
 */
import type { ErrorCode } from '@ereuna/shared';

export type ErrorParams = Record<string, string | number>;

export type AppErrorOptions = {
    params?: ErrorParams;
    logContext?: Record<string, string | number>;
    securityEvent?: boolean;
};

export class AppError extends Error {
    readonly status: number;
    readonly code: ErrorCode;
    readonly params?: ErrorParams;
    readonly logContext?: Record<string, string | number>;
    readonly securityEvent: boolean;

    constructor(status: number, code: ErrorCode, message: string, options: AppErrorOptions = {}) {
        super(message);
        this.name = 'AppError';
        this.status = status;
        this.code = code;
        this.params = options.params;
        this.logContext = options.logContext;
        this.securityEvent = options.securityEvent ?? false;
    }
}
