<template>
    <div class="summary-row">
              <div class="category">Ticker</div>
              <div class="response">
                {{ assetInfo.Symbol}}
              </div>
            </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>