import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { register } from 'prom-client';
import { TIINGO_STREAM, TIINGO_STREAM_MAXLEN } from '@ereuna/shared';

/**
 * A WebSocket double. `runSession` drives a browser-shaped socket, so the test
 * drives it back: `open`, `message` and `close` are pushed in from outside, and
 * everything the session sent is recorded.
 */
class FakeSocket {
    static last: FakeSocket | null = null;

    readonly sent: string[] = [];
    closed = false;
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: unknown }) => void) | null = null;
    onerror: (() => void) | null = null;
    onclose: (() => void) | null = null;

    constructor(readonly url: string) {
        FakeSocket.last = this;
    }

    send(payload: string): void {
        this.sent.push(payload);
    }

    close(): void {
        this.closed = true;
        this.onclose?.();
    }

    /** What the session sent, parsed, so assertions read the protocol not the JSON. */
    events(): { eventName?: string; eventData?: Record<string, unknown> }[] {
        return this.sent.map((raw) => JSON.parse(raw) as { eventName?: string });
    }
}

const redis: { xadd: ReturnType<typeof vi.fn> } = { xadd: vi.fn(() => Promise.resolve('1-0')) };
const logged: { errors: unknown[]; warnings: unknown[] } = { errors: [], warnings: [] };

vi.mock('@/lib/redis.js', () => ({ getRedis: () => redis }));
vi.mock('@/lib/logger.js', () => ({
    logger: {
        error: (payload: unknown): void => {
            logged.errors.push(payload);
        },
        warn: (payload: unknown): void => {
            logged.warnings.push(payload);
        },
        info: (): void => {},
        debug: (): void => {},
    },
}));

const { config } = await import('@/lib/config.js');

let runSession: typeof import('@/tiingo.js').runSession;

const ACK = JSON.stringify({ data: { subscriptionId: 77 } });
const trade = (extra: Record<string, unknown> = {}): string =>
    JSON.stringify({ messageType: 'A', service: 'iex', data: [1, 'AAPL', 100], ...extra });

/** Open a session, complete the handshake, and hand back the socket driving it. */
async function connected(
    shouldStop: () => boolean = () => false,
): Promise<{ socket: FakeSocket; done: Promise<void> }> {
    const done = runSession(['AAPL'], shouldStop);
    const socket = FakeSocket.last as FakeSocket;
    socket.onopen?.();
    socket.onmessage?.({ data: ACK });
    await Promise.resolve();
    return { socket, done };
}

beforeEach(async () => {
    FakeSocket.last = null;
    redis.xadd = vi.fn(() => Promise.resolve('1-0'));
    logged.errors = [];
    logged.warnings = [];
    vi.stubGlobal('WebSocket', FakeSocket);
    vi.useFakeTimers();

    // The counters are registered at import against a process-global registry
    register.clear();
    vi.resetModules();
    ({ runSession } = await import('@/tiingo.js'));
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('the handshake', () => {
    it('opens the configured vendor socket', () => {
        void runSession(['AAPL'], () => false);
        expect(FakeSocket.last?.url).toBe(config.tiingo.url);
    });

    it('subscribes with the key, the threshold and the ticker list', () => {
        void runSession(['AAPL', 'MSFT'], () => false);
        FakeSocket.last?.onopen?.();

        const [subscribe] = (FakeSocket.last as FakeSocket).events();
        expect(subscribe).toEqual({
            eventName: 'subscribe',
            authorization: config.tiingo.key,
            eventData: { thresholdLevel: config.tiingo.thresholdLevel, tickers: ['AAPL', 'MSFT'] },
        });
    });

    it('closes when the vendor never acknowledges', async () => {
        const done = runSession(['AAPL'], () => false);
        FakeSocket.last?.onopen?.();

        await vi.advanceTimersByTimeAsync(config.tiingo.handshakeTimeoutMs);
        await expect(done).resolves.toBeUndefined();
        expect(logged.errors).toHaveLength(1);
    });

    it('reports a rejected subscription and keeps waiting rather than relaying', async () => {
        void runSession(['AAPL'], () => false);
        FakeSocket.last?.onopen?.();
        FakeSocket.last?.onmessage?.({ data: JSON.stringify({ response: { code: 401, message: 'invalid key' } }) });
        await Promise.resolve();

        expect(logged.warnings).toHaveLength(1);
        expect(redis.xadd).not.toHaveBeenCalled();
    });

    it('ignores a message that is not JSON while waiting for the acknowledgement', async () => {
        void runSession(['AAPL'], () => false);
        FakeSocket.last?.onopen?.();
        FakeSocket.last?.onmessage?.({ data: 'not json' });
        await Promise.resolve();
        expect(redis.xadd).not.toHaveBeenCalled();
    });

    it('ignores a non-string frame', async () => {
        const { socket } = await connected();
        socket.onmessage?.({ data: new ArrayBuffer(8) });
        await Promise.resolve();
        expect(redis.xadd).not.toHaveBeenCalled();
    });
});

describe('relaying', () => {
    it('writes a trade verbatim to the stream — the aggregator owns the payload shape', async () => {
        const { socket } = await connected();
        const raw = trade();
        socket.onmessage?.({ data: raw });
        await vi.advanceTimersByTimeAsync(0);

        expect(redis.xadd).toHaveBeenCalledWith(TIINGO_STREAM, 'MAXLEN', '~', TIINGO_STREAM_MAXLEN, '*', 'data', raw);
    });

    it.each([
        ['a heartbeat', JSON.stringify({ messageType: 'H' })],
        ['an info frame', JSON.stringify({ messageType: 'I' })],
        ['another message type', JSON.stringify({ messageType: 'E', service: 'iex', data: [1, 'AAPL', 1] })],
        ['another service', JSON.stringify({ messageType: 'A', service: 'crypto', data: [1, 'BTC', 1] })],
        ['no data array', JSON.stringify({ messageType: 'A', service: 'iex' })],
        ['a truncated data array', JSON.stringify({ messageType: 'A', service: 'iex', data: [1, 'AAPL'] })],
        ['malformed JSON', '{'],
    ])('does not relay %s', async (_label, payload) => {
        const { socket } = await connected();
        socket.onmessage?.({ data: payload });
        await vi.advanceTimersByTimeAsync(0);
        expect(redis.xadd).not.toHaveBeenCalled();
    });

    it('logs a failed write and stays on the socket — ioredis reconnects on its own', async () => {
        redis.xadd = vi.fn(() => Promise.reject(new Error('connection lost')));
        const { socket } = await connected();
        socket.onmessage?.({ data: trade() });
        await vi.advanceTimersByTimeAsync(0);

        expect(logged.errors).toHaveLength(1);
        expect(socket.closed).toBe(false);
    });
});

describe('ending the session', () => {
    it('unsubscribes before closing, so the vendor is told rather than timing it out', async () => {
        let stop = false;
        const { socket, done } = await connected(() => stop);

        stop = true;
        await vi.advanceTimersByTimeAsync(1_000);
        await done;

        expect(socket.events().map((event) => event.eventName)).toEqual(['subscribe', 'unsubscribe']);
        expect(socket.events()[1]?.eventData).toEqual({ subscriptionId: 77, tickers: ['AAPL'] });
        expect(socket.closed).toBe(true);
    });

    it('closes without an unsubscribe when it never got a subscription id', async () => {
        let stop = false;
        const done = runSession(['AAPL'], () => stop);
        FakeSocket.last?.onopen?.();

        stop = true;
        await vi.advanceTimersByTimeAsync(1_000);
        await done;

        expect((FakeSocket.last as FakeSocket).events().map((event) => event.eventName)).toEqual(['subscribe']);
    });

    it('stops only once however long the stop signal stays raised', async () => {
        const { socket, done } = await connected(() => true);
        await vi.advanceTimersByTimeAsync(5_000);
        await done;
        expect(socket.events().filter((event) => event.eventName === 'unsubscribe')).toHaveLength(1);
    });

    it('resolves when the socket closes under it, rather than rejecting', async () => {
        const { socket, done } = await connected();
        socket.close();
        await expect(done).resolves.toBeUndefined();
    });

    it('logs a socket error and lets the close that follows end the session', async () => {
        const { socket, done } = await connected();
        socket.onerror?.();
        expect(logged.errors).toHaveLength(1);

        socket.close();
        await done;
    });

    it('stops polling once closed', async () => {
        let polled = 0;
        const { socket, done } = await connected(() => {
            polled += 1;
            return false;
        });
        socket.close();
        await done;

        polled = 0;
        await vi.advanceTimersByTimeAsync(5_000);
        expect(polled).toBe(0);
    });
});
