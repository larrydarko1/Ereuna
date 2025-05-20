<template>
 <div class="summary-row">
              <div class="category">Relative Volume (1Y)</div>
               <div class="response">
                {{ (assetInfo.RelVolume1Y != null && !isNaN(assetInfo.RelVolume1Y)) ?
                  (parseFloat(assetInfo.RelVolume1Y)).toFixed(2) : '-' }}
              </div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>