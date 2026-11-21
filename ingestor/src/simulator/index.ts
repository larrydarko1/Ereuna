/**
 * The feed simulator: a local stand-in for Tiingo, so ingestor → aggregator →
 * API → chart runs end to end without a vendor key.
 *   npm run feed:sim                  the fake vendor, 20 trades a second
 *   npm run feed:sim -- --rate 430    about 10M trades over a session
 *   npm run dev:ingestor:sim          the real ingestor, pointed at it
 * It prices the symbols the ingestor subscribes to, read with the ingestor's
 * own query, starting from their last real daily bar. The trades it prints
 * become real candles in whichever database the aggregator writes to.
 */
import 'dotenv/config';
import { parseArgs } from 'node:util';

import { z } from 'zod';

import { closeDb, connectDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import { listLastBars } from '@/simulator/market.js';
import { buildMarket } from '@/simulator/traffic.js';
import { SIMULATOR_PORT, startVendor } from '@/simulator/vendor.js';
import { loadUniverse } from '@/universe.js';

// The ceiling is a typo guard: 100k a second is past anything the stream cap survives
const argsSchema = z.object({ rate: z.coerce.number().positive().max(100_000).default(20) });

const started = start().catch((err: unknown) => {
    logger.fatal({ err }, 'Feed simulator failed');
    process.exit(1);
});

async function start(): Promise<() => Promise<void>> {
    const { rate } = argsSchema.parse(parseArgs({ options: { rate: { type: 'string' } } }).values);

    await connectDb();
    const symbols = await loadUniverse();
    const market = buildMarket(await listLastBars(symbols, new Date()), rate);
    const vendor = await startVendor({
        port: SIMULATOR_PORT,
        market,
        tradesPerSecond: rate,
        random: Math.random,
        now: Date.now,
    });

    logger.info(
        { url: `ws://localhost:${vendor.port}`, symbols: symbols.length, priced: market.symbols.length, rate },
        'Simulated vendor feed listening',
    );
    return vendor.close;
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
        logger.info({ signal }, 'Feed simulator shutting down');
        started
            .then(async (close) => {
                await Promise.allSettled([close(), closeDb()]);
                process.exit(0);
            })
            .catch(() => process.exit(1));
    });
}
