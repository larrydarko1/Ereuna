<template>
<div class="summary-row">
              <div class="category">PS Ratio</div>
              <div class="response">
                {{ (assetInfo.PriceToSalesRatio != null && !isNaN(assetInfo.PriceToSalesRatio) && assetInfo.PriceToSalesRatio >= 0) ?
                  parseInt(assetInfo.PriceToSalesRatio) : '-' }}
              </div>
            </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>