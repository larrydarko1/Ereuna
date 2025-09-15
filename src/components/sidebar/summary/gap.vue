<template>
 <div class="summary-row">
              <div class="category">Gap (%)</div>
               <div class="response">
                {{ (assetInfo.Gap != null && !isNaN(assetInfo.Gap)) ?
                  (parseFloat(assetInfo.Gap)).toFixed(2) + '%' : '-' }}
              </div>
            </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>