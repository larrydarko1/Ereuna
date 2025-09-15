<template>
 <div class="summary-row">
              <div class="category">Relative Volume (6M)</div>
               <div class="response">
                {{ (assetInfo.RelVolume6M != null && !isNaN(assetInfo.RelVolume6M)) ?
                  (parseFloat(assetInfo.RelVolume6M)).toFixed(2) : '-' }}
              </div>
            </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>