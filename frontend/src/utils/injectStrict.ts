/**
 * inject() that throws instead of returning undefined.
 * The plain form widens every injected value to `T | undefined`, so each
 * consumer either handles a case that cannot happen or asserts it away. A
 * missing provider is a wiring bug, and failing loudly at the injection point
 * names it far better than a null check three components down.
 */
import { inject, type InjectionKey } from 'vue';

export function injectStrict<T>(key: InjectionKey<T>, fallback?: T): T {
    const resolved = inject(key, fallback);
    if (resolved === undefined) {
        throw new Error(`No provider found for injection key "${String(key)}"`);
    }
    return resolved;
}
