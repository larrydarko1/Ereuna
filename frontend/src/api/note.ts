/**
 * note — API wrappers for /api/notes.
 * A note is addressed by its own id, not by (symbol, id): the id already
 * identifies it, and carrying the symbol as well only creates a second way for
 * the two to disagree.
 */
import type { NotePage, NoteRow, QueryOf } from '@ereuna/shared';

import { call, type ApiResult } from '@/api/client';

export function getNotes(query: QueryOf<'GET /api/notes'> = {}): ApiResult<NotePage> {
    return call('GET /api/notes', { query });
}

export function createNote(symbol: string, message: string): ApiResult<NoteRow> {
    return call('POST /api/notes', { body: { symbol, message } });
}

export function updateNote(id: string, message: string): ApiResult<NoteRow> {
    return call('PATCH /api/notes/:id', { params: { id }, body: { message } });
}

export function deleteNote(id: string): ApiResult<void> {
    return call('DELETE /api/notes/:id', { params: { id } });
}
