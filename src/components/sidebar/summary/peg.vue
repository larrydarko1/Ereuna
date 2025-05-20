<template>
 <div class="summary-row">
              <div class="category">PEG Ratio</div>
              <div class="response">
                {{ (assetInfo.PEGRatio != null && !isNaN(assetInfo.PEGRatio) && assetInfo.PEGRatio >= 0) ?
                  parseInt(assetInfo.PEGRatio) : '-' }}
              </div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>