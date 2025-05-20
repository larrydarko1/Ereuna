<template>
 <div class="summary-row">
              <div class="category">ADV 1M</div>
               <div class="response">
                {{ (assetInfo.ADV1M != null && !isNaN(assetInfo.ADV1M)) ?
                  (parseFloat(assetInfo.ADV1M)).toFixed(2) + '%' : '-' }}
              </div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>