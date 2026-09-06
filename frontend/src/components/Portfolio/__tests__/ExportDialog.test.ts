import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { PortfolioExport } from '@/api/portfolio';
import { i18n } from '@/i18n';
import ExportDialog from '@/components/portfolio/ExportDialog.vue';

const EXPORT: PortfolioExport = {
    portfolio: {
        baseValue: 100_000,
        leverage: 2,
        defaultCommission: 1,
        benchmarks: ['SPY'],
        stats: null,
        valueHistory: [],
    },
    trades: [
        {
            action: 'buy',
            symbol: 'AAPL',
            shares: 10,
            price: 190,
            commission: 1,
            total: 1900,
            tradeDate: '2026-02-01',
        },
    ],
} as unknown as PortfolioExport;

/** What `downloadFile` hands the browser, captured off the anchor it builds. */
type Saved = { name: string; body: string; type: string };

const saved: Saved[] = [];

const captureDownloads = (): void => {
    const anchor = document.createElement('a');
    vi.spyOn(anchor, 'click').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
        tag === 'a' ? anchor : document.createElementNS('http://www.w3.org/1999/xhtml', tag),
    );
    URL.createObjectURL = vi.fn((blob: Blob) => {
        void blob.text().then((body) => saved.push({ name: anchor.download, body, type: blob.type }));
        return 'blob:export';
    });
    URL.revokeObjectURL = vi.fn();
};

const open = (props: Record<string, unknown> = {}): VueWrapper =>
    mount(ExportDialog, {
        props: { slotNumber: 0, load: (): Promise<PortfolioExport> => Promise.resolve(EXPORT), ...props },
        attachTo: document.body,
    });

/** The dialog is teleported to <body>, which the wrapper does not traverse. */
const $ = (selector: string): HTMLElement => {
    const element = document.body.querySelector<HTMLElement>(selector);
    if (element === null) throw new Error(`no ${selector} in the dialog`);
    return element;
};

const download = async (): Promise<void> => {
    $('.dialog__footer .btn--primary').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
};

afterEach(() => {
    document.body.innerHTML = '';
    saved.length = 0;
    vi.restoreAllMocks();
});

describe('ExportDialog', () => {
    it('starts on the format that keeps everything', () => {
        open();

        expect(($('input[value="json"]') as HTMLInputElement).checked).toBe(true);
        expect($('.form-hint').textContent).toBe(i18n.global.t('portfolio.exportJsonHint'));
    });

    it('explains what the spreadsheet format leaves out', async () => {
        open();

        ($('input[value="csv"]') as HTMLInputElement).click();
        await Promise.resolve();

        expect($('.form-hint').textContent).toBe(i18n.global.t('portfolio.exportCsvHint'));
    });

    it('names the file for the slot the user sees, not the index', async () => {
        captureDownloads();
        open({ slotNumber: 2 });

        await download();

        expect(saved[0]?.name).toBe('ereuna-portfolio-3.json');
    });

    it('writes the whole export as JSON', async () => {
        captureDownloads();
        open();

        await download();

        expect(JSON.parse(saved[0]?.body ?? '')).toEqual(EXPORT);
        expect(saved[0]?.type).toBe('application/json');
    });

    it('writes the trade log alone as CSV, headed by its columns', async () => {
        captureDownloads();
        open();
        ($('input[value="csv"]') as HTMLInputElement).click();
        await Promise.resolve();

        await download();

        const lines = (saved[0]?.body ?? '').trim().split('\r\n');
        expect(lines[0]).toBe('tradeDate,action,symbol,shares,price,commission,total');
        expect(lines[1]).toBe('2026-02-01,buy,AAPL,10,190,1,1900');
        expect(saved[0]?.name).toBe('ereuna-portfolio-1.csv');
    });

    it('reads the log at download time rather than when the dialog opened', async () => {
        captureDownloads();
        const load = vi.fn().mockResolvedValue(EXPORT);
        open({ load });

        expect(load).not.toHaveBeenCalled();
        await download();

        expect(load).toHaveBeenCalledTimes(1);
    });

    it('closes once the file is handed over', async () => {
        captureDownloads();
        const wrapper = open();

        await download();

        expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('stays open and explains a failed read', async () => {
        const wrapper = open({ load: (): Promise<PortfolioExport> => Promise.reject(new Error('offline')) });

        await download();

        expect($('.form-error[role="alert"]').textContent).toBe(i18n.global.t('errors.INTERNAL'));
        expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('closes on cancel', async () => {
        const wrapper = open();

        $('.dialog__footer .btn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();

        expect(wrapper.emitted('close')).toHaveLength(1);
    });
});
