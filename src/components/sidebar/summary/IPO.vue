<template>
 <div class="summary-row">
              <div class="category">IPO Date</div>
              <div class="response">{{ formatDate(assetInfo.IPO) }}</div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>