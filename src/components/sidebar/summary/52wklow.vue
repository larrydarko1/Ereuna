<template>
 <div class="summary-row">
              <div class="category">52Wk Low</div>
               <div class="response">
                {{ (assetInfo.fiftytwoWeekLow != null && !isNaN(assetInfo.fiftytwoWeekLow)) ?
                  (parseFloat(assetInfo.fiftytwoWeekLow)).toFixed(2) : '-' }}
              </div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>