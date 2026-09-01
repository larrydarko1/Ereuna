/**
 * screener — API wrappers for /api/screeners.
 * The filter registry is served by the API rather than hardcoded here: bounds
 * and option lists are derived from the ingested data, so a client that
 * hardcoded them would drift the moment the dataset changed. Build the panels
 * from `getFilterRegistry`, and address a filter by its `key`.
 * `available: false` means the ingestor has not populated that column yet — the
 * filter is real, but there is nothing to range over, so it renders disabled
 * rather than vanishing.
 */
import type { ScreenerFilterValue } from '@ereuna/shared';
import { api, type ApiResult } from '@/api/client';

/** The filters written on a screener, keyed by filter slug. */
export type ScreenerFilters = Record<string, ScreenerFilterValue>;

export type ScreenerSummary = {
    id: string;
    name: string;
    include: boolean; // Whether it contributes to the combined results
    filterCount: number;
    updatedAt: string;
};

export type ScreenerDetail = ScreenerSummary & {
    filters: ScreenerFilters;
};

export type FilterDescriptor =
    | { key: string; label: string; kind: 'range'; available: boolean; bounds: { min: number; max: number } | null }
    | { key: string; label: string; kind: 'date'; available: boolean; bounds: { min: string; max: string } | null }
    | { key: string; label: string; kind: 'enum'; available: boolean; options: string[] }
    | { key: string; label: string; kind: 'ma'; available: boolean; directions: readonly string[]; targets: readonly string[] }
    | { key: string; label: string; kind: 'flag'; available: boolean };

export type ScreenerResult = {
    symbol: string;
    name: string | null;
    assetType: string | null;
    sector: string | null;
    exchange: string | null;
} & Record<string, unknown>;

export type ScreenerResultPage = {
    items: ScreenerResult[];
    total: number;
    page: number;
    pages: number;
};

/** The value written for one filter. Which shape applies is decided by the
 *  descriptor's `kind`, which is why this is a union rather than a guess. */
export type FilterValue =
    | { min?: number; max?: number }
    | { from?: string; to?: string }
    | { values: string[] }
    | { direction: string; target: string }
    | { enabled: boolean };

export type ResultsQuery = {
    page?: number;
    limit?: number;
};

export function listScreeners(): ApiResult<{ items: ScreenerSummary[] }> {
    return api.get<{ items: ScreenerSummary[] }>('/screeners');
}

export function createScreener(name: string): ApiResult<ScreenerSummary> {
    return api.post<ScreenerSummary>('/screeners', { name });
}

export function getFilterRegistry(): ApiResult<{ items: FilterDescriptor[] }> {
    return api.get<{ items: FilterDescriptor[] }>('/screeners/filters');
}

/** Results across every screener the user has switched on. */
export function getCombinedResults(query: ResultsQuery = {}): ApiResult<ScreenerResultPage> {
    return api.get<ScreenerResultPage>('/screeners/results', { params: query });
}

export function getScreener(name: string): ApiResult<ScreenerDetail> {
    return api.get<ScreenerDetail>(`/screeners/${encodeURIComponent(name)}`);
}

export function updateScreener(name: string, patch: { name?: string; include?: boolean }): ApiResult<ScreenerSummary> {
    return api.patch<ScreenerSummary>(`/screeners/${encodeURIComponent(name)}`, patch);
}

export function deleteScreener(name: string): ApiResult<{ ok: true }> {
    return api.delete<{ ok: true }>(`/screeners/${encodeURIComponent(name)}`);
}

export function getScreenerResults(name: string, query: ResultsQuery = {}): ApiResult<ScreenerResultPage> {
    return api.get<ScreenerResultPage>(`/screeners/${encodeURIComponent(name)}/results`, { params: query });
}

export function setFilter(name: string, filter: string, value: FilterValue): ApiResult<{ filters: ScreenerFilters }> {
    return api.put<{ filters: ScreenerFilters }>(
        `/screeners/${encodeURIComponent(name)}/filters/${encodeURIComponent(filter)}`,
        value,
    );
}

export function clearFilter(name: string, filter: string): ApiResult<{ filters: ScreenerFilters }> {
    return api.delete<{ filters: ScreenerFilters }>(
        `/screeners/${encodeURIComponent(name)}/filters/${encodeURIComponent(filter)}`,
    );
}

export function clearAllFilters(name: string): ApiResult<{ filters: ScreenerFilters }> {
    return api.delete<{ filters: ScreenerFilters }>(`/screeners/${encodeURIComponent(name)}/filters`);
}
