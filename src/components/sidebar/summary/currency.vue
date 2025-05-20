<template>
  <div class="summary-row">
              <div class="category">Reported Currency</div>
              <div class="response">{{ assetInfo.Currency.toUpperCase() }}</div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>