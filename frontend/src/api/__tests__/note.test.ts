import { describe, expect, it } from 'vitest';
import { mockApi } from '@/__tests__/support/msw';
import { createNote, deleteNote, getNotes, updateNote } from '@/api/note';

const mock = mockApi();
const page = { items: [], total: 0, page: 1, limit: 50 };

describe('getNotes', () => {
    it('asks for the default page when given no query', async () => {
        mock.on('GET /api/notes', page);

        await getNotes();

        expect(mock.last().search.toString()).toBe('');
    });

    it('passes the query through as parameters', async () => {
        mock.on('GET /api/notes', page);

        await getNotes({ page: 2, limit: 10, symbol: 'AAPL' });

        expect(Object.fromEntries(mock.last().search)).toEqual({ page: '2', limit: '10', symbol: 'AAPL' });
    });
});

describe('writes', () => {
    it('creates a note against a symbol', async () => {
        mock.on('POST /api/notes', { id: '1' });

        await createNote('AAPL', 'buy the dip');

        expect(mock.last().body).toEqual({ symbol: 'AAPL', message: 'buy the dip' });
    });

    it('addresses a revision by the note id alone', async () => {
        mock.on('PATCH /api/notes/abc', { id: 'abc' });

        await updateNote('abc', 'revised');

        expect(mock.last().path).toBe('/api/notes/abc');
        expect(mock.last().body).toEqual({ message: 'revised' });
    });

    it('deletes by id', async () => {
        mock.on('DELETE /api/notes/abc', null, { status: 204 });

        await deleteNote('abc');

        expect(mock.last().method).toBe('DELETE');
    });
});
