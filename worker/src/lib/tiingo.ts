/** The market-data vendor's REST API. */
import { z } from 'zod';

import { config } from '@/lib/config.js';
import { logger } from '@/lib/logger.js';

/**
 * A daily bar as the vendor sends it. Only the adjusted prices are kept, so
 * only they are required; a row missing one is dropped rather than half-filled,
 * because a bar with a raw close among adjusted ones is a discontinuity every
 * derived figure would read as a move. A missing split factor or dividend is
 * read as none.
 */
const dailyBarSchema = z.object({
    date: z.string(),
    adjOpen: z.number(),
    adjHigh: z.number(),
    adjLow: z.number(),
    adjClose: z.number(),
    adjVolume: z.number(),
    divCash: z.number().catch(0),
    splitFactor: z.number().catch(1),
});

const marketBarSchema = dailyBarSchema.extend({ ticker: z.string().min(1) });

const statementItemSchema = z.object({
    dataCode: z.string().optional(),
    value: z.number().nullable().optional(),
});

const statementSchema = z.object({
    date: z.string().optional(),
    quarter: z.number().optional(),
    statementData: z
        .object({
            incomeStatement: z.array(statementItemSchema).optional(),
            balanceSheet: z.array(statementItemSchema).optional(),
            cashFlow: z.array(statementItemSchema).optional(),
            overview: z.array(statementItemSchema).optional(),
        })
        .optional(),
});

export type VendorDailyBar = z.infer<typeof dailyBarSchema>;

export type VendorMarketBar = z.infer<typeof marketBarSchema>;

export type VendorStatementItem = z.infer<typeof statementItemSchema>;

export type VendorStatement = z.infer<typeof statementSchema>;

const waiting: (() => void)[] = [];

class TiingoError extends Error {
    readonly status: number;
    readonly path: string;

    constructor(status: number, path: string) {
        super(`Tiingo ${path} responded ${status}`);
        this.name = 'TiingoError';
        this.status = status;
        this.path = path;
    }
}

let inFlight = 0;

/** Every listed symbol's end-of-day bar for the latest session, in one call. */
export function marketPrices(): Promise<VendorMarketBar[]> {
    return request('/tiingo/daily/prices', marketBarSchema);
}

/** The full daily history for one symbol. */
export function dailyHistory(symbol: string, startDate = '1960-01-01'): Promise<VendorDailyBar[]> {
    return request(`/tiingo/daily/${encodeURIComponent(symbol)}/prices`, dailyBarSchema, {
        startDate,
        endDate: new Date().toISOString().slice(0, 10),
    });
}

/** Quarterly and annual financial statements for one symbol. */
export function statements(symbol: string): Promise<VendorStatement[]> {
    return request(`/tiingo/fundamentals/${encodeURIComponent(symbol)}/statements`, statementSchema);
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
    await new Promise<void>((resolve): void => {
        waiting.push(resolve);
    });
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
async function request<T>(path: string, row: z.ZodType<T>, query: Record<string, string> = {}): Promise<T[]> {
    const url = new URL(path, config.tiingo.baseUrl);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);

    await acquire();
    try {
        return rowsOf(await retrying(url, path), row, path);
    } finally {
        release();
    }
}

/**
 * The rows of a list response that match `row`. Each is checked on its own, so
 * one malformed row costs that row rather than the whole response; a body that
 * is not a list at all is the vendor answering something else, and throws.
 */
function rowsOf<T>(body: unknown, row: z.ZodType<T>, path: string): T[] {
    const rows: T[] = [];
    let dropped = 0;
    for (const item of z.array(z.unknown()).parse(body)) {
        const parsed = row.safeParse(item);
        if (parsed.success) rows.push(parsed.data);
        else dropped += 1;
    }
    if (dropped > 0) logger.warn({ path, dropped }, 'Vendor rows that did not match their schema were dropped');
    return rows;
}

/** The retry ladder, with the rate-limit slot already held by the caller. */
async function retrying(url: URL, path: string): Promise<unknown> {
    for (let attempt = 1; attempt <= config.tiingo.retries; attempt += 1) {
        try {
            return await attemptOnce(url, path);
        } catch (err) {
            if (err instanceof TiingoError && err.status < 500 && err.status !== 429) throw err;
            if (attempt === config.tiingo.retries) throw err;
            logger.debug({ err, path, attempt }, 'Vendor request failed, retrying');
        }

        await new Promise((resolve): void => {
            setTimeout(resolve, 2 ** attempt * 500);
        });
    }

    throw new TiingoError(0, path); // Unreachable: the loop returns or throws
}

/**
 * One GET, with every non-2xx raised as a TiingoError carrying its status.
 * Which statuses are worth another try is the ladder's decision, not this one's,
 * so the 4xx rule lives in exactly one place.
 */
async function attemptOnce(url: URL, path: string): Promise<unknown> {
    const response = await fetch(url, {
        headers: { Authorization: `Token ${config.tiingo.key}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(config.tiingo.timeoutMs),
    });

    if (response.ok) return response.json();
    throw new TiingoError(response.status, path);
}
