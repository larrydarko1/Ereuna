/**
 * The shared Socket.IO connection — one per tab, for the live market feed.
 * Opened lazily by the first composable that needs it and reused by the rest,
 * so a chart and a positions table cost one handshake between them rather than
 * one each. The access token is read at connect time rather than captured, so a
 * reconnect after a silent refresh presents the token that is current then.
 * The connection dies with the session: `onSessionCleared` drops it, because a
 * socket authenticated as the previous user must not survive a sign-out.
 */
import { ref, readonly, type DeepReadonly, type Ref } from 'vue';
import { io, type Socket } from 'socket.io-client';
import { findAccessToken, isAuthenticated, onSessionCleared } from '@/api/client';

export type UseSocketReturn = {
    socket: Socket;
    connected: DeepReadonly<Ref<boolean>>;
};

let socket: Socket | null = null;
const connected = ref(false);

export function useSocket(): UseSocketReturn {
    const active = createSocket();
    if (isAuthenticated() && !active.connected) active.connect();
    return { socket: active, connected: readonly(connected) };
}

export function disconnectSocket(): void {
    if (socket === null) return;
    socket.disconnect();
    socket = null;
    connected.value = false;
}

function createSocket(): Socket {
    if (socket !== null) return socket;

    socket = io(window.location.origin, {
        path: '/socket.io',
        autoConnect: false,
        auth: (cb: (data: { token: string | null }) => void): void => cb({ token: findAccessToken() }),
    });

    socket.on('connect', () => {
        connected.value = true;
    });
    socket.on('disconnect', () => {
        connected.value = false;
    });

    return socket;
}

onSessionCleared(disconnectSocket);
