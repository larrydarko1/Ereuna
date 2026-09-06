import { describe, expect, it, vi } from 'vitest';
import { HttpResponse, http } from 'msw';
import { mockApi, ORIGIN } from '@/__tests__/support/msw';
import { usePortfolios, type UsePortfoliosReturn } from '@/composables/portfolio/usePortfolios';

const mock = mockApi();

const slot = (number: number): Record<string, unknown> => ({
    number,
    cash: 0,
    baseValue: 0,
    leverage: 1,
    defaultCommission: 0,
    benchmarks: [],
    positionCount: 0,
    updatedAt: '2026-03-02T00:00:00.000Z',
});

const summary = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    number: 0,
    cash: 1000,
    baseValue: 10000,
    leverage: 1,
    defaultCommission: 0,
    positions: [],
    longValue: 0,
    shortValue: 0,
    grossExposure: 0,
    netExposure: 0,
    totalValue: 1000,
    leverageUsed: null,
    buyingPower: 1000,
    unrealizedPL: 0,
    totalPL: null,
    totalPLPercent: null,
    stats: null,
    valueHistory: [],
    benchmarks: [],
    ...over,
});

const position = (symbol: string): Record<string, unknown> => ({
    symbol,
    side: 'long',
    shares: 1,
    avgPrice: 1,
    lastClose: 1,
    marketValue: 1,
    exposure: 1,
    unrealizedPL: 0,
    unrealizedPLPercent: 0,
    weight: 100,
});

const build = (): UsePortfoliosReturn => usePortfolios();

describe('load', () => {
    it('reads which slots have been opened', async () => {
        mock.on('GET /api/portfolios', { items: [slot(0), slot(3)] });
        const portfolios = build();

        await portfolios.load();

        expect(portfolios.openedSlots.value).toEqual(new Set([0, 3]));
    });

    it('reports a failure rather than throwing at the view', async () => {
        mock.on('GET /api/portfolios', { error: 'INTERNAL' }, { status: 500 });
        const portfolios = build();

        await expect(portfolios.load()).resolves.toBeUndefined();

        expect(portfolios.error.value).not.toBeNull();
    });
});

describe('reload', () => {
    it('reads the open slot', async () => {
        mock.on('GET /api/portfolios/0', summary());
        const portfolios = build();

        await portfolios.reload();

        expect(portfolios.summary.value).toMatchObject({ cash: 1000 });
        expect(portfolios.pending.value).toBe(false);
    });

    it('treats a slot nobody has written to as empty, not broken', async () => {
        mock.on('GET /api/portfolios/0', { error: 'PORTFOLIO_NOT_FOUND' }, { status: 404 });
        const portfolios = build();

        await portfolios.reload();

        expect(portfolios.summary.value).toBeNull();
        expect(portfolios.error.value).toBeNull();
        expect(portfolios.isBlank.value).toBe(true);
    });

    it('reports any other failure', async () => {
        mock.on('GET /api/portfolios/0', { error: 'INTERNAL' }, { status: 500 });
        const portfolios = build();

        await portfolios.reload();

        expect(portfolios.error.value).not.toBeNull();
    });

    it('paints the slot that is current, not the one whose answer came back last', async () => {
        const portfolios = build();
        const release: Record<string, (value: Response) => void> = {};
        mock.server.use(
            http.get(`${ORIGIN}/api/portfolios/:number`, async ({ params }) => {
                const number = String(params.number);
                return new Promise<Response>((resolve) => {
                    release[number] = resolve;
                });
            }),
        );

        const first = portfolios.reload();
        void portfolios.select(7);
        await vi.waitFor(() => expect(Object.keys(release)).toHaveLength(2));

        release['7']?.(HttpResponse.json(summary({ number: 7, cash: 77 })));
        await vi.waitFor(() => expect(portfolios.summary.value).toMatchObject({ number: 7 }));

        release['0']?.(HttpResponse.json(summary({ number: 0, cash: 1 })));
        await first;

        expect(portfolios.summary.value).toMatchObject({ number: 7 });
    });
});

describe('select', () => {
    it('clears the old slot before it reads the new one', async () => {
        mock.on('GET /api/portfolios/0', summary());
        mock.on('GET /api/portfolios/2', summary({ number: 2, cash: 22 }));
        const portfolios = build();
        await portfolios.reload();

        await portfolios.select(2);

        expect(portfolios.selected.value).toBe(2);
        expect(portfolios.summary.value).toMatchObject({ number: 2 });
    });

    it('does nothing when that slot is already open', async () => {
        mock.on('GET /api/portfolios/0', summary());
        const portfolios = build();
        await portfolios.reload();
        const before = mock.calls.length;

        await portfolios.select(0);

        expect(mock.calls).toHaveLength(before);
    });
});

describe('isBlank and heldSymbols', () => {
    it('calls a slot with nothing held, owed or declared blank', async () => {
        mock.on('GET /api/portfolios/0', summary({ cash: 0, baseValue: 0 }));
        const portfolios = build();

        await portfolios.reload();

        expect(portfolios.isBlank.value).toBe(true);
        expect(portfolios.heldSymbols.value).toEqual([]);
    });

    it('does not call a slot with cash in it blank', async () => {
        mock.on('GET /api/portfolios/0', summary({ cash: 500, baseValue: 0 }));
        const portfolios = build();

        await portfolios.reload();

        expect(portfolios.isBlank.value).toBe(false);
    });

    it('names what is held, for the live quote subscription', async () => {
        mock.on('GET /api/portfolios/0', summary({ positions: [position('AAPL'), position('MSFT')] }));
        const portfolios = build();

        await portfolios.reload();

        expect(portfolios.heldSymbols.value).toEqual(['AAPL', 'MSFT']);
    });
});

describe('the writes', () => {
    const arm = (): void => {
        mock.on('GET /api/portfolios', { items: [slot(0)] });
        mock.on('GET /api/portfolios/0', summary());
    };

    it.each([
        ['base value', 'PUT /api/portfolios/0/base-value', (p: UsePortfoliosReturn) => p.saveBaseValue(5000)],
        ['leverage', 'PUT /api/portfolios/0/leverage', (p: UsePortfoliosReturn) => p.saveLeverage(2)],
        ['commission', 'PUT /api/portfolios/0/commission', (p: UsePortfoliosReturn) => p.saveCommission(1)],
        ['benchmarks', 'PUT /api/portfolios/0/benchmarks', (p: UsePortfoliosReturn) => p.saveBenchmarks(['SPY'])],
    ])('re-reads the whole slot after setting the %s', async (_case, route, act) => {
        arm();
        mock.on(route, {});
        const portfolios = build();

        await act(portfolios);

        expect(mock.calls.some((call) => call.path === '/api/portfolios/0')).toBe(true);
        expect(mock.calls.some((call) => call.path === '/api/portfolios')).toBe(true);
        expect(portfolios.revision.value).toBe(1);
    });

    it('reports a refused write and does not count it as a revision', async () => {
        arm();
        mock.on('PUT /api/portfolios/0/leverage', { error: 'LEVERAGE_TOO_LOW' }, { status: 422 });
        const portfolios = build();

        await expect(portfolios.saveLeverage(1)).rejects.toBeDefined();

        expect(portfolios.error.value).not.toBeNull();
        expect(portfolios.revision.value).toBe(0);
    });

    it('deletes the slot outright on reset', async () => {
        arm();
        mock.on('DELETE /api/portfolios/0', null, { status: 204 });
        const portfolios = build();

        await portfolios.reset();

        expect(mock.calls.some((call) => call.method === 'DELETE')).toBe(true);
    });
});

describe('export and import', () => {
    it('hands back the export envelope', async () => {
        mock.on('GET /api/portfolios/0/export', { portfolio: {}, trades: [] });
        const portfolios = build();

        await expect(portfolios.exportCurrent()).resolves.toEqual({ portfolio: {}, trades: [] });
    });

    it('answers with how many trades went in, and re-reads', async () => {
        mock.on('GET /api/portfolios', { items: [slot(0)] });
        mock.on('GET /api/portfolios/0', summary());
        mock.on('POST /api/portfolios/0/import', { imported: 12 });
        const portfolios = build();

        await expect(portfolios.importInto({ trades: [] })).resolves.toBe(12);
        expect(portfolios.revision.value).toBe(1);
    });
});
