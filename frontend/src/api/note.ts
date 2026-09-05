/**
 * note — API wrappers for /api/notes.
 * A note is addressed by its own id, not by (symbol, id): the id already
 * identifies it, and carrying the symbol as well only creates a second way for
 * the two to disagree.
 */
import { api, type ApiResult } from '@/api/client';

export type NoteRow = {
    id: string;
    symbol: string;
    message: string;
    createdAt: string;
    updatedAt: string;
};

export type NotePage = {
    items: NoteRow[];
    total: number;
    page: number;
    limit: number;
};

export type NoteQuery = {
    page?: number;
    limit?: number;
    symbol?: string;
};

export function getNotes(query: NoteQuery = {}): ApiResult<NotePage> {
    return api.get<NotePage>('/notes', { params: query });
}

export function createNote(symbol: string, message: string): ApiResult<NoteRow> {
    return api.post<NoteRow>('/notes', { symbol, message });
}

export function updateNote(id: string, message: string): ApiResult<NoteRow> {
    return api.patch<NoteRow>(`/notes/${id}`, { message });
}

export function deleteNote(id: string): ApiResult<void> {
    return api.delete<void>(`/notes/${id}`);
}
