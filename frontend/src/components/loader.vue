<script setup lang="ts">
/**
 * MIGRATION SCAFFOLDING — delete with the last unmigrated view.
 * Five views still import this path. It is now AppSpinner under the old name,
 * so there is one spinner in the app rather than two that drift apart.
 * Replacement: @/components/ui/AppSpinner.vue.
 * Remaining consumers: Screener/Chart1, Screener/Chart2, charts/MainChart,
 * and the Charts and User views.
 */
import AppSpinner from '@/components/ui/AppSpinner.vue';
</script>

<template>
    <AppSpinner size="lg" />
</template>
