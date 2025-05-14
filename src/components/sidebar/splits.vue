<template>
  <div>
    <div v-if="displayedSplitsItems.length > 0" id="SplitsTable">
      <div class="splits-header">
        <div class="splits-cell" style="flex: 0 0 50%;">Reported</div>
        <div class="splits-cell" style="flex: 0 0 50%;">Split</div>
      </div>
      <div class="splits-body">
        <div
          v-for="(split, index) in displayedSplitsItems"
          :key="index"
          class="splits-row"
        >
          <div class="splits-cell" style="flex: 0 0 50%;">
            {{ formatDate(split.effective_date) }}
          </div>
          <div class="splits-cell" style="flex: 0 0 50%;">
            {{ parseInt(split.split_factor) }}
          </div>
        </div>
      </div>
    </div>
    <div v-if="displayedSplitsItems.length === 0" class="no-data">
      No splits data available
    </div>
    <button
      v-if="showSplitsButton"
      @click="$emit('toggle-splits')"
      class="toggle-btn"
    >
      {{ showAllSplits ? 'Show Less' : 'Show All' }}
    </button>
  </div>
</template>

<script setup>
defineProps([
  'displayedSplitsItems',
  'formatDate',
  'showAllSplits',
  'showSplitsButton',
]);
</script>

<style scoped>
/* Add your styles here */
</style>