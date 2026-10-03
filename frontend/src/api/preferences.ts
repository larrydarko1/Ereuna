/**
 * preferences — API wrappers for /api/preferences.
 * Chart settings live here rather than under /api/charts: which overlays a user
 * wants is a property of the user, not of any one chart.
 */
import type { hiddenSymbolsSchema, Preferences, ResponseBody } from '@ereuna/shared';

import { api, type ApiResult } from '@/api/client';

export function getPreferences(): ApiResult<Preferences> {
    return api.get<Preferences>('/preferences');
}

export function updatePreferences(patch: Partial<Preferences>): ApiResult<Preferences> {
    return api.patch<Preferences>('/preferences', patch);
}

export function hideSymbol(symbol: string): ApiResult<ResponseBody<typeof hiddenSymbolsSchema>> {
    return api.post<ResponseBody<typeof hiddenSymbolsSchema>>(`/preferences/hidden/${encodeURIComponent(symbol)}`);
}

export function unhideSymbol(symbol: string): ApiResult<ResponseBody<typeof hiddenSymbolsSchema>> {
    return api.delete<ResponseBody<typeof hiddenSymbolsSchema>>(`/preferences/hidden/${encodeURIComponent(symbol)}`);
}
