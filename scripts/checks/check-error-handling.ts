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
     * Codes that legitimately answer 400 — a request that never parsed. Empty: this
     * API takes no multipart uploads and no free-form JSON blobs, so every
     * malformed request is caught by Zod and answered 422 by the error handler.
     */
    parseLevel400: [],

    /** No Multer branch: this API takes no uploads, so a deliberate throw and a Zod parse are the two typed failures. */
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
