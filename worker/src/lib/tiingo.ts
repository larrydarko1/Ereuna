/** The market-data vendor's REST API. */
import { config } from '@/lib/config.js';
import { logger } from '@/lib/logger.js';

/** A daily bar as the vendor sends it. Adjusted and raw fields both arrive. */
export type VendorDailyBar = {
    date: string;
    close: number;
    high: number;
    low: number;
    open: number;
    volume: number;
    adjClose: number;
    adjHigh: number;
    adjLow: number;
    adjOpen: number;
    adjVolume: number;
    divCash: number;
    splitFactor: number;
};

/** One row of the whole-market end-of-day endpoint. */
export type VendorMarketBar = VendorDailyBar & { ticker: string };

export type VendorStatementItem = { dataCode?: string; value?: number | null };

export type VendorStatement = {
    date?: string;
    quarter?: number;
    statementData?: {
        incomeStatement?: VendorStatementItem[];
        balanceSheet?: VendorStatementItem[];
        cashFlow?: VendorStatementItem[];
        overview?: VendorStatementItem[];
    };
};

export type VendorNewsItem = {
    id?: number;
    title?: string;
    url?: string;
    description?: string;
    source?: string;
    publishedDate?: string;
    tickers?: string[];
};

const waiting: (() => void)[] = [];

class TiingoError extends Error {
    constructor(
        readonly status: number,
        readonly path: string,
    ) {
        super(`Tiingo ${path} responded ${status}`);
        this.name = 'TiingoError';
    }
}

let inFlight = 0;

/** Every listed symbol's end-of-day bar for the latest session, in one call. */
export function marketPrices(): Promise<VendorMarketBar[]> {
    return request<VendorMarketBar[]>('/tiingo/daily/prices');
}

/** The full daily history for one symbol. */
export function dailyHistory(symbol: string, startDate = '1960-01-01'): Promise<VendorDailyBar[]> {
    return request<VendorDailyBar[]>(`/tiingo/daily/${encodeURIComponent(symbol)}/prices`, {
        startDate,
        endDate: new Date().toISOString().slice(0, 10),
    });
}

/** Quarterly and annual financial statements for one symbol. */
export function statements(symbol: string): Promise<VendorStatement[]> {
    return request<VendorStatement[]>(`/tiingo/fundamentals/${encodeURIComponent(symbol)}/statements`);
}

/** Headlines mentioning any of `symbols`. */
export function news(symbols: readonly string[], limit: number): Promise<VendorNewsItem[]> {
    return request<VendorNewsItem[]>('/tiingo/news', {
        tickers: symbols.map((symbol) => symbol.toLowerCase()).join(','),
        limit: String(limit),
    });
}

/**
 * Hold the caller until a request slot frees up.
 * A plain counter rather than a queue library: the only thing being limited is
 * the number of sockets open to one host, and every caller here is a `for await`
 * that will not outlive the process.
 */
async function acquire(): Promise<void> {
    if (inFlight < config.tiingo.concurrency) {
        inFlight += 1;
        return;
    }
    // The slot is handed over by release() rather than freed and re-taken, so
    // a caller arriving between the two cannot jump the queue
    await new Promise<void>((resolve) => waiting.push(resolve));
}

function release(): void {
    const next = waiting.shift();
    if (next === undefined) inFlight -= 1;
    else next();
}

/**
 * GET a vendor path and parse it as JSON.
 *
 * Retries on a network failure and on 5xx and 429, because those are the vendor
 * having a moment. A 4xx is not retried: asking again for a ticker the vendor
 * does not know wastes the rate limit that the rest of the run needs.
 */
async function request<T>(path: string, query: Record<string, string> = {}): Promise<T> {
    const url = new URL(path, config.tiingo.baseUrl);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);

    await acquire();
    try {
        for (let attempt = 1; attempt <= config.tiingo.retries; attempt += 1) {
            try {
                const response = await fetch(url, {
                    headers: { Authorization: `Token ${config.tiingo.key}`, Accept: 'application/json' },
                    signal: AbortSignal.timeout(config.tiingo.timeoutMs),
                });

                if (response.ok) return (await response.json()) as T;
                if (response.status < 500 && response.status !== 429) throw new TiingoError(response.status, path);
                if (attempt === config.tiingo.retries) throw new TiingoError(response.status, path);
            } catch (err) {
                if (err instanceof TiingoError && err.status < 500 && err.status !== 429) throw err;
                if (attempt === config.tiingo.retries) throw err;
                logger.debug({ err, path, attempt }, 'Vendor request failed, retrying');
            }

            await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 500));
        }

        throw new TiingoError(0, path); // Unreachable: the loop returns or throws
    } finally {
        release();
    }
}
