import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { Financials } from '@/api/market';
import { i18n } from '@/i18n';
import { formatCompact, formatNumber } from '@/utils/formatters';
import FinancialsDialog from '@/components/charts/FinancialsDialog.vue';

const statements = (over: Partial<Financials> = {}): Financials => ({
    symbol: 'AAPL',
    annual: [
        { fiscalDateEnding: '2025-12-31', totalRevenue: 400_000_000, rps: 24 },
        { fiscalDateEnding: '2024-12-31', totalRevenue: 320_000_000, rps: 20 },
    ],
    quarterly: [{ fiscalDateEnding: '2026-03-31', totalRevenue: 110_000_000 }],
    ...over,
});

const open = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(FinancialsDialog, { props: { symbol: 'AAPL', ...props }, attachTo: document.body });

/** The dialog is teleported to <body>, which the wrapper does not traverse. */
const $ = (selector: string): HTMLElement => {
    const element = document.body.querySelector<HTMLElement>(selector);
    if (element === null) throw new Error(`no ${selector} in the dialog`);
    return element;
};

const all = (selector: string): HTMLElement[] => [...document.body.querySelectorAll<HTMLElement>(selector)];

const click = async (element: HTMLElement): Promise<void> => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
};

const headers = (): string[] =>
    all('thead th')
        .slice(1)
        .map((node) => node.textContent?.trim() ?? '');

afterEach(() => {
    document.body.innerHTML = '';
});

describe('FinancialsDialog', () => {
    it('names the instrument in its title', () => {
        open({ statements: statements() });

        expect($('.dialog__title').textContent).toBe(`${i18n.global.t('financials.title')} — AAPL`);
    });

    it('spins while the statements are being read', () => {
        open({ pending: true });

        expect($('.financials-dialog__note').textContent).toBe(i18n.global.t('sidebar.loading'));
    });

    it('says there is nothing filed rather than showing an empty table', () => {
        open({ statements: statements({ annual: [], quarterly: [] }) });

        expect($('.financials-dialog__note').textContent).toBe(i18n.global.t('financials.noData'));
    });

    it('opens on the annual filings, headed by their years', () => {
        open({ statements: statements() });

        expect(headers()).toEqual(['2025', '2024']);
    });

    it('switches to the quarters, headed by quarter and year', async () => {
        open({ statements: statements() });

        await click($('.financials-dialog__periods button:last-child'));

        expect(headers()).toEqual(['Q1 2026']);
    });

    it('marks the period in view as pressed', async () => {
        open({ statements: statements() });

        await click($('.financials-dialog__periods button:last-child'));

        expect(all('.financials-dialog__period--active')).toHaveLength(1);
        expect($('.financials-dialog__periods button:last-child').getAttribute('aria-pressed')).toBe('true');
    });

    it('heads a column it could not read as a date with the date itself', () => {
        open({ statements: statements({ annual: [{ fiscalDateEnding: 'not-a-date', rps: 1 }] }) });

        expect(headers()).toEqual(['not-a-date']);
    });

    it('skips a filing with no fiscal date to head it', () => {
        open({ statements: statements({ annual: [{ totalRevenue: 1 }] }) });

        expect(headers()).toHaveLength(0);
    });

    it('shows every line any period reported, not only the newest', () => {
        open({
            statements: statements({
                annual: [
                    { fiscalDateEnding: '2025-12-31', totalRevenue: 1 },
                    { fiscalDateEnding: '2024-12-31', totalRevenue: 1, rps: 5 },
                ],
            }),
        });

        expect(all('tbody th').length).toBe(2);
    });

    it('names a line from the locale, and falls back to the filing’s own name', () => {
        open({ statements: statements({ annual: [{ fiscalDateEnding: '2025-12-31', someOddLine: 1, rps: 2 }] }) });
        const labels = all('tbody th').map((node) => node.textContent?.trim());

        expect(labels[0]).toBe('someOddLine');
        expect(labels[1]).toBe(i18n.global.t('financials.attributes.rps'));
    });

    it('abbreviates the large figures and writes the small ones out', () => {
        open({ statements: statements() });
        const cells = all('tbody td').map((node) => node.textContent?.trim().split(' ')[0]);

        expect(cells).toContain(formatCompact(400_000_000));
        expect(cells).toContain(formatNumber(24, 2));
    });

    it('dashes a line a period did not report', () => {
        open({
            statements: statements({
                annual: [{ fiscalDateEnding: '2025-12-31', rps: 1 }, { fiscalDateEnding: '2024-12-31' }],
            }),
        });

        expect(all('tbody td')[1]?.textContent?.trim()).toBe('—');
    });

    it('measures each period against the one before it, which is the next column along', () => {
        open({ statements: statements() });
        const first = all('tbody td')[0];

        expect(first?.querySelector('.financials-dialog__change')?.textContent?.trim()).toBe(`${formatNumber(25, 1)}%`);
    });

    it('shows no change on the oldest period, having nothing to compare it with', () => {
        open({ statements: statements() });

        expect(all('tbody td')[1]?.querySelector('.financials-dialog__change')).toBeNull();
    });

    it('colours growth and contraction apart', () => {
        open({
            statements: statements({
                annual: [
                    { fiscalDateEnding: '2025-12-31', rps: 8 },
                    { fiscalDateEnding: '2024-12-31', rps: 10 },
                ],
            }),
        });

        expect(all('tbody td')[0]?.querySelector('.financials-dialog__change--down')).not.toBeNull();
    });

    it('hides the explanatory text until it is asked for', async () => {
        open({ statements: statements() });

        expect(all('.financials-dialog__description')).toHaveLength(0);

        await click($('.financials-dialog__toggle input'));

        expect(all('.financials-dialog__description').length).toBeGreaterThan(0);
    });

    it('shows no explanation for a line the locale never described', async () => {
        open({ statements: statements({ annual: [{ fiscalDateEnding: '2025-12-31', someOddLine: 1 }] }) });

        await click($('.financials-dialog__toggle input'));

        expect(all('.financials-dialog__description')).toHaveLength(0);
    });

    it('closes on the dialog close', async () => {
        const wrapper = open({ statements: statements() });

        await click($('.dialog__close'));

        expect(wrapper.emitted('close')).toHaveLength(1);
    });
});
