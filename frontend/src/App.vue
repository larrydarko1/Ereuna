<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from '@/components/Header.vue';
import AppToasts from '@/components/ui/AppToasts.vue';

const route = useRoute();

const showHeader = computed(() => route.meta.public !== true);
</script>

<template>
    <AppHeader v-if="showHeader" />
    <RouterView />
    <AppToasts />
</template>
