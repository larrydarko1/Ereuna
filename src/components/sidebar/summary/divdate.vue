<template>
 <div class="summary-row">
              <div class="category">Dividend Date</div>
              <div class="response">
                {{
                  (assetInfo.DividendDate !== 'Invalid Date' && assetInfo.DividendDate != null &&
                    !isNaN(Date.parse(assetInfo.DividendDate)))
                    ? formatDate(assetInfo.DividendDate)
                    : '-'
                }}
              </div>
            </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>