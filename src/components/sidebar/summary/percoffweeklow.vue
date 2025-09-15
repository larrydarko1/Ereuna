<template>
 <div class="summary-row">
              <div class="category">% Off 52Wk Low</div>
               <div class="response">
                {{ (assetInfo.percoff52WeekLow != null && !isNaN(assetInfo.percoff52WeekLow)) ?
                  (parseFloat(assetInfo.percoff52WeekLow) * 100).toFixed(2) + '%' : '-' }}
              </div>
            </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>