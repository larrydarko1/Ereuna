<template>
 <div class="summary-row">
              <div class="category">Dividend Yield</div>
              <div class="response">
                {{ (assetInfo.DividendYield != null && !isNaN(assetInfo.DividendYield)) ?
                  (parseFloat(assetInfo.DividendYield) * 100).toFixed(2) + '%' : '-' }}
              </div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>