<template>
 <div class="summary-row">
              <div class="category">Relative Volume (1W)</div>
               <div class="response">
                {{ (assetInfo.RelVolume1W != null && !isNaN(assetInfo.RelVolume1W)) ?
                  (parseFloat(assetInfo.RelVolume1W)).toFixed(2) : '-' }}
              </div>
            </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>