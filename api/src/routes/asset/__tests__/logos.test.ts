import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { quietLogger, serve, type Harness } from '@/__tests__/support/http.js';

const ORIGIN = 'http://localhost:5173';
const MARK = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/></svg>';

// A real directory rather than a stubbed `sendFile`: the confinement to `root`
// is the second half of what guards this route, and only the real one has it.
const root = await mkdtemp(path.join(tmpdir(), 'ereuna-logos-'));

vi.mock('@/lib/config.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/config.js')>();
    return { config: { ...actual.config, corsOrigin: ORIGIN, logos: { dir: root, maxAge: 3600 } } };
});

const { router } = await import('@/routes/asset/logos.js');

let harness: Harness;

beforeAll(async () => {
    await mkdir(path.join(root, 'NASDAQ'), { recursive: true });
    await writeFile(path.join(root, 'NASDAQ', 'AAPL.svg'), MARK);
    await writeFile(path.join(root, 'NASDAQ', '.hidden.svg'), MARK);
    await writeFile(path.join(root, 'secret.svg'), MARK);
});

afterAll(async () => {
    await rm(root, { recursive: true, force: true });
});

beforeEach(async () => {
    harness = await serve((app) => app.use('/api/logos', quietLogger, router));
});

afterEach(async () => {
    await harness.close();
});

describe('GET /api/logos/:exchange/:file', () => {
    it('serves the mark off disk', async () => {
        const response = await harness.call('/api/logos/NASDAQ/AAPL.svg');

        expect(response.status).toBe(200);
        expect(response.text).toBe(MARK);
    });

    it('sandboxes the SVG — nothing it names is allowed to load', async () => {
        const response = await harness.call('/api/logos/NASDAQ/AAPL.svg');

        expect(response.headers.get('content-security-policy')).toBe(
            "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        );
    });

    it('lets the browser cache it', async () => {
        const response = await harness.call('/api/logos/NASDAQ/AAPL.svg');

        expect(response.headers.get('cache-control')).toContain('max-age=3600');
    });

    it('answers a bare 404 for a ticker with no mark — most tickers have none', async () => {
        const response = await harness.call('/api/logos/NASDAQ/NOSUCH.svg');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'NOT_FOUND' });
    });

    it('serves the request when it carries the app origin', async () => {
        const response = await harness.call('/api/logos/NASDAQ/AAPL.svg', { headers: { origin: ORIGIN } });

        expect(response.status).toBe(200);
    });

    it('serves an <img> request, which carries neither origin nor referer', async () => {
        const response = await harness.call('/api/logos/NASDAQ/AAPL.svg');

        expect(response.status).toBe(200);
    });

    it('refuses an origin that belongs to someone else', async () => {
        const response = await harness.call('/api/logos/NASDAQ/AAPL.svg', {
            headers: { origin: 'https://evil.example' },
        });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: 'FORBIDDEN' });
    });

    it('accepts a referer from the app when there is no origin header', async () => {
        const response = await harness.call('/api/logos/NASDAQ/AAPL.svg', {
            headers: { referer: `${ORIGIN}/charts/AAPL` },
        });

        expect(response.status).toBe(200);
    });

    it('refuses a referer from another site', async () => {
        const response = await harness.call('/api/logos/NASDAQ/AAPL.svg', {
            headers: { referer: 'https://evil.example/page' },
        });

        expect(response.status).toBe(403);
    });

    it('refuses a referer that is not a URL', async () => {
        const response = await harness.call('/api/logos/NASDAQ/AAPL.svg', { headers: { referer: 'not a url' } });

        expect(response.status).toBe(403);
    });

    it('refuses a traversal in the exchange segment', async () => {
        const response = await harness.call('/api/logos/..%2F..%2Fetc/AAPL.svg');

        expect(response.status).toBe(422);
    });

    it('refuses a traversal in the file segment', async () => {
        const response = await harness.call('/api/logos/NASDAQ/..%2Fsecret.svg');

        expect(response.status).toBe(422);
    });

    it('refuses a lowercase exchange — the allow-list is the whole defence', async () => {
        const response = await harness.call('/api/logos/nasdaq/AAPL.svg');

        expect(response.status).toBe(422);
    });

    it('refuses anything that is not an svg', async () => {
        const response = await harness.call('/api/logos/NASDAQ/AAPL.png');

        expect(response.status).toBe(422);
    });

    it('refuses a dotfile', async () => {
        const response = await harness.call('/api/logos/NASDAQ/.hidden.svg');

        expect(response.status).toBe(422);
    });

    it('allows the colon the crypto pairs use', async () => {
        const response = await harness.call('/api/logos/NASDAQ/XAUT%3AUSD.svg');

        expect(response.status).toBe(404);
    });
});
