<template>
  <div class="summary-container">
    <div class="summary-header">
      <h1 class="summary-title">{{ t('screenerComponents.summaryTitle') }}</h1>
    </div>
    <div class="summary-content">
      <div class="summary-list" v-if="screenerSummary.length > 0">
        <div class="summary-item" v-for="(item, index) in screenerSummary"
          :key="index">
          <span class="attribute">{{ item.attribute }}</span>
          <span class="value">{{ formatValue(item) }}</span>
        </div>
      </div>
      <div class="summary-empty" v-else>
        <span>{{ t('screenerComponents.noSummaryData') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  apiKey: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  selectedScreener: {
    type: String,
    required: true
  }
});

const screenerSummary = ref<any[]>([]);

const percentageAttributes = [
  'ADV (1W)',
  'ADV (1M)',
  'ADV (4M)',
  'ADV (1Y)',
  'Gap %',
  '% Off 52WeekHigh',
  '% Off 52WeekLow'
];

const growthAttributes = [
  'Dividend Yield (%)',
  'EPS Growth QoQ (%)',
  'EPS Growth YoY (%)',
  'Earnings Growth QoQ (%)',
  'Earnings Growth YoY (%)',
  'Revenue Growth QoQ (%)',
  'Revenue Growth YoY (%)'
];

function formatDate(date: string | number | Date) {
  let d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatValue(item: { attribute: string; value: any }) {
  if (!item.value && item.value !== 0) return '';

  const attribute = item.attribute;
  let value = item.value;

  if (attribute === 'IPO') {
    if (Array.isArray(value)) {
      return value.map(d => formatDate(d)).filter(d => d !== '').join(' - ');
    } else {
      return formatDate(value);
    }
  }

  if (attribute === 'Change (%)') {
    if (Array.isArray(value) && value.length === 3) {
      // Process first two elements with growthAttributes logic (multiply by 100 + format)
      const processed = value.slice(0, 2).map(v => {
        let num = parseFloat(v);
        return isNaN(num) ? v : (num * 100).toFixed(2) + '%';
      });
      // Append third element as is (string, untouched)
      processed.push(String(value[2]));
      return processed.join(' - ');
    } else {
      // Fallback to string representation if not array or length != 3
      return Array.isArray(value) ? value.join(' - ') : String(value);
    }
  }

  if (percentageAttributes.includes(attribute)) {
    if (Array.isArray(value)) {
      return value.map(v => {
        let num = parseFloat(v);
        return isNaN(num) ? v : num.toFixed(2) + '%';
      }).join(' - ');
    } else {
      let num = parseFloat(value);
      return isNaN(num) ? value : num.toFixed(2) + '%';
    }
  }

  if (growthAttributes.includes(attribute)) {
    if (Array.isArray(value)) {
      return value.map(v => {
        let num = parseFloat(v);
        return isNaN(num) ? v : (num * 100).toFixed(2) + '%';
      }).join(' - ');
    } else {
      let num = parseFloat(value);
      return isNaN(num) ? value : (num * 100).toFixed(2) + '%';
    }
  }

  if (Array.isArray(value)) {
    let cleaned = value.map(v => String(v).replace(/'/g, '').replace(/,/g, '-'));
    return cleaned.join(' - ');
  } else if (typeof value === 'string') {
    return value.replace(/'/g, '').replace(/,/g, '-');
  } else {
    return String(value);
  }
}

async function loadSummary(): Promise<void> {
  const Name = props.selectedScreener;

  try {
    const response = await fetch(`/api/screener/summary/${props.username}/${Name}`, {
      headers: {
        'X-API-KEY': props.apiKey,
      }
    });
    const screenerSettings = await response.json();

    const attributes = [
      'Price', 'MarketCap', 'Sectors', 'Exchanges', 'Countries', 'AIRecommendations', 'PE', 'PS', 'ForwardPE', 'PEG', 'EPS', 'PB', 'DivYield',
      'EPSQoQ', 'EPSYoY', 'EarningsQoQ', 'EarningsYoY', 'RevQoQ', 'RevYoY', 'AvgVolume1W', 'AvgVolume1M', 'AvgVolume6M', 'AvgVolume1Y',
      'RelVolume1W', 'RelVolume1M', 'RelVolume6M', 'RelVolume1Y', 'RSScore1W', 'RSScore1M', 'RSScore4M', 'MA10', 'MA20', 'MA50', 'MA200', 'CurrentPrice', 'NewHigh',
      'NewLow', 'PercOffWeekHigh', 'PercOffWeekLow', 'changePerc', 'IPO', 'ADV1W', 'ADV1M', 'ADV4M', 'ADV1Y', 'ROE', 'ROA', 'currentRatio',
      'assetsCurrent', 'liabilitiesCurrent', 'debtCurrent', 'cashAndEq', 'freeCashFlow', 'profitMargin', 'grossMargin', 'debtEquity', 'bookVal', 'EV',
      'RSI', 'Gap', 'AssetTypes', 'IV', 'FundFamilies', 'FundCategories', 'NetExpenseRatio', 'CAGR'
    ];

    const attributeMapping: { [key: string]: string } = {
      'Price': t('screenerComponents.attrPrice'),
      'MarketCap': t('screenerComponents.attrMarketCap'),
      'Sectors': t('screenerComponents.attrSectors'),
      'Exchanges': t('screenerComponents.attrExchanges'),
      'Countries': t('screenerComponents.attrCountries'),
      'AIRecommendations': t('screenerComponents.attrAIRecommendations'),
      'PE': t('screenerComponents.attrPE'),
      'PS': t('screenerComponents.attrPS'),
      'ForwardPE': t('screenerComponents.attrForwardPE'),
      'PEG': t('screenerComponents.attrPEG'),
      'EPS': t('screenerComponents.attrEPS'),
      'PB': t('screenerComponents.attrPB'),
      'DivYield': t('screenerComponents.attrDivYieldPercent'),
      'EPSQoQ': t('screenerComponents.attrEPSQoQ'),
      'EPSYoY': t('screenerComponents.attrEPSYoY'),
      'EarningsQoQ': t('screenerComponents.attrEarningsQoQ'),
      'EarningsYoY': t('screenerComponents.attrEarningsYoY'),
      'RevQoQ': t('screenerComponents.attrRevQoQ'),
      'RevYoY': t('screenerComponents.attrRevYoY'),
      'AvgVolume1W': t('screenerComponents.attrAvgVolume1W'),
      'AvgVolume1M': t('screenerComponents.attrAvgVolume1M'),
      'AvgVolume6M': t('screenerComponents.attrAvgVolume6M'),
      'AvgVolume1Y': t('screenerComponents.attrAvgVolume1Y'),
      'RelVolume1W': t('screenerComponents.attrRelVolume1W'),
      'RelVolume1M': t('screenerComponents.attrRelVolume1M'),
      'RelVolume6M': t('screenerComponents.attrRelVolume6M'),
      'RelVolume1Y': t('screenerComponents.attrRelVolume1Y'),
      'RSScore1W': t('screenerComponents.attrRSScore1W'),
      'RSScore1M': t('screenerComponents.attrRSScore1M'),
      'RSScore4M': t('screenerComponents.attrRSScore4M'),
      'MA10': t('screenerComponents.attrMA10'),
      'MA20': t('screenerComponents.attrMA20'),
      'MA50': t('screenerComponents.attrMA50'),
      'MA200': t('screenerComponents.attrMA200'),
      'CurrentPrice': t('screenerComponents.attrCurrentPrice'),
      'NewHigh': t('screenerComponents.attrNewHigh'),
      'NewLow': t('screenerComponents.attrNewLow'),
      'PercOffWeekHigh': t('screenerComponents.attrPercOffWeekHigh'),
      'PercOffWeekLow': t('screenerComponents.attrPercOffWeekLow'),
      'changePerc': t('screenerComponents.attrChangePerc'),
      'IPO': t('screenerComponents.attrIPO'),
      'ADV1W': t('screenerComponents.attrADV1W'),
      'ADV1M': t('screenerComponents.attrADV1M'),
      'ADV4M': t('screenerComponents.attrADV4M'),
      'ADV1Y': t('screenerComponents.attrADV1Y'),
      'ROE': t('screenerComponents.attrROE'),
      'ROA': t('screenerComponents.attrROA'),
      'currentRatio': t('screenerComponents.attrCurrentRatio'),
      'assetsCurrent': t('screenerComponents.attrCurrentAssets'),
      'liabilitiesCurrent': t('screenerComponents.attrCurrentLiabilities'),
      'debtCurrent': t('screenerComponents.attrCurrentDebt'),
      'cashAndEq': t('screenerComponents.attrCash'),
      'freeCashFlow': t('screenerComponents.attrFreeCashFlow'),
      'profitMargin': t('screenerComponents.attrProfitMargin'),
      'grossMargin': t('screenerComponents.attrGrossMargin'),
      'debtEquity': t('screenerComponents.attrDebtEquity'),
      'bookVal': t('screenerComponents.attrBookValue'),
      'EV': t('screenerComponents.attrEV'),
      'RSI': t('screenerComponents.attrRSI'),
      'Gap': t('screenerComponents.attrGap'),
      'AssetTypes': t('screenerComponents.attrAssetTypes'),
      'IV': t('screenerComponents.attrIntrinsicValue'),
      'FundFamilies': t('screenerComponents.attrFundFamilies'),
      'FundCategories': t('screenerComponents.attrFundCategories'),
      'NetExpenseRatio': t('screenerComponents.attrNetExpenseRatioPercent'),
      'CAGR': t('screenerComponents.attrCAGRPercent')
    };

    const valueMapping: { [key: string]: string } = {
      'abv200': t('screenerComponents.valueAbove200MA'),
      'abv50': t('screenerComponents.valueAbove50MA'),
      'abv20': t('screenerComponents.valueAbove20MA'),
      'abv10': t('screenerComponents.valueAbove10MA'),
      'blw200': t('screenerComponents.valueBelow200MA'),
      'blw50': t('screenerComponents.valueBelow50MA'),
      'blw20': t('screenerComponents.valueBelow20MA'),
      'blw10': t('screenerComponents.valueBelow10MA'),
    };

    const newScreenerSummary: { attribute: string; value: any }[] = [];
    attributes.forEach((attribute) => {
      if (screenerSettings[attribute]) {
        const attributeName = attributeMapping[attribute] || attribute;
        const attributeValue = screenerSettings[attribute];
        const mappedValue = valueMapping[attributeValue] || attributeValue;
        newScreenerSummary.push({
          attribute: attributeName,
          value: mappedValue
        });
      }
    });
    screenerSummary.value = newScreenerSummary;
  } catch (error) {
    console.error('Error loading summary:', error);
  }
}

// Watch for changes in selectedScreener
watch(() => props.selectedScreener, () => {
  loadSummary();
}, { immediate: true });

defineExpose({
  loadSummary
});
</script>

<style scoped>
.summary-container {
  position: relative;
  width: calc(100% - 20px);
  min-height: 250px;
  border-radius: 12px;
  overflow: hidden;
  background-color: var(--base2);
  margin-bottom: 10px;
}

.summary-header {
  width: 100%;
  background-color: var(--base1);
  border-bottom: 1px solid var(--base3);
  padding: 6px;
}

.summary-title {
  margin: 0;
  font-size: 14px;
  font-weight: bold;
  color: var(--text1);
  text-align: center;
}

.summary-content {
  padding: 15px;
  height: 100%;
  overflow-y: auto;
  min-height: 260px; 
  background-color: var(--base1);
  border-radius: 0 0 12px 12px;
}

.summary-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background-color: var(--base2);
  border-radius: 6px;
  border: 1px solid var(--base3);
}

.attribute {
  font-weight: 600;
  color: var(--text1);
  font-size: 12px;
  flex: 1;
}

.value {
  color: var(--text2);
  font-size: 12px;
  text-align: right;
  flex: 1;
}

.summary-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  color: var(--text1);
  font-size: 14px;
}

/* Custom scrollbar for webkit browsers */
.summary-content::-webkit-scrollbar {
  width: 6px;
}

.summary-content::-webkit-scrollbar-track {
  background: var(--base2);
  border-radius: 3px;
}

.summary-content::-webkit-scrollbar-thumb {
  background: var(--base3);
  border-radius: 3px;
}

.summary-content::-webkit-scrollbar-thumb:hover {
  background: var(--text3);
}
</style>
