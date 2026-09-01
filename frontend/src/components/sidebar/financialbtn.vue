<template>
  <button class="financialbtn" @click="$emit('show-popup')">
    {{ t('sidebar.viewFinancialStatements') }}
  </button>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<style scoped>
.financialbtn {
  background-color: var(--color-accent-1);
  border: none;
  cursor: pointer;
  width: 100%;
  padding: 10px;
  color: var(--color-text-inverted);
  font-weight: bold;
  transition: background-color 0.5s ease-in-out;
  border-radius: 6px;
  margin: 0 5px 2px 5px;
   width: calc(100% - 10px);
}

.financialbtn:hover {
  background-color: var(--color-accent-2);
}
</style>