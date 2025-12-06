<template>
  <div class="eps-container">
    <div v-if="displayedEPSItems.length > 0" id="EPStable">
      <div class="eps-header">
        <div class="eps-cell" style="flex: 0 0 20%;">Reported</div>
        <div class="eps-cell" style="flex: 0 0 40%;">EPS</div>
        <div class="eps-cell" style="flex: 0 0 20%;">Chg (%)</div>
        <div class="eps-cell" style="flex: 0 0 10%;">QoQ</div>
        <div class="eps-cell" style="flex: 0 0 10%;">YoY</div>
      </div>
      <div class="eps-body">
        <div
          v-for="(earnings, index) in displayedEPSItems"
          :key="earnings.fiscalDateEnding"
          class="eps-row"
        >
          <div class="eps-cell" style="flex: 0 0 20%;">
          {{ props.formatDate ? props.formatDate(earnings.fiscalDateEnding) : earnings.fiscalDateEnding }}
          </div>
          <div class="eps-cell" style="flex: 0 0 40%;">
          {{ parseFloat(String(earnings.reportedEPS)).toFixed(2) }}
          </div>

          <div
            class="eps-cell"
            style="flex: 0 0 20%;"
            v-if="(displayedEPSItems.length < 4 && index === displayedEPSItems.length - 1) || (showAllEPS && index === displayedEPSItems.length - 1)"
          >
            <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
          </div>
          <div
            class="eps-cell"
            style="flex: 0 0 20%;"
            v-else
              :class="Number(calculatePercentageChange(earnings.reportedEPS, props.assetInfo?.quarterlyFinancials?.[index + 1]?.reportedEPS ?? 0)) > 0 ? 'positive' : 'negative'"
          >
            {{
              isNaN(Number(calculatePercentageChange(
                Number(earnings.reportedEPS),
                Number(props.assetInfo?.quarterlyFinancials?.[index + 1]?.reportedEPS ?? 0)
              ))) ||
              !isFinite(Number(calculatePercentageChange(
                Number(earnings.reportedEPS),
                Number(props.assetInfo?.quarterlyFinancials?.[index + 1]?.reportedEPS ?? 0)
              )))
                ? '-'
                : calculatePercentageChange(
                      Number(earnings.reportedEPS),
                      Number(props.assetInfo?.quarterlyFinancials?.[index + 1]?.reportedEPS ?? 0)
                    ) + '%'
            }}
          </div>

          <div
            class="eps-cell"
            style="flex: 0 0 10%;"
            v-if="(displayedEPSItems.length < 4 && index === displayedEPSItems.length - 1) || (showAllEPS && index === displayedEPSItems.length - 1)"
          >
            <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
          </div>
          <div class="eps-cell" style="flex: 0 0 10%;" v-else>
            <span
                v-if="props.getQoQClass && props.getQoQClass(calculateQoQ1(earnings.reportedEPS)) === 'green'"
              class="sphere green-sphere"
            ></span>
            <span v-else class="sphere red-sphere"></span>
          </div>

          <div
            class="eps-cell"
            style="flex: 0 0 10%;"
            v-if="(displayedEPSItems.length < 4 && index === displayedEPSItems.length - 1) || (showAllEPS && index === displayedEPSItems.length - 1)"
          >
            <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
          </div>
          <div class="eps-cell" style="flex: 0 0 10%;" v-else>
            <span
                v-if="props.getYoYClass && props.getYoYClass(calculateYoY1(earnings.reportedEPS)) === 'green'"
              class="sphere green-sphere"
            ></span>
            <span v-else class="sphere red-sphere"></span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="displayedEPSItems.length === 0" class="no-data">
      No Quarterly EPS data available
    </div>
    <button
  v-if="showEPSButton"
  @click="toggleEPS"
  class="toggle-btn"
>
  {{ showAllEPS ? 'Show Less' : 'Show All' }}
</button>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, watch } from 'vue';

interface QuarterlyFinancial {
  fiscalDateEnding: string;
  reportedEPS: number;
}

interface AssetInfo {
  quarterlyFinancials?: QuarterlyFinancial[];
}

const props = defineProps<{ 
  formatDate?: (date: string) => string;
  assetInfo?: AssetInfo;
  getQoQClass?: (val: string | null) => string;
  getYoYClass?: (val: string | null) => string;
  symbol?: string;
}>();

const showAllEPS = ref(false);

const emit = defineEmits(['request-full-eps']);

function toggleEPS() {
  showAllEPS.value = !showAllEPS.value;
  if (showAllEPS.value) {
    emit('request-full-eps');
  }
}

const displayedEPSItems = computed(() => {
  const earnings = props.assetInfo?.quarterlyFinancials || [];
  if (earnings.length === 0) return [];
  if (earnings.length <= 4) return earnings;
  return showAllEPS.value ? earnings : earnings.slice(0, 4);
});

const showEPSButton = computed(() => {
  return (props.assetInfo?.quarterlyFinancials?.length || 0) > 4;
});

//converts floats to percentage (%) for info box
function calculatePercentageChange(currentValue: number, previousValue: number): string {
  const change = currentValue - previousValue;
  let percentageChange;
  if (previousValue < 0) {
    percentageChange = (change / Math.abs(previousValue)) * 100;
  } else {
    percentageChange = (change / previousValue) * 100;
  }
  return percentageChange.toFixed(2);
}

function calculateQoQ1(reportedEPS: number): string | null {
  if (!reportedEPS) return null;
  const quarterlyFinancials = props.assetInfo?.quarterlyFinancials;
  if (!quarterlyFinancials) return null;
  const index = quarterlyFinancials.findIndex((earnings: QuarterlyFinancial) => earnings.reportedEPS === reportedEPS);
  if (index === -1) return null;
  const previousQuarterlyFinancials = quarterlyFinancials[index + 1];
  if (!previousQuarterlyFinancials) return null;
  const previousReportedEPS = previousQuarterlyFinancials.reportedEPS;
  if (previousReportedEPS === undefined) return null;
  let percentageChange;
  if (previousReportedEPS < 0) {
    percentageChange = ((reportedEPS - previousReportedEPS) / Math.abs(previousReportedEPS)) * 100;
  } else {
    percentageChange = ((reportedEPS - previousReportedEPS) / previousReportedEPS) * 100;
  }
  return percentageChange.toFixed(2);
}

function calculateYoY1(reportedEPS: number): string | null {
  if (!reportedEPS) return null;
  const earnings = props.assetInfo?.quarterlyFinancials;
  if (!earnings) return null;
  const index = earnings.findIndex((earn: QuarterlyFinancial) => earn.reportedEPS === reportedEPS);
  if (index === -1) return null;
  const previousEarnings = earnings[index + 4];
  if (!previousEarnings) return null;
  const previousReportedEPS = previousEarnings.reportedEPS;
  if (previousReportedEPS === undefined) return null;
  let percentageChange;
  if (previousReportedEPS < 0) {
    percentageChange = ((reportedEPS - previousReportedEPS) / Math.abs(previousReportedEPS)) * 100;
  } else {
    percentageChange = ((reportedEPS - previousReportedEPS) / previousReportedEPS) * 100;
  }
  return percentageChange.toFixed(2);
}

watch(() => props.symbol, () => {
  showAllEPS.value = false;
});
</script>

<style scoped>
.eps-container {
  display: flex;
  flex-direction: column;
  color: var(--text2);
  border: none;
  border-radius: 6px;
  margin: 5px;
  padding: 5px;
  background-color: var(--base2);
}
</style>