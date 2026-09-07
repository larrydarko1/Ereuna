import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

vi.mock('@/lib/logger.js', () => ({
    logger: { info: (): void => {}, warn: (): void => {}, error: (): void => {}, debug: (): void => {} },
}));

const { config } = await import('@/lib/config.js');
const { dailyHistory, marketPrices, statements } = await import('@/lib/tiingo.js');

const BASE = config.tiingo.baseUrl;

/** Every request MSW saw, so the assertions can read the URL and the headers. */
const seen: Request[] = [];
const server = setupServer();

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

const lastUrl = (): URL => new URL((seen[seen.length - 1] as Request).url);

describe('the endpoints', () => {
    it("asks for every listed symbol's latest bar in one call", async () => {
        server.use(http.get(`${BASE}/tiingo/daily/prices`, () => HttpResponse.json([{ ticker: 'AAPL' }])));
        await expect(marketPrices()).resolves.toEqual([{ ticker: 'AAPL' }]);
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

describe('authentication', () => {
    it('sends the key as a Token header and asks for JSON', async () => {
        server.use(http.get(`${BASE}/tiingo/daily/prices`, () => HttpResponse.json([])));
        await marketPrices();

        const request = seen[seen.length - 1] as Request;
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
                return attempts === 1
                    ? new HttpResponse(null, { status: 503 })
                    : HttpResponse.json([{ ticker: 'AAPL' }]);
            }),
        );
        await expect(marketPrices()).resolves.toEqual([{ ticker: 'AAPL' }]);
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
                started.push(String(params.symbol));
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
