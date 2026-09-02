/**
 * useScreenerFilters — the filters written on one screener, read and edited.
 * The API addresses a filter by its slug (`pe`) but a screener document stores
 * it under its field name (`PE`), so reading a value back means going through
 * the shared registry rather than assuming the two names match. Every write
 * returns the whole filter set, which is what is kept: a filter the server
 * normalised — a reversed range, a value clamped to the data — must show the
 * number that was actually saved, not the one that was typed.
 */
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import { filterField } from '@ereuna/shared';
import { apiErrorMessage } from '@/api/client';
import {
    clearAllFilters,
    clearFilter,
    getScreener,
    setFilter,
    type FilterDescriptor,
    type FilterValue,
    type ScreenerFilters,
} from '@/api/screener';
import { i18n } from '@/i18n';

export type FilterKind = FilterDescriptor['kind'];

export type ActiveFilter =
    | { kind: 'range'; min: number; max: number }
    | { kind: 'date'; from: string; to: string }
    | { kind: 'enum'; values: string[] }
    | { kind: 'ma'; direction: string; target: string }
    | { kind: 'flag'; enabled: boolean };

export type UseScreenerFiltersReturn = {
    filters: Ref<ScreenerFilters>;
    activeCount: ComputedRef<number>;
    pending: Ref<boolean>;
    saving: Ref<string | null>; // The key currently being written, for a per-card spinner
    error: Ref<string | null>;
    valueFor: (key: string, kind: FilterKind) => ActiveFilter | null;
    set: (key: string, value: FilterValue) => Promise<void>;
    clear: (key: string) => Promise<void>;
    clearAll: () => Promise<void>;
    reload: () => Promise<void>;
};

export function useScreenerFilters(name: Ref<string>): UseScreenerFiltersReturn {
    const filters = ref<ScreenerFilters>({});
    const pending = ref(false);
    const saving = ref<string | null>(null);
    const error = ref<string | null>(null);

    // Switching screeners mid-request must not paint the old one's filters
    // under the new one's name.
    let sequence = 0;

    async function reload(): Promise<void> {
        const target = name.value;
        const ticket = (sequence += 1);

        if (target === '') {
            filters.value = {};
            return;
        }

        pending.value = true;
        error.value = null;
        try {
            const { data } = await getScreener(target);
            if (ticket !== sequence) return;
            filters.value = data.filters;
        } catch (err) {
            if (ticket !== sequence) return;
            filters.value = {};
            error.value = apiErrorMessage(err, i18n.global.t('errors.INTERNAL'));
        } finally {
            if (ticket === sequence) pending.value = false;
        }
    }

    watch(name, reload, { immediate: true });

    const activeCount = computed(() => Object.keys(filters.value).length);

    /**
     * The stored value for one filter, shaped by the kind the catalogue gives
     * it. The kind has to come from the caller: a date range and a two-value
     * enum selection are both arrays of two strings on the wire, and a fund
     * family named "2024" parses as a date perfectly well.
     */
    function valueFor(key: string, kind: FilterKind): ActiveFilter | null {
        const field = filterField(key);
        if (field === undefined) return null;

        const stored = filters.value[field];
        if (stored === undefined) return null;

        switch (kind) {
            case 'range':
                return isNumberPair(stored) ? { kind: 'range', min: stored[0], max: stored[1] } : null;
            case 'date':
                return isStringPair(stored) ? { kind: 'date', from: stored[0], to: stored[1] } : null;
            case 'enum':
                return Array.isArray(stored) && stored.every((entry) => typeof entry === 'string')
                    ? { kind: 'enum', values: stored }
                    : null;
            case 'ma':
                return typeof stored === 'string' ? parseMa(stored) : null;
            case 'flag':
                return stored === true ? { kind: 'flag', enabled: true } : null;
        }
    }

    async function write(key: string, action: () => Promise<{ data: { filters: ScreenerFilters } }>): Promise<void> {
        if (name.value === '') return;
        saving.value = key;
        error.value = null;
        try {
            const { data } = await action();
            filters.value = data.filters;
        } catch (err) {
            error.value = apiErrorMessage(err, i18n.global.t('errors.INTERNAL'));
        } finally {
            saving.value = null;
        }
    }

    async function set(key: string, value: FilterValue): Promise<void> {
        await write(key, () => setFilter(name.value, key, value));
    }

    async function clear(key: string): Promise<void> {
        await write(key, () => clearFilter(name.value, key));
    }

    async function clearAll(): Promise<void> {
        await write('', () => clearAllFilters(name.value));
    }

    return { filters, activeCount, pending, saving, error, valueFor, set, clear, clearAll, reload };
}

/** The stored `abv200` / `blwPrice` shorthand, split back into its two parts. */
function parseMa(value: string): ActiveFilter | null {
    const match = /^(abv|blw)(10|20|50|200|[Pp]rice)$/.exec(value);
    if (match === null || match[1] === undefined || match[2] === undefined) return null;
    return { kind: 'ma', direction: match[1], target: match[2].toLowerCase() === 'price' ? 'price' : match[2] };
}

function isNumberPair(value: unknown): value is [number, number] {
    return Array.isArray(value) && value.length === 2 && value.every((entry) => typeof entry === 'number');
}

function isStringPair(value: unknown): value is [string, string] {
    return Array.isArray(value) && value.length === 2 && value.every((entry) => typeof entry === 'string');
}
