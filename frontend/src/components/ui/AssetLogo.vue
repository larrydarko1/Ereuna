<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const { symbol, exchange = null, size = 'md' } = defineProps<{
    symbol: string;
    exchange?: string | null;
    size?: 'sm' | 'md';
}>();

const failed = ref(false);

// A new symbol deserves a fresh attempt: the previous one's 404 says nothing
// about this one.
watch(
    () => `${exchange ?? ''}/${symbol}`,
    () => {
        failed.value = false;
    },
);

// Served by the API off disk, not shipped in the build — a relative path so
// the reverse proxy that fronts both is the only thing that knows where.
const source = computed(() =>
    exchange === null || exchange === '' ? null : `/api/logos/${exchange}/${encodeURIComponent(symbol)}.svg`,
);

const initials = computed(() => symbol.slice(0, 2).toUpperCase());
</script>

<template>
    <img
        v-if="source !== null && !failed"
        class="logo"
        :class="`logo--${size}`"
        :src="source"
        :alt="''"
        loading="lazy"
        decoding="async"
        @error="failed = true"
    />
    <span v-else class="logo logo--fallback" :class="`logo--${size}`" aria-hidden="true">{{ initials }}</span>
</template>

<style lang="scss" scoped>
.logo {
    flex: none;
    border-radius: $radius-sm;
    object-fit: contain;
    background: $color-sunken;
}

.logo--sm {
    width: 20px;
    height: 20px;
}

.logo--md {
    width: 28px;
    height: 28px;
}

.logo--fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: $color-text-muted;
    font-size: $font-size-xs;
    font-weight: $font-weight-bold;
    letter-spacing: -0.02em;
}
</style>
