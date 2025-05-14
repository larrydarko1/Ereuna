<template>
  <div>
    <div v-if="displayedDividendsItems.length > 0" id="DividendsTable">
      <div class="dividends-header">
        <div class="dividends-cell" style="flex: 0 0 50%;">Reported</div>
        <div class="dividends-cell" style="flex: 0 0 50%;">Dividends</div>
      </div>
      <div class="dividends-body">
        <div
          v-for="(dividend, index) in displayedDividendsItems"
          :key="index"
          class="dividends-row"
        >
          <div class="dividends-cell" style="flex: 0 0 50%;">
            {{ formatDate(dividend.payment_date) }}
          </div>
          <div class="dividends-cell" style="flex: 0 0 50%;">
            {{ parseFloat(dividend.amount).toLocaleString() }}
          </div>
        </div>
      </div>
    </div>
    <div v-if="displayedDividendsItems.length === 0" class="no-data">
      No dividend data available
    </div>
    <button
      v-if="showDividendsButton"
      @click="$emit('toggle-dividends')"
      class="toggle-btn"
    >
      {{ showAllDividends ? 'Show Less' : 'Show All' }}
    </button>
  </div>
</template>

<script setup>
defineProps([
  'displayedDividendsItems',
  'formatDate',
  'showAllDividends',
  'showDividendsButton',
]);
</script>

<style scoped>
/* Add your styles here */
</style>