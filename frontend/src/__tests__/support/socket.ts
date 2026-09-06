/**
 * A stand-in for the shared Socket.IO connection.
 * The composables under test are about what they subscribe to and what they do
 * with what arrives; the transport underneath is covered by the gateway's own
 * suite. A suite mocks `@/api/socket` itself and hands back `socketModule()` —
 * the mock has to be declared in the file that needs it, because that is the
 * file the hoisting applies to.
 */
import { ref, type Ref } from 'vue';

type Handler = (...args: unknown[]) => void;

export type SocketStub = {
    emitted: { event: string; payload: unknown }[];
    on: (event: string, handler: Handler) => void;
    off: (event: string, handler: Handler) => void;
    emit: (event: string, payload: unknown) => void;
    deliver: (event: string, payload: unknown) => void;
    listeners: (event: string) => number;
    reset: () => void;
};

export const connected = ref(true);

export const socket: SocketStub = (() => {
    const handlers = new Map<string, Set<Handler>>();
    const emitted: { event: string; payload: unknown }[] = [];

    return {
        emitted,
        on: (event, handler) => {
            const set = handlers.get(event) ?? new Set<Handler>();
            set.add(handler);
            handlers.set(event, set);
        },
        off: (event, handler) => {
            handlers.get(event)?.delete(handler);
        },
        emit: (event, payload) => void emitted.push({ event, payload }),
        deliver: (event, payload) => {
            for (const handler of handlers.get(event) ?? []) handler(payload);
        },
        listeners: (event) => handlers.get(event)?.size ?? 0,
        reset: () => {
            handlers.clear();
            emitted.length = 0;
            connected.value = true;
        },
    };
})();

/** The shape `vi.mock('@/api/socket', socketModule)` should return. */
export function socketModule(): { useSocket: () => { socket: SocketStub; connected: Ref<boolean> } } {
    return { useSocket: () => ({ socket, connected }) };
}
