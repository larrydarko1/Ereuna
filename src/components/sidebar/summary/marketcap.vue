<template>
 <div class="summary-row">
              <div class="category">Market Cap</div>
              <div class="response">{{ parseInt(assetInfo.MarketCapitalization).toLocaleString() }}</div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>