<template>
<div class="summary-row">
              <div class="category">Net Expense Ratio</div>
              <div class="response">
                {{ formatExpenseRatio(assetInfo.netExpenseRatio) }}
              </div>
            </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);

const formatExpenseRatio = (value: any): string => {
  if (value == null || value === '' || value === '-') {
    return '-';
  }
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(numValue)) {
    return '-';
  }
  return numValue.toFixed(2) + '%';
};
</script>

<style lang="scss">

</style>
