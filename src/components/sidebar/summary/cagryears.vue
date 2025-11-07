<template>
 <div class="summary-row">
              <div class="category">CAGR Years</div>
              <div class="response">
                {{ (assetInfo.CAGRYears != null && !isNaN(assetInfo.CAGRYears)) ? parseFloat(assetInfo.CAGRYears).toFixed(2) : '-'
                }}
              </div>
            </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>