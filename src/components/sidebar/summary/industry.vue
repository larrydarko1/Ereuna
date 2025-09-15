<template>
 <div class="summary-row">
              <div class="category">Industry</div>
              <div class="response">
                {{ assetInfo.Industry.charAt(0).toUpperCase() + assetInfo.Industry.slice(1).toLowerCase() }}
              </div>
            </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>