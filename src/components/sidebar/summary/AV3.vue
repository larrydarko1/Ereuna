<template>
 <div class="summary-row">
              <div class="category">Average Volume (6M)</div>
              <div class="response">{{ parseInt(assetInfo.AvgVolume6M).toLocaleString() }}</div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>