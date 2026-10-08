/**
 * preferences — API wrappers for /api/preferences.
 * Chart settings live here rather than under /api/charts: which overlays a user
 * wants is a property of the user, not of any one chart.
 */
import type { AnswerOf, BodyOf, Preferences } from '@ereuna/shared';

import { call, type ApiResult } from '@/api/client';

/** The preferences a PATCH may change: every one but `hiddenSymbols`, which has its own two routes. */
export type PreferencesPatch = BodyOf<'PATCH /api/preferences'>;

type HiddenSymbols = AnswerOf<'POST /api/preferences/hidden/:symbol'>;

export function getPreferences(): ApiResult<Preferences> {
    return call('GET /api/preferences');
}

export function updatePreferences(patch: PreferencesPatch): ApiResult<Preferences> {
    return call('PATCH /api/preferences', { body: patch });
}

export function hideSymbol(symbol: string): ApiResult<HiddenSymbols> {
    return call('POST /api/preferences/hidden/:symbol', { params: { symbol } });
}

export function unhideSymbol(symbol: string): ApiResult<HiddenSymbols> {
    return call('DELETE /api/preferences/hidden/:symbol', { params: { symbol } });
}
