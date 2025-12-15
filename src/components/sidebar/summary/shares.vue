<template>
  <div class="summary-row">
              <div class="category">{{ t('summary.sharesOutstanding') }}</div>
              <div class="response">{{ displayShares(assetInfo.SharesOutstanding) }}</div>
            </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);

const displayShares = (value: any): string => {
  if (value === null || value === undefined || value === '' || value === 0) return '-';
  
  const parsed = parseInt(value);
  
  if (isNaN(parsed) || parsed === 0) return '-';
  
  return parsed.toLocaleString();
};
</script>

<style lang="scss">

</style>