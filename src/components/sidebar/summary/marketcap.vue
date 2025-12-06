<template>
 <div class="summary-row">
              <div class="category">Market Cap</div>
              <div class="response">{{ displayMarketCap(assetInfo.MarketCapitalization) }}</div>
            </div>
</template>

<script setup lang="ts">
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