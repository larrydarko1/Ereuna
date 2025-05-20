<template>
 <div class="summary-row">
              <div class="category">All Time Low</div>
              <div class="response">
                {{ (assetInfo.AlltimeLow != null && !isNaN(assetInfo.AlltimeLow)) ?
                  (parseFloat(assetInfo.AlltimeLow)).toFixed(2) : '-' }}
              </div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>