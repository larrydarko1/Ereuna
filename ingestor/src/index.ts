/**
 * Ingestor entry point.
 * The service is one loop: wait for the market to open, hold a vendor socket
 * for that session, drop it at the close, wait again. It has no HTTP interface
 * beyond liveness and metrics, and it talks to exactly two things — MongoDB for
 * the ticker universe and the holiday calendar, Redis for everything it emits.
 * It must run as a single instance. A second one would double-subscribe
 * upstream and write every trade to the stream twice, and the aggregator has no
 * way to tell the copies apart.
 */
import 'dotenv/config';
import { type Server } from 'http';
import { startProbeServer } from '@ereuna/shared/service/probes';
import { isHoliday, isMarketHours } from '@/calendar.js';
import { config } from '@/lib/config.js';
import { closeDb, connectDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import { closeRedis } from '@/lib/redis.js';
import { runSession } from '@/tiingo.js';
import { loadUniverse } from '@/universe.js';

let stopping = false;
let probes: Server | undefined;

/**
 * Wait for the next session, run it, repeat.
 * The holiday check is first and cheap: on a closed day the loop should not be
 * reloading the ticker universe every ten seconds to decide it has no work.
 */
async function run(): Promise<void> {
    while (!stopping) {
        if (await isHoliday()) {
            await sleep(60_000);
            continue;
        }

        if (isMarketHours()) {
            const symbols = await loadUniverse();
            if (symbols.length === 0) {
                logger.warn('No listed symbols to subscribe to — waiting');
            } else {
                logger.info({ symbols: symbols.length }, 'Market open — starting a session');
                await runSession(symbols, () => stopping || !isMarketHours());
            }
        }

        await sleep(config.pollIntervalMs);
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Startup is all-or-nothing. Without Mongo there is no ticker universe and
 * therefore nothing to subscribe to, so a failure here kills the process with a
 * logged reason rather than leaving a loop that quietly does nothing.
 */
connectDb()
    .then(() => {
        probes = startProbeServer({
            port: config.probe.port,
            token: config.probe.token,
            onError: (err) => logger.error({ err }, 'Failed to render metrics'),
        });
        logger.info({ port: config.probe.port }, 'Probes listening');
        return run();
    })
    .catch((err: Error) => {
        logger.fatal({ err }, 'Ingestor failed');
        process.exit(1);
    });

/**
 * Graceful shutdown. The flag is what ends the session: `runSession` polls it
 * and unsubscribes upstream on the way out, so the vendor is told the
 * subscription is over rather than being left to time it out.
 */
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
        logger.info({ signal }, 'Shutting down');
        stopping = true;
        probes?.close();
        Promise.allSettled([closeDb(), closeRedis()])
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    });
}
