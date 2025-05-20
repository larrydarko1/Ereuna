<template>
 <div class="summary-row2">
              <div :class="['description', { 'expanded': showAllDescription }]"
                :style="{ height: showAllDescription ? 'auto' : minHeight }">
                {{ assetInfo.Description }}
              </div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>