<template>
   <div class="summary-row">
              <div class="category">Exchange</div>
              <div class="response">
                {{ assetInfo.Exchange }}
              </div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>