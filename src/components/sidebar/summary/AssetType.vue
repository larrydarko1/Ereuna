<template>
  <div class="summary-row">
              <div class="category">Asset Type</div>
              <div class="response">
                {{ assetInfo.AssetType }}
              </div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>