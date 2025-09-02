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
            {{ props.formatDate(quarterlyReport.fiscalDateEnding) }}
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
              v-if="props.getQoQClass(calculateQoQ3(quarterlyReport.totalRevenue)) === 'green'"
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
              v-if="props.getYoYClass(calculateYoY3(quarterlyReport.totalRevenue)) === 'green'"
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
      @click="toggleSales"
      class="toggle-btn"
    >
      {{ showAllSales ? 'Show Less' : 'Show All' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  formatDate: Function,
  assetInfo: Object,
  getQoQClass: Function,
  getYoYClass: Function,
  symbol: String,
});
const emit = defineEmits(['request-full-sales']);
const showAllSales = ref(false);

function toggleSales() {
  showAllSales.value = !showAllSales.value;
  if (showAllSales.value) {
    emit('request-full-sales');
  }
}

const displayedSalesItems = computed(() => {
  const income = props.assetInfo?.quarterlyFinancials || [];
  if (income.length === 0) return [];
  if (income.length <= 4) return income;
  return showAllSales.value ? income : income.slice(0, 4);
});

const showSalesButton = computed(() => {
  return (props.assetInfo?.quarterlyFinancials?.length || 0) > 4;
});

function calculateQoQ3(totalRevenue) {
  if (!totalRevenue) return null;
  const quarterlyIncome = props.assetInfo.quarterlyFinancials;
  if (!quarterlyIncome) return null;
  const index = quarterlyIncome.findIndex(quarterlyReport => quarterlyReport.totalRevenue === totalRevenue);
  if (index === -1) return null;
  const previousQuarterlyIncome = quarterlyIncome[index + 1];
  if (!previousQuarterlyIncome) return null;
  const previousReportedRevenue = previousQuarterlyIncome.totalRevenue;
  if (previousReportedRevenue === undefined) return null;
  let percentageChange;
  if (previousReportedRevenue < 0) {
    percentageChange = ((totalRevenue - previousReportedRevenue) / Math.abs(previousReportedRevenue)) * 100;
  } else {
    percentageChange = ((totalRevenue - previousReportedRevenue) / previousReportedRevenue) * 100;
  }
  return percentageChange.toFixed(2);
}

function calculateYoY3(totalRevenue) {
  if (!totalRevenue) return null;
  const quarterlyIncome = props.assetInfo.quarterlyFinancials;
  if (!quarterlyIncome) return null;
  const index = quarterlyIncome.findIndex(quarterlyReport => quarterlyReport.totalRevenue === totalRevenue);
  if (index === -1) return null;
  const previousQuarterlyIncome = quarterlyIncome[index + 4];
  if (!previousQuarterlyIncome) return null;
  const previousReportedRevenue = previousQuarterlyIncome.totalRevenue;
  if (previousReportedRevenue === undefined) return null;
  let percentageChange;
  if (previousReportedRevenue < 0) {
    percentageChange = ((totalRevenue - previousReportedRevenue) / Math.abs(previousReportedRevenue)) * 100;
  } else {
    percentageChange = ((totalRevenue - previousReportedRevenue) / previousReportedRevenue) * 100;
  }
  return percentageChange.toFixed(2);
}

function calculateRev(totalRevenue) {
  if (!totalRevenue) return null;
  const quarterlyIncome = props.assetInfo.quarterlyFinancials;
  if (!quarterlyIncome) return null;
  const index = quarterlyIncome.findIndex(quarterlyReport => quarterlyReport.totalRevenue === totalRevenue);
  if (index === -1) return null;
  const previousQuarterlyIncome = quarterlyIncome[index + 1];
  if (!previousQuarterlyIncome) return null;
  const previousReportedRevenue = previousQuarterlyIncome.totalRevenue;
  if (previousReportedRevenue === undefined) return null;
  let percentageChange;
  if (previousReportedRevenue < 0) {
    percentageChange = ((totalRevenue - previousReportedRevenue) / Math.abs(previousReportedRevenue)) * 100;
  } else {
    percentageChange = ((totalRevenue - previousReportedRevenue) / previousReportedRevenue) * 100;
  }
  return percentageChange.toFixed(2);
}

watch(() => props.symbol, () => {
  showAllSales.value = false;
});
</script>

<style scoped>
/* Add your styles here */
</style>