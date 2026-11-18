/** The market-data vendor's REST API. */
import { z } from 'zod';

import { config } from '@/lib/config.js';
import { logger } from '@/lib/logger.js';
import { msUntilNextSlot } from '@/utils/rate-window.js';

/**
 * A daily bar as the vendor sends it. The prices it traded at are kept, not the
 * vendor's adjusted ones: those are restated for every later dividend as well as
 * every split, which moves past prices off what anyone paid. Splits are applied
 * here from each day's split factor, and dividends are recorded on their own.
 * A row missing a price is dropped rather than half-filled; a missing split
 * factor or dividend is read as none.
 */
const dailyBarSchema = z.object({
    date: z.string(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number(),
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

const HOUR = 3_600_000;

const waiting: (() => void)[] = [];

/** When each request of the last hour was sent, oldest first. */
const sent: number[] = [];

/**
 * The vendor refused a request for the plan's request limit. Thrown in place of
 * every request for an hour afterwards, unsent, so a caller can tell "stop and
 * come back" from "this symbol failed".
 */
export class TiingoLimitError extends Error {
    readonly path: string;

    constructor(path: string) {
        super(`Tiingo ${path} not sent: the plan's request limit was reached, asking again after an hour`);
        this.name = 'TiingoLimitError';
        this.path = path;
    }
}

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
/** Until when every request is refused unsent, because the vendor said the limit was reached. */
let refusedUntil = 0;
let pacing = false;

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
 * Retries on a network failure and on 5xx, because those are the vendor having
 * a moment. A 4xx is not retried: asking again for a ticker the vendor does not
 * know wastes the allowance the rest of the run needs. A 429 is the allowance
 * spent, which another try cannot fix.
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
            if (err instanceof TiingoLimitError) throw err;
            if (err instanceof TiingoError && err.status < 500) throw err;
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
    await takeSlot(path);
    const response = await fetch(url, {
        headers: { Authorization: `Token ${config.tiingo.key}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(config.tiingo.timeoutMs),
    });

    if (response.ok) return response.json();
    if (response.status === 429) {
        // The plan counts what was sent before this process started too, so the pacing alone cannot rule this out
        refusedUntil = Date.now() + HOUR;
        const detail = (await response.text().catch(() => '')).slice(0, 300);
        logger.error({ path, detail, resumesAt: new Date(refusedUntil) }, 'Tiingo refused: request limit reached');
        throw new TiingoLimitError(path);
    }
    throw new TiingoError(response.status, path);
}

/**
 * Wait until one more request fits the hourly allowance, then count it as sent.
 * The check and the count run with no await between them, so two waiting
 * callers can never both take the last slot.
 */
async function takeSlot(path: string): Promise<void> {
    for (;;) {
        if (Date.now() < refusedUntil) throw new TiingoLimitError(path);
        const now = Date.now();
        while (sent[0] !== undefined && sent[0] <= now - HOUR) sent.shift();

        const wait = msUntilNextSlot(sent, now, config.tiingo.requestsPerHour, HOUR);
        if (wait === 0) {
            sent.push(now);
            pacing = false;
            return;
        }
        if (!pacing) {
            pacing = true;
            logger.info({ resumesAt: new Date(now + wait) }, "Tiingo's hourly allowance is spent; waiting for it");
        }
        await new Promise((resolve): void => {
            setTimeout(resolve, wait);
        });
    }
}
