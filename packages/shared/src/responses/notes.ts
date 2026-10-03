/** Response schemas for /api/notes (see responses/identity.ts for how `send()` uses them). Timestamps are ISO 8601 strings. */
import { z } from 'zod';

/** POST /notes (201) and PATCH /notes/:id, and one row of the list. */
export const noteRowSchema = z.object({
    id: z.string(),
    symbol: z.string(),
    message: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

/** GET /notes */
export const notePageSchema = z.object({
    items: z.array(noteRowSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
});

export type NoteRow = z.infer<typeof noteRowSchema>;
export type NotePage = z.infer<typeof notePageSchema>;
