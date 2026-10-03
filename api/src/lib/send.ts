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
 */
import type { Response } from 'express';
import type { z } from 'zod';

import { AppError } from '@/lib/app-error.js';

export function send<TSchema extends z.ZodType>(res: Response, schema: TSchema, data: z.input<TSchema>): void {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
        // Paths and messages only: an issue never carries the offending value, which may be what must not leak
        const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
        throw new AppError(500, 'INTERNAL', 'Response did not match its schema', { logContext: { issues } });
    }
    res.json(parsed.data);
}
