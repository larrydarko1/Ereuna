<template>
 <div class="summary-row">
              <div class="category">CAGR</div>
              <div class="response">
                {{ (assetInfo.CAGR != null && !isNaN(assetInfo.CAGR)) ? (parseFloat(assetInfo.CAGR) * 100).toFixed(2) + '%' : '-'
                }}
              </div>
            </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>