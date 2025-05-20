<template>
<div class="summary-row">
              <div class="category">ADV 1W</div>
               <div class="response">
                {{ (assetInfo.ADV1W != null && !isNaN(assetInfo.ADV1W)) ?
                  (parseFloat(assetInfo.ADV1W)).toFixed(2) + '%' : '-' }}
              </div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>