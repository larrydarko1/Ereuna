/**
 * Live portfolio valuation — what `portfolio:watch` starts and each trade on a
 * held symbol re-prices.
 * The holdings (positions, cash, cost basis) are read once per watch, and the
 * page sends the watch again after every write, so between two watches only the
 * prices move. They go through `valuePortfolio`, the summary's own arithmetic:
 * the page never computes a portfolio number, it shows this one.
 * A push carries the whole valuation and a held symbol can trade many times a
 * second, so a socket gets at most one push a second, however many of its
 * symbols moved in it.
 */
import { ObjectId } from 'mongodb';

import { BUCKET_MS, QUOTE_TIMEFRAME, type PortfolioValuation } from '@ereuna/shared';

import { readLastCandle } from '@/lib/last-bucket.js';
import { logger } from '@/lib/logger.js';
import { findHoldings, valuePortfolio, type Holdings } from '@/services/portfolio/index.js';

type Push = (valuation: PortfolioValuation) => void;

type Valuation = {
    holdings: Holdings;
    prices: Map<string, number>; // The session's latest trade per held symbol that has traded today
    push: Push;
    timer: NodeJS.Timeout | undefined;
};

const PUSH_INTERVAL_MS = 1_000;

/** Each socket's valuation, by socket id. */
const valuations = new Map<string, Valuation>();

/** The valuations holding each symbol, so a trade wakes only the sockets it moves. */
const holders = new Map<string, Set<Valuation>>();

/** The newest watch per socket, so a slow read cannot install a slot the page has since left. */
const tickets = new Map<string, number>();

/**
 * Replace this socket's valuation with the given slot's, and push it at once;
 * null stops it. A slot nobody has written to has nothing to price, and a read
 * that fails is logged and leaves the page on its summary: no socket error
 * reaches the page, which still has the REST answer it rendered.
 */
export async function startValuation(
    socketId: string,
    userId: string,
    number: number | null,
    push: Push,
): Promise<void> {
    const ticket = (tickets.get(socketId) ?? 0) + 1;
    tickets.set(socketId, ticket);
    stopValuation(socketId);
    if (number === null) return;

    try {
        const holdings = await findHoldings(new ObjectId(userId), number);
        if (holdings === null || tickets.get(socketId) !== ticket) return;
        const prices = await readTodaysPrices(holdings, Date.now());
        if (tickets.get(socketId) !== ticket) return;

        const valuation: Valuation = { holdings, prices, push, timer: undefined };
        valuations.set(socketId, valuation);
        for (const { symbol } of holdings.positions) {
            const set = holders.get(symbol) ?? new Set<Valuation>();
            set.add(valuation);
            holders.set(symbol, set);
        }
        push(valuePortfolio(holdings, prices));
    } catch (err) {
        logger.warn({ err, userId, number }, 'Portfolio valuation read failed; the page keeps its summary');
    }
}

/** A socket that has gone holds no ticket either. */
export function forgetValuation(socketId: string): void {
    stopValuation(socketId);
    tickets.delete(socketId);
}

/** Take a symbol's new price, and push each valuation holding it within the second. */
export function repriceValuations(symbol: string, price: number): void {
    for (const valuation of holders.get(symbol) ?? []) {
        valuation.prices.set(symbol, price);
        valuation.timer ??= setTimeout(() => {
            valuation.timer = undefined;
            valuation.push(valuePortfolio(valuation.holdings, valuation.prices));
        }, PUSH_INTERVAL_MS);
    }
}

export function clearValuations(): void {
    for (const socketId of [...valuations.keys()]) stopValuation(socketId);
    tickets.clear();
}

function stopValuation(socketId: string): void {
    const valuation = valuations.get(socketId);
    if (valuation === undefined) return;

    clearTimeout(valuation.timer);
    valuations.delete(socketId);
    for (const { symbol } of valuation.holdings.positions) {
        const set = holders.get(symbol);
        set?.delete(valuation);
        if (set?.size === 0) holders.delete(symbol);
    }
}

/**
 * The newest one-minute bucket of each held symbol, kept only when it belongs to
 * today's session: a symbol that has not traded yet today is worth its close,
 * which the holdings already carry, not the last print of an earlier session.
 */
async function readTodaysPrices(holdings: Holdings, now: number): Promise<Map<string, number>> {
    const today = Math.floor(now / BUCKET_MS['1d']) * BUCKET_MS['1d'];
    const buckets = await Promise.all(
        holdings.positions.map(async ({ symbol }) => ({
            symbol,
            bucket: await readLastCandle(symbol, QUOTE_TIMEFRAME),
        })),
    );

    const prices = new Map<string, number>();
    for (const { symbol, bucket } of buckets) {
        if (bucket !== null && Date.parse(bucket.timestamp) >= today) prices.set(symbol, bucket.close);
    }
    return prices;
}
