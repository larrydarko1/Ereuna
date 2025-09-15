<template>
<div class="summary-row">
              <div class="category">Sector</div>
              <div class="response">
                {{ assetInfo.Sector.charAt(0).toUpperCase() + assetInfo.Sector.slice(1).toLowerCase() }}
              </div>
            </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>