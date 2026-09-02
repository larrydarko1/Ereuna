/**
 * usePanelLayout — which sidebar sections and summary rows the user shows, and
 * in what order.
 * Order is the array order and hidden is absence, which is the whole model: the
 * old shape stored `{ order, tag, name, hidden }` objects and then sorted them
 * by `order` in a computed that mutated the source array in place, so the list
 * could reorder itself under a render.
 * A user who has never touched the layout has no stored value, and gets the
 * full default order rather than an empty sidebar.
 */
import { computed, type ComputedRef } from 'vue';
import { PANEL_SECTIONS, SUMMARY_FIELDS, type PanelSection, type SummaryField } from '@ereuna/shared';
import { patchPreferences, usePreferences } from '@/composables/data/usePreferences';

export type UsePanelLayoutReturn = {
    sections: ComputedRef<readonly PanelSection[]>;
    summaryFields: ComputedRef<readonly SummaryField[]>;
    save: (layout: { sections: readonly PanelSection[]; summaryFields: readonly SummaryField[] }) => Promise<void>;
    reset: () => Promise<void>;
};

export function usePanelLayout(): UsePanelLayoutReturn {
    const { preferences } = usePreferences();

    const sections = computed<readonly PanelSection[]>(() => preferences.value?.panels?.sections ?? PANEL_SECTIONS);

    const summaryFields = computed<readonly SummaryField[]>(
        () => preferences.value?.panels?.summaryFields ?? SUMMARY_FIELDS,
    );

    async function save(layout: {
        sections: readonly PanelSection[];
        summaryFields: readonly SummaryField[];
    }): Promise<void> {
        await patchPreferences({
            panels: { sections: [...layout.sections], summaryFields: [...layout.summaryFields] },
        });
    }

    /** Forget the customisation. Null means "no stored layout", not "empty layout". */
    async function reset(): Promise<void> {
        await patchPreferences({ panels: null });
    }

    return { sections, summaryFields, save, reset };
}
