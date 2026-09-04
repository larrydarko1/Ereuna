/**
 * useFilterRegistry — the screener's filter catalogue, read once for the app.
 * Bounds and option lists are derived from the whole dataset, not from any one
 * user's screener, so they are the same answer for everybody and change only
 * when the ingestor runs.
 */
import { computed, readonly, ref, type ComputedRef, type DeepReadonly, type Ref } from 'vue';
import { apiErrorMessage, onSessionCleared } from '@/api/client';
import { getFilterRegistry, type FilterDescriptor } from '@/api/screener';
import { i18n } from '@/i18n';
import { FILTER_GROUPS, filterGroup, type FilterGroup } from '@/constants/screener';

export type FilterGrouping = {
    group: FilterGroup;
    filters: FilterDescriptor[];
};

export type UseFilterRegistryReturn = {
    descriptors: DeepReadonly<Ref<FilterDescriptor[]>>;
    grouped: ComputedRef<FilterGrouping[]>;
    byKey: ComputedRef<Map<string, FilterDescriptor>>;
    pending: DeepReadonly<Ref<boolean>>;
    error: DeepReadonly<Ref<string | null>>;
    load: () => Promise<void>;
};

const descriptors = ref<FilterDescriptor[]>([]);
const pending = ref(false);
const error = ref<string | null>(null);
let inflight: Promise<void> | null = null;

const byKey = computed(() => new Map(descriptors.value.map((item) => [item.key, item])));

/**
 * The catalogue arranged into the panel's headings.
 * A heading with nothing in it is dropped rather than rendered empty, which is
 * what happens to the fund group when the dataset holds no funds.
 */
const grouped = computed<FilterGrouping[]>(() =>
    FILTER_GROUPS.map((group) => ({
        group,
        filters: descriptors.value.filter((item) => filterGroup(item.key) === group),
    })).filter((entry) => entry.filters.length > 0),
);

export function useFilterRegistry(): UseFilterRegistryReturn {
    return { descriptors: readonly(descriptors), grouped, byKey, pending: readonly(pending), error: readonly(error), load };
}

async function load(): Promise<void> {
    if (descriptors.value.length > 0) return;
    if (inflight !== null) return inflight;

    pending.value = true;
    error.value = null;

    const request = getFilterRegistry()
        .then(({ data }) => {
            descriptors.value = data.items;
        })
        .catch((err: unknown) => {
            error.value = apiErrorMessage(err, i18n.global.t('errors.INTERNAL'));
        })
        .finally(() => {
            pending.value = false;
            inflight = null;
        });

    inflight = request;
    return request;
}

onSessionCleared(() => {
    descriptors.value = [];
    error.value = null;
    inflight = null;
});
