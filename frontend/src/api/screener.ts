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
import type {
    filterCatalogueSchema,
    ResponseBody,
    ScreenerDetail,
    screenerFilterSetSchema,
    screenerListSchema,
    ScreenerResultPage,
    ScreenerSummary,
} from '@ereuna/shared';

import { api, type ApiResult } from '@/api/client';

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

export function getScreeners(): ApiResult<ResponseBody<typeof screenerListSchema>> {
    return api.get<ResponseBody<typeof screenerListSchema>>('/screeners');
}

export function createScreener(name: string): ApiResult<ScreenerSummary> {
    return api.post<ScreenerSummary>('/screeners', { name });
}

export function getFilterRegistry(): ApiResult<ResponseBody<typeof filterCatalogueSchema>> {
    return api.get<ResponseBody<typeof filterCatalogueSchema>>('/screeners/filters');
}

/** Results across every screener the user has switched on. */
export function getCombinedResults(query: ResultsQuery = {}): ApiResult<ScreenerResultPage> {
    return api.get<ScreenerResultPage>('/screeners/results', { params: query });
}

/** The hidden symbols, projected through the same columns as any other page. */
export function getHiddenResults(query: ResultsQuery = {}): ApiResult<ScreenerResultPage> {
    return api.get<ScreenerResultPage>('/screeners/hidden/results', { params: query });
}

export function getScreener(name: string): ApiResult<ScreenerDetail> {
    return api.get<ScreenerDetail>(`/screeners/${encodeURIComponent(name)}`);
}

export function updateScreener(name: string, patch: { name?: string; include?: boolean }): ApiResult<ScreenerSummary> {
    return api.patch<ScreenerSummary>(`/screeners/${encodeURIComponent(name)}`, patch);
}

export function deleteScreener(name: string): ApiResult<void> {
    return api.delete<void>(`/screeners/${encodeURIComponent(name)}`);
}

export function getScreenerResults(name: string, query: ResultsQuery = {}): ApiResult<ScreenerResultPage> {
    return api.get<ScreenerResultPage>(`/screeners/${encodeURIComponent(name)}/results`, { params: query });
}

export function setFilter(
    name: string,
    filter: string,
    value: FilterValue,
): ApiResult<ResponseBody<typeof screenerFilterSetSchema>> {
    return api.put<ResponseBody<typeof screenerFilterSetSchema>>(
        `/screeners/${encodeURIComponent(name)}/filters/${encodeURIComponent(filter)}`,
        value,
    );
}

export function clearFilter(name: string, filter: string): ApiResult<ResponseBody<typeof screenerFilterSetSchema>> {
    return api.delete<ResponseBody<typeof screenerFilterSetSchema>>(
        `/screeners/${encodeURIComponent(name)}/filters/${encodeURIComponent(filter)}`,
    );
}

export function clearAllFilters(name: string): ApiResult<ResponseBody<typeof screenerFilterSetSchema>> {
    return api.delete<ResponseBody<typeof screenerFilterSetSchema>>(`/screeners/${encodeURIComponent(name)}/filters`);
}
