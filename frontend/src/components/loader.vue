<script setup lang="ts">
/**
 * MIGRATION SCAFFOLDING — delete with the last unmigrated view.
 * One view still imports this path. It is now AppSpinner under the old name,
 * so there is one spinner in the app rather than two that drift apart.
 * Replacement: @/components/ui/AppSpinner.vue.
 * Remaining consumer: the User view.
 */
import AppSpinner from '@/components/ui/AppSpinner.vue';
</script>

<template>
    <AppSpinner size="lg" />
</template>
