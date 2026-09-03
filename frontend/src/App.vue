<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from '@/components/Header.vue';
import AppToasts from '@/components/ui/AppToasts.vue';
import { useThrottleFn } from '@/composables/ui/useDebounce';

/** Below this the data-dense views (charts, screener tables) stop being usable. */
const NARROW_VIEWPORT = 1150;

const route = useRoute();
const isNarrow = ref(false);

const showHeader = computed(() => route.meta.public !== true);

// Throttled: a drag-resize fires this continuously, and the answer only ever
// changes once as the viewport crosses the threshold.
const measure = useThrottleFn(() => {
    isNarrow.value = window.innerWidth <= NARROW_VIEWPORT;
}, 150);

onMounted(() => {
    measure();
    window.addEventListener('resize', measure, { passive: true });
});

// The old version added this listener and never removed it.
onUnmounted(() => window.removeEventListener('resize', measure));
</script>

<template>
    <AppHeader v-if="showHeader" />
    <RouterView />
    <AppToasts />
</template>

<style lang="scss">
body {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}
</style>
