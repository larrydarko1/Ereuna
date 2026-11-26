import { Router } from 'express';
import { register } from 'prom-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { quietLogger, serve, type Harness } from '@/__tests__/support/http.js';
import { AppError } from '@/lib/app-error.js';
import { initMetrics, metricsEndpoint, metricsMiddleware } from '@/lib/metrics.js';

const TRADE_ID = '0123456789abcdef01234567';

let harness: Harness;

/**
 * Stands in for the trades router: mounted under a parameter of its own, one
 * route that answers and one the error handler answers for, after Express has
 * left the router.
 */
function tradesRouter(): Router {
    const trades = Router({ mergeParams: true });
    trades.delete('/:id', (_req, res) => {
        res.status(204).end();
    });
    trades.get('/', () => {
        throw new AppError(404, 'PORTFOLIO_NOT_FOUND', 'No such portfolio');
    });
    return trades;
}

/** Each `{ route, status }` the request histogram has counted, read from what a scrape receives. */
async function seen(): Promise<{ route: string; status: number }[]> {
    const text = await register.getSingleMetricAsString('http_request_duration_seconds');
    return [
        ...text.matchAll(/^http_request_duration_seconds_count\{method="\w+",route="([^"]+)",status="(\d+)"\}/gm),
    ].map(([, route = '', status = '']) => ({ route, status: Number(status) }));
}

beforeEach(async () => {
    register.resetMetrics();
    harness = await serve((app) => {
        app.use(quietLogger);
        app.use(metricsMiddleware());
        app.use('/api/portfolios/:number/trades', tradesRouter());
        app.use('/api/notes', (_req, _res, next) => {
            next(new AppError(401, 'MISSING_TOKEN', 'No access token'));
        });
        app.get('/probe', (_req, res) => {
            res.json({ ok: true });
        });
        app.get('/metrics', metricsEndpoint);
    });
});

afterEach(async () => {
    await harness.close();
});

describe('the route label', () => {
    it("names a route by its template, the mount's own parameter included", async () => {
        await harness.call(`/api/portfolios/0/trades/${TRADE_ID}`, { method: 'DELETE' });
        await harness.call(`/api/portfolios/1/trades/${TRADE_ID}`, { method: 'DELETE' });

        expect(await seen()).toEqual([{ route: '/api/portfolios/:number/trades/:id', status: 204 }]);
    });

    it('keeps the whole template when the error handler answers, after Express has left the router', async () => {
        await harness.call('/api/portfolios/0/trades');

        expect(await seen()).toEqual([{ route: '/api/portfolios/:number/trades', status: 404 }]);
    });

    it('names a request refused before any route ran by the route it was for', async () => {
        await harness.call('/api/notes');

        expect(await seen()).toEqual([{ route: '/api/notes', status: 401 }]);
    });

    it('names a route on the app itself by its path', async () => {
        await harness.call('/probe');

        expect(await seen()).toEqual([{ route: '/probe', status: 200 }]);
    });

    it('counts every path nothing serves as one series, so probing cannot mint new ones', async () => {
        await harness.call('/nothing/here');
        await harness.call('/or/here');

        expect(await seen()).toEqual([{ route: 'unknown', status: 404 }]);
    });
});

describe('the endpoint', () => {
    it('renders the register in the Prometheus text format', async () => {
        await harness.call('/probe');
        const response = await harness.call('/metrics');

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe(register.contentType);
        expect(response.text).toContain(
            'http_request_duration_seconds_count{method="GET",route="/probe",status="200"} 1',
        );
    });

    it('starts the process metrics once, however often it is asked', () => {
        initMetrics();
        initMetrics();

        expect(register.getSingleMetric('process_cpu_user_seconds_total')).toBeDefined();
    });
});
