/**
 * Entry point for the Ereuna API server.
 * Startup sequence:
 *  1. Load environment variables — must precede any module that reads config.
 *  2. Register middleware, in this order (order is load-bearing):
 *       helmet       — secure response headers
 *       cors         — the single allowed frontend origin
 *       json         — body parsing, with an explicit size cap
 *       cookieParser — the httpOnly refresh cookie
 *       requestId    — correlation id + request-scoped logger
 *       sanitizer    — strips $-prefixed and dotted keys from body and query
 *       optionalAuth — resolves the token BEFORE the limiters, so they key by user
 *       rate limits  — applied per route group below
 *  3. Connect to MongoDB and apply the index manifest.
 *  4. Bind the port only once the database is up.
 */
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import { config } from '@/lib/config.js';
import { closeDb, connectDb, getDb } from '@/lib/db.js';
import { logger } from '@/lib/logger.js';
import { relaxedLimiter, standardLimiter, strictLimiter } from '@/lib/rate-limiters.js';
import { closeRedis } from '@/lib/redis.js';
import { optionalAuth, requireAuth } from '@/middleware/auth.js';
import { errorHandler } from '@/middleware/error-handler.js';
import { requestId } from '@/middleware/request-id.js';
import { sanitizeRequest } from '@/middleware/sanitizer.js';
import { chartsRouter } from '@/routes/chart/index.js';
import { marketRouter } from '@/routes/market/index.js';
import { notesRouter } from '@/routes/note/index.js';
import { accountRouter, authRouter, preferencesRouter } from '@/routes/identity/index.js';
import { portfoliosRouter, tradesRouter } from '@/routes/portfolio/index.js';
import { screenersRouter } from '@/routes/screener/index.js';
import { watchlistsRouter } from '@/routes/watchlist/index.js';

const app = express();
const server = createServer(app);

/** A numeric hop count, never `true` — otherwise a client can spoof
 *  X-Forwarded-For and defeat every req.ip-keyed control. */
app.set('trust proxy', config.trustProxyHops);

/**
 * Protocol-attack timeouts. Both are set explicitly because the runtime
 * defaults have moved across Node majors, and `0` means "never time out".
 * 60 s of headers is what defeats slowloris; no legitimate client needs longer.
 */
server.headersTimeout = 60_000;
server.requestTimeout = 120_000;

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                // No third-party scripts. No unsafe-inline, no eval.
                scriptSrc: ["'self'"],
                // Vue's dynamic :style bindings render as inline style
                // attributes, which a nonce or hash cannot cover. Scoped to
                // styles only — inline styles cannot execute JavaScript.
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'blob:'],
                connectSrc: ["'self'", config.corsOrigin],
                frameSrc: ["'none'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                frameAncestors: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
            },
        },
        frameguard: { action: 'deny' },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        noSniff: true,
        strictTransportSecurity: {
            maxAge: 31_536_000, // 1 year
            includeSubDomains: true,
            // Written explicitly rather than omitted: preload is hard to
            // reverse and forces HTTPS on every future subdomain, so switching
            // it on should be a reviewable one-line diff.
            preload: false,
        },
    }),
);

// helmet has no Permissions-Policy support — set it directly.
app.use((_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    next();
});

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(requestId);
app.use(sanitizeRequest);
app.use(optionalAuth);

app.use('/api/auth', strictLimiter, authRouter);
app.use('/api/account', standardLimiter, requireAuth, accountRouter);
app.use('/api/preferences', standardLimiter, requireAuth, preferencesRouter);
app.use('/api/screeners', relaxedLimiter, requireAuth, screenersRouter);
app.use('/api/watchlists', standardLimiter, requireAuth, watchlistsRouter);
app.use('/api/portfolios/:number/trades', standardLimiter, requireAuth, tradesRouter);
app.use('/api/portfolios', standardLimiter, requireAuth, portfoliosRouter);
app.use('/api/charts', relaxedLimiter, requireAuth, chartsRouter);
app.use('/api/notes', standardLimiter, requireAuth, notesRouter);
app.use('/api/market', relaxedLimiter, requireAuth, marketRouter);


app.get('/healthz', async (_req: express.Request, res: express.Response) => {
    try {
        await getDb().command({ ping: 1 });
        res.json({ ok: true });
    } catch {
        // A kubelet probe, not a client-facing error — a bare ok/503, no AppError.
        res.status(503).json({ ok: false });
    }
});

app.get('/livez', (_req: express.Request, res: express.Response) => {
    res.json({ ok: true });
});

// Must be registered after every route: Express finds it by its 4-arg signature.
app.use(errorHandler);

/**
 * Startup is all-or-nothing. A half-booted server that accepts requests with no
 * database behind it fails every one of them with a 500 that says nothing about
 * the cause, so a failure here kills the process with a logged reason instead.
 */
const startup = connectDb().then(() => {
    server.listen(config.port, () => logger.info({ port: config.port }, 'API listening'));
});

startup.catch((err: Error) => {
    logger.fatal({ err }, 'API startup failed');
    process.exit(1);
});

/**
 * Graceful shutdown: stop accepting connections, then close Mongo and Redis so
 * in-flight queries drain rather than being severed mid-write.
 */
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
        logger.info({ signal }, 'Shutting down');
        server.close(() => {
            Promise.allSettled([closeDb(), closeRedis()])
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
        });
    });
}

export { app };
