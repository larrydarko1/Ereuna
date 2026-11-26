/**
 * useScreenerExport — the results table as a CSV file.
 * Export walks the same endpoint the table reads, page by page, up to a stated
 * cap: a loose screener matches tens of thousands of symbols, and paging all of
 * them is a denial of service pointed at the user's own API. The cap is shown
 * on the button, so a truncated file is not a surprise.
 */
import { ref, type Ref } from 'vue';

import type { ScreenerResult } from '@ereuna/shared';

import { fetchResults, type ResultsSource } from '@/composables/screener/useScreenerResults';
import { notify } from '@/composables/ui/useNotifications';
import { findColumn, readColumn } from '@/constants/screener';
import { i18n } from '@/i18n';
import { CSV_TYPE, toCsv } from '@/utils/csv';
import { downloadFile } from '@/utils/download';

type UseScreenerExportReturn = {
    exporting: Ref<boolean>;
    run: () => Promise<void>;
};

export const EXPORT_LIMIT = 5000;

const EXPORT_PAGE = 200;

export function useScreenerExport(options: {
    source: () => ResultsSource;
    columns: () => readonly string[];
    filename: () => string;
}): UseScreenerExportReturn {
    const exporting = ref(false);

    async function collect(): Promise<ScreenerResult[]> {
        const collected: ScreenerResult[] = [];

        for (let page = 1; collected.length < EXPORT_LIMIT; page += 1) {
            const { data } = await fetchResults(options.source(), { page, limit: EXPORT_PAGE });
            collected.push(...data.items);
            if (page >= data.pages || data.items.length === 0) break;
        }

        return collected.slice(0, EXPORT_LIMIT);
    }

    async function run(): Promise<void> {
        const translate = i18n.global.t;
        exporting.value = true;

        try {
            const columns = options.columns();
            const rows = await collect();

            const headers = [
                translate('screener.symbol'),
                translate('screener.name'),
                ...columns.map((path) => translate(`screener.fields.${findColumn(path)?.filterKey ?? path}`)),
            ];
            const body = rows.map((row) => [row.symbol, row.name, ...columns.map((path) => readColumn(row, path))]);

            downloadFile(`${options.filename()}.csv`, toCsv(headers, body), CSV_TYPE);
        } catch {
            // The toolbar button that started it shows no result of its own
            notify.error(translate('screener.exportFailed'));
        } finally {
            exporting.value = false;
        }
    }

    return { exporting, run };
}
