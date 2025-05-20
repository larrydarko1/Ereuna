<template>
 <div class="summary-row">
              <div class="category">Technical Score (1M)</div>
              <div class="response">{{ assetInfo.RSScore1M }}</div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>