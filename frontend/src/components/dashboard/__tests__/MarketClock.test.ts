import { describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { i18n } from '@/i18n';
import { formatDateTime } from '@/utils/formatters';
import MarketClock from '@/components/dashboard/MarketClock.vue';

const clock = (props: Record<string, unknown> = {}): VueWrapper => mount(MarketClock, { props });

describe('MarketClock', () => {
    it('shows the current date and time', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-04T15:30:45Z'));

        const wrapper = clock();

        expect(wrapper.get('.clock__date').text()).toBe(
            new Date('2026-03-04T15:30:45Z').toLocaleDateString('en', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
            }),
        );
        expect(wrapper.get('.clock__time').text()).toBe(
            new Date('2026-03-04T15:30:45Z').toLocaleTimeString('en', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            }),
        );
    });

    it('ticks on the second', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-04T15:30:45Z'));
        const wrapper = clock();
        const before = wrapper.get('.clock__time').text();

        vi.setSystemTime(new Date('2026-03-04T15:30:47Z'));
        await vi.advanceTimersByTimeAsync(1000);

        expect(wrapper.get('.clock__time').text()).not.toBe(before);
    });

    it('stops ticking once it is gone', () => {
        vi.useFakeTimers();
        const cleared = vi.spyOn(globalThis, 'clearInterval');

        clock().unmount();

        expect(cleared).toHaveBeenCalled();
    });

    it('reads the ingest time when there is one', () => {
        expect(clock({ updatedAt: '2026-03-04T15:30:45Z' }).get('.clock__ingest').text()).toContain(
            formatDateTime('2026-03-04T15:30:45Z'),
        );
    });

    it('says so when the market summary has never been written', () => {
        expect(clock().get('.clock__ingest').text()).toContain(i18n.global.t('dashboard.never'));
    });
});
