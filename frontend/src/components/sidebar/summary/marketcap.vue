<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.marketCap') }}</div>
              <div class="response">{{ displayMarketCap(assetInfo.MarketCapitalization) }}</div>
            </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);

const displayMarketCap = (value: any): string => {
  if (value === null || value === undefined || value === '' || value === 0) return '-';
  
  const parsed = parseInt(value);
  
  if (isNaN(parsed) || parsed === 0) return '-';
  
  return parsed.toLocaleString();
};
</script>

<style lang="scss">

</style>