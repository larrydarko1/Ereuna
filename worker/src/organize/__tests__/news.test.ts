import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VendorNewsItem } from '@/lib/tiingo.js';
import type { Asset } from '@/organize/universe.js';
import { fakeDb, type DbStub } from '@/__tests__/support/mongo.js';

const db: { current: DbStub } = { current: fakeDb() };
const vendor: { batches: (VendorNewsItem[] | Error)[]; asked: string[][] } = { batches: [], asked: [] };
const logged: { errors: unknown[] } = { errors: [] };

vi.mock('@/lib/db.js', () => ({ getDb: () => db.current }));
vi.mock('@/lib/tiingo.js', () => ({
    news: (symbols: readonly string[]) => {
        vendor.asked.push([...symbols]);
        const answer = vendor.batches.shift() ?? [];
        return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
    },
}));
vi.mock('@/lib/logger.js', () => ({
    logger: {
        error: (payload: unknown): void => {
            logged.errors.push(payload);
        },
        info: (): void => {},
        warn: (): void => {},
        debug: (): void => {},
    },
}));

const { updateNews } = await import('@/organize/news.js');

function asset(symbol: string, assetType = 'Stock'): Asset {
    return {
        symbol,
        assetType,
        exchange: 'NASDAQ',
        sector: '',
        industry: '',
        marketCap: null,
        sharesOutstanding: null,
        ipo: null,
    };
}

function item(overrides: Partial<VendorNewsItem> = {}): VendorNewsItem {
    return {
        url: 'https://example.com/a',
        title: 'Headline',
        publishedDate: '2026-09-04T12:00:00.000Z',
        tickers: ['aapl'],
        source: 'wire',
        description: 'What happened',
        ...overrides,
    } as VendorNewsItem;
}

const articles = (): Record<string, unknown>[] =>
    db.current
        .of('News')
        .writes.flatMap((write) => write.args[0] as { updateOne: { update: { $set: Record<string, unknown> } } }[])
        .map((operation) => operation.updateOne.update.$set);

beforeEach(() => {
    db.current = fakeDb();
    vendor.batches = [];
    vendor.asked = [];
    logged.errors = [];
});

describe('updateNews', () => {
    it('fetches nothing for a universe with no covered asset types', async () => {
        await expect(updateNews([asset('BOND', 'Bond')])).resolves.toBe(0);
        expect(vendor.asked).toEqual([]);
    });

    it.each(['Stock', 'ETF', 'Crypto'])('covers %s', async (assetType) => {
        vendor.batches = [[item()]];
        await updateNews([asset('AAPL', assetType)]);
        expect(vendor.asked).toEqual([['AAPL']]);
    });

    it('asks in batches of fifty, because a longer query string is refused', async () => {
        const universe = Array.from({ length: 51 }, (_unused, index) => asset(`S${index}`));
        vendor.batches = [[], []];
        await updateNews(universe);
        expect(vendor.asked.map((batch) => batch.length)).toEqual([50, 1]);
    });

    it('carries on past a batch the vendor refused', async () => {
        const universe = Array.from({ length: 51 }, (_unused, index) => asset(`S${index}`));
        vendor.batches = [new Error('502'), [item()]];
        await expect(updateNews(universe)).resolves.toBe(1);
    });

    it('writes nothing when no batch produced an article', async () => {
        vendor.batches = [[]];
        await expect(updateNews([asset('AAPL')])).resolves.toBe(0);
        expect(db.current.of('News').writes).toEqual([]);
    });

    it('upserts on the url, so the same story arriving twice updates one row', async () => {
        vendor.batches = [[item()]];
        await updateNews([asset('AAPL')]);
        const [operation] = db.current.of('News').writes[0]?.args[0] as {
            updateOne: { filter: unknown; upsert: boolean };
        }[];
        expect(operation?.updateOne.filter).toEqual({ url: 'https://example.com/a' });
        expect(operation?.updateOne.upsert).toBe(true);
    });

    it('de-duplicates by url before writing rather than at the server', async () => {
        vendor.batches = [[item(), item({ title: 'Same story, second copy' })]];
        await expect(updateNews([asset('AAPL')])).resolves.toBe(1);
        expect(articles()[0]?.title).toBe('Same story, second copy');
    });

    it('logs a failed write and finishes', async () => {
        vendor.batches = [[item()]];
        db.current = fakeDb();
        db.current.of('News').bulkWrite.mockRejectedValueOnce(new Error('write conflict'));
        await expect(updateNews([asset('AAPL')])).resolves.toBe(1);
        expect(logged.errors).toHaveLength(1);
    });
});

describe('one stored article', () => {
    it("renames the vendor's `description` to the `summary` the read path serves", async () => {
        vendor.batches = [[item({ description: 'What happened' })]];
        await updateNews([asset('AAPL')]);
        expect(articles()[0]).toMatchObject({ summary: 'What happened' });
    });

    it('upper-cases every ticker so a symbol lookup matches', async () => {
        vendor.batches = [[item({ tickers: ['aapl', 'msft'] })]];
        await updateNews([asset('AAPL')]);
        expect(articles()[0]?.tickers).toEqual(['AAPL', 'MSFT']);
    });

    it('stores an empty ticker list rather than undefined', async () => {
        vendor.batches = [[item({ tickers: undefined })]];
        await updateNews([asset('AAPL')]);
        expect(articles()[0]?.tickers).toEqual([]);
    });

    it.each([
        ['an empty description', { description: '' }],
        ['no description', { description: undefined }],
        ['no source', { source: undefined }],
    ])('leaves the optional field off entirely for %s', async (_label, overrides) => {
        vendor.batches = [[item(overrides)]];
        await updateNews([asset('AAPL')]);
        const stored = articles()[0] ?? {};
        expect(Object.values(stored)).not.toContain(undefined);
    });

    it.each([
        ['no url', { url: undefined }],
        ['an empty url', { url: '' }],
        ['no title', { title: undefined }],
        ['no publication date', { publishedDate: undefined }],
        ['an unparseable publication date', { publishedDate: 'whenever' }],
    ])('drops an item with %s', async (_label, overrides) => {
        vendor.batches = [[item(overrides)]];
        await expect(updateNews([asset('AAPL')])).resolves.toBe(0);
    });

    it('parses the publication date into a Date', async () => {
        vendor.batches = [[item()]];
        await updateNews([asset('AAPL')]);
        expect(articles()[0]?.publishedDate).toEqual(new Date('2026-09-04T12:00:00.000Z'));
    });
});
