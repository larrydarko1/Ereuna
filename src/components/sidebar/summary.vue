<template>
  <div class="summary-container">
    <component
      v-for="(item, idx) in sortedFields"
      :key="idx"
      :is="sidebarComponentMap[item.tag]"
      v-show="!item.hidden"
      v-bind="getSidebarProps(item.tag)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useUserStore } from '@/store/store';
import Symbol from '@/components/sidebar/summary/ticker.vue';
import Name from '@/components/sidebar/summary/name.vue';
import AssetType from '@/components/sidebar/summary/AssetType.vue';
import Exchange from '@/components/sidebar/summary/exchange.vue';
import ISIN from '@/components/sidebar/summary/ISIN.vue';
import IPO from '@/components/sidebar/summary/IPO.vue';
import Sector from '@/components/sidebar/summary/sector.vue';
import Industry from '@/components/sidebar/summary/industry.vue';
import Currency from '@/components/sidebar/summary/currency.vue';
import RS1 from '@/components/sidebar/summary/RS1.vue';
import RS2 from '@/components/sidebar/summary/RS2.vue';
import RS3 from '@/components/sidebar/summary/RS3.vue';
import MarketCap from '@/components/sidebar/summary/marketcap.vue';
import SharesOutstanding from '@/components/sidebar/summary/shares.vue';
import Location from '@/components/sidebar/summary/location.vue';
import DivDate from '@/components/sidebar/summary/divdate.vue';
import DivYield from '@/components/sidebar/summary/divyield.vue';
import BookValue from '@/components/sidebar/summary/bookvalue.vue';
import PEG from '@/components/sidebar/summary/peg.vue';
import PE from '@/components/sidebar/summary/pe.vue';
import PS from '@/components/sidebar/summary/ps.vue';
import AllTimeHigh from '@/components/sidebar/summary/alltimehigh.vue';
import AllTimeLow from '@/components/sidebar/summary/alltimelow.vue';
import FiftyTwoWeekHigh from '@/components/sidebar/summary/52wkhigh.vue';
import FiftyTwoWeekLow from '@/components/sidebar/summary/52wklow.vue';
import Percoffweekhigh from '@/components/sidebar/summary/percoffweekhigh.vue';
import Percoffweeklow from '@/components/sidebar/summary/percoffweeklow.vue';
import RSI from '@/components/sidebar/summary/rsi.vue';
import Gap from '@/components/sidebar/summary/gap.vue';
import ADV1 from '@/components/sidebar/summary/adv1.vue';
import ADV2 from '@/components/sidebar/summary/adv2.vue';
import ADV3 from '@/components/sidebar/summary/adv3.vue';
import ADV4 from '@/components/sidebar/summary/adv4.vue';
import RV1 from '@/components/sidebar/summary/RV1.vue';
import RV2 from '@/components/sidebar/summary/RV2.vue';
import RV3 from '@/components/sidebar/summary/RV3.vue';
import RV4 from '@/components/sidebar/summary/RV4.vue';
import AV1 from '@/components/sidebar/summary/AV1.vue';
import AV2 from '@/components/sidebar/summary/AV2.vue';
import AV3 from '@/components/sidebar/summary/AV3.vue';
import AV4 from '@/components/sidebar/summary/AV4.vue';
import Description from '@/components/sidebar/summary/description.vue';
import FundCategory from '@/components/sidebar/summary/fundcategory.vue';
import FundFamily from '@/components/sidebar/summary/fundfamily.vue';
import NetExpenseRatio from '@/components/sidebar/summary/netexpenseratio.vue';

// access user from store 
const userStore = useUserStore();
const user = computed(() => userStore.getUser);
const apiKey = import.meta.env.VITE_EREUNA_KEY;

const props = defineProps(['assetInfo', 'formatDate', 'showAllDescription', 'refreshKey']);
const emit = defineEmits();

// Define the mapping of tags to components
const sidebarComponentMap: Record<string, any> = {
  Symbol,
  CompanyName: Name,
  AssetType,
  Exchange,
  ISIN,
  IPODate: IPO,
  Sector,
  Industry,
  ReportedCurrency: Currency,
  TechnicalScore1W: RS1,
  TechnicalScore1M: RS2,
  TechnicalScore4M: RS3,
  MarketCap,
  SharesOutstanding,
  Location,
  DividendDate: DivDate,
  DividendYieldTTM: DivYield,
  BookValue,
  PEGRatio: PEG,
  PERatio: PE,
  PSRatio: PS,
  AllTimeHigh,
  AllTimeLow,
  fiftytwoWeekHigh: FiftyTwoWeekHigh,
  fiftytwoWeekLow: FiftyTwoWeekLow,
  PercentageOff52wkHigh: Percoffweekhigh,
  PercentageOff52wkLow: Percoffweeklow,
  RSI,
  Gap,
  ADV1W: ADV1,
  ADV1M: ADV2,
  ADV4M: ADV4,
  ADV1Y: ADV3,
  RelativeVolume1W: RV1,
  RelativeVolume1M: RV2,
  RelativeVolume6M: RV3,
  RelativeVolume1Y: RV4,
  AverageVolume1W: AV1,
  AverageVolume1M: AV2,
  AverageVolume6M: AV3,
  AverageVolume1Y: AV4,
  Description,
  FundCategory,
  FundFamily,
  NetExpenseRatio,
};
interface Field {
  order: number;
  tag: string;
  name: string;
  hidden: boolean;
}

// Reactive variable to hold the fetched panel data
const summaryFields = ref<Field[]>([]);

// Initial fields array
const initialFields = [
  { order: 1, tag: 'Symbol', name: 'Symbol', hidden: false },
  { order: 2, tag: 'CompanyName', name: 'Company Name', hidden: false },
  { order: 3, tag: 'AssetType', name: 'Asset Type', hidden: false },
  { order: 4, tag: 'Exchange', name: 'Exchange', hidden: false },
  { order: 5, tag: 'ISIN', name: 'ISIN', hidden: false },
  { order: 6, tag: 'IPODate', name: 'IPO Date', hidden: false },
  { order: 7, tag: 'Sector', name: 'Sector', hidden: false },
  { order: 8, tag: 'Industry', name: 'Industry', hidden: false },
  { order: 9, tag: 'ReportedCurrency', name: 'Reported Currency', hidden: false },
  { order: 10, tag: 'TechnicalScore1W', name: 'Technical Score (1W)', hidden: false },
  { order: 11, tag: 'TechnicalScore1M', name: 'Technical Score (1M)', hidden: false },
  { order: 12, tag: 'TechnicalScore4M', name: 'Technical Score (4M)', hidden: false },
  { order: 13, tag: 'MarketCap', name: 'Market Cap', hidden: false },
  { order: 14, tag: 'SharesOutstanding', name: 'Shares Outstanding', hidden: false },
  { order: 15, tag: 'Location', name: 'Location', hidden: false },
  { order: 16, tag: 'DividendDate', name: 'Dividend Date', hidden: false },
  { order: 17, tag: 'DividendYieldTTM', name: 'Dividend Yield TTM', hidden: false },
  { order: 18, tag: 'BookValue', name: 'Book Value', hidden: false },
  { order: 19, tag: 'PEGRatio', name: 'PEG Ratio', hidden: false },
  { order: 20, tag: 'PERatio', name: 'PE Ratio', hidden: false },
  { order: 21, tag: 'PSRatio', name: 'PS Ratio', hidden: false },
  { order: 22, tag: 'AllTimeHigh', name: 'All Time High', hidden: false },
  { order: 23, tag: 'AllTimeLow', name: 'All Time Low', hidden: false },
  { order: 24, tag: 'fiftytwoWeekHigh', name: '52wk High', hidden: false },
  { order: 25, tag: 'fiftytwoWeekLow', name: '52wk Low', hidden: false },
  { order: 26, tag: 'PercentageOff52wkHigh', name: 'Percentage off 52wk High', hidden: false },
  { order: 27, tag: 'PercentageOff52wkLow', name: 'Percentage off 52wk Low', hidden: false },
  { order: 28, tag: 'RSI', name: 'RSI', hidden: false },
  { order: 29, tag: 'Gap', name: 'Gap (%)', hidden: false },
  { order: 30, tag: 'ADV1W', name: 'ADV 1W', hidden: false },
  { order: 31, tag: 'ADV1M', name: 'ADV 1M', hidden: false },
  { order: 32, tag: 'ADV4M', name: 'ADV 4M', hidden: false },
  { order: 33, tag: 'ADV1Y', name: 'ADV 1Y', hidden: false },
  { order: 34, tag: 'RelativeVolume1W', name: 'Relative Volume 1W', hidden: false },
  { order: 35, tag: 'RelativeVolume1M', name: 'Relative Volume 1M', hidden: false },
  { order: 36, tag: 'RelativeVolume6M', name: 'Relative Volume 6M', hidden: false },
  { order: 37, tag: 'RelativeVolume1Y', name: 'Relative Volume 1Y', hidden: false },
  { order: 38, tag: 'AverageVolume1W', name: 'Average Volume 1W', hidden: false },
  { order: 39, tag: 'AverageVolume1M', name: 'Average Volume 1M', hidden: false },
  { order: 40, tag: 'AverageVolume6M', name: 'Average Volume 6M', hidden: false },
  { order: 41, tag: 'AverageVolume1Y', name: 'Average Volume 1Y', hidden: false },
  { order: 42, tag: 'FundCategory', name: 'Fund Category', hidden: false },
  { order: 43, tag: 'FundFamily', name: 'Fund Family', hidden: false },
  { order: 44, tag: 'NetExpenseRatio', name: 'Net Expense Ratio', hidden: false },
  { order: 45, tag: 'Description', name: 'Description', hidden: false },
];

async function fetchPanel2() {
  try {
  const headers = { 'X-API-KEY': apiKey };
  const username = user.value?.Username || '';
  const response = await fetch(`/api/panel2?username=${username}`, { headers });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const newPanel = await response.json();

    // Defensive: fallback to default if empty
    summaryFields.value = (newPanel.panel2 && newPanel.panel2.length)
      ? newPanel.panel2
      : initialFields.map(field => ({ ...field }));
  } catch (error) {
    summaryFields.value = initialFields.map(field => ({ ...field }));
  }
}

// Expose fetchPanel2 for parent calls
defineExpose({ fetchPanel2 });

// Call fetchPanel2 on mounted
onMounted(() => {
  fetchPanel2();
});

// Watch for refreshKey changes to re-fetch fields
watch(() => props.refreshKey, () => {
  fetchPanel2();
});

// Sort the fields based on the order attribute
const sortedFields = computed(() => {
  return summaryFields.value.sort((a, b) => a.order - b.order);
});

// Function to get props for the sidebar components
const getSidebarProps = (tag: string) => {
  return {
    assetInfo: props.assetInfo,
    formatDate: props.formatDate,
    showAllDescription: props.showAllDescription,
  };
};

</script>

<style lang="scss">

</style>