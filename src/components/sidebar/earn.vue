<template>
  <div>
    <div v-if="displayedEarningsItems.length > 0" id="Earntable">
      <div class="earn-header">
        <div class="earn-cell" style="flex: 0 0 20%;">Reported</div>
        <div class="earn-cell" style="flex: 0 0 40%;">Earnings</div>
        <div class="earn-cell" style="flex: 0 0 20%;">Chg (%)</div>
        <div class="earn-cell" style="flex: 0 0 10%;">QoQ</div>
        <div class="earn-cell" style="flex: 0 0 10%;">YoY</div>
      </div>
      <div class="earn-body">
        <div
          v-for="(quarterlyReport, index) in displayedEarningsItems"
          :key="quarterlyReport.fiscalDateEnding"
          class="earn-row"
        >
          <div class="earn-cell" style="flex: 0 0 20%;">
            {{ formatDate(quarterlyReport.fiscalDateEnding) }}
          </div>
          <div class="earn-cell" style="flex: 0 0 40%;">
            {{ parseInt(quarterlyReport.netIncome).toLocaleString() }}
          </div>

          <div
            class="earn-cell"
            style="flex: 0 0 20%;"
            v-if="(displayedEarningsItems.length < 4 && index === displayedEarningsItems.length - 1) || (showAllEarnings && quarterlyReport === displayedEarningsItems[displayedEarningsItems.length - 1])"
          >
            <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
          </div>
          <div
            class="earn-cell"
            style="flex: 0 0 20%;"
            v-else
            :class="calculateNet(quarterlyReport.netIncome) > 0 ? 'positive' : 'negative'"
          >
            {{
              isNaN(calculateNet(quarterlyReport.netIncome)) ||
              !isFinite(calculateNet(quarterlyReport.netIncome)) ||
              calculateNet(quarterlyReport.netIncome) === null
                ? '-'
                : calculateNet(quarterlyReport.netIncome) + '%'
            }}
          </div>

          <div
            class="earn-cell"
            style="flex: 0 0 10%;"
            v-if="(displayedEarningsItems.length < 4 && index === displayedEarningsItems.length - 1) || (showAllEarnings && quarterlyReport === displayedEarningsItems[displayedEarningsItems.length - 1])"
          >
            <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
          </div>
          <div class="earn-cell" style="flex: 0 0 10%;" v-else>
            <span
              v-if="getQoQClass(calculateQoQ2(quarterlyReport.netIncome)) === 'green'"
              class="sphere green-sphere"
            ></span>
            <span v-else class="sphere red-sphere"></span>
          </div>

          <div
            class="earn-cell"
            style="flex: 0 0 10%;"
            v-if="(displayedEarningsItems.length < 4 && index === displayedEarningsItems.length - 1) || (showAllEarnings && quarterlyReport === displayedEarningsItems[displayedEarningsItems.length - 1])"
          >
            <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
          </div>
          <div class="earn-cell" style="flex: 0 0 10%;" v-else>
            <span
              v-if="getYoYClass(calculateYoY2(quarterlyReport.netIncome)) === 'green'"
              class="sphere green-sphere"
            ></span>
            <span v-else class="sphere red-sphere"></span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="displayedEarningsItems.length === 0" class="no-data">
      No Quarterly earnings data available
    </div>
    <button
      v-if="showEarningsButton"
      @click="$emit('toggle-earnings')"
      class="toggle-btn"
    >
      {{ showAllEarnings ? 'Show Less' : 'Show All' }}
    </button>
  </div>
</template>

<script setup>
defineProps([
  'displayedEarningsItems',
  'formatDate',
  'showAllEarnings',
  'showEarningsButton',
  'calculateNet',
  'calculateQoQ2',
  'calculateYoY2',
  'getQoQClass',
  'getYoYClass',
]);
</script>

<style scoped>
/* Add your styles here */
</style>