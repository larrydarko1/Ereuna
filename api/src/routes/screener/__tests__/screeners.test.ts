import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { DATE_FILTERS, ENUM_FILTERS, FLAG_FILTERS, MA_FILTERS, RANGE_FILTERS } from '@ereuna/shared';
import { asUser, json, quietLogger, serve, type Harness } from '@/__tests__/support/http.js';

const screenerService = {
    listScreeners: vi.fn(),
    createScreener: vi.fn(),
    getScreener: vi.fn(),
    toSummary: vi.fn(),
    setScreenerIncluded: vi.fn(),
    renameScreener: vi.fn(),
    deleteScreener: vi.fn(),
    runScreener: vi.fn(),
    runIncludedScreeners: vi.fn(),
    tryGetBounds: vi.fn(),
    getRangeBounds: vi.fn(),
    getDateBounds: vi.fn(),
    getEnumOptions: vi.fn(),
    setRangeFilter: vi.fn(),
    setEnumFilter: vi.fn(),
    setDateFilter: vi.fn(),
    setMaFilter: vi.fn(),
    setFlagFilter: vi.fn(),
    clearFilter: vi.fn(),
    resetFilters: vi.fn(),
};

const userService = { getPreferences: vi.fn() };

vi.mock('@/services/screener/index.js', () => screenerService);
vi.mock('@/services/user/index.js', () => userService);

const { router } = await import('@/routes/screener/screeners.js');

const USER = '507f1f77bcf86cd799439011';
const USER_ID = new ObjectId(USER);
const summary = { name: 'Value', include: true };
const screener = { ...summary, filters: { Price: { min: 1 } } };

let harness: Harness;

beforeEach(async () => {
    screenerService.listScreeners.mockResolvedValue([summary]);
    screenerService.createScreener.mockResolvedValue(summary);
    screenerService.getScreener.mockResolvedValue(screener);
    screenerService.toSummary.mockReturnValue(summary);
    screenerService.setScreenerIncluded.mockResolvedValue({ ...summary, include: false });
    screenerService.renameScreener.mockResolvedValue({ ...summary, name: 'Growth' });
    screenerService.deleteScreener.mockResolvedValue(undefined);
    screenerService.runScreener.mockResolvedValue({ items: [], total: 0 });
    screenerService.runIncludedScreeners.mockResolvedValue({ items: [], total: 0 });
    screenerService.tryGetBounds.mockResolvedValue({ min: 0, max: 100 });
    screenerService.getEnumOptions.mockResolvedValue(['Technology']);
    for (const setter of [
        'setRangeFilter',
        'setEnumFilter',
        'setDateFilter',
        'setMaFilter',
        'setFlagFilter',
    ] as const) {
        screenerService[setter].mockResolvedValue(screener);
    }
    screenerService.clearFilter.mockResolvedValue(screener);
    screenerService.resetFilters.mockResolvedValue(screener);
    userService.getPreferences.mockResolvedValue({ screenerColumns: ['Price'], hiddenSymbols: ['XYZ'] });
    harness = await serve((app) => app.use('/api/screeners', quietLogger, asUser(USER), router));
});

afterEach(async () => {
    await harness.close();
});

describe('collection routes', () => {
    it('lists under an items key', async () => {
        const response = await harness.call('/api/screeners');

        expect(response.body).toEqual({ items: [summary] });
        expect(screenerService.listScreeners).toHaveBeenCalledWith(USER_ID);
    });

    it('answers 201 on create', async () => {
        const response = await harness.call('/api/screeners', json({ name: 'Value' }));

        expect(response.status).toBe(201);
        expect(screenerService.createScreener).toHaveBeenCalledWith(USER_ID, 'Value');
    });
});

describe('GET /api/screeners/filters', () => {
    it('answers with one entry per registered filter, not a name the frontend has to know', async () => {
        const response = await harness.call('/api/screeners/filters');
        const body = response.body as { items: { key: string; kind: string; available: boolean }[] };

        expect(body.items).toHaveLength(
            RANGE_FILTERS.length + ENUM_FILTERS.length + DATE_FILTERS.length + MA_FILTERS.length + FLAG_FILTERS.length,
        );
        expect(new Set(body.items.map((item) => item.kind))).toEqual(new Set(['range', 'enum', 'date', 'ma', 'flag']));
    });

    it('marks a range the ingestor never populated unavailable rather than failing the request', async () => {
        screenerService.tryGetBounds.mockResolvedValue(null);
        const response = await harness.call('/api/screeners/filters');
        const body = response.body as { items: { kind: string; available: boolean }[] };

        expect(response.status).toBe(200);
        expect(body.items.filter((item) => item.kind === 'range').every((item) => !item.available)).toBe(true);
        expect(body.items.filter((item) => item.kind === 'ma').every((item) => item.available)).toBe(true);
    });

    it('marks an enum with no options unavailable', async () => {
        screenerService.getEnumOptions.mockResolvedValue([]);
        const response = await harness.call('/api/screeners/filters');
        const body = response.body as { items: { kind: string; available: boolean }[] };

        expect(body.items.filter((item) => item.kind === 'enum').every((item) => !item.available)).toBe(true);
    });

    it('carries the directions and targets an MA filter accepts', async () => {
        const response = await harness.call('/api/screeners/filters');
        const body = response.body as { items: { kind: string; directions?: string[]; targets?: string[] }[] };
        const ma = body.items.find((item) => item.kind === 'ma');

        expect(ma?.directions).toEqual(['abv', 'blw']);
        expect(ma?.targets).toEqual(['10', '20', '50', '200', 'price']);
    });

    it('is not read as a screener named "filters"', async () => {
        await harness.call('/api/screeners/filters');

        expect(screenerService.getScreener).not.toHaveBeenCalled();
    });
});

describe('results', () => {
    it("runs the included screeners with the user's own columns and hidden symbols", async () => {
        const response = await harness.call('/api/screeners/results?page=2&limit=25');

        expect(response.status).toBe(200);
        expect(screenerService.runIncludedScreeners).toHaveBeenCalledWith(USER_ID, {
            page: 2,
            limit: 25,
            columns: ['Price'],
            hiddenSymbols: ['XYZ'],
        });
    });

    it('is not read as a screener named "results"', async () => {
        await harness.call('/api/screeners/results');

        expect(screenerService.runScreener).not.toHaveBeenCalled();
    });

    it('runs one screener by name', async () => {
        await harness.call('/api/screeners/Value/results');

        expect(screenerService.runScreener).toHaveBeenCalledWith(USER_ID, 'Value', {
            page: 1,
            limit: 50,
            columns: ['Price'],
            hiddenSymbols: ['XYZ'],
        });
    });

    it('refuses a page size beyond two hundred', async () => {
        const response = await harness.call('/api/screeners/Value/results?limit=201');

        expect(response.status).toBe(422);
    });
});

describe('single screener routes', () => {
    it('answers with the summary and the filters together', async () => {
        const response = await harness.call('/api/screeners/Value');

        expect(response.body).toEqual({ ...summary, filters: screener.filters });
    });

    it('reads the screener first, so a rename against a missing one fails before it writes', async () => {
        const { AppError } = await import('@/lib/app-error.js');
        screenerService.getScreener.mockRejectedValue(new AppError(404, 'SCREENER_NOT_FOUND', 'gone'));
        const response = await harness.call('/api/screeners/Nope', json({ name: 'New' }, 'PATCH'));

        expect(response.status).toBe(404);
        expect(screenerService.renameScreener).not.toHaveBeenCalled();
    });

    it('sets inclusion', async () => {
        const response = await harness.call('/api/screeners/Value', json({ include: false }, 'PATCH'));

        expect(response.body).toEqual({ ...summary, include: false });
        expect(screenerService.setScreenerIncluded).toHaveBeenCalledWith(USER_ID, 'Value', { include: false });
        expect(screenerService.renameScreener).not.toHaveBeenCalled();
    });

    it('renames last, so the answer is the renamed screener and not the stale one', async () => {
        const response = await harness.call('/api/screeners/Value', json({ include: true, name: 'Growth' }, 'PATCH'));

        expect(response.body).toEqual({ ...summary, name: 'Growth' });
    });

    it('refuses a patch with neither key', async () => {
        const response = await harness.call('/api/screeners/Value', json({}, 'PATCH'));

        expect(response.status).toBe(422);
        expect(screenerService.getScreener).not.toHaveBeenCalled();
    });

    it('answers 204 on delete', async () => {
        const response = await harness.call('/api/screeners/Value', { method: 'DELETE' });

        expect(response.status).toBe(204);
        expect(screenerService.deleteScreener).toHaveBeenCalledWith(USER_ID, 'Value');
    });
});

describe('PUT one filter', () => {
    const put = (filter: string, body: unknown): Promise<{ status: number; body: unknown }> =>
        harness.call(`/api/screeners/Value/filters/${filter}`, json(body, 'PUT'));

    it('routes a range key to the range setter, and passes both sides through', async () => {
        const response = await put('price', { min: 10, max: 100 });

        expect(response.body).toEqual({ filters: screener.filters });
        expect(screenerService.setRangeFilter).toHaveBeenCalledWith(USER_ID, 'Value', 'price', {
            min: 10,
            max: 100,
        });
    });

    it('accepts a range with only one side — the other is filled from the data', async () => {
        await put('price', { max: 15 });

        expect(screenerService.setRangeFilter).toHaveBeenCalledWith(USER_ID, 'Value', 'price', {
            min: undefined,
            max: 15,
        });
    });

    it('routes an enum key to the enum setter', async () => {
        await put('sectors', { values: ['Technology'] });

        expect(screenerService.setEnumFilter).toHaveBeenCalledWith(USER_ID, 'Value', 'sectors', ['Technology']);
    });

    it('names the filter when an enum body carries no values', async () => {
        const response = await put('sectors', { min: 1 });

        expect(response.status).toBe(422);
        expect(response.body).toEqual({ error: 'FILTER_RANGE_INVALID', params: { filter: 'sectors' } });
    });

    it('routes a date key to the date setter', async () => {
        await put('ipo-date', { from: '2020-01-01', to: '2026-01-01' });

        expect(screenerService.setDateFilter).toHaveBeenCalledWith(USER_ID, 'Value', 'ipo-date', {
            from: '2020-01-01',
            to: '2026-01-01',
        });
    });

    it('routes an MA key to the MA setter', async () => {
        await put('ma-50', { direction: 'abv', target: 'price' });

        expect(screenerService.setMaFilter).toHaveBeenCalledWith(USER_ID, 'Value', 'ma-50', 'abv', 'price');
    });

    it('refuses an MA relation missing either half', async () => {
        const response = await put('ma-50', { direction: 'abv' });

        expect(response.status).toBe(422);
        expect(response.body).toEqual({ error: 'FILTER_RANGE_INVALID', params: { filter: 'ma-50' } });
    });

    it('refuses a direction outside the two the query can express', async () => {
        const response = await put('ma-50', { direction: 'sideways', target: 'price' });

        expect(response.status).toBe(422);
        expect(response.body).toMatchObject({ error: 'VALIDATION_FAILED' });
    });

    it('routes a flag key to the flag setter', async () => {
        await put('new-high', { enabled: true });

        expect(screenerService.setFlagFilter).toHaveBeenCalledWith(USER_ID, 'Value', 'new-high', { enabled: true });
    });

    it('refuses a flag body with no enabled key', async () => {
        const response = await put('new-high', {});

        expect(response.status).toBe(422);
        expect(response.body).toEqual({ error: 'FILTER_RANGE_INVALID', params: { filter: 'new-high' } });
    });

    it('names the filter when the registry has never heard of it', async () => {
        const response = await put('made-up', { min: 1 });

        expect(response.status).toBe(422);
        expect(response.body).toEqual({ error: 'UNKNOWN_SCREENER_FILTER', params: { filter: 'made-up' } });
    });

    it('refuses more enum values than a filter may carry', async () => {
        const values = Array.from({ length: 501 }, (_, index) => `v${index}`);
        const response = await put('sectors', { values });

        expect(response.status).toBe(422);
        expect(screenerService.setEnumFilter).not.toHaveBeenCalled();
    });
});

describe('clearing filters', () => {
    it('clears one', async () => {
        const response = await harness.call('/api/screeners/Value/filters/price', { method: 'DELETE' });

        expect(response.body).toEqual({ filters: screener.filters });
        expect(screenerService.clearFilter).toHaveBeenCalledWith(USER_ID, 'Value', 'price');
    });

    it('clears every one', async () => {
        const response = await harness.call('/api/screeners/Value/filters', { method: 'DELETE' });

        expect(response.body).toEqual({ filters: screener.filters });
        expect(screenerService.resetFilters).toHaveBeenCalledWith(USER_ID, 'Value');
    });
});
