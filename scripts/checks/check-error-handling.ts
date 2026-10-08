#!/usr/bin/env node
/**
 * Error handling at this app's boundaries. What it checks — the status policy, the
 * AppError contract, the one error handler, the shared error codes, which failures
 * are security events, what `params` may carry, the non-HTTP services, the frontend
 * interceptor, and swallows that state a reason — lives in
 * @larrydarko/lint-config/gates/error-handling/fullstack.
 *
 * What stays here is what only this project knows.
 */
import { checkFullstackErrorHandling } from '@larrydarko/lint-config/gates/error-handling/fullstack';

checkFullstackErrorHandling({
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
});
