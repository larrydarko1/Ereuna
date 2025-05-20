<template>
 <div class="summary-row">
              <div class="category">RSI</div>
              <div class="response">
                {{ (assetInfo.RSI != null && !isNaN(assetInfo.RSI) && assetInfo.RSI >= 0) ?
                  parseInt(assetInfo.RSI) : '-' }}
              </div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>