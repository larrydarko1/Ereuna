/**
 * Request schemas for /api/notes. See requests/identity.ts for how the API and
 * the frontend share them.
 */
import { z } from 'zod';

import { makePaginationQuery, symbolField } from '#requests/fields.js';

const messageField = z.string().trim().min(1, 'Note cannot be empty').max(5000);

/** POST /notes */
export const createNoteBody = z.object({ symbol: symbolField, message: messageField });

/** PATCH /notes/:id */
export const updateNoteBody = z.object({ message: messageField });

/** GET /notes — `symbol` narrows it to one ticker. */
export const notesQuery = makePaginationQuery({ defaultLimit: 50, maxLimit: 200 }).extend({
    symbol: symbolField.optional(),
});
