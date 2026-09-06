import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NewsDoc } from '@ereuna/shared';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const cache: { keys: string[]; options: unknown[] } = { keys: [], options: [] };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/lib/cache.js', () => ({
    marketKey: (...parts: string[]) => `m:${parts.join(':')}`,
    withCache: (key: string, fetcher: () => Promise<unknown>, options: unknown) => {
        cache.keys.push(key);
        cache.options.push(options);
        return fetcher();
    },
}));

const { news } = await import('@/services/market/market-news.js');

function article(overrides: Partial<NewsDoc> = {}): NewsDoc {
    return {
        title: 'Apple beats',
        url: 'https://example.com/a',
        source: 'wire',
        summary: 'Numbers were good',
        imageUrl: 'https://example.com/a.png',
        tickers: ['AAPL'],
        publishedDate: new Date('2026-01-05T12:00:00.000Z'),
        ...overrides,
    } as NewsDoc;
}

beforeEach(() => {
    db.current = fakeDb({ News: [] });
    cache.keys = [];
    cache.options = [];
});

describe('news', () => {
    it('reads everything when no symbol is named', async () => {
        await news({ limit: 10 });
        expect(db.current.of('News').filters[0]).toEqual({});
    });

    it('narrows to the named symbols', async () => {
        await news({ symbols: ['MSFT', 'AAPL'], limit: 10 });
        expect(db.current.of('News').filters[0]).toEqual({ tickers: { $in: ['AAPL', 'MSFT'] } });
    });

    it('narrows to a date when one is given', async () => {
        const since = new Date('2026-01-01T00:00:00.000Z');
        await news({ since, limit: 10 });
        expect(db.current.of('News').filters[0]).toEqual({ publishedDate: { $gte: since } });
    });

    it('caps the limit, however large the caller asked for', async () => {
        await news({ limit: 5_000 });
        expect(cache.keys[0]?.endsWith(':100')).toBe(true);
    });

    it('renders a headline as JSON-safe rows, dates included', async () => {
        db.current = fakeDb({ News: [article()] });
        await expect(news({ limit: 10 })).resolves.toEqual([
            {
                title: 'Apple beats',
                url: 'https://example.com/a',
                source: 'wire',
                summary: 'Numbers were good',
                imageUrl: 'https://example.com/a.png',
                tickers: ['AAPL'],
                publishedDate: '2026-01-05T12:00:00.000Z',
            },
        ]);
    });

    it.each(['source', 'summary', 'imageUrl'] as const)('reports a missing %s as null', async (field) => {
        db.current = fakeDb({ News: [article({ [field]: undefined })] });
        const [row] = await news({ limit: 10 });
        expect(row?.[field]).toBeNull();
    });

    it('hashes the symbol set into the key, so it cannot be longer than the value', async () => {
        await news({ symbols: Array.from({ length: 30 }, (_u, i) => `S${i}`), limit: 10 });
        expect(cache.keys[0]).toMatch(/^m:news:[0-9a-f]{16}:any:10$/);
    });

    it('shares one entry between two callers naming the same set in a different order', async () => {
        await news({ symbols: ['AAPL', 'MSFT'], limit: 10 });
        await news({ symbols: ['MSFT', 'AAPL'], limit: 10 });
        expect(cache.keys[0]).toBe(cache.keys[1]);
    });

    it('scopes an unfiltered read under `all`, and keys the date to the day', async () => {
        await news({ since: new Date('2026-01-05T18:00:00.000Z'), limit: 10 });
        expect(cache.keys[0]).toBe('m:news:all:2026-01-05:10');
        expect(cache.options[0]).toEqual({ dataType: 'price' });
    });
});
