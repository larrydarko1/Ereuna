<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDialog from '@/components/ui/AppDialog.vue';

const { min, max } = defineProps<{
    min: string;
    max: string;
}>();

const emit = defineEmits<{
    close: [];
    start: [from: Date];
}>();

const MONTH_PRESETS = [1, 3, 6] as const;

const { t } = useI18n();

const date = ref(defaultStart());

const valid = computed(() => date.value !== '' && date.value >= min && date.value <= max);

/**
 * Three months back, or the start of the series when it is shorter.
 * Opening on the newest bar would start a replay with nothing left to replay.
 */
function defaultStart(): string {
    const target = monthsBack(3);
    return target < min ? min : target;
}

function monthsBack(months: number): string {
    const end = new Date(`${max}T00:00:00Z`);
    end.setUTCMonth(end.getUTCMonth() - months);
    return end.toISOString().slice(0, 10);
}

function applyPreset(months: number): void {
    const target = monthsBack(months);
    date.value = target < min ? min : target;
}

function submit(): void {
    if (!valid.value) return;
    emit('start', new Date(`${date.value}T00:00:00Z`));
}
</script>

<template>
    <AppDialog
        :title="t('charts.replay.selectStart')"
        size="sm"
        @close="emit('close')">
        <form
            class="replay-start"
            @submit.prevent="submit">
            <label class="replay-start__field">
                <span class="replay-start__label">{{ t('charts.replay.startDate') }}</span>
                <input
                    v-model="date"
                    class="replay-start__input"
                    type="date"
                    :min="min"
                    :max="max"
                    required />
            </label>

            <div class="replay-start__presets">
                <button
                    v-for="months in MONTH_PRESETS"
                    :key="months"
                    type="button"
                    class="replay-start__preset"
                    @click="applyPreset(months)">
                    {{ t('charts.replay.monthsAgo', { count: months }) }}
                </button>
                <button
                    type="button"
                    class="replay-start__preset"
                    @click="applyPreset(12)">
                    {{ t('charts.replay.yearsAgo', { count: 1 }) }}
                </button>
            </div>
        </form>

        <template #footer>
            <button
                type="button"
                class="replay-start__confirm"
                :disabled="!valid"
                @click="submit">
                {{ t('charts.replay.start') }}
            </button>
        </template>
    </AppDialog>
</template>

<style lang="scss" scoped>
.replay-start {
    display: flex;
    flex-direction: column;
    gap: $space-3;
}

.replay-start__field {
    display: flex;
    flex-direction: column;
    gap: $space-1;
}

.replay-start__label {
    color: $color-text-muted;
    font-size: $font-size-xs;
}

.replay-start__input {
    padding: $space-1 $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-bg;
    color: $color-text;
    font-size: $font-size-sm;
}

.replay-start__presets {
    display: flex;
    flex-wrap: wrap;
    gap: $space-1;
}

.replay-start__preset {
    padding: $space-1 $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-pill;
    background: none;
    color: $color-text-muted;
    font-size: $font-size-xs;
    cursor: pointer;

    &:hover {
        border-color: $color-accent-1;
        color: $color-text;
    }
}

.replay-start__confirm {
    margin-left: auto;
    padding: $space-1 $space-4;
    border: none;
    border-radius: $radius-sm;
    background: $color-accent-1;
    color: $color-text-inverted;
    font-size: $font-size-sm;
    cursor: pointer;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
}
</style>
