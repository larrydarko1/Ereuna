import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { asUser, json, quietLogger, serve, type Harness } from '@/__tests__/support/http.js';

const service = {
    getNotePage: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
};

vi.mock('@/services/note/index.js', () => service);

const { router } = await import('@/routes/note/notes.js');

const USER = '507f1f77bcf86cd799439011';
const USER_ID = new ObjectId(USER);
const ID = '507f191e810c19729de860ea';

let harness: Harness;

beforeEach(async () => {
    service.getNotePage.mockResolvedValue({ items: [], total: 0 });
    service.createNote.mockResolvedValue({ id: ID });
    service.updateNote.mockResolvedValue({ id: ID });
    service.deleteNote.mockResolvedValue(undefined);
    harness = await serve((app) => app.use('/api/notes', quietLogger, asUser(USER), router));
});

afterEach(async () => {
    await harness.close();
});

describe('GET /api/notes', () => {
    it('reads a page for the authenticated user', async () => {
        const response = await harness.call('/api/notes');

        expect(response.status).toBe(200);
        expect(service.getNotePage).toHaveBeenCalledWith(USER_ID, { page: 1, limit: 50, symbol: undefined });
    });

    it('narrows to a symbol and takes the caller page size', async () => {
        await harness.call('/api/notes?symbol=aapl&page=3&limit=10');

        expect(service.getNotePage).toHaveBeenCalledWith(USER_ID, { page: 3, limit: 10, symbol: 'AAPL' });
    });

    it('refuses a page size beyond the route maximum', async () => {
        const response = await harness.call('/api/notes?limit=500');

        expect(response.status).toBe(422);
        expect(service.getNotePage).not.toHaveBeenCalled();
    });
});

describe('POST /api/notes', () => {
    it('answers 201 with the created note', async () => {
        const response = await harness.call('/api/notes', json({ symbol: 'aapl', message: '  buy the dip  ' }));

        expect(response.status).toBe(201);
        expect(response.body).toEqual({ id: ID });
        expect(service.createNote).toHaveBeenCalledWith(USER_ID, 'AAPL', 'buy the dip');
    });

    it('refuses an empty message', async () => {
        const response = await harness.call('/api/notes', json({ symbol: 'AAPL', message: '   ' }));

        expect(response.status).toBe(422);
        expect(service.createNote).not.toHaveBeenCalled();
    });

    it('refuses a message beyond five thousand characters', async () => {
        const response = await harness.call('/api/notes', json({ symbol: 'AAPL', message: 'x'.repeat(5001) }));

        expect(response.status).toBe(422);
    });

    it('refuses a note with no symbol', async () => {
        const response = await harness.call('/api/notes', json({ message: 'orphan' }));

        expect(response.status).toBe(422);
    });
});

describe('PATCH /api/notes/:id', () => {
    it('passes the id through as an ObjectId', async () => {
        const response = await harness.call(`/api/notes/${ID}`, json({ message: 'revised' }, 'PATCH'));

        expect(response.status).toBe(200);
        const [, id] = service.updateNote.mock.calls[0] as [ObjectId, ObjectId, string];
        expect(id.toHexString()).toBe(ID);
    });

    it('refuses an id that is not an ObjectId', async () => {
        const response = await harness.call('/api/notes/nonsense', json({ message: 'revised' }, 'PATCH'));

        expect(response.status).toBe(422);
        expect(service.updateNote).not.toHaveBeenCalled();
    });
});

describe('DELETE /api/notes/:id', () => {
    it('answers 204 with no body', async () => {
        const response = await harness.call(`/api/notes/${ID}`, { method: 'DELETE' });

        expect(response.status).toBe(204);
        expect(response.text).toBe('');
        expect(service.deleteNote).toHaveBeenCalledTimes(1);
    });

    it('renders a service failure through the error handler', async () => {
        const { AppError } = await import('@/lib/app-error.js');
        service.deleteNote.mockRejectedValue(new AppError(404, 'NOTE_NOT_FOUND', 'gone'));

        const response = await harness.call(`/api/notes/${ID}`, { method: 'DELETE' });

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'NOTE_NOT_FOUND' });
    });
});
