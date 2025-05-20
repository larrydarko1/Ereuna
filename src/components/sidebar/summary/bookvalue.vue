<template>
 <div class="summary-row">
              <div class="category">Book Value</div>
              <div class="response">
                {{ (assetInfo.BookValue != null && !isNaN(assetInfo.BookValue)) ? parseFloat(assetInfo.BookValue) : '-'
                }}
              </div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>