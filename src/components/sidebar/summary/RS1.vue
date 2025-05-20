<template>
 <div class="summary-row">
              <div class="category">Technical Score (1W)</div>
              <div class="response">{{ assetInfo.RSScore1W }}</div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>