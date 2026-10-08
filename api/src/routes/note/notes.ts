/**
 * Note routes — mounted at /api/notes (all require authentication)
 * GET    /api/notes           — every note, newest first; `symbol` narrows it
 * POST   /api/notes           — write a note against a symbol
 * PATCH  /api/notes/:id       — revise a note
 * DELETE /api/notes/:id       — remove a note
 */
import { Router } from 'express';
import { ObjectId } from 'mongodb';

import { createNoteBody, idParam, notePageSchema, noteRowSchema, notesQuery, updateNoteBody } from '@ereuna/shared';

import { send } from '@/lib/send.js';
import { authedUserId } from '@/middleware/auth.js';
import { validated } from '@/middleware/validate.js';
import * as noteService from '@/services/note/index.js';

export const router = Router();

router.get(
    '/',
    ...validated({ query: notesQuery }, async (req, res): Promise<void> => {
        const { page, limit, symbol } = req.validatedQuery;
        const notes = await noteService.getNotePage(authedUserId(req), {
            page,
            limit,
            ...(symbol !== undefined ? { symbol } : {}),
        });
        send(res, notePageSchema, notes);
    }),
);

router.post(
    '/',
    ...validated({ body: createNoteBody }, async (req, res): Promise<void> => {
        const note = await noteService.createNote(authedUserId(req), req.body.symbol, req.body.message);
        send(res.status(201), noteRowSchema, note);
    }),
);

router.patch(
    '/:id',
    ...validated({ params: idParam, body: updateNoteBody }, async (req, res): Promise<void> => {
        const note = await noteService.updateNote(authedUserId(req), new ObjectId(req.params.id), req.body.message);
        send(res, noteRowSchema, note);
    }),
);

router.delete(
    '/:id',
    ...validated({ params: idParam }, async (req, res): Promise<void> => {
        await noteService.deleteNote(authedUserId(req), new ObjectId(req.params.id));
        res.status(204).end();
    }),
);
