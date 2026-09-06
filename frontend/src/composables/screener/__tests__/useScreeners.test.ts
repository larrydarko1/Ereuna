import { describe, expect, it } from 'vitest';
import { mockApi } from '@/__tests__/support/msw';
import { useScreeners, type UseScreenersReturn } from '@/composables/screener/useScreeners';

const mock = mockApi();

const summary = (name: string, include = false): Record<string, unknown> => ({
    id: name,
    name,
    include,
    filterCount: 0,
    updatedAt: '2026-03-02T00:00:00.000Z',
});

const build = (): UseScreenersReturn => useScreeners();

describe('load', () => {
    it('reads the screeners and selects the first', async () => {
        mock.on('GET /api/screeners', { items: [summary('Value'), summary('Growth')] });
        const screeners = build();

        await screeners.load();

        expect(screeners.items.value).toHaveLength(2);
        expect(screeners.selected.value).toBe('Value');
        expect(screeners.current.value).toMatchObject({ name: 'Value' });
        expect(screeners.pending.value).toBe(false);
    });

    it('holds a selection that survived the read', async () => {
        mock.on('GET /api/screeners', { items: [summary('Value'), summary('Growth')] });
        const screeners = build();
        await screeners.load();
        screeners.selected.value = 'Growth';

        await screeners.load();

        expect(screeners.selected.value).toBe('Growth');
    });

    it('falls to the first when the selected screener is gone', async () => {
        mock.on('GET /api/screeners', { items: [summary('Value')] });
        const screeners = build();
        screeners.selected.value = 'Deleted';

        await screeners.load();

        expect(screeners.selected.value).toBe('Value');
    });

    it('selects nothing when the account has none', async () => {
        mock.on('GET /api/screeners', { items: [] });
        const screeners = build();

        await screeners.load();

        expect(screeners.selected.value).toBe('');
        expect(screeners.current.value).toBeNull();
    });

    it('counts the ones feeding the combined results', async () => {
        mock.on('GET /api/screeners', { items: [summary('Value', true), summary('Growth')] });
        const screeners = build();

        await screeners.load();

        expect(screeners.includedCount.value).toBe(1);
    });

    it('reports a failure', async () => {
        mock.on('GET /api/screeners', { error: 'INTERNAL' }, { status: 500 });
        const screeners = build();

        await screeners.load();

        expect(screeners.error.value).not.toBeNull();
        expect(screeners.pending.value).toBe(false);
    });
});

describe('create', () => {
    it('selects the new screener and re-reads the list', async () => {
        mock.on('POST /api/screeners', summary('Growth'));
        mock.on('GET /api/screeners', { items: [summary('Value'), summary('Growth')] });
        const screeners = build();

        await screeners.create('Growth');

        expect(screeners.selected.value).toBe('Growth');
        expect(screeners.items.value).toHaveLength(2);
    });

    it('reports a refused create and leaves the list alone', async () => {
        mock.on('GET /api/screeners', { items: [summary('Value')] });
        const screeners = build();
        await screeners.load();
        mock.on('POST /api/screeners', { error: 'SCREENER_NAME_TAKEN' }, { status: 409 });

        await expect(screeners.create('Value')).rejects.toBeDefined();

        expect(screeners.error.value).not.toBeNull();
        expect(screeners.items.value).toHaveLength(1);
    });
});

describe('rename', () => {
    it('moves the selection with the name', async () => {
        mock.on('GET /api/screeners', { items: [summary('Value')] });
        const screeners = build();
        await screeners.load();

        mock.on('PATCH /api/screeners/Value', summary('Deep value'));
        mock.on('GET /api/screeners', { items: [summary('Deep value')] });
        await screeners.rename('Deep value');

        expect(screeners.selected.value).toBe('Deep value');
        expect(screeners.current.value).toMatchObject({ name: 'Deep value' });
    });
});

describe('remove', () => {
    it('lets the re-read choose the next survivor', async () => {
        mock.on('GET /api/screeners', { items: [summary('Value'), summary('Growth')] });
        const screeners = build();
        await screeners.load();

        mock.on('DELETE /api/screeners/Value', null, { status: 204 });
        mock.on('GET /api/screeners', { items: [summary('Growth')] });
        await screeners.remove('Value');

        expect(screeners.selected.value).toBe('Growth');
    });

    it('leaves the selection alone when another screener is deleted', async () => {
        mock.on('GET /api/screeners', { items: [summary('Value'), summary('Growth')] });
        const screeners = build();
        await screeners.load();

        mock.on('DELETE /api/screeners/Growth', null, { status: 204 });
        mock.on('GET /api/screeners', { items: [summary('Value')] });
        await screeners.remove('Growth');

        expect(screeners.selected.value).toBe('Value');
    });
});

describe('setIncluded', () => {
    it('switches a screener into the combined results without moving the selection', async () => {
        mock.on('GET /api/screeners', { items: [summary('Value'), summary('Growth')] });
        const screeners = build();
        await screeners.load();

        mock.on('PATCH /api/screeners/Growth', summary('Growth', true));
        mock.on('GET /api/screeners', { items: [summary('Value'), summary('Growth', true)] });
        await screeners.setIncluded('Growth', { include: true });

        expect(screeners.selected.value).toBe('Value');
        expect(screeners.includedCount.value).toBe(1);
    });
});
