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
import type { AnswerOf, BodyOf, QueryOf, ScreenerDetail, ScreenerResultPage, ScreenerSummary } from '@ereuna/shared';

import { call, type ApiResult } from '@/api/client';

/** The value written for one filter. Which keys apply is decided by the
 *  descriptor's `kind`; the API refuses a key that kind does not read. */
export type FilterValue = BodyOf<'PUT /api/screeners/:name/filters/:filter'>;

/** A moving-average filter's two choices, as the API names them. */
export type MaChoice = {
    direction: NonNullable<FilterValue['direction']>;
    target: NonNullable<FilterValue['target']>;
};

export type ResultsQuery = QueryOf<'GET /api/screeners/results'>;

type FilterSet = AnswerOf<'PUT /api/screeners/:name/filters/:filter'>;

export function getScreeners(): ApiResult<AnswerOf<'GET /api/screeners'>> {
    return call('GET /api/screeners');
}

export function createScreener(name: string): ApiResult<ScreenerSummary> {
    return call('POST /api/screeners', { body: { name } });
}

export function getFilterRegistry(): ApiResult<AnswerOf<'GET /api/screeners/filters'>> {
    return call('GET /api/screeners/filters');
}

/** Results across every screener the user has switched on. */
export function getCombinedResults(query: ResultsQuery = {}): ApiResult<ScreenerResultPage> {
    return call('GET /api/screeners/results', { query });
}

/** The hidden symbols, projected through the same columns as any other page. */
export function getHiddenResults(query: ResultsQuery = {}): ApiResult<ScreenerResultPage> {
    return call('GET /api/screeners/hidden/results', { query });
}

export function getScreener(name: string): ApiResult<ScreenerDetail> {
    return call('GET /api/screeners/:name', { params: { name } });
}

export function updateScreener(name: string, patch: BodyOf<'PATCH /api/screeners/:name'>): ApiResult<ScreenerSummary> {
    return call('PATCH /api/screeners/:name', { params: { name }, body: patch });
}

export function deleteScreener(name: string): ApiResult<void> {
    return call('DELETE /api/screeners/:name', { params: { name } });
}

export function getScreenerResults(name: string, query: ResultsQuery = {}): ApiResult<ScreenerResultPage> {
    return call('GET /api/screeners/:name/results', { params: { name }, query });
}

export function setFilter(name: string, filter: string, value: FilterValue): ApiResult<FilterSet> {
    return call('PUT /api/screeners/:name/filters/:filter', { params: { name, filter }, body: value });
}

export function clearFilter(name: string, filter: string): ApiResult<FilterSet> {
    return call('DELETE /api/screeners/:name/filters/:filter', { params: { name, filter } });
}

export function clearAllFilters(name: string): ApiResult<FilterSet> {
    return call('DELETE /api/screeners/:name/filters', { params: { name } });
}
