<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from '@/components/Header.vue';

const route = useRoute();

const showHeader = computed(() => route.meta.bare !== true);
</script>

<template>
    <AppHeader v-if="showHeader" />
    <RouterView />
</template>
