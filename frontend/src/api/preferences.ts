/**
 * preferences — API wrappers for /api/preferences.
 * Chart settings live here rather than under /api/charts: which overlays a user
 * wants is a property of the user, not of any one chart.
 */
import type { ChartSettings, PanelLayout } from '@ereuna/shared';
import { api, type ApiResult } from '@/api/client';

export type Preferences = {
    language: string;
    theme: string | null;
    defaultSymbol: string;
    hiddenSymbols: string[];
    chartSettings: ChartSettings | null;
    panels: PanelLayout | null;
    screenerColumns: string[];
};

export function getPreferences(): ApiResult<Preferences> {
    return api.get<Preferences>('/preferences');
}

export function updatePreferences(patch: Partial<Preferences>): ApiResult<Preferences> {
    return api.patch<Preferences>('/preferences', patch);
}

export function hideSymbol(symbol: string): ApiResult<{ hiddenSymbols: string[] }> {
    return api.post<{ hiddenSymbols: string[] }>(`/preferences/hidden/${encodeURIComponent(symbol)}`);
}

export function unhideSymbol(symbol: string): ApiResult<{ hiddenSymbols: string[] }> {
    return api.delete<{ hiddenSymbols: string[] }>(`/preferences/hidden/${encodeURIComponent(symbol)}`);
}
