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
    open: 101,
    high: 106,
    low: 100,
    close: 105,
    volume: 1_000,
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

// A bar is only usable whole: a hole in it is a move every derived figure would
// read, so a row short of a price is dropped
describe('the rows', () => {
    const answer = (rows: JsonBodyType): void => {
        server.use(http.get(`${BASE}/tiingo/daily/prices`, () => HttpResponse.json(rows)));
    };

    it.each([
        ['no ticker', { ticker: undefined }],
        ['an empty ticker', { ticker: '' }],
        ['a missing close', { close: undefined }],
        ['a non-numeric volume', { volume: 'lots' }],
        ['no date', { date: null }],
    ])('drops a row with %s and keeps the rest', async (_label, overrides) => {
        answer([
            { ...ROW, ...overrides },
            { ...ROW, ticker: 'MSFT' },
        ]);
        await expect(marketPrices()).resolves.toEqual([{ ...ROW, ticker: 'MSFT' }]);
    });

    it('keeps the prices it traded at, never the ones restated for later dividends', async () => {
        answer([{ ...ROW, adjOpen: 1, adjClose: 1, adjVolume: 1 }]);
        await expect(marketPrices()).resolves.toEqual([ROW]);
    });

    it('reads a missing split factor as no split, and a missing dividend as none', async () => {
        answer([{ ...ROW, splitFactor: null, divCash: undefined }]);
        await expect(marketPrices()).resolves.toEqual([{ ...ROW, splitFactor: 1, divCash: 0 }]);
    });

    it('throws when the vendor answers something other than a list', async () => {
        answer({ detail: 'Error: upstream is down' });
        await expect(marketPrices()).rejects.toThrow('expected array, received object');
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

describe('the request limit', () => {
    /** A client of its own, so the hour it is told to stop for, and the requests it counted, end with the test. */
    async function freshClient(perHour: string): Promise<typeof import('@/lib/tiingo.js')> {
        vi.stubEnv('TIINGO_REQUESTS_PER_HOUR', perHour);
        vi.resetModules();
        return import('@/lib/tiingo.js');
    }

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllEnvs();
    });

    it('stops at a 429 and sends nothing more for an hour, then asks again', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        const client = await freshClient('10000');
        let status = 429;
        server.use(
            http.get(`${BASE}/tiingo/daily/prices`, () =>
                status === 429
                    ? HttpResponse.json({ detail: 'over your hourly allocation' }, { status })
                    : HttpResponse.json([]),
            ),
        );

        await expect(client.marketPrices()).rejects.toThrow(client.TiingoLimitError);
        await expect(client.dailyHistory('AAPL')).rejects.toThrow(client.TiingoLimitError);
        expect(seen).toHaveLength(1);

        status = 200;
        vi.setSystemTime(Date.now() + 3_600_001);
        await expect(client.marketPrices()).resolves.toEqual([]);
        expect(seen).toHaveLength(2);
    });

    it('holds a request past the hourly allowance until the oldest is an hour old', async () => {
        vi.useFakeTimers({ toFake: ['Date', 'setTimeout'] });
        const client = await freshClient('2');
        server.use(http.get(`${BASE}/tiingo/daily/prices`, () => HttpResponse.json([])));

        await client.marketPrices();
        await client.marketPrices();
        const third = client.marketPrices();

        await vi.advanceTimersByTimeAsync(3_599_000);
        expect(seen).toHaveLength(2);
        await vi.advanceTimersByTimeAsync(1_000);
        await expect(third).resolves.toEqual([]);
        expect(seen).toHaveLength(3);
    });

    it('says once that it is waiting, not once per request held at the limit', async () => {
        vi.useFakeTimers({ toFake: ['Date', 'setTimeout'] });
        const client = await freshClient('2');
        const { logger } = await import('@/lib/logger.js');
        const info = vi.spyOn(logger, 'info');
        server.use(http.get(`${BASE}/tiingo/daily/prices`, () => HttpResponse.json([])));

        await client.marketPrices();
        await vi.advanceTimersByTimeAsync(1_000);
        await client.marketPrices();
        const held = [client.marketPrices(), client.marketPrices()];

        await vi.advanceTimersByTimeAsync(3_600_000);
        await Promise.all(held);
        expect(seen).toHaveLength(4);
        expect(info).toHaveBeenCalledTimes(1);
    });
});
