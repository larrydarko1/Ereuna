/**
 * Note routes — mounted at /api/notes (all require authentication)
 * GET    /api/notes           — every note, newest first; `symbol` narrows it
 * POST   /api/notes           — write a note against a symbol
 * PATCH  /api/notes/:id       — revise a note
 * DELETE /api/notes/:id       — remove a note
 */
import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { idParam, makePaginationQuery, symbolSchema } from '@/lib/schemas.js';
import { authedUserId } from '@/middleware/auth.js';
import { validated } from '@/middleware/validate.js';
import * as noteService from '@/services/note/index.js';

const messageSchema = z.string().trim().min(1, 'Note cannot be empty').max(5000);

const listQuery = makePaginationQuery({ defaultLimit: 50, maxLimit: 200 }).extend({
    symbol: symbolSchema.optional(),
});

const createBody = z.object({ symbol: symbolSchema, message: messageSchema });
const updateBody = z.object({ message: messageSchema });

export const router = Router();

router.get(
    '/',
    ...validated({ query: listQuery }, async (req, res): Promise<void> => {
        const { page, limit, symbol } = req.validatedQuery;
        res.json(await noteService.listNotes(authedUserId(req), { page, limit, symbol }));
    }),
);

router.post(
    '/',
    ...validated({ body: createBody }, async (req, res): Promise<void> => {
        const note = await noteService.createNote(authedUserId(req), req.body.symbol, req.body.message);
        res.status(201).json(note);
    }),
);

router.patch(
    '/:id',
    ...validated({ params: idParam, body: updateBody }, async (req, res): Promise<void> => {
        const note = await noteService.updateNote(authedUserId(req), new ObjectId(req.params.id), req.body.message);
        res.json(note);
    }),
);

router.delete(
    '/:id',
    ...validated({ params: idParam }, async (req, res): Promise<void> => {
        await noteService.deleteNote(authedUserId(req), new ObjectId(req.params.id));
        res.json({ ok: true });
    }),
);
