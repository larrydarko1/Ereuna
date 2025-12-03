<template>
 <div class="summary-row">
              <div class="category">Intrinsic Value (AI)</div>
              <div class="response">
                {{ (assetInfo.IntrinsicValue != null && !isNaN(assetInfo.IntrinsicValue)) ? parseFloat(assetInfo.IntrinsicValue) : '-'
                }}
              </div>
            </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>