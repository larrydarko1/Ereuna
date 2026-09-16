/**
 * Debounce, as a composable that cleans up after itself.
 * It waits for the user to STOP — a search box, not a steady stream — and
 * auto-cancels on scope disposal. Without that, a pending timer fires into an
 * unmounted component and touches refs that no longer exist: silent, and
 * miserable to trace back.
 * This is a UX tool, not a control. The API rate-limits regardless, because
 * anything enforced only in the browser is not enforced.
 */
import { getCurrentScope, onScopeDispose } from 'vue';

/** A debounced function, with a real canceller for the pending call. */
export type Cancelable<TArgs extends unknown[]> = ((...args: TArgs) => void) & { cancel: () => void };

export type DebounceOptions = {
    ms?: number;
    maxWait?: number;
};

export function useDebounceFn<TArgs extends unknown[]>(
    fn: (...args: TArgs) => void,
    options: DebounceOptions = {},
): Cancelable<TArgs> {
    const ms = options.ms ?? 200;
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
