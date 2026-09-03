<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatDateTime } from '@/utils/formatters';

const { updatedAt = null } = defineProps<{
    updatedAt?: string | null; // When the ingestor last wrote the market summary
}>();

const { t, locale } = useI18n();

const now = ref(new Date());

const date = computed(() =>
    now.value.toLocaleDateString(locale.value, { weekday: 'long', day: 'numeric', month: 'long' }),
);

const time = computed(() =>
    now.value.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
);

const ingested = computed(() => (updatedAt === null ? t('dashboard.never') : formatDateTime(updatedAt)));

// A wall clock only has to be right to the second it displays, so it ticks on
// the second rather than on a frame
let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
    timer = setInterval(() => {
        now.value = new Date();
    }, 1000);
});

onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
    <div class="clock">
        <p class="clock__date">{{ date }}</p>
        <p class="clock__time">{{ time }}</p>
        <p class="clock__ingest">
            <span class="clock__ingest-label">{{ t('dashboard.lastUpdate') }}</span>
            <span>{{ ingested }}</span>
        </p>
    </div>
</template>

<style lang="scss" scoped>
.clock {
    display: flex;
    flex-direction: column;
    gap: 0.15em;
}

.clock__date {
    margin: 0;
    font-size: $font-size-sm;
    color: $color-text-muted;
}

.clock__time {
    margin: 0;
    font-family: $font-mono;
    font-size: $font-size-xl;
    color: $color-text;
    font-variant-numeric: tabular-nums;
}

.clock__ingest {
    display: flex;
    gap: 0.4em;
    margin: 0;
    font-size: $font-size-xs;
    color: $color-text-muted;
}

.clock__ingest-label {
    text-transform: uppercase;
    letter-spacing: 0.04em;
}
</style>
