<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import IconPlayerPause from '@/components/icons/IconPlayerPause.vue';
import IconPlayerPlay from '@/components/icons/IconPlayerPlay.vue';
import IconStepBackward from '@/components/icons/IconStepBackward.vue';
import IconStepForward from '@/components/icons/IconStepForward.vue';
import { targetOf } from '@/utils/dom';

const { playing, progress, label } = defineProps<{
    playing: boolean;
    progress: number;
    label: string;
}>();

const emit = defineEmits<{
    toggle: [];
    step: [delta: 1 | -1];
    seek: [percent: number];
}>();

const speed = defineModel<number>('speed', { required: true });

const SPEEDS = [0.5, 1, 2, 5, 10] as const;

const { t } = useI18n();

function onSeek(event: Event): void {
    emit('seek', Number(targetOf(event, HTMLInputElement).value));
}
</script>

<template>
    <div
        class="replay"
        role="group"
        :aria-label="t('charts.replay.title')">
        <div class="replay__transport">
            <button
                type="button"
                class="replay__button"
                :title="t('charts.replay.stepBackward')"
                :aria-label="t('charts.replay.stepBackward')"
                @click="emit('step', -1)">
                <IconStepBackward class="replay__icon" />
            </button>

            <button
                type="button"
                class="replay__button"
                :title="playing ? t('charts.replay.pause') : t('charts.replay.play')"
                :aria-label="playing ? t('charts.replay.pause') : t('charts.replay.play')"
                @click="emit('toggle')">
                <IconPlayerPause
                    v-if="playing"
                    class="replay__icon" />
                <IconPlayerPlay
                    v-else
                    class="replay__icon" />
            </button>

            <button
                type="button"
                class="replay__button"
                :title="t('charts.replay.stepForward')"
                :aria-label="t('charts.replay.stepForward')"
                @click="emit('step', 1)">
                <IconStepForward class="replay__icon" />
            </button>

            <select
                v-model.number="speed"
                class="replay__speed"
                :aria-label="t('charts.replay.speed')">
                <!-- "2×" is a multiplication sign and a number: not prose, so not a string. -->
                <option
                    v-for="option in SPEEDS"
                    :key="option"
                    :value="option"
                    >{{ option }}×</option
                >
            </select>
        </div>

        <input
            class="replay__scrubber"
            type="range"
            min="0"
            max="100"
            step="0.1"
            :value="progress"
            :aria-label="t('charts.replay.seek')"
            :aria-valuetext="label"
            @input="onSeek" />

        <span class="replay__date">{{ label }}</span>
    </div>
</template>

<style lang="scss" scoped>
.replay {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $space-2;
    padding: $space-1 $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-surface;
}

.replay__transport {
    display: flex;
    align-items: center;
    gap: $space-1;
}

.replay__button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: $radius-sm;
    background: none;
    color: $color-text-muted;
    cursor: pointer;

    &:hover {
        color: $color-text;
    }
}

.replay__icon {
    width: 14px;
    height: 14px;
}

.replay__speed {
    font-size: $font-size-xs;
}

.replay__scrubber {
    flex: 1;
    min-width: 120px;
    accent-color: $color-accent-1;
}

.replay__date {
    color: $color-text-muted;
    font-size: $font-size-xs;
    font-variant-numeric: tabular-nums;
}
</style>
