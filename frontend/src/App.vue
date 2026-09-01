<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from '@/components/Header.vue';
import AppToasts from '@/components/ui/AppToasts.vue';
import MobileNotice from '@/components/message.vue';
import { useThrottleFn } from '@/composables/ui/useDebounce';

/** Below this the data-dense views (charts, screener tables) stop being usable. */
const NARROW_VIEWPORT = 1150;

/** The views that genuinely need the width. Everything else reads fine narrow. */
const DENSE_ROUTES = new Set(['Charts', 'Screener', 'Dashboard', 'Account', 'Portfolio']);

const route = useRoute();
const isNarrow = ref(false);

const routeName = computed(() => (typeof route.name === 'string' ? route.name : ''));
const showHeader = computed(() => route.meta.public !== true);
const showMobileNotice = computed(() => isNarrow.value && DENSE_ROUTES.has(routeName.value));

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
    <MobileNotice v-if="showMobileNotice" />
    <AppToasts />
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
 *
 * `:not()` carves out the migrated trees, which size themselves from the
 * typography scale. The list shrinks as batches land, and the rule goes with
 * the last entry.
 */
* :not(.auth *, .auth, .header *, .header, .toasts *, .toasts) {
    // A raw pixel value with no token behind it is exactly what this rule
    // exists to catch. There is no token for it because it is not a design
    // decision — it is the old baseline being held in place until the views
    // that depend on it are gone.
    // stylelint-disable-next-line scale-unlimited/declaration-strict-value, declaration-property-unit-allowed-list
    font-size: 10px;
}
</style>
