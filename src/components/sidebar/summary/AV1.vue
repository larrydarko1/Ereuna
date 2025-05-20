<template>
<div class="summary-row">
              <div class="category">Average Volume (1W)</div>
              <div class="response">{{ parseInt(assetInfo.AvgVolume1W).toLocaleString() }}</div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>