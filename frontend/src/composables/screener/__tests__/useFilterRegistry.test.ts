import { beforeEach, describe, expect, it } from 'vitest';
import { HttpResponse, http } from 'msw';
import { mockApi, ORIGIN } from '@/__tests__/support/msw';
import { clearAuth } from '@/api/client';
import { useFilterRegistry } from '@/composables/screener/useFilterRegistry';

const mock = mockApi();
const registry = useFilterRegistry();

const range = (key: string): Record<string, unknown> => ({
    key,
    label: key,
    kind: 'range',
    available: true,
    bounds: { min: 0, max: 100 },
});

beforeEach(() => {
    // The catalogue is the same answer for everybody and is held at module
    // scope; ending the session is how the app itself drops it.
    clearAuth();
});

describe('load', () => {
    it('reads the catalogue once and holds it', async () => {
        let reads = 0;
        mock.server.use(
            http.get(`${ORIGIN}/api/screeners/filters`, () => {
                reads += 1;
                return HttpResponse.json({ items: [range('pe')] });
            }),
        );

        await registry.load();
        await registry.load();

        expect(reads).toBe(1);
        expect(registry.descriptors.value).toHaveLength(1);
        expect(registry.pending.value).toBe(false);
    });

    it('shares one request between concurrent callers', async () => {
        let reads = 0;
        mock.server.use(
            http.get(`${ORIGIN}/api/screeners/filters`, () => {
                reads += 1;
                return HttpResponse.json({ items: [range('pe')] });
            }),
        );

        await Promise.all([registry.load(), registry.load(), registry.load()]);

        expect(reads).toBe(1);
    });

    it('reports a failure and stays empty, so the next caller tries again', async () => {
        mock.on('GET /api/screeners/filters', { error: 'INTERNAL' }, { status: 500 });

        await registry.load();

        expect(registry.error.value).not.toBeNull();
        expect(registry.descriptors.value).toEqual([]);
    });

    it('keys the catalogue for lookup by filter slug', async () => {
        mock.on('GET /api/screeners/filters', { items: [range('pe'), range('price')] });

        await registry.load();

        expect(registry.byKey.value.get('pe')).toMatchObject({ kind: 'range' });
        expect(registry.byKey.value.has('made-up')).toBe(false);
    });
});

describe('grouped', () => {
    it("arranges the catalogue into the panel's headings, in their order", async () => {
        mock.on('GET /api/screeners/filters', {
            items: [range('pe'), range('price'), { ...range('sectors'), kind: 'enum', options: [] }],
        });

        await registry.load();

        expect(registry.grouped.value.map((entry) => entry.group)).toEqual([
            'classification',
            'priceSize',
            'valuation',
        ]);
    });

    it('drops a heading with nothing under it rather than rendering it empty', async () => {
        mock.on('GET /api/screeners/filters', { items: [range('pe')] });

        await registry.load();

        expect(registry.grouped.value).toHaveLength(1);
        expect(registry.grouped.value[0]).toMatchObject({ group: 'valuation' });
    });
});

describe('the session ending', () => {
    it('drops the catalogue', async () => {
        mock.on('GET /api/screeners/filters', { items: [range('pe')] });
        await registry.load();

        clearAuth();

        expect(registry.descriptors.value).toEqual([]);
    });
});
