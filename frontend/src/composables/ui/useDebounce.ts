/**
 * Debounce and throttle, as composables that clean up after themselves.
 * The difference matters: debounce waits for the user to STOP (a search box),
 * throttle fires at a steady rate no matter what (scroll, resize, a live
 * chart crosshair).
 * Both auto-cancel on scope disposal. Without that, a pending timer fires into
 * an unmounted component and touches refs that no longer exist — silent, and
 * miserable to trace back.
 * These are UX tools, not controls. The API rate-limits regardless, because
 * anything enforced only in the browser is not enforced.
 */
import { getCurrentScope, onScopeDispose } from 'vue';

/** A debounced or throttled function, with a real canceller for the pending call. */
export type Cancelable<TArgs extends unknown[]> = ((...args: TArgs) => void) & { cancel: () => void };

export type DebounceOptions = {
    /** Ceiling on how long a call may be deferred while input keeps arriving.
     *  Without it, a fast continuous typer defers the call forever. */
    maxWait?: number;
};

export function useDebounceFn<TArgs extends unknown[]>(
    fn: (...args: TArgs) => void,
    ms = 200,
    options: DebounceOptions = {},
): Cancelable<TArgs> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let maxTimer: ReturnType<typeof setTimeout> | undefined;
    let lastArgs: TArgs | undefined;

    const clearTimers = (): void => {
        if (timer !== undefined) clearTimeout(timer);
        if (maxTimer !== undefined) clearTimeout(maxTimer);
        timer = undefined;
        maxTimer = undefined;
    };

    const invoke = (): void => {
        clearTimers();
        const args = lastArgs;
        lastArgs = undefined;
        if (args !== undefined) fn(...args);
    };

    const cancel = (): void => {
        clearTimers();
        lastArgs = undefined;
    };

    const debounced = ((...args: TArgs): void => {
        lastArgs = args;
        if (timer !== undefined) clearTimeout(timer);
        if (options.maxWait !== undefined && maxTimer === undefined) {
            maxTimer = setTimeout(invoke, options.maxWait);
        }
        timer = setTimeout(invoke, ms);
    }) as Cancelable<TArgs>;

    debounced.cancel = cancel;
    if (getCurrentScope() !== undefined) onScopeDispose(cancel);
    return debounced;
}

/** Run immediately, then at most once per `ms`, with a trailing call. */
export function useThrottleFn<TArgs extends unknown[]>(fn: (...args: TArgs) => void, ms = 200): Cancelable<TArgs> {
    let last = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastArgs: TArgs | undefined;

    const cancel = (): void => {
        if (timer !== undefined) clearTimeout(timer);
        timer = undefined;
        lastArgs = undefined;
    };

    const throttled = ((...args: TArgs): void => {
        lastArgs = args;
        const elapsed = Date.now() - last;
        if (elapsed >= ms) {
            last = Date.now();
            fn(...args);
            return;
        }
        if (timer !== undefined) return;
        timer = setTimeout(() => {
            last = Date.now();
            timer = undefined;
            const pending = lastArgs;
            lastArgs = undefined;
            if (pending !== undefined) fn(...pending);
        }, ms - elapsed);
    }) as Cancelable<TArgs>;

    throttled.cancel = cancel;
    if (getCurrentScope() !== undefined) onScopeDispose(cancel);
    return throttled;
}
