<template>
  <div class="sales-container">
    <div v-if="displayedSalesItems.length > 0" id="Salestable">
      <div class="sales-header">
        <div class="sales-cell" style="flex: 0 0 20%;">{{ t('sidebar.salesReported') }}</div>
        <div class="sales-cell" style="flex: 0 0 40%;">{{ t('sidebar.salesColumn') }}</div>
        <div class="sales-cell" style="flex: 0 0 20%;">{{ t('sidebar.salesChange') }}</div>
        <div class="sales-cell" style="flex: 0 0 10%;">{{ t('sidebar.salesQoQ') }}</div>
        <div class="sales-cell" style="flex: 0 0 10%;">{{ t('sidebar.salesYoY') }}</div>
      </div>
      <div class="sales-body">
        <div
          v-for="(quarterlyReport, index) in displayedSalesItems"
          :key="quarterlyReport.fiscalDateEnding"
          class="sales-row"
        >
          <div class="sales-cell" style="flex: 0 0 20%;">
            {{ props.formatDate ? props.formatDate(quarterlyReport.fiscalDateEnding) : quarterlyReport.fiscalDateEnding }}
          </div>
          <div class="sales-cell" style="flex: 0 0 40%;">
            {{ parseInt(typeof quarterlyReport.totalRevenue === 'string' ? quarterlyReport.totalRevenue : quarterlyReport.totalRevenue.toString()).toLocaleString() }}
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
            :class="(() => { const rev = calculateRev(quarterlyReport.totalRevenue); return rev !== null && rev > 0 ? 'positive' : 'negative'; })()"
          >
            {{
              calculateRev(quarterlyReport.totalRevenue) === null ||
              isNaN(calculateRev(quarterlyReport.totalRevenue) as number) ||
              !isFinite(calculateRev(quarterlyReport.totalRevenue) as number)
                ? '-'
                : (calculateRev(quarterlyReport.totalRevenue) as number).toFixed(2) + '%'
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
              v-if="props.getQoQClass && props.getQoQClass(calculateQoQ3(quarterlyReport.totalRevenue)) === 'green'"
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
              v-if="props.getYoYClass && props.getYoYClass(calculateYoY3(quarterlyReport.totalRevenue)) === 'green'"
              class="sphere green-sphere"
            ></span>
            <span v-else class="sphere red-sphere"></span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="displayedSalesItems.length === 0" class="no-data">
      {{ t('sidebar.noSalesData') }}
    </div>
    <button
      v-if="showSalesButton"
      @click="toggleSales"
      class="toggle-btn"
    >
      {{ showAllSales ? t('sidebar.showLess') : t('sidebar.showAll') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface QuarterlyReport {
  fiscalDateEnding: string;
  totalRevenue: number | string;
}

interface AssetInfo {
  quarterlyFinancials: QuarterlyReport[];
}

const props = defineProps<{
  formatDate?: (date: string) => string;
  assetInfo?: AssetInfo;
  getQoQClass?: (val: string | number | null) => string;
  getYoYClass?: (val: string | number | null) => string;
  symbol?: string;
}>();
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

function calculateQoQ3(totalRevenue: number | string): string | null {
  if (!props.assetInfo) return null;
  if (!totalRevenue) return null;
  const quarterlyIncome = props.assetInfo.quarterlyFinancials;
  if (!quarterlyIncome) return null;
  const index = quarterlyIncome.findIndex((quarterlyReport: QuarterlyReport) => quarterlyReport.totalRevenue === totalRevenue);
  if (index === -1) return null;
  const previousQuarterlyIncome = quarterlyIncome[index + 1];
  if (!previousQuarterlyIncome) return null;
  const prevRev = typeof previousQuarterlyIncome.totalRevenue === 'string' ? parseFloat(previousQuarterlyIncome.totalRevenue) : previousQuarterlyIncome.totalRevenue;
  const currRev = typeof totalRevenue === 'string' ? parseFloat(totalRevenue) : totalRevenue;
  if (isNaN(currRev) || isNaN(prevRev)) return null;
  let percentageChange;
  if (prevRev < 0) {
    percentageChange = ((currRev - prevRev) / Math.abs(prevRev)) * 100;
  } else {
    percentageChange = ((currRev - prevRev) / prevRev) * 100;
  }
  return percentageChange.toFixed(2);
}

function calculateYoY3(totalRevenue: number | string): string | null {
  if (!props.assetInfo) return null;
  if (!totalRevenue) return null;
  const quarterlyIncome = props.assetInfo.quarterlyFinancials;
  if (!quarterlyIncome) return null;
  const index = quarterlyIncome.findIndex((quarterlyReport: QuarterlyReport) => quarterlyReport.totalRevenue === totalRevenue);
  if (index === -1) return null;
  const previousQuarterlyIncome = quarterlyIncome[index + 4];
  if (!previousQuarterlyIncome) return null;
  const prevRev = typeof previousQuarterlyIncome.totalRevenue === 'string' ? parseFloat(previousQuarterlyIncome.totalRevenue) : previousQuarterlyIncome.totalRevenue;
  const currRev = typeof totalRevenue === 'string' ? parseFloat(totalRevenue) : totalRevenue;
  if (isNaN(currRev) || isNaN(prevRev)) return null;
  let percentageChange;
  if (prevRev < 0) {
    percentageChange = ((currRev - prevRev) / Math.abs(prevRev)) * 100;
  } else {
    percentageChange = ((currRev - prevRev) / prevRev) * 100;
  }
  return percentageChange.toFixed(2);
}

function calculateRev(totalRevenue: number | string): number | null {
  if (!props.assetInfo) return null;
  if (!totalRevenue) return null;
  const quarterlyIncome = props.assetInfo.quarterlyFinancials;
  if (!quarterlyIncome) return null;
  const index = quarterlyIncome.findIndex((quarterlyReport: QuarterlyReport) => quarterlyReport.totalRevenue === totalRevenue);
  if (index === -1) return null;
  const previousQuarterlyIncome = quarterlyIncome[index + 1];
  if (!previousQuarterlyIncome) return null;
  const prevRev = typeof previousQuarterlyIncome.totalRevenue === 'string' ? parseFloat(previousQuarterlyIncome.totalRevenue) : previousQuarterlyIncome.totalRevenue;
  const currRev = typeof totalRevenue === 'string' ? parseFloat(totalRevenue) : totalRevenue;
  if (isNaN(currRev) || isNaN(prevRev)) return null;
  let percentageChange;
  if (prevRev < 0) {
    percentageChange = ((currRev - prevRev) / Math.abs(prevRev)) * 100;
  } else {
    percentageChange = ((currRev - prevRev) / prevRev) * 100;
  }
  return percentageChange;
}

watch(() => props.symbol, () => {
  showAllSales.value = false;
});
</script>

<style scoped>
.sales-container {
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