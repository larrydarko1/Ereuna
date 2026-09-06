import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import {
    dismiss,
    notify,
    notifyError,
    notifySuccess,
    useNotificationCleanup,
    useNotifications,
} from '@/composables/ui/useNotifications';

const { toasts } = useNotifications();

beforeEach(() => {
    vi.useFakeTimers();
    for (const toast of [...toasts.value]) dismiss(toast.id);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('notify', () => {
    it('queues a toast and answers with its id', () => {
        const id = notify('saved');

        expect(toasts.value).toEqual([{ id, message: 'saved', tone: 'info' }]);
    });

    it('defaults to the neutral tone', () => {
        notify('saved');

        expect(toasts.value[0]?.tone).toBe('info');
    });

    it('has a helper for each of the other two', () => {
        notifySuccess('done');
        notifyError('broken');

        expect(toasts.value.map((toast) => toast.tone)).toEqual(['success', 'error']);
    });

    it('dismisses itself after four seconds', () => {
        notify('saved');

        vi.advanceTimersByTime(3999);
        expect(toasts.value).toHaveLength(1);

        vi.advanceTimersByTime(1);
        expect(toasts.value).toHaveLength(0);
    });

    it('leaves an error up twice as long — it is the one worth reading', () => {
        notifyError('broken');

        vi.advanceTimersByTime(4000);
        expect(toasts.value).toHaveLength(1);

        vi.advanceTimersByTime(4000);
        expect(toasts.value).toHaveLength(0);
    });

    it('keeps the newest four, so the stack never covers the page', () => {
        for (let index = 0; index < 6; index += 1) notify(`toast ${index}`);

        expect(toasts.value.map((toast) => toast.message)).toEqual(['toast 2', 'toast 3', 'toast 4', 'toast 5']);
    });

    it('gives every toast an id of its own', () => {
        const first = notify('a');
        const second = notify('b');

        expect(first).not.toBe(second);
    });
});

describe('dismiss', () => {
    it('removes one and clears its timer', () => {
        const id = notify('saved');

        dismiss(id);

        expect(toasts.value).toHaveLength(0);
        expect(() => vi.advanceTimersByTime(10_000)).not.toThrow();
    });

    it('ignores an id that is no longer queued', () => {
        expect(() => dismiss(999)).not.toThrow();
    });
});

describe('useNotificationCleanup', () => {
    it('empties the queue when the host goes away', () => {
        const scope = effectScope();
        scope.run(() => useNotificationCleanup());
        notify('saved');

        scope.stop();

        expect(toasts.value).toHaveLength(0);
    });
});
