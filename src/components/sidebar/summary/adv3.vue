<template>
 <div class="summary-row">
              <div class="category">ADV 4M</div>
               <div class="response">
                {{ (assetInfo.ADV4M != null && !isNaN(assetInfo.ADV4M)) ?
                  (parseFloat(assetInfo.ADV4M)).toFixed(2) + '%' : '-' }}
              </div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>