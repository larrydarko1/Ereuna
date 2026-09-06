import { describe, expect, it } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { NoteRow } from '@/api/note';
import { i18n } from '@/i18n';
import { mockApi } from '@/__tests__/support/msw';
import { formatDate } from '@/utils/formatters';
import NotesPanel from '@/components/charts/NotesPanel.vue';

const api = mockApi();

const note = (over: Partial<NoteRow> = {}): NoteRow => ({
    id: 'n1',
    symbol: 'AAPL',
    message: 'Watching the 200 day',
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
    ...over,
});

const panel = async (items: NoteRow[], symbol = 'AAPL'): Promise<VueWrapper> => {
    api.on('GET /api/notes', { items, total: items.length, page: 1, pages: 1 });
    const wrapper = mount(NotesPanel, { props: { symbol } });
    await flushPromises();
    return wrapper;
};

const compose = async (wrapper: VueWrapper, message: string): Promise<void> => {
    await wrapper.get('.notes__composer textarea').setValue(message);
};

const submit = async (wrapper: VueWrapper): Promise<void> => {
    await wrapper.get('.notes__composer').trigger('submit');
    await flushPromises();
};

describe('NotesPanel', () => {
    it('reads this symbol’s notes alone', async () => {
        await panel([]);

        expect(api.last().search.get('symbol')).toBe('AAPL');
        expect(api.last().search.get('limit')).toBe('50');
    });

    it('reads nothing until there is a symbol on the chart', async () => {
        await panel([], '');

        expect(api.calls).toHaveLength(0);
    });

    it('says there are no notes rather than drawing an empty list', async () => {
        expect((await panel([])).get('.notes__note').text()).toBe(i18n.global.t('sidebar.noNotesAvailable'));
    });

    it('lists one item per note', async () => {
        expect((await panel([note(), note({ id: 'n2' })])).findAll('.notes__item')).toHaveLength(2);
    });

    it('says when a note was written, and when it was last changed', async () => {
        const wrapper = await panel([note(), note({ id: 'n2', updatedAt: '2026-03-01T00:00:00.000Z' })]);
        const times = wrapper.findAll('time').map((node) => node.text());

        expect(times[0]).toBe(`${i18n.global.t('sidebar.created')} ${formatDate('2026-02-01T00:00:00.000Z')}`);
        expect(times[1]).toBe(`${i18n.global.t('sidebar.edited')} ${formatDate('2026-03-01T00:00:00.000Z')}`);
    });

    it('will not save an empty note', async () => {
        const wrapper = await panel([]);

        await compose(wrapper, '   ');

        expect(wrapper.get('.notes__save').attributes('disabled')).toBeDefined();
    });

    it('saves a note and puts it at the top of the list', async () => {
        const wrapper = await panel([note({ id: 'old' })]);
        api.on('POST /api/notes', note({ id: 'new', message: 'Fresh' }));

        await compose(wrapper, '  Fresh  ');
        await submit(wrapper);

        expect(api.last().body).toEqual({ symbol: 'AAPL', message: 'Fresh' });
        expect(wrapper.findAll('.notes__message')[0]?.text()).toBe('Fresh');
    });

    it('empties the composer once the note is saved', async () => {
        const wrapper = await panel([]);
        api.on('POST /api/notes', note());

        await compose(wrapper, 'Fresh');
        await submit(wrapper);

        expect((wrapper.get('.notes__composer textarea').element as HTMLTextAreaElement).value).toBe('');
    });

    it('keeps the draft and explains a refused save', async () => {
        const wrapper = await panel([]);
        api.on('POST /api/notes', { error: 'INTERNAL' }, { status: 500 });

        await compose(wrapper, 'Fresh');
        await submit(wrapper);

        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('errors.INTERNAL'));
        expect((wrapper.get('.notes__composer textarea').element as HTMLTextAreaElement).value).toBe('Fresh');
    });

    it('counts the draft against the ceiling the API enforces', async () => {
        const wrapper = await panel([]);

        await compose(wrapper, 'abc');

        expect(wrapper.get('.notes__count').text()).toBe('3/5000');
    });

    it('edits a note in place, on the same textarea the composer uses', async () => {
        const wrapper = await panel([note()]);

        await wrapper.get('.notes__control').trigger('click');

        expect(wrapper.findAll('.notes__composer')).toHaveLength(2);
        expect((wrapper.findAll('textarea')[1]?.element as HTMLTextAreaElement).value).toBe('Watching the 200 day');
    });

    it('saves the edit and shows the note as the API returned it', async () => {
        const wrapper = await panel([note()]);
        api.on('PATCH /api/notes/n1', note({ message: 'Changed', updatedAt: '2026-03-01T00:00:00.000Z' }));

        await wrapper.get('.notes__control').trigger('click');
        await wrapper.findAll('textarea')[1]?.setValue('  Changed  ');
        await wrapper.findAll('.notes__composer')[1]?.trigger('submit');
        await flushPromises();

        expect(api.last().body).toEqual({ message: 'Changed' });
        expect(wrapper.get('.notes__message').text()).toBe('Changed');
    });

    it('will not save an edit that empties the note', async () => {
        const wrapper = await panel([note()]);

        await wrapper.get('.notes__control').trigger('click');
        await wrapper.findAll('textarea')[1]?.setValue('   ');
        await wrapper.findAll('.notes__composer')[1]?.trigger('submit');
        await flushPromises();

        expect(api.calls.filter((call) => call.method === 'PATCH')).toHaveLength(0);
    });

    it('abandons an edit on cancel, leaving the note as it was', async () => {
        const wrapper = await panel([note()]);

        await wrapper.get('.notes__control').trigger('click');
        await wrapper.findAll('textarea')[1]?.setValue('Changed');
        await wrapper.get('.notes__cancel').trigger('click');

        expect(wrapper.get('.notes__message').text()).toBe('Watching the 200 day');
    });

    it('explains a refused edit and keeps the row open', async () => {
        const wrapper = await panel([note()]);
        api.on('PATCH /api/notes/n1', { error: 'INTERNAL' }, { status: 500 });

        await wrapper.get('.notes__control').trigger('click');
        await wrapper.findAll('textarea')[1]?.setValue('Changed');
        await wrapper.findAll('.notes__composer')[1]?.trigger('submit');
        await flushPromises();

        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('errors.INTERNAL'));
        expect(wrapper.findAll('.notes__composer')).toHaveLength(2);
    });

    it('takes a deleted note off the list without waiting for the round trip', async () => {
        const wrapper = await panel([note()]);
        api.on('DELETE /api/notes/n1', null, { status: 204 });

        await wrapper.get('.notes__control--delete').trigger('click');

        expect(wrapper.findAll('.notes__item')).toHaveLength(0);
        await flushPromises();
        expect(api.last().method).toBe('DELETE');
    });

    it('puts the note back when the delete is refused', async () => {
        const wrapper = await panel([note()]);
        api.on('DELETE /api/notes/n1', { error: 'INTERNAL' }, { status: 500 });

        await wrapper.get('.notes__control--delete').trigger('click');
        await flushPromises();

        expect(wrapper.findAll('.notes__item')).toHaveLength(1);
        expect(wrapper.get('[role="alert"]').text()).toBe(i18n.global.t('errors.INTERNAL'));
    });

    it('reports a failed read in place of the list', async () => {
        api.on('GET /api/notes', { error: 'INTERNAL' }, { status: 500 });
        const wrapper = mount(NotesPanel, { props: { symbol: 'AAPL' } });
        await flushPromises();

        expect(wrapper.get('.notes__note').text()).toBe(i18n.global.t('errors.INTERNAL'));
    });
});
