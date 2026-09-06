import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useDebounceFn, useThrottleFn } from '@/composables/ui/useDebounce';

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('useDebounceFn', () => {
    it('waits for the caller to stop', () => {
        const fn = vi.fn();
        const debounced = useDebounceFn(fn, { ms: 100 });

        debounced('a');
        vi.advanceTimersByTime(50);
        debounced('b');
        vi.advanceTimersByTime(50);
        expect(fn).not.toHaveBeenCalled();

        vi.advanceTimersByTime(50);
        expect(fn).toHaveBeenCalledExactlyOnceWith('b');
    });

    it('defaults to two hundred milliseconds', () => {
        const fn = vi.fn();
        const debounced = useDebounceFn(fn);

        debounced();
        vi.advanceTimersByTime(199);
        expect(fn).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('fires at maxWait however long the caller keeps typing', () => {
        const fn = vi.fn();
        const debounced = useDebounceFn(fn, { ms: 100, maxWait: 250 });

        for (let tick = 0; tick < 5; tick += 1) {
            debounced(tick);
            vi.advanceTimersByTime(50);
        }

        expect(fn).toHaveBeenCalledExactlyOnceWith(4);
    });

    it('starts a fresh maxWait window after one fires', () => {
        const fn = vi.fn();
        const debounced = useDebounceFn(fn, { ms: 100, maxWait: 250 });

        for (let tick = 0; tick < 10; tick += 1) {
            debounced(tick);
            vi.advanceTimersByTime(50);
        }

        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('drops the pending call when cancelled', () => {
        const fn = vi.fn();
        const debounced = useDebounceFn(fn, { ms: 100 });

        debounced('a');
        debounced.cancel();
        vi.advanceTimersByTime(500);

        expect(fn).not.toHaveBeenCalled();
    });

    it('cancels when the owning scope goes away, rather than firing into a dead component', () => {
        const fn = vi.fn();
        const scope = effectScope();
        scope.run(() => {
            useDebounceFn(fn, { ms: 100 })('a');
        });

        scope.stop();
        vi.advanceTimersByTime(500);

        expect(fn).not.toHaveBeenCalled();
    });

    it('works outside a component scope', () => {
        const fn = vi.fn();

        useDebounceFn(fn, { ms: 10 })('a');
        vi.advanceTimersByTime(10);

        expect(fn).toHaveBeenCalledTimes(1);
    });
});

describe('useThrottleFn', () => {
    it('runs the first call immediately', () => {
        const fn = vi.fn();

        useThrottleFn(fn, 100)('a');

        expect(fn).toHaveBeenCalledExactlyOnceWith('a');
    });

    it('holds the next one back to the trailing edge, with the newest arguments', () => {
        const fn = vi.fn();
        const throttled = useThrottleFn(fn, 100);

        throttled('a');
        vi.advanceTimersByTime(20);
        throttled('b');
        vi.advanceTimersByTime(20);
        throttled('c');
        expect(fn).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(60);
        expect(fn).toHaveBeenCalledTimes(2);
        expect(fn).toHaveBeenLastCalledWith('c');
    });

    it('runs immediately again once the window has passed', () => {
        const fn = vi.fn();
        const throttled = useThrottleFn(fn, 100);

        throttled('a');
        vi.advanceTimersByTime(100);
        throttled('b');

        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('drops the trailing call when cancelled', () => {
        const fn = vi.fn();
        const throttled = useThrottleFn(fn, 100);

        throttled('a');
        throttled('b');
        throttled.cancel();
        vi.advanceTimersByTime(500);

        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('cancels with its scope', () => {
        const fn = vi.fn();
        const scope = effectScope();
        scope.run(() => {
            const throttled = useThrottleFn(fn, 100);
            throttled('a');
            throttled('b');
        });

        scope.stop();
        vi.advanceTimersByTime(500);

        expect(fn).toHaveBeenCalledTimes(1);
    });
});
