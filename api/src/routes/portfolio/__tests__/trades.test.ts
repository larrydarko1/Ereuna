import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { asUser, json, quietLogger, serve, type Harness } from '@/__tests__/support/http.js';

const service = {
    getTradePage: vi.fn(),
    addTrade: vi.fn(),
    updateTrade: vi.fn(),
    deleteTrade: vi.fn(),
};

vi.mock('@/services/portfolio/index.js', () => service);

const { router, toTradeInput, tradeInputSchema } = await import('@/routes/portfolio/trades.js');

const USER = '507f1f77bcf86cd799439011';
const USER_ID = new ObjectId(USER);
const ID = '507f191e810c19729de860ea';

const buy = {
    action: 'buy' as const,
    symbol: 'aapl',
    shares: 10,
    price: 180,
    total: 1800,
    tradeDate: '2026-03-02',
};

let harness: Harness;

beforeEach(async () => {
    service.getTradePage.mockResolvedValue({ items: [], total: 0 });
    service.addTrade.mockResolvedValue({ id: ID });
    service.updateTrade.mockResolvedValue({ id: ID });
    service.deleteTrade.mockResolvedValue(undefined);
    harness = await serve((app) => app.use('/api/portfolios/:number/trades', quietLogger, asUser(USER), router));
});

afterEach(async () => {
    await harness.close();
});

describe('toTradeInput', () => {
    it('fills the fields a cash movement does not carry', () => {
        const input = toTradeInput(tradeInputSchema.parse({ action: 'deposit', total: 5000, tradeDate: '2026-03-02' }));

        expect(input).toEqual({
            action: 'deposit',
            symbol: null,
            shares: 0,
            price: 0,
            total: 5000,
            commission: null,
            tradeDate: new Date('2026-03-02'),
        });
    });

    it('keeps a declared commission', () => {
        const input = toTradeInput(tradeInputSchema.parse({ ...buy, commission: 1.5 }));

        expect(input.commission).toBe(1.5);
        expect(input.symbol).toBe('AAPL');
    });
});

describe('GET the blotter', () => {
    it('reads the parent slot number out of the merged params', async () => {
        const response = await harness.call('/api/portfolios/2/trades');

        expect(response.status).toBe(200);
        expect(service.getTradePage).toHaveBeenCalledWith(USER_ID, 2, { page: 1, limit: 50, symbol: undefined });
    });

    it('refuses a slot number past the configured count', async () => {
        const { config } = await import('@/lib/config.js');
        const response = await harness.call(`/api/portfolios/${config.limits.portfolioSlots}/trades`);

        expect(response.status).toBe(422);
        expect(service.getTradePage).not.toHaveBeenCalled();
    });
});

describe('POST a trade', () => {
    it('answers 201 with the recorded trade', async () => {
        const response = await harness.call('/api/portfolios/0/trades', json(buy));

        expect(response.status).toBe(201);
        expect(service.addTrade).toHaveBeenCalledWith(USER_ID, 0, expect.objectContaining({ symbol: 'AAPL' }));
    });

    it('accepts a cash movement with no instrument', async () => {
        const response = await harness.call(
            '/api/portfolios/0/trades',
            json({ action: 'withdrawal', total: 500, tradeDate: '2026-03-02' }),
        );

        expect(response.status).toBe(201);
    });

    it('refuses a cash movement carrying a symbol, shares or a price', async () => {
        const response = await harness.call(
            '/api/portfolios/0/trades',
            json({ action: 'deposit', symbol: 'AAPL', shares: 1, price: 2, total: 500, tradeDate: '2026-03-02' }),
        );

        expect(response.status).toBe(422);
        const body = response.body as { errors: { field: string }[] };
        expect(body.errors.map((issue) => issue.field)).toEqual(['symbol', 'shares', 'price']);
    });

    it('refuses an equity trade missing its symbol, shares and price', async () => {
        const response = await harness.call(
            '/api/portfolios/0/trades',
            json({ action: 'buy', total: 500, tradeDate: '2026-03-02' }),
        );

        expect(response.status).toBe(422);
        const body = response.body as { errors: { field: string }[] };
        expect(body.errors.map((issue) => issue.field)).toEqual(['symbol', 'shares', 'price']);
    });

    it('refuses an action that is not one of the six', async () => {
        const response = await harness.call('/api/portfolios/0/trades', json({ ...buy, action: 'gift' }));

        expect(response.status).toBe(422);
    });

    it('refuses a negative or non-finite total', async () => {
        const negative = await harness.call('/api/portfolios/0/trades', json({ ...buy, total: -1 }));

        expect(negative.status).toBe(422);
    });

    it('refuses a commission past the configured ceiling', async () => {
        const { config } = await import('@/lib/config.js');
        const response = await harness.call(
            '/api/portfolios/0/trades',
            json({ ...buy, commission: config.limits.maxCommission + 1 }),
        );

        expect(response.status).toBe(422);
    });

    it('accepts a full timestamp as well as a plain date', async () => {
        const response = await harness.call(
            '/api/portfolios/0/trades',
            json({ ...buy, tradeDate: '2026-03-02T14:30:00Z' }),
        );

        expect(response.status).toBe(201);
    });

    it('refuses a timestamp with no offset', async () => {
        const response = await harness.call(
            '/api/portfolios/0/trades',
            json({ ...buy, tradeDate: '2026-03-02T14:30:00' }),
        );

        expect(response.status).toBe(422);
    });
});

describe('PATCH a trade', () => {
    it('passes the slot and the trade id through', async () => {
        const response = await harness.call(`/api/portfolios/1/trades/${ID}`, json(buy, 'PATCH'));

        expect(response.status).toBe(200);
        const [userId, slot, tradeId] = service.updateTrade.mock.calls[0] as [ObjectId, number, ObjectId];
        expect(userId).toEqual(USER_ID);
        expect(slot).toBe(1);
        expect(tradeId.toHexString()).toBe(ID);
    });

    it('refuses an id that is not an ObjectId', async () => {
        const response = await harness.call('/api/portfolios/1/trades/nope', json(buy, 'PATCH'));

        expect(response.status).toBe(422);
    });
});

describe('DELETE a trade', () => {
    it('answers 204', async () => {
        const response = await harness.call(`/api/portfolios/1/trades/${ID}`, { method: 'DELETE' });

        expect(response.status).toBe(204);
        expect(service.deleteTrade).toHaveBeenCalledTimes(1);
    });
});
