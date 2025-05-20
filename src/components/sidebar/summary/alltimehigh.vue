<template>
 <div class="summary-row">
              <div class="category">All Time High</div>
              <div class="response">
                {{ (assetInfo.AlltimeHigh != null && !isNaN(assetInfo.AlltimeHigh)) ?
                  (parseFloat(assetInfo.AlltimeHigh)).toFixed(2) : '-' }}
              </div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>