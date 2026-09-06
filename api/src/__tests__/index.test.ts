/**
 * The entry point, driven as a module rather than as a process.
 * `index.ts` boots on import: it connects, attaches the gateway and binds a
 * port. The HTTP server is therefore stubbed — the point of these tests is the
 * order of the sequence and what happens when a step fails, not that Node can
 * open a socket — while the Express app itself is the real one, mounted on a
 * throwaway listener so the middleware stack answers real requests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type { Express } from 'express';

type Listener = () => void;

const state: {
    connectError: Error | null;
    socketError: Error | null;
    pingError: Error | null;
    order: string[];
} = { connectError: null, socketError: null, pingError: null, order: [] };

const httpServer = {
    headersTimeout: 0,
    requestTimeout: 0,
    listen: vi.fn((_port: number, done?: Listener) => {
        state.order.push('listen');
        done?.();
        return httpServer;
    }),
    close: vi.fn((done?: Listener) => {
        state.order.push('server.close');
        done?.();
        return httpServer;
    }),
};

vi.mock('dotenv/config', () => ({}));
vi.mock('http', () => ({ createServer: () => httpServer }));
vi.mock('@/lib/db.js', () => ({
    connectDb: () => {
        state.order.push('connectDb');
        return state.connectError === null ? Promise.resolve() : Promise.reject(state.connectError);
    },
    closeDb: () => {
        state.order.push('closeDb');
        return Promise.resolve();
    },
    getDb: () => ({
        command: () => (state.pingError === null ? Promise.resolve({ ok: 1 }) : Promise.reject(state.pingError)),
    }),
}));
vi.mock('@/lib/redis.js', () => ({
    closeRedis: () => {
        state.order.push('closeRedis');
        return Promise.resolve();
    },
    getRedis: () => ({ eval: () => Promise.resolve([1, 99, 0]) }),
}));
vi.mock('@/gateway/index.js', () => ({
    initSocket: () => {
        state.order.push('initSocket');
        return state.socketError === null ? Promise.resolve() : Promise.reject(state.socketError);
    },
    closeSocket: () => {
        state.order.push('closeSocket');
        return Promise.resolve();
    },
}));
// The limiters are the one middleware here that needs a live Redis; the tiers
// themselves are covered in `lib/__tests__/rate-limiters.test.ts`.
vi.mock('@/lib/rate-limiters.js', () => {
    const pass = (_req: unknown, _res: unknown, next: () => void): void => next();
    return { strictLimiter: pass, standardLimiter: pass, relaxedLimiter: pass, assetLimiter: pass };
});
vi.mock('@/lib/logger.js', () => {
    const logger = {
        info: () => {},
        debug: () => {},
        warn: () => {},
        error: (_ctx: unknown, message: string) => logs.push(message),
        fatal: (_ctx: unknown, message: string) => logs.push(message),
        child: () => logger,
    };
    return { logger };
});

const logs: string[] = [];
const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

/** Boot a fresh copy of the entry point and wait for its startup chain to settle. */
async function boot(): Promise<Express> {
    vi.resetModules();
    const module = await import('@/index.js');
    await vi.waitFor(() => expect(state.order.length).toBeGreaterThan(0));
    return module.app;
}

let harness: { url: string; server: Server } | null = null;

/**
 * Mount the booted app on a real listener so requests go through the real stack.
 * `importActual` because the `http` mock above covers `node:http` too, and this
 * is the one place that wants the real one.
 */
async function listen(app: Express): Promise<string> {
    const { createServer } = await vi.importActual<typeof import('node:http')>('node:http');
    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
    harness = { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, server };
    return harness.url;
}

beforeEach(() => {
    state.connectError = null;
    state.socketError = null;
    state.pingError = null;
    state.order = [];
    logs.length = 0;
    exit.mockClear();
    httpServer.listen.mockClear();
    httpServer.close.mockClear();
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
});

afterEach(async () => {
    if (harness !== null) {
        const { server } = harness;
        harness = null;
        await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
});

describe('startup', () => {
    it('connects, attaches the gateway, then binds — in that order', async () => {
        await boot();
        await vi.waitFor(() => expect(state.order).toEqual(['connectDb', 'initSocket', 'listen']));
    });

    it('sets the protocol-attack timeouts explicitly', async () => {
        await boot();

        expect(httpServer.headersTimeout).toBe(60_000);
        expect(httpServer.requestTimeout).toBe(120_000);
    });

    it('never binds when the database is unreachable', async () => {
        state.connectError = new Error('no mongo');
        await boot();

        await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
        expect(httpServer.listen).not.toHaveBeenCalled();
        expect(logs).toContain('API startup failed');
    });

    it('never binds when the gateway will not start', async () => {
        state.socketError = new Error('no redis');
        await boot();

        await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
        expect(httpServer.listen).not.toHaveBeenCalled();
    });
});

describe('the middleware stack', () => {
    it('sends the security headers helmet is configured for', async () => {
        const url = await listen(await boot());
        const response = await fetch(`${url}/livez`);

        expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
        expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
        expect(response.headers.get('x-frame-options')).toBe('DENY');
        expect(response.headers.get('x-content-type-options')).toBe('nosniff');
        expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
        expect(response.headers.get('strict-transport-security')).toBe('max-age=31536000; includeSubDomains');
    });

    it('sets the Permissions-Policy helmet does not', async () => {
        const url = await listen(await boot());
        const response = await fetch(`${url}/livez`);

        expect(response.headers.get('permissions-policy')).toBe('camera=(), microphone=(), geolocation=(), payment=()');
    });

    it('binds a correlation id to every response', async () => {
        const url = await listen(await boot());
        const response = await fetch(`${url}/livez`);

        expect(response.headers.get('x-request-id')).not.toBeNull();
    });

    it('answers a preflight from the app origin', async () => {
        const { config } = await import('@/lib/config.js');
        const url = await listen(await boot());
        const response = await fetch(`${url}/api/notes`, {
            method: 'OPTIONS',
            headers: { 'origin': config.corsOrigin, 'access-control-request-method': 'GET' },
        });

        expect(response.headers.get('access-control-allow-origin')).toBe(config.corsOrigin);
        expect(response.headers.get('access-control-allow-credentials')).toBe('true');
    });
});

describe('the route table', () => {
    it.each([
        '/api/account',
        '/api/preferences',
        '/api/screeners',
        '/api/watchlists',
        '/api/portfolios',
        '/api/portfolios/0/trades',
        '/api/charts/search?q=a',
        '/api/notes',
        '/api/market/stats',
    ])('refuses %s without a token', async (path) => {
        const url = await listen(await boot());
        const response = await fetch(`${url}${path}`);

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({ error: 'MISSING_TOKEN' });
    });

    it('serves logos without a token — an <img src> cannot carry one', async () => {
        const url = await listen(await boot());
        const response = await fetch(`${url}/api/logos/NASDAQ/NOSUCH.svg`);

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({ error: 'NOT_FOUND' });
    });

    it('answers an unknown path with a 404 rather than a stack trace', async () => {
        const url = await listen(await boot());
        const response = await fetch(`${url}/api/nothing-here`);

        expect(response.status).toBe(404);
        expect(await response.text()).not.toContain('at ');
    });
});

describe('the probes', () => {
    it('reports live without touching the database', async () => {
        const url = await listen(await boot());
        const response = await fetch(`${url}/livez`);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ ok: true });
    });

    it('pings the database for readiness', async () => {
        const url = await listen(await boot());
        const response = await fetch(`${url}/healthz`);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ ok: true });
    });

    it('answers 503 when the ping fails — a status code, not an AppError', async () => {
        state.pingError = new Error('no mongo');
        const url = await listen(await boot());
        const response = await fetch(`${url}/healthz`);

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toEqual({ ok: false });
    });
});

describe('graceful shutdown', () => {
    it.each(['SIGTERM', 'SIGINT'] as const)('closes the gateway before the server on %s', async (signal) => {
        await boot();
        await vi.waitFor(() => expect(state.order).toContain('listen'));
        state.order = [];

        process.emit(signal);

        await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
        expect(state.order.slice(0, 2)).toEqual(['closeSocket', 'server.close']);
        expect(state.order).toContain('closeDb');
        expect(state.order).toContain('closeRedis');
    });
});
