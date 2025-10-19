<template>
<div class="summary-row">
              <div class="category">Fund Family</div>
              <div class="response">
                {{ assetInfo.fundFamily && assetInfo.fundFamily !== '' ? assetInfo.fundFamily : '-' }}
              </div>
            </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>
