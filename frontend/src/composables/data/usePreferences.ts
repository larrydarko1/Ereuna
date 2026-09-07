/**
 * usePreferences — the user's stored interface state, held once for the app.
 * Preferences are read constantly (the chart's default symbol, its overlays,
 * the sidebar layout, the theme, the screener's columns) and change rarely, so
 * they are cached at module scope and shared by every caller. The old code
 * fetched them separately in five places, each with its own idea of what the
 * current value was.
 * Writes are optimistic: a reordered sidebar has to move under the pointer, not
 * a round trip later. A rejected write puts the previous value back, so the
 * screen never keeps a change the server refused.
 * The cache is cleared when the session ends — a signed-out user's default
 * symbol must not become the next user's.
 * `adoptPreferences` is the other half: a route that owns one field and returns
 * the new value of it — hiding a symbol, say — has already written, and folding
 * that answer back in is a cache update, not a second request.
 */
import { readonly, ref, type DeepReadonly, type Ref } from 'vue';
import { onSessionCleared } from '@/api/client';
import { getPreferences, updatePreferences, type Preferences } from '@/api/preferences';

export type UsePreferencesReturn = {
    preferences: DeepReadonly<Ref<Preferences | null>>;
    load: typeof loadPreferences;
    patch: typeof patchPreferences;
    adopt: typeof adoptPreferences;
};

const preferences = ref<Preferences | null>(null);
let inflight: Promise<Preferences> | null = null;

/**
 * The preferences, fetching them if this is the first ask.
 * Concurrent callers share one request: the chart view, the sidebar and the
 * theme all want them the moment the app mounts.
 */
export function loadPreferences(force = false): Promise<Preferences> {
    if (!force && preferences.value !== null) return Promise.resolve(preferences.value);

    if (force || inflight === null) {
        const request = getPreferences().then(({ data }) => {
            preferences.value = data;
            return data;
        });
        inflight = request;
        void request
            .catch(() => undefined)
            .finally(() => {
                // Only clear the slot this request owns: a forced reload may
                // have already replaced it with a newer one.
                if (inflight === request) inflight = null;
            });
    }

    return inflight;
}

/** Apply a change locally, then persist it. A rejection restores what was there. */
export async function patchPreferences(patch: Partial<Preferences>): Promise<void> {
    const previous = preferences.value;
    if (previous !== null) preferences.value = { ...previous, ...patch };

    try {
        const { data } = await updatePreferences(patch);
        preferences.value = data;
    } catch (error) {
        preferences.value = previous;
        throw error;
    }
}

/**
 * Fold a value the server has already stored into the cache.
 * `hiddenSymbols` has its own two routes and is not a field `PATCH
 * /api/preferences` accepts — sending it there answers 422, which is what made
 * hiding a symbol roll straight back off the screen.
 */
export function adoptPreferences(patch: Partial<Preferences>): void {
    if (preferences.value !== null) preferences.value = { ...preferences.value, ...patch };
}

export function usePreferences(): UsePreferencesReturn {
    return {
        preferences: readonly(preferences),
        load: loadPreferences,
        patch: patchPreferences,
        adopt: adoptPreferences,
    };
}

onSessionCleared(() => {
    preferences.value = null;
    inflight = null;
});
