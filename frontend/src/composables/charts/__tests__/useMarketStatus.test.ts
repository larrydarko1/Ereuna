import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { mockApi } from '@/__tests__/support/msw';
import { useMarketStatus, type UseMarketStatusReturn } from '@/composables/charts/useMarketStatus';

const mock = mockApi();

/** A Friday during the session, and the same day after the close. */
const OPEN = new Date('2026-03-06T15:00:00Z'); // 10:00 New York
const CLOSED = new Date('2026-03-06T22:00:00Z'); // 17:00 New York
const WEEKEND = new Date('2026-03-07T15:00:00Z'); // Saturday
const HOLIDAY = new Date('2026-12-25T15:00:00Z');

function inScope(alwaysOpen = false): { status: UseMarketStatusReturn; stop: () => void } {
    const scope = effectScope();
    const status = scope.run(() => useMarketStatus(() => alwaysOpen)) as UseMarketStatusReturn;
    return { status, stop: () => scope.stop() };
}

beforeEach(() => {
    vi.useFakeTimers();
    mock.on('GET /api/market/holidays', { Holidays: [{ date: '2026-12-25', name: 'Christmas' }] });
});

afterEach(() => {
    vi.useRealTimers();
});

describe('the session clock', () => {
    it('reads open during New York trading hours', () => {
        vi.setSystemTime(OPEN);

        expect(inScope().status.status.value).toBe('open');
    });

    it('reads closed after the bell', () => {
        vi.setSystemTime(CLOSED);

        expect(inScope().status.status.value).toBe('closed');
    });

    it('reads closed at the weekend', () => {
        vi.setSystemTime(WEEKEND);

        expect(inScope().status.status.value).toBe('closed');
    });

    it('opens exactly at 09:30 and closes exactly at 16:00, New York', () => {
        vi.setSystemTime(new Date('2026-03-06T14:29:00Z'));
        expect(inScope().status.status.value).toBe('closed');

        vi.setSystemTime(new Date('2026-03-06T14:30:00Z'));
        expect(inScope().status.status.value).toBe('open');

        vi.setSystemTime(new Date('2026-03-06T21:00:00Z'));
        expect(inScope().status.status.value).toBe('closed');
    });

    it('re-reads the clock on its own, without a timer per second', async () => {
        vi.setSystemTime(new Date('2026-03-06T20:59:30Z'));
        const { status } = inScope();
        expect(status.status.value).toBe('open');

        vi.setSystemTime(new Date('2026-03-06T21:00:30Z'));
        vi.advanceTimersByTime(30_000);
        await nextTick();

        expect(status.status.value).toBe('closed');
    });

    it('stops ticking when the component is gone', () => {
        vi.setSystemTime(OPEN);
        const { stop } = inScope();

        stop();

        expect(vi.getTimerCount()).toBe(0);
    });

    it('answers open regardless of the hour for a venue that never closes', () => {
        vi.setSystemTime(WEEKEND);

        expect(inScope(true).status.status.value).toBe('open');
    });
});

describe('the holiday calendar', () => {
    it('names the holiday rather than calling it closed', async () => {
        vi.setSystemTime(HOLIDAY);
        const { status } = inScope();

        await vi.waitFor(() => expect(status.status.value).toBe('holiday'));
        expect(status.holidayName.value).toBe('Christmas');
    });

    it('names nothing on an ordinary day', async () => {
        vi.setSystemTime(OPEN);
        const { status } = inScope();

        await vi.waitFor(() => expect(status.pending.value).toBe(false));
        expect(status.holidayName.value).toBeNull();
    });

    it('reports open or closed even when the calendar cannot be read', async () => {
        vi.setSystemTime(OPEN);
        mock.on('GET /api/market/holidays', { error: 'INTERNAL' }, { status: 500 });
        const { status } = inScope();

        await vi.waitFor(() => expect(status.pending.value).toBe(false));
        expect(status.status.value).toBe('open');
    });
});
