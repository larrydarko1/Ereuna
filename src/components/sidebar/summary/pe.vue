<template>
 <div class="summary-row">
              <div class="category">PE Ratio</div>
              <div class="response">
                {{ (assetInfo.PERatio != null && !isNaN(assetInfo.PERatio) && assetInfo.PERatio >= 0) ?
                  parseInt(assetInfo.PERatio) : '-' }}
              </div>
            </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>