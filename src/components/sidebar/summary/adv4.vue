<template>
 <div class="summary-row">
              <div class="category">ADV 1Y</div>
               <div class="response">
                {{ (assetInfo.ADV1Y != null && !isNaN(assetInfo.ADV1Y)) ?
                  (parseFloat(assetInfo.ADV1Y)).toFixed(2) + '%' : '-' }}
              </div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>