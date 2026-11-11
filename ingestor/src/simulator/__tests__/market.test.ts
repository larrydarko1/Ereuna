import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));

const { listLastBars } = await import('@/simulator/market.js');

const NOW = new Date('2026-11-11T14:30:00.000Z');

const bar = (tickerID: string, day: string, close: number, volume: number): Record<string, unknown> => ({
    tickerID,
    timestamp: new Date(`${day}T00:00:00.000Z`),
    close,
    volume,
});

beforeEach(() => {
    db.current = fakeDb();
});

describe('listLastBars', () => {
    it('reads the daily bars of the last two weeks for the symbols asked, in one query', async () => {
        db.current = fakeDb({ OHCLVData: [] });
        await listLastBars(['AAPL', 'MSFT'], NOW);
        expect(db.current.of('OHCLVData').filters).toEqual([
            {
                tickerID: { $in: ['AAPL', 'MSFT'] },
                timestamp: { $gte: new Date('2026-10-28T14:30:00.000Z') },
            },
        ]);
    });

    it("keeps each symbol's latest bar, whatever order they arrive in", async () => {
        db.current = fakeDb({
            OHCLVData: [
                bar('AAPL', '2026-11-10', 231, 50),
                bar('AAPL', '2026-11-06', 225, 40),
                bar('MSFT', '2026-11-09', 410, 20),
                bar('MSFT', '2026-11-10', 415, 25),
            ],
        });
        await expect(listLastBars(['AAPL', 'MSFT'], NOW)).resolves.toEqual([
            { symbol: 'AAPL', close: 231, volume: 50 },
            { symbol: 'MSFT', close: 415, volume: 25 },
        ]);
    });

    it('asks for nothing when there are no symbols', async () => {
        await expect(listLastBars([], NOW)).resolves.toEqual([]);
        expect(db.current.collection).not.toHaveBeenCalled();
    });
});
