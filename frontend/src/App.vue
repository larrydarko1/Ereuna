<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import MobileNotice from '@/components/message.vue';
import { useThrottleFn } from '@/composables/ui/useDebounce';

/** Below this the data-dense views (charts, screener tables) stop being usable. */
const NARROW_VIEWPORT = 1150;

/** The views that genuinely need the width. Everything else reads fine narrow. */
const DENSE_ROUTES = ['/charts', '/screener', '/dashboard', '/account', '/portfolio'];

const route = useRoute();
const isNarrow = ref(false);

const showMobileNotice = computed(() => isNarrow.value && DENSE_ROUTES.includes(route.path));

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
    <router-view />
    <MobileNotice v-if="showMobileNotice" />
</template>

<!-- Unscoped: this is the application shell, and these rules are the page
     ground itself rather than any one component's styling. -->
<style lang="scss">
body {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}

/**
 * LEGACY TYPE BASELINE — remove with the last migrated view.
 * The old app set a 10px base on every element and then wrote explicit pixel
 * sizes against it in all 222 components. `_base.scss` carries the real
 * baseline ($font-size-base); until every view is migrated, dropping this
 * would resize the ones that have not been touched yet.
 */
* {
    font-size: 10px;
}
</style>
