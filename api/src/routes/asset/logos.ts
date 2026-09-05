/**
 * Ticker logo route — mounted at /api/logos (the one route with no authentication)
 * GET /api/logos/:exchange/:file — one ticker's mark, as SVG
 *
 * These ~28,000 icons used to sit in the frontend's `public/`, which copied
 * 151 MB into every build. Serving them off the API's disk keeps one origin and
 * one deploy unit with no CDN and no bucket, and the frontend asks for them
 * with a relative path, so nothing has to know where the API lives.
 * Unauthenticated by design: the browser fetches these through `<img src>`,
 * which cannot carry a bearer token, and a company's mark is no more private
 * than its last traded price. What guards them instead is a same-origin check,
 * an allow-list on both path segments, and `sendFile`'s confinement to `root`.
 * A missing file answers a bare 404 rather than an `AppError`: most tickers
 * have no mark, so the miss is the ordinary case and one warning per miss would
 * drown the log.
 */
import { Router, type Request } from 'express';
import { z } from 'zod';
import { AppError } from '@/lib/app-error.js';
import { config } from '@/lib/config.js';
import { validated } from '@/middleware/validate.js';

/** Both segments are allow-listed rather than escaped: neither pattern can
 *  express a separator or a dot segment, so no path can leave the root. The
 *  colon is in the symbol set because the crypto pairs use it (`XAUT:USD`). */
const logoParams = z.object({
    exchange: z.string().regex(/^[A-Z]{2,10}$/),
    file: z.string().regex(/^[A-Z0-9][A-Z0-9.:-]{0,14}\.svg$/),
});

/** An SVG is a document, not just a picture: served from the API's own origin
 *  it would otherwise run whatever it contains. Nothing here needs to load, so
 *  nothing is allowed to. */
const SVG_SANDBOX = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

export const router = Router();

/** True when the request came from the app, or carries no hint either way —
 *  an `<img>` sends no Origin, and a browser set to withhold the referrer
 *  sends neither. Failing open on absence keeps those users' logos loading;
 *  a header that IS present and belongs to someone else is refused. */
function isSameOrigin(req: Request): boolean {
    const { origin, referer } = req.headers;
    if (origin !== undefined && origin !== '') return origin === config.corsOrigin;
    if (referer !== undefined && referer !== '') {
        try {
            return new URL(referer).origin === config.corsOrigin;
        } catch {
            return false;
        }
    }
    return true;
}

router.get(
    '/:exchange/:file',
    ...validated({ params: logoParams }, (req, res): void => {
        if (!isSameOrigin(req)) {
            throw new AppError(403, 'FORBIDDEN', 'Disallowed origin for logo access', {
                logContext: { op: 'logo.access' },
                securityEvent: true,
            });
        }

        res.setHeader('Content-Security-Policy', SVG_SANDBOX);
        res.sendFile(
            `${req.params.exchange}/${req.params.file}`,
            {
                root: config.logos.dir,
                maxAge: config.logos.maxAge * 1000,
                dotfiles: 'deny',
            },
            (err?: Error): void => {
                if (err === undefined) return;
                // The bytes were already going out — there is no status left to
                // set, only a socket to drop.
                if (res.headersSent) {
                    res.destroy();
                    return;
                }
                // eslint-disable-next-line no-restricted-syntax -- sendFile's callback runs after the handler returned; there is no error middleware left to reach
                res.status(404).json({ error: 'NOT_FOUND' });
            },
        );
    }),
);
