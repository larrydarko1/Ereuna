<template>
 <div class="summary-row">
              <div class="category">Relative Volume (1M)</div>
               <div class="response">
                {{ (assetInfo.RelVolume1M != null && !isNaN(assetInfo.RelVolume1M)) ?
                  (parseFloat(assetInfo.RelVolume1M)).toFixed(2) : '-' }}
              </div>
            </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>