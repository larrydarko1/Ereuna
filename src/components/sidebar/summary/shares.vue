<template>
  <div class="summary-row">
              <div class="category">Shares Outstanding</div>
              <div class="response">{{ parseInt(assetInfo.SharesOutstanding).toLocaleString() }}</div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>