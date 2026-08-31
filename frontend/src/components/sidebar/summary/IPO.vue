<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.ipoDate') }}</div>
              <div class="response">{{ displayIPODate(assetInfo.IPO) }}</div>
            </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const props = defineProps(['assetInfo', 'formatDate', 'showAllDescription']);

const displayIPODate = (date: any): string => {
  if (date === null || date === undefined || date === '') return '-';
  
  const formatted = props.formatDate(date);
  
  if (!formatted || formatted === 'Invalid Date' || formatted.toLowerCase() === 'nan' || formatted.toLowerCase() === 'null') {
    return '-';
  }
  
  return formatted;
};
</script>

<style lang="scss">

</style>