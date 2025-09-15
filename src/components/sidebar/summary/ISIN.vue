<template>
<div class="summary-row">
              <div class="category">ISIN</div>
              <div class="response">{{ assetInfo.ISIN }}</div>
            </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>