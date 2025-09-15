<template>
 <div class="summary-row">
              <div class="category">Location</div>
              <div class="response">{{ assetInfo.Address }}</div>
            </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>