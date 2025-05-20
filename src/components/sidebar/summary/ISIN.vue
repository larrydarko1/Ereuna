<template>
<div class="summary-row">
              <div class="category">ISIN</div>
              <div class="response">{{ assetInfo.ISIN }}</div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>