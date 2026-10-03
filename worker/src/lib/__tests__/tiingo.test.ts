import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger.js', () => ({
    logger: { info: (): void => {}, warn: (): void => {}, error: (): void => {}, debug: (): void => {} },
}));

const { config } = await import('@/lib/config.js');
const { dailyHistory, marketPrices, statements } = await import('@/lib/tiingo.js');

const BASE = config.tiingo.baseUrl;

/** Every request MSW saw, so the assertions can read the URL and the headers. */
const seen: Request[] = [];
const server = setupServer();

/** One row of the market-wide endpoint, with every field the client keeps. */
const ROW = {
    ticker: 'AAPL',
    date: '2026-09-04T00:00:00.000Z',
    adjOpen: 101,
    adjHigh: 106,
    adjLow: 100,
    adjClose: 105,
    adjVolume: 1_000,
    divCash: 0,
    splitFactor: 1,
};

const lastRequest = (): Request => {
    const request = seen[seen.length - 1];
    if (request === undefined) throw new Error('no request reached the vendor');
    return request;
};

const lastUrl = (): URL => new URL(lastRequest().url);

beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
    server.events.on('request:start', ({ request }) => seen.push(request));
});

beforeEach(() => {
    seen.length = 0;
});

afterEach(() => {
    server.resetHandlers();
});

afterAll(() => {
    server.close();
});

describe('the endpoints', () => {
    it("asks for every listed symbol's latest bar in one call", async () => {
        server.use(http.get(`${BASE}/tiingo/daily/prices`, () => HttpResponse.json([ROW])));
        await expect(marketPrices()).resolves.toEqual([ROW]);
    });

    it("asks for a symbol's whole history, ending today", async () => {
        server.use(http.get(`${BASE}/tiingo/daily/:symbol/prices`, () => HttpResponse.json([])));
        await dailyHistory('AAPL');

        const url = lastUrl();
        expect(url.pathname).toBe('/tiingo/daily/AAPL/prices');
        expect(url.searchParams.get('startDate')).toBe('1960-01-01');
        expect(url.searchParams.get('endDate')).toBe(new Date().toISOString().slice(0, 10));
    });

    it('takes a start date from the caller', async () => {
        server.use(http.get(`${BASE}/tiingo/daily/:symbol/prices`, () => HttpResponse.json([])));
        await dailyHistory('AAPL', '2020-01-01');
        expect(lastUrl().searchParams.get('startDate')).toBe('2020-01-01');
    });

    it('escapes a symbol that would otherwise change the path', async () => {
        server.use(http.get(`${BASE}/tiingo/daily/*`, () => HttpResponse.json([])));
        await dailyHistory('BRK/B');
        expect(lastUrl().pathname).toBe('/tiingo/daily/BRK%2FB/prices');
    });

    it("asks for one symbol's statements", async () => {
        server.use(http.get(`${BASE}/tiingo/fundamentals/:symbol/statements`, () => HttpResponse.json([])));
        await statements('AAPL');
        expect(lastUrl().pathname).toBe('/tiingo/fundamentals/AAPL/statements');
    });
});

// A bar is only usable whole: a raw close among adjusted ones is a discontinuity
// every derived figure would read as a move, so a row short of one is dropped
describe('the rows', () => {
    const answer = (rows: JsonBodyType): void => {
        server.use(http.get(`${BASE}/tiingo/daily/prices`, () => HttpResponse.json(rows)));
    };

    it.each([
        ['no ticker', { ticker: undefined }],
        ['an empty ticker', { ticker: '' }],
        ['a missing adjusted close', { adjClose: undefined }],
        ['a non-numeric adjusted volume', { adjVolume: 'lots' }],
        ['no date', { date: null }],
    ])('drops a row with %s and keeps the rest', async (_label, overrides) => {
        answer([
            { ...ROW, ...overrides },
            { ...ROW, ticker: 'MSFT' },
        ]);
        await expect(marketPrices()).resolves.toEqual([{ ...ROW, ticker: 'MSFT' }]);
    });

    it('keeps only the adjusted prices, which is the whole series a bar joins', async () => {
        answer([{ ...ROW, open: 1, close: 1, volume: 1 }]);
        await expect(marketPrices()).resolves.toEqual([ROW]);
    });

    it('reads a missing split factor as no split, and a missing dividend as none', async () => {
        answer([{ ...ROW, splitFactor: null, divCash: undefined }]);
        await expect(marketPrices()).resolves.toEqual([{ ...ROW, splitFactor: 1, divCash: 0 }]);
    });

    it('throws when the vendor answers something other than a list', async () => {
        answer({ detail: 'Error: upstream is down' });
        await expect(marketPrices()).rejects.toThrow();
    });
});

describe('authentication', () => {
    it('sends the key as a Token header and asks for JSON', async () => {
        server.use(http.get(`${BASE}/tiingo/daily/prices`, () => HttpResponse.json([])));
        await marketPrices();

        const request = lastRequest();
        expect(request.headers.get('authorization')).toBe(`Token ${config.tiingo.key}`);
        expect(request.headers.get('accept')).toBe('application/json');
    });
});

describe('the retry ladder', () => {
    it("gives up immediately on a 4xx — asking again wastes the run's rate limit", async () => {
        server.use(
            http.get(`${BASE}/tiingo/fundamentals/:symbol/statements`, () => new HttpResponse(null, { status: 404 })),
        );
        await expect(statements('NOPE')).rejects.toThrow('responded 404');
        expect(seen).toHaveLength(1);
    });

    it('retries a 5xx and succeeds on a later attempt', async () => {
        let attempts = 0;
        server.use(
            http.get(`${BASE}/tiingo/daily/prices`, () => {
                attempts += 1;
                return attempts === 1 ? new HttpResponse(null, { status: 503 }) : HttpResponse.json([ROW]);
            }),
        );
        await expect(marketPrices()).resolves.toEqual([ROW]);
        expect(attempts).toBe(2);
    });

    it('retries a 429, which is the vendor having a moment rather than a bad request', async () => {
        let attempts = 0;
        server.use(
            http.get(`${BASE}/tiingo/daily/prices`, () => {
                attempts += 1;
                return attempts === 1 ? new HttpResponse(null, { status: 429 }) : HttpResponse.json([]);
            }),
        );
        await expect(marketPrices()).resolves.toEqual([]);
        expect(attempts).toBe(2);
    });

    it('retries a network failure', async () => {
        let attempts = 0;
        server.use(
            http.get(`${BASE}/tiingo/daily/prices`, () => {
                attempts += 1;
                return attempts === 1 ? HttpResponse.error() : HttpResponse.json([]);
            }),
        );
        await expect(marketPrices()).resolves.toEqual([]);
        expect(attempts).toBe(2);
    });

    it('gives up after the configured number of attempts', async () => {
        let attempts = 0;
        server.use(
            http.get(`${BASE}/tiingo/daily/prices`, () => {
                attempts += 1;
                return new HttpResponse(null, { status: 503 });
            }),
        );
        await expect(marketPrices()).rejects.toThrow('responded 503');
        expect(attempts).toBe(config.tiingo.retries);
    });
});

describe('the concurrency limit', () => {
    it('holds requests beyond the limit until a slot frees, then runs them', async () => {
        const started: string[] = [];
        const gates: (() => void)[] = [];
        let releasing = false;

        server.use(
            http.get(`${BASE}/tiingo/fundamentals/:symbol/statements`, async ({ params }) => {
                started.push(String(params['symbol']));
                // Once released, the ones that were queued must not park again
                if (!releasing) await new Promise<void>((resolve) => gates.push(resolve));
                return HttpResponse.json([]);
            }),
        );

        const limit = config.tiingo.concurrency;
        const all = Array.from({ length: limit + 2 }, (_unused, index) => statements(`S${index}`));

        await vi.waitFor(() => expect(started).toHaveLength(limit));

        releasing = true;
        for (const release of gates.splice(0)) release();

        await Promise.all(all);
        expect(started).toHaveLength(limit + 2);
    });

    it('releases the slot when a request threw, so the run does not deadlock', async () => {
        server.use(
            http.get(`${BASE}/tiingo/fundamentals/:symbol/statements`, () => new HttpResponse(null, { status: 404 })),
        );
        const limit = config.tiingo.concurrency;

        await Promise.allSettled(Array.from({ length: limit + 2 }, (_unused, index) => statements(`S${index}`)));

        server.use(http.get(`${BASE}/tiingo/daily/prices`, () => HttpResponse.json([])));
        await expect(marketPrices()).resolves.toEqual([]);
    });
});
