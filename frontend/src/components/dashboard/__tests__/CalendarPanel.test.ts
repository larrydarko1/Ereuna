import { describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { CalendarEvent, DayCalendar } from '@/api/market';
import { i18n } from '@/i18n';
import { toDateInput } from '@/utils/formatters';
import { mockApi } from '@/__tests__/support/msw';
import CalendarPanel from '@/components/dashboard/CalendarPanel.vue';

const api = mockApi();

const event = (symbol: string, type: CalendarEvent['type'], details: Record<string, unknown>): CalendarEvent => ({
    symbol,
    type,
    reportDate: '2026-03-04',
    details,
});

const day = (over: Partial<DayCalendar> = {}): DayCalendar => ({
    date: '2026-03-04',
    earnings: [],
    dividends: [],
    splits: [],
    ...over,
});

const panel = async (calendar: DayCalendar): Promise<VueWrapper> => {
    api.on('GET /api/market/calendar', calendar);
    const wrapper = mount(CalendarPanel);
    await flushPromises();
    return wrapper;
};

describe('CalendarPanel', () => {
    it('asks for today when it opens', async () => {
        await panel(day());

        expect(api.last().search.get('date')).toBe(toDateInput(new Date()));
    });

    it('shows a loading note before the day lands', () => {
        api.on('GET /api/market/calendar', day());

        expect(mount(CalendarPanel).get('.calendar__note').text()).toBe(i18n.global.t('dashboard.loading'));
    });

    it('reloads for the day the picker is moved to', async () => {
        const wrapper = await panel(day());

        await wrapper.get('input[type="date"]').setValue('2026-01-15');
        await flushPromises();

        expect(api.last().search.get('date')).toBe('2026-01-15');
    });

    it('groups the three event kinds and counts each', async () => {
        const wrapper = await panel(
            day({
                earnings: [event('AAPL', 'Earnings', { estimate: 1.25 })],
                dividends: [event('KO', 'Dividend', { amount: 0.46 })],
            }),
        );

        expect(wrapper.findAll('.calendar__group')).toHaveLength(3);
        expect(wrapper.findAll('.calendar__count').map((node) => node.text())).toEqual(['1', '1', '0']);
    });

    it('shows the one number that belongs to each event kind', async () => {
        const wrapper = await panel(
            day({
                earnings: [event('AAPL', 'Earnings', { estimate: 1.25, amount: 9 })],
                dividends: [event('KO', 'Dividend', { amount: 0.46 })],
                splits: [event('NVDA', 'Split', { ratio: '10:1' })],
            }),
        );

        expect(wrapper.findAll('.calendar__detail').map((node) => node.text())).toEqual(['1.25', '0.46', '10:1']);
    });

    it('shows a symbol with no detail rather than one with the wrong number', async () => {
        const wrapper = await panel({ ...day(), earnings: [event('AAPL', 'Earnings', { estimate: null })] });

        expect(wrapper.get('.calendar__symbol').text()).toBe('AAPL');
        expect(wrapper.find('.calendar__detail').exists()).toBe(false);
    });

    it('says the day is empty rather than drawing three empty groups', async () => {
        const wrapper = await panel(day());

        expect(wrapper.findAll('.calendar__group')).toHaveLength(0);
        expect(wrapper.get('.calendar__note').text()).toBe(i18n.global.t('dashboard.calendar.empty'));
    });

    it('says so for a group that is empty while the others are not', async () => {
        const wrapper = await panel(day({ earnings: [event('AAPL', 'Earnings', { estimate: 1.25 })] }));
        const notes = wrapper.findAll('.calendar__group .calendar__note');

        expect(notes).toHaveLength(2);
    });

    it('reports a failed read in place of the groups', async () => {
        api.on('GET /api/market/calendar', { error: 'INTERNAL' }, { status: 500 });
        const wrapper = mount(CalendarPanel);
        await flushPromises();

        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('errors.INTERNAL'));
    });
});
