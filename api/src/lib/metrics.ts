/**
 * Request metrics for the API, by the RED method: the rate, the errors and
 * the duration of every request, as one histogram labelled by method, route
 * template and status, beside the default process metrics.
 * The worker and the ingestor serve theirs from the shared probe listener on
 * a port of their own; the API already listens, so it serves `/metrics` from
 * its own app.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { collectDefaultMetrics, Histogram, register } from 'prom-client';

import { isRecord, routeOf } from '@ereuna/shared';

const httpDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

let initialized = false;

/** Start collecting the process metrics; safe to call twice, which prom-client itself is not. */
export function initMetrics(): void {
    if (initialized) return;
    collectDefaultMetrics();
    initialized = true;
}

/** Time every request to its finish, so a response the error handler sent counts too. */
export function metricsMiddleware(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
        const end = httpDuration.startTimer();
        res.on('finish', () => {
            end({ method: req.method, route: routeLabel(req), status: res.statusCode });
        });
        next();
    };
}

export async function metricsEndpoint(_req: Request, res: Response): Promise<void> {
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
}

/**
 * The route template a finished request was for, such as
 * `/api/portfolios/:number/trades/:id`.
 * An API route is looked up in the contract rather than rebuilt from
 * `req.baseUrl` + `req.route.path`. By the time a refusal finishes, Express
 * has left the router and emptied `req.baseUrl`, so every router's `/:id`
 * would share one series. A mount's own parameter would arrive as its value,
 * one series per portfolio. And a 401 or a 429 from the mount's middleware
 * never reaches a route at all.
 * A request matching nothing is 'unknown' rather than its URL: anyone probing
 * random paths would otherwise mint label values without limit.
 */
function routeLabel(req: Request): string {
    const contractRoute = routeOf(req.method, req.originalUrl.split('?')[0] ?? '');
    if (contractRoute !== undefined) return contractRoute.slice(contractRoute.indexOf(' ') + 1);

    // The probes and /metrics itself, which sit on the app outside any router
    const route: unknown = req.route;
    const routePath = isRecord(route) ? route['path'] : undefined;
    if (typeof routePath !== 'string') return 'unknown';
    return routePath;
}
