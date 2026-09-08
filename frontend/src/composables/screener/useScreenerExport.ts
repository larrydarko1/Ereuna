/**
 * useScreenerExport — the results table as a CSV file.
 * Export walks the same endpoint the table reads, page by page, up to a stated
 * cap: a loose screener matches tens of thousands of symbols, and paging all of
 * them is a denial of service pointed at the user's own API. The cap is shown
 * on the button, so a truncated file is not a surprise.
 */
import { ref, type Ref } from 'vue';
import { type ScreenerResult } from '@/api/screener';
import { fetchResults, type ResultsSource } from '@/composables/screener/useScreenerResults';
import { i18n } from '@/i18n';
import { findColumn, readColumn } from '@/constants/screener';
import { CSV_TYPE, toCsv } from '@/utils/csv';
import { downloadFile } from '@/utils/download';

export type UseScreenerExportReturn = {
    exporting: Ref<boolean>;
    error: Ref<string | null>;
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
    const error = ref<string | null>(null);

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
        error.value = null;

        try {
            const columns = options.columns();
            const rows = await collect();

            const headers = [
                translate('screener.symbol'),
                translate('screener.name'),
                ...columns.map((path) => translate(`screener.fields.${findColumn(path)?.filterKey ?? path}`)),
            ];
            const body = rows.map((row) => [
                row.symbol,
                row.name,
                ...columns.map((path) => {
                    const value = readColumn(row, path);
                    return typeof value === 'string' || typeof value === 'number' ? value : null;
                }),
            ]);

            downloadFile(`${options.filename()}.csv`, toCsv(headers, body), CSV_TYPE);
        } catch {
            error.value = translate('screener.exportFailed');
        } finally {
            exporting.value = false;
        }
    }

    return { exporting, error, run };
}
