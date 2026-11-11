import { afterEach, assert, beforeEach, describe, expect, it, vi } from 'vitest';

import { isList, isRecord } from '@ereuna/shared';

import { buildMarket } from '@/simulator/traffic.js';
import { startVendor } from '@/simulator/vendor.js';

type Vendor = Awaited<ReturnType<typeof startVendor>>;
type Frame = Record<string, unknown>;
/** A real client on the simulator, recording every frame it receives. */
type Client = { socket: WebSocket; frames: Frame[] };

vi.mock('@/lib/logger.js', () => ({
    logger: { info: (): void => {}, warn: (): void => {}, error: (): void => {} },
}));

const NOW = Date.parse('2026-11-11T15:00:00.000Z');

let vendor: Vendor;
const clients: WebSocket[] = [];

/** A vendor busy enough to print on every tick: 1000 a second is 100 a tick. */
function startBusyVendor(): Promise<Vendor> {
    const market = buildMarket(
        [
            { symbol: 'AAPL', close: 200, volume: 1 },
            { symbol: 'MSFT', close: 400, volume: 1 },
        ],
        1000,
    );
    return startVendor({ port: 0, market, tradesPerSecond: 1000, random: Math.random, now: () => NOW });
}

async function connect(): Promise<Client> {
    const socket = new WebSocket(`ws://localhost:${vendor.port}`);
    clients.push(socket);
    const frames: Frame[] = [];
    socket.addEventListener('message', (event) => {
        const parsed: unknown = JSON.parse(String(event.data));
        if (isRecord(parsed)) frames.push(parsed);
    });
    await new Promise((resolve) => {
        socket.addEventListener('open', resolve);
    });
    return { socket, frames };
}

function send(client: Client, frame: Frame): void {
    client.socket.send(JSON.stringify(frame));
}

const subscribe = (tickers: string[]): Frame => ({
    eventName: 'subscribe',
    authorization: 'simulated',
    eventData: { thresholdLevel: 6, tickers },
});

const trades = (client: Client): Frame[] => client.frames.filter((frame) => frame['messageType'] === 'A');

// `vi.waitFor` advances fake timers while it polls, so trades keep printing during
// a wait: the protocol is asserted on the replies, never on a count of every frame
const replies = (client: Client): Frame[] =>
    client.frames.filter((frame) => frame['messageType'] === 'I' || frame['messageType'] === 'E');

/** Run the trade ticks for `ms`, then let the frames they sent arrive. */
async function advance(client: Client, ms: number): Promise<void> {
    const before = client.frames.length;
    vi.advanceTimersByTime(ms);
    await vi.waitFor(() => expect(client.frames.length).toBeGreaterThan(before));
}

beforeEach(async () => {
    // Only the intervals are faked: the sockets themselves run on real I/O
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    vendor = await startBusyVendor();
});

afterEach(async () => {
    for (const socket of clients.splice(0)) socket.close();
    await vendor.close();
    vi.useRealTimers();
});

describe('the simulated vendor', () => {
    it('acknowledges a subscribe with a subscription id, as the vendor does', async () => {
        const client = await connect();
        send(client, subscribe(['AAPL']));
        await vi.waitFor(() => expect(replies(client)).toHaveLength(1));
        expect(replies(client)[0]).toEqual({
            messageType: 'I',
            data: { subscriptionId: 1 },
            response: { code: 200, message: 'Success' },
        });
    });

    it('gives each connection its own subscription id', async () => {
        const first = await connect();
        const second = await connect();
        send(first, subscribe(['AAPL']));
        await vi.waitFor(() => expect(replies(first)).toHaveLength(1));
        send(second, subscribe(['AAPL']));
        await vi.waitFor(() => expect(replies(second)).toHaveLength(1));
        expect(replies(second)[0]).toMatchObject({ data: { subscriptionId: 2 } });
    });

    it.each([
        ['is not JSON', 'subscribe me'],
        ['carries no key', JSON.stringify({ eventName: 'subscribe', eventData: { tickers: ['AAPL'] } })],
        ['names no known event', JSON.stringify({ ...subscribe(['AAPL']), eventName: 'resubscribe' })],
    ])('refuses a request that %s', async (_label, raw) => {
        const client = await connect();
        client.socket.send(raw);
        await vi.waitFor(() => expect(replies(client)).toHaveLength(1));
        expect(replies(client)[0]).toMatchObject({ messageType: 'E', response: { code: 400 } });
    });

    it('prints trades for the subscribed symbols only, as consolidated-feed price frames', async () => {
        const client = await connect();
        send(client, subscribe(['aapl']));
        await vi.waitFor(() => expect(replies(client)).toHaveLength(1));

        await advance(client, 500);

        const printed = trades(client);
        expect(printed.length).toBeGreaterThan(0);
        for (const frame of printed) {
            expect(frame['service']).toBe('cons');
            const data = frame['data'];
            assert(isList(data));
            const [instant, ticker, price] = data;
            expect(ticker).toBe('aapl');
            expect(price).toBeGreaterThan(0);
            expect(Date.parse(String(instant))).toBe(NOW);
        }
    });

    it('prints nothing before a subscribe', async () => {
        const client = await connect();
        vi.advanceTimersByTime(500);
        send(client, subscribe(['AAPL']));
        await vi.waitFor(() => expect(replies(client)).toHaveLength(1));
        expect(client.frames[0]).toMatchObject({ messageType: 'I', data: { subscriptionId: 1 } });
    });

    it('sends a heartbeat every 30 seconds', async () => {
        const client = await connect();
        await advance(client, 30_000);
        expect(client.frames).toContainEqual({ messageType: 'H', response: { code: 200, message: 'HeartBeat' } });
    });

    it('answers an unsubscribe with the tickers left, and stops printing them', async () => {
        const client = await connect();
        send(client, subscribe(['AAPL', 'MSFT']));
        await vi.waitFor(() => expect(replies(client)).toHaveLength(1));

        send(client, {
            eventName: 'unsubscribe',
            authorization: 'simulated',
            eventData: { tickers: ['AAPL', 'MSFT'] },
        });
        await vi.waitFor(() => expect(replies(client)).toHaveLength(2));
        expect(replies(client)[1]).toEqual({
            messageType: 'I',
            data: { tickers: [], thresholdLevel: '6' },
            response: { code: 200, message: 'Success' },
        });

        // A socket delivers in order, so nothing printed after the reply means nothing printed after the unsubscribe
        const printedBefore = trades(client).length;
        vi.advanceTimersByTime(500);
        send(client, subscribe([]));
        await vi.waitFor(() => expect(replies(client)).toHaveLength(3));
        expect(trades(client)).toHaveLength(printedBefore);
    });

    it('drops its clients when it closes', async () => {
        const client = await connect();
        const closed = new Promise((resolve) => {
            client.socket.addEventListener('close', resolve);
        });
        await vendor.close();
        await expect(closed).resolves.toBeDefined();
        vendor = await startBusyVendor();
    });
});
