<template>
   <div class="summary-row">
              <div class="category">Exchange</div>
              <div class="response">
                {{ assetInfo.Exchange }}
              </div>
            </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>