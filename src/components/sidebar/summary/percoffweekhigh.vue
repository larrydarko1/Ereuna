<template>
<div class="summary-row">
  <div class="category">% Off 52Wk High</div>
  <div class="response">
    {{ (assetInfo.percoff52WeekHigh != null && !isNaN(assetInfo.percoff52WeekHigh)) ?
      (parseFloat(assetInfo.percoff52WeekHigh) * 100).toFixed(2) + '%' : '-' }}
  </div>
</div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>