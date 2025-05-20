<template>
<div class="summary-row">
              <div class="category">52Wk High</div>
               <div class="response">
                {{ (assetInfo.fiftytwoWeekHigh != null && !isNaN(assetInfo.fiftytwoWeekHigh)) ?
                  (parseFloat(assetInfo.fiftytwoWeekHigh)).toFixed(2) : '-' }}
              </div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>