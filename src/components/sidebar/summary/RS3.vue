<template>
 <div class="summary-row">
              <div class="category">Technical Score (4M)</div>
              <div class="response">{{ assetInfo.RSScore4M }}</div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>