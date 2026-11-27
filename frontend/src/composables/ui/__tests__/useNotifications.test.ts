import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { notify, useNotifications } from '@/composables/ui/useNotifications';

const { notifications, dismiss, pause, resume } = useNotifications();

function messages(): string[] {
    return notifications.value.map((notification) => notification.message);
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    resume();
    for (const notification of [...notifications.value]) dismiss(notification.id);
    vi.useRealTimers();
});

describe('useNotifications', () => {
    it('queues an error keyed by its message', () => {
        notify.error('Could not export the chart.');
        expect(notifications.value).toEqual([
            { id: 'Could not export the chart.', message: 'Could not export the chart.', persistent: false },
        ]);
    });

    it('collapses an identical message into the one already shown', () => {
        notify.error('Could not export the chart.');
        notify.error('Could not export the chart.');
        expect(messages()).toEqual(['Could not export the chart.']);
    });

    it('replaces the notification that shares an id', () => {
        notify.error('Could not load.', { id: 'drawings' });
        notify.error('Could not save.', { id: 'drawings' });
        expect(messages()).toEqual(['Could not save.']);
    });

    it('dismisses itself after a while', () => {
        notify.error('Could not export the chart.');
        vi.advanceTimersByTime(6000);
        expect(notifications.value).toEqual([]);
    });

    it('restarts the timer when the same message comes in again', () => {
        notify.error('Could not export the chart.');
        vi.advanceTimersByTime(5000);
        notify.error('Could not export the chart.');
        vi.advanceTimersByTime(5000);
        expect(messages()).toEqual(['Could not export the chart.']);
    });

    it('keeps a persistent notification until it is dismissed by id', () => {
        notify.error('Could not save.', { id: 'drawings', persistent: true });
        vi.advanceTimersByTime(60_000);
        expect(messages()).toEqual(['Could not save.']);
        notify.dismiss('drawings');
        expect(notifications.value).toEqual([]);
    });

    it('holds every timer while paused and restarts them on resume', () => {
        notify.error('Could not export the chart.');
        pause();
        vi.advanceTimersByTime(60_000);
        expect(messages()).toEqual(['Could not export the chart.']);
        resume();
        vi.advanceTimersByTime(6000);
        expect(notifications.value).toEqual([]);
    });

    it('drops the oldest temporary notification past the visible limit', () => {
        notify.error('kept', { persistent: true });
        for (const message of ['a', 'b', 'c', 'd']) notify.error(message);
        expect(messages()).toEqual(['kept', 'b', 'c', 'd']);
    });
});
