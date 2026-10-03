import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (...args: unknown[]) => void;

/** A stand-in for the Socket.IO client: this suite is about the sharing and the
 *  lifecycle around the socket, not about the transport underneath it. */
class FakeSocket {
    static instances: FakeSocket[] = [];
    readonly handlers = new Map<string, Handler>();
    readonly url: string;
    readonly options: Record<string, unknown>;
    connected = false;
    connects = 0;
    disconnects = 0;

    constructor(url: string, options: Record<string, unknown>) {
        this.url = url;
        this.options = options;
        FakeSocket.instances.push(this);
    }

    on(event: string, handler: Handler): this {
        this.handlers.set(event, handler);
        return this;
    }

    connect(): void {
        this.connects += 1;
        this.connected = true;
        this.handlers.get('connect')?.();
    }

    disconnect(): void {
        this.disconnects += 1;
        this.connected = false;
        this.handlers.get('disconnect')?.();
    }
}

vi.mock('socket.io-client', () => ({
    io: (url: string, options: Record<string, unknown>) => new FakeSocket(url, options),
}));

const { clearAuth, setAccessToken, setSessionUser } = await import('@/api/client');
const { useSocket } = await import('@/api/socket');

const user = {
    id: '507f1f77bcf86cd799439011',
    username: 'larry',
    language: 'en',
    twoFactorEnabled: false,
    passwordResetRequired: false,
};

/** The fake behind a socket `useSocket` handed out, found by identity rather than cast to. */
function fakeOf(socket: unknown): FakeSocket {
    const fake = FakeSocket.instances.find((instance) => instance === socket);
    if (fake === undefined) throw new Error('the socket did not come from the mocked client');
    return fake;
}

/** The `auth` option: a callback Socket.IO calls with the function that takes the handshake payload. */
function isAuthOption(value: unknown): value is (callback: (data: unknown) => void) => void {
    return typeof value === 'function';
}

beforeEach(() => {
    // The connection is module state and there is deliberately one per tab, so
    // each test starts by ending the session that would otherwise share it.
    clearAuth();
    localStorage.clear();
    setAccessToken(null);
    FakeSocket.instances = [];
});

describe('useSocket', () => {
    it('opens one connection for the whole tab, however many callers ask', () => {
        setSessionUser(user);

        const first = useSocket();
        const second = useSocket();

        expect(first.socket).toBe(second.socket);
        expect(fakeOf(first.socket).connects).toBe(1);
    });

    it('connects only once a session exists', () => {
        const { socket } = useSocket();

        expect(fakeOf(socket).connects).toBe(0);
    });

    it('reads the token at connect time, so a reconnect presents the current one', () => {
        setSessionUser(user);
        setAccessToken('first');
        const { socket } = useSocket();
        const auth = fakeOf(socket).options['auth'];
        if (!isAuthOption(auth)) throw new Error('the socket was opened without an auth callback');

        let handed: unknown;
        auth((data) => {
            handed = data;
        });
        expect(handed).toEqual({ token: 'first' });

        setAccessToken('second');
        auth((data) => {
            handed = data;
        });
        expect(handed).toEqual({ token: 'second' });
    });

    it('does not connect on its own — the app decides when', () => {
        const { socket } = useSocket();

        expect(fakeOf(socket).options['autoConnect']).toBe(false);
    });

    it('tracks whether the connection is up', () => {
        setSessionUser(user);
        const { socket, connected } = useSocket();

        expect(connected.value).toBe(true);

        fakeOf(socket).disconnect();
        expect(connected.value).toBe(false);
    });

    it('drops the socket when the session ends, so it cannot outlive the user who opened it', () => {
        setSessionUser(user);
        const first = fakeOf(useSocket().socket);

        clearAuth();

        expect(first.disconnects).toBe(1);
        setSessionUser(user);
        expect(useSocket().socket).not.toBe(first);
    });
});
