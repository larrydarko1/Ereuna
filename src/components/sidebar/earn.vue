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
            {{ props.formatDate ? props.formatDate(quarterlyReport.fiscalDateEnding) : quarterlyReport.fiscalDateEnding }}
          </div>
          <div class="earn-cell" style="flex: 0 0 40%;">
            {{ parseInt(String(quarterlyReport.netIncome)).toLocaleString() }}
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
            :class="Number(calculateNet(quarterlyReport.netIncome)) > 0 ? 'positive' : 'negative'"
          >
            {{
              isNaN(Number(calculateNet(quarterlyReport.netIncome))) ||
              !isFinite(Number(calculateNet(quarterlyReport.netIncome))) ||
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
              v-if="props.getQoQClass && props.getQoQClass(calculateQoQ2(quarterlyReport.netIncome)) === 'green'"
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
              v-if="props.getYoYClass && props.getYoYClass(calculateYoY2(quarterlyReport.netIncome)) === 'green'"
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
      @click="toggleEarnings"
      class="toggle-btn"
    >
      {{ showAllEarnings ? 'Show Less' : 'Show All' }}
    </button>
  </div>
</template>

<script setup lang="ts">

interface QuarterlyReport {
  fiscalDateEnding: string;
  netIncome: number;
}

interface AssetInfo {
  quarterlyFinancials?: QuarterlyReport[];
}

import { ref, computed, watch } from 'vue';
const props = defineProps<{ 
  formatDate?: (date: string) => string;
  assetInfo?: AssetInfo;
  getQoQClass?: (val: string | null) => string;
  getYoYClass?: (val: string | null) => string;
  symbol?: string;
}>();

const showAllEarnings = ref(false);

const emit = defineEmits(['request-full-earnings']);

function toggleEarnings() {
  showAllEarnings.value = !showAllEarnings.value;
  if (showAllEarnings.value) {
    emit('request-full-earnings');
  }
}

const displayedEarningsItems = computed(() => {
  const income = props.assetInfo?.quarterlyFinancials || [];
  if (income.length === 0) return [];
  if (income.length <= 4) return income;
  return showAllEarnings.value ? income : income.slice(0, 4);
});

const showEarningsButton = computed(() => {
  return (props.assetInfo?.quarterlyFinancials?.length || 0) > 4;
});

function calculateQoQ2(netIncome: number): string | null {
  if (!netIncome) return null;
  const quarterlyIncome = props.assetInfo?.quarterlyFinancials;
  if (!quarterlyIncome) return null;
  const index = quarterlyIncome.findIndex((quarterlyReport: QuarterlyReport) => quarterlyReport.netIncome === netIncome);
  if (index === -1) return null;
  const previousQuarterlyIncome = quarterlyIncome[index + 1];
  if (!previousQuarterlyIncome) return null;
  const previousReportedIncome = previousQuarterlyIncome.netIncome;
  if (previousReportedIncome === undefined) return null;
  let percentageChange;
  if (previousReportedIncome < 0) {
    percentageChange = ((netIncome - previousReportedIncome) / Math.abs(previousReportedIncome)) * 100;
  } else {
    percentageChange = ((netIncome - previousReportedIncome) / previousReportedIncome) * 100;
  }
  return percentageChange.toFixed(2);
}

function calculateYoY2(netIncome: number): string | null {
  if (!netIncome) return null;
  const quarterlyIncome = props.assetInfo?.quarterlyFinancials;
  if (!quarterlyIncome) return null;
  const index = quarterlyIncome.findIndex((quarterlyReport: QuarterlyReport) => quarterlyReport.netIncome === netIncome);
  if (index === -1) return null;
  const previousQuarterlyIncome = quarterlyIncome[index + 4];
  if (!previousQuarterlyIncome) return null;
  const previousReportedIncome = previousQuarterlyIncome.netIncome;
  if (previousReportedIncome === undefined) return null;
  let percentageChange;
  if (previousReportedIncome < 0) {
    percentageChange = ((netIncome - previousReportedIncome) / Math.abs(previousReportedIncome)) * 100;
  } else {
    percentageChange = ((netIncome - previousReportedIncome) / previousReportedIncome) * 100;
  }
  return percentageChange.toFixed(2);
}

function calculateNet(netIncome: number): string | null {
  if (!netIncome) return null;
  const quarterlyIncome = props.assetInfo?.quarterlyFinancials;
  if (!quarterlyIncome) return null;
  const index = quarterlyIncome.findIndex((quarterlyReport: QuarterlyReport) => quarterlyReport.netIncome === netIncome);
  if (index === -1) return null;
  const previousQuarterlyIncome = quarterlyIncome[index + 1];
  if (!previousQuarterlyIncome) return null;
  const previousReportedIncome = previousQuarterlyIncome.netIncome;
  if (previousReportedIncome === undefined) return null;
  let percentageChange;
  if (previousReportedIncome < 0) {
    percentageChange = ((netIncome - previousReportedIncome) / Math.abs(previousReportedIncome)) * 100;
  } else {
    percentageChange = ((netIncome - previousReportedIncome) / previousReportedIncome) * 100;
  }
  return percentageChange.toFixed(2);
}

watch(() => props.symbol, () => {
  showAllEarnings.value = false;
});
</script>

<style scoped>
/* Add your styles here */
</style>