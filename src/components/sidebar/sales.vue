<template>
  <div>
    <div v-if="displayedSalesItems.length > 0" id="Salestable">
      <div class="sales-header">
        <div class="sales-cell" style="flex: 0 0 20%;">Reported</div>
        <div class="sales-cell" style="flex: 0 0 40%;">Sales</div>
        <div class="sales-cell" style="flex: 0 0 20%;">Chg (%)</div>
        <div class="sales-cell" style="flex: 0 0 10%;">QoQ</div>
        <div class="sales-cell" style="flex: 0 0 10%;">YoY</div>
      </div>
      <div class="sales-body">
        <div
          v-for="(quarterlyReport, index) in displayedSalesItems"
          :key="quarterlyReport.fiscalDateEnding"
          class="sales-row"
        >
          <div class="sales-cell" style="flex: 0 0 20%;">
            {{ formatDate(quarterlyReport.fiscalDateEnding) }}
          </div>
          <div class="sales-cell" style="flex: 0 0 40%;">
            {{ parseInt(quarterlyReport.totalRevenue).toLocaleString() }}
          </div>

          <div
            class="sales-cell"
            style="flex: 0 0 20%;"
            v-if="(displayedSalesItems.length < 4 && index === displayedSalesItems.length - 1) || (showAllSales && quarterlyReport === displayedSalesItems[displayedSalesItems.length - 1])"
          >
            <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
          </div>
          <div
            class="sales-cell"
            style="flex: 0 0 20%;"
            v-else
            :class="calculateRev(quarterlyReport.totalRevenue) > 0 ? 'positive' : 'negative'"
          >
            {{
              isNaN(calculateRev(quarterlyReport.totalRevenue)) ||
              !isFinite(calculateRev(quarterlyReport.totalRevenue)) ||
              calculateRev(quarterlyReport.totalRevenue) === null
                ? '-'
                : calculateRev(quarterlyReport.totalRevenue) + '%'
            }}
          </div>

          <div
            class="sales-cell"
            style="flex: 0 0 10%;"
            v-if="(displayedSalesItems.length < 4 && index === displayedSalesItems.length - 1) || (showAllSales && quarterlyReport === displayedSalesItems[displayedSalesItems.length - 1])"
          >
            <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
          </div>
          <div class="sales-cell" style="flex: 0 0 10%;" v-else>
            <span
              v-if="getQoQClass(calculateQoQ3(quarterlyReport.totalRevenue)) === 'green'"
              class="sphere green-sphere"
            ></span>
            <span v-else class="sphere red-sphere"></span>
          </div>

          <div
            class="sales-cell"
            style="flex: 0 0 10%;"
            v-if="(displayedSalesItems.length < 4 && index === displayedSalesItems.length - 1) || (showAllSales && quarterlyReport === displayedSalesItems[displayedSalesItems.length - 1])"
          >
            <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
          </div>
          <div class="sales-cell" style="flex: 0 0 10%;" v-else>
            <span
              v-if="getYoYClass(calculateYoY3(quarterlyReport.totalRevenue)) === 'green'"
              class="sphere green-sphere"
            ></span>
            <span v-else class="sphere red-sphere"></span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="displayedSalesItems.length === 0" class="no-data">
      No Quarterly sales data available
    </div>
    <button
      v-if="showSalesButton"
      @click="$emit('toggle-sales')"
      class="toggle-btn"
    >
      {{ showAllSales ? 'Show Less' : 'Show All' }}
    </button>
  </div>
</template>

<script setup>
defineProps([
  'displayedSalesItems',
  'formatDate',
  'showAllSales',
  'showSalesButton',
  'calculateRev',
  'calculateQoQ3',
  'calculateYoY3',
  'getQoQClass',
  'getYoYClass',
]);
</script>

<style scoped>
/* Add your styles here */
</style>