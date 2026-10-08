/**
 * send — the one way a route answers with data.
 * The schema is the list of fields the response may carry, from
 * `@ereuna/shared`'s `responses/`. A Zod object drops every key it does not
 * declare, so whatever the service handed back — a whole database document, a
 * field added to the collection next month — only the listed fields reach the
 * wire, and the frontend's types are inferred from the same schema. Error
 * bodies do not come through here: they carry a code, never data.
 *
 *   send(res, notePageSchema, page);
 *   send(res.status(201), noteRowSchema, note);
 *
 * Data that does not fit its schema is a server bug, not a bad request, so it
 * becomes a 500 here. Left as a ZodError it would reach the error handler's 422
 * branch and blame the client.
 *
 * Data carrying a field the schema does not declare is a bug too: the mapper
 * built something nobody listed, or handed over a document it should have
 * mapped. The schema keeps the field off the wire either way, so nothing leaks;
 * what changes is who finds out. Outside production the answer fails, so the
 * test, the E2E run or the developer clicking through sees it at once. In
 * production the user keeps a working page with the field dropped, and the
 * error log names the field.
 */
import type { Response } from 'express';
import type { z } from 'zod';

import { droppedKeys } from '@ereuna/shared';

import { AppError } from '@/lib/app-error.js';
import { config } from '@/lib/config.js';

export function send<TSchema extends z.ZodType>(res: Response, schema: TSchema, data: z.input<TSchema>): void {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
        // Paths and messages only: an issue never carries the offending value, which may be what must not leak
        const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
        throw new AppError(500, 'INTERNAL', 'Response did not match its schema', { logContext: { issues } });
    }
    const dropped = droppedKeys(data, parsed.data);
    if (dropped.length > 0) {
        const message = 'Response carried fields its schema does not declare';
        if (config.isDev) throw new AppError(500, 'INTERNAL', message, { logContext: { dropped: dropped.join(', ') } });
        res.req.log.error({ dropped }, message);
    }
    res.json(parsed.data);
}
