import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { i18n } from '@/i18n';
import { useResource, type UseResourceReturn } from '@/composables/data/useResource';

/** A deferred, so a test can decide the order two in-flight reads land in. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (err: unknown) => void } {
    let resolve!: (value: T) => void;
    let reject!: (err: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

/** Run a resource inside its own scope, the way a component would. */
function inScope<T>(build: () => UseResourceReturn<T>): { resource: UseResourceReturn<T>; stop: () => void } {
    const scope = effectScope();
    const resource = scope.run(build) as UseResourceReturn<T>;
    return { resource, stop: () => scope.stop() };
}

describe('useResource', () => {
    it('reads once immediately for the current key', async () => {
        const fetcher = vi.fn(() => Promise.resolve('value'));
        const { resource } = inScope(() => useResource(() => 'AAPL', fetcher));

        expect(resource.pending.value).toBe(true);
        await nextTick();
        await nextTick();

        expect(fetcher).toHaveBeenCalledExactlyOnceWith('AAPL');
        expect(resource.data.value).toBe('value');
        expect(resource.pending.value).toBe(false);
        expect(resource.error.value).toBeNull();
    });

    it('reads again when the key changes', async () => {
        const symbol = ref('AAPL');
        const fetcher = vi.fn((key: string) => Promise.resolve(`${key} data`));
        const { resource } = inScope(() => useResource(() => symbol.value, fetcher));
        await vi.waitFor(() => expect(resource.data.value).toBe('AAPL data'));

        symbol.value = 'MSFT';
        await vi.waitFor(() => expect(resource.data.value).toBe('MSFT data'));

        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('drops a late answer, so the screen belongs to the key that is current', async () => {
        const symbol = ref('AAPL');
        const first = deferred<string>();
        const second = deferred<string>();
        const { resource } = inScope(() =>
            useResource(
                () => symbol.value,
                (key) => (key === 'AAPL' ? first.promise : second.promise),
            ),
        );

        await nextTick();
        symbol.value = 'MSFT';
        await nextTick();

        second.resolve('MSFT data');
        await vi.waitFor(() => expect(resource.data.value).toBe('MSFT data'));

        first.resolve('AAPL data');
        await nextTick();
        expect(resource.data.value).toBe('MSFT data');
    });

    it('localises a failure and clears the stale data behind it', async () => {
        const { resource } = inScope(() =>
            useResource(
                () => 'AAPL',
                () =>
                    Promise.reject(
                        Object.assign(new Error('rejected'), { response: { data: { error: 'Not found' } } }),
                    ),
            ),
        );

        await vi.waitFor(() => expect(resource.error.value).toBe('Not found'));
        expect(resource.data.value).toBeNull();
        expect(resource.pending.value).toBe(false);
    });

    it('falls back to a generic message when the failure carries none', async () => {
        const { resource } = inScope(() =>
            useResource(
                () => 'AAPL',
                () => Promise.reject(new Error('offline')),
            ),
        );

        await vi.waitFor(() => expect(resource.error.value).toBe(i18n.global.t('errors.INTERNAL')));
    });

    it('drops a late failure too', async () => {
        const symbol = ref('AAPL');
        const first = deferred<string>();
        const { resource } = inScope(() =>
            useResource(
                () => symbol.value,
                (key) => (key === 'AAPL' ? first.promise : Promise.resolve('MSFT data')),
            ),
        );

        await nextTick();
        symbol.value = 'MSFT';
        await vi.waitFor(() => expect(resource.data.value).toBe('MSFT data'));

        first.reject(new Error('too late'));
        await nextTick();

        expect(resource.error.value).toBeNull();
        expect(resource.data.value).toBe('MSFT data');
    });

    it('does not read at all while it is disabled', async () => {
        const enabled = ref(false);
        const fetcher = vi.fn(() => Promise.resolve('value'));
        const { resource } = inScope(() => useResource(() => enabled.value, fetcher, { enabled: (key) => key }));

        await nextTick();
        expect(fetcher).not.toHaveBeenCalled();
        expect(resource.pending.value).toBe(false);

        enabled.value = true;
        await vi.waitFor(() => expect(resource.data.value).toBe('value'));
    });

    it('clears what it holds when it becomes disabled, and invalidates the read in flight', async () => {
        const enabled = ref(true);
        const first = deferred<string>();
        const { resource } = inScope(() =>
            useResource(
                () => enabled.value,
                () => first.promise,
                { enabled: (key) => key },
            ),
        );

        await nextTick();
        enabled.value = false;
        await nextTick();

        first.resolve('value');
        await nextTick();

        expect(resource.data.value).toBeNull();
        expect(resource.pending.value).toBe(false);
    });

    it('reloads on demand', async () => {
        const fetcher = vi.fn(() => Promise.resolve('value'));
        const { resource } = inScope(() => useResource(() => 'AAPL', fetcher));
        await vi.waitFor(() => expect(resource.data.value).toBe('value'));

        await resource.reload();

        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('takes a local edit as the current answer, and invalidates the read in flight', async () => {
        const first = deferred<string>();
        const { resource } = inScope(() =>
            useResource(
                () => 'AAPL',
                () => first.promise,
            ),
        );
        await nextTick();

        resource.mutate('edited');
        expect(resource.data.value).toBe('edited');
        expect(resource.pending.value).toBe(false);

        first.resolve('from the server');
        await nextTick();

        expect(resource.data.value).toBe('edited');
    });

    it('writes nothing once the component is gone', async () => {
        const first = deferred<string>();
        const { resource, stop } = inScope(() =>
            useResource(
                () => 'AAPL',
                () => first.promise,
            ),
        );
        await nextTick();

        stop();
        first.resolve('value');
        await nextTick();

        expect(resource.data.value).toBeNull();
    });

    it('works outside a component scope', async () => {
        const resource = useResource(
            () => 'AAPL',
            () => Promise.resolve('value'),
        );

        await vi.waitFor(() => expect(resource.data.value).toBe('value'));
    });
});
