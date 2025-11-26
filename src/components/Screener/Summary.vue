<template>
  <div class="summary-container">
    <div class="summary-header">
      <h1 class="summary-title">SUMMARY</h1>
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
        <span>No summary data available</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

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
      'Price', 'MarketCap', 'Sectors', 'Exchanges', 'Countries', 'PE', 'PS', 'ForwardPE', 'PEG', 'EPS', 'PB', 'DivYield',
      'EPSQoQ', 'EPSYoY', 'EarningsQoQ', 'EarningsYoY', 'RevQoQ', 'RevYoY', 'AvgVolume1W', 'AvgVolume1M', 'AvgVolume6M', 'AvgVolume1Y',
      'RelVolume1W', 'RelVolume1M', 'RelVolume6M', 'RelVolume1Y', 'RSScore1W', 'RSScore1M', 'RSScore4M', 'MA10', 'MA20', 'MA50', 'MA200', 'CurrentPrice', 'NewHigh',
      'NewLow', 'PercOffWeekHigh', 'PercOffWeekLow', 'changePerc', 'IPO', 'ADV1W', 'ADV1M', 'ADV4M', 'ADV1Y', 'ROE', 'ROA', 'currentRatio',
      'assetsCurrent', 'liabilitiesCurrent', 'debtCurrent', 'cashAndEq', 'freeCashFlow', 'profitMargin', 'grossMargin', 'debtEquity', 'bookVal', 'EV',
      'RSI', 'Gap', 'AssetTypes', 'IV', 'FundFamilies', 'FundCategories', 'NetExpenseRatio', 'CAGR'
    ];

    const attributeMapping: { [key: string]: string } = {
      'MarketCap': 'Market Cap',
      'PE': 'PE Ratio',
      'PB': 'PB Ratio',
      'PS': 'PS Ratio',
      'DivYield': 'Dividend Yield (%)',
      'EPSQoQ': 'EPS Growth QoQ (%)',
      'EPSYoY': 'EPS Growth YoY (%)',
      'EarningsQoQ': 'Earnings Growth QoQ (%)',
      'EarningsYoY': 'Earnings Growth YoY (%)',
      'RevQoQ': 'Revenue Growth QoQ (%)',
      'RevYoY': 'Revenue Growth YoY (%)',
      'AvgVolume1W': 'Average Volume (1W)',
      'AvgVolume1M': 'Average Volume (1M)',
      'AvgVolume6M': 'Average Volume (6M)',
      'AvgVolume1Y': 'Average Volume (1Y)',
      'RelVolume1W': 'Relative Volume (1W)',
      'RelVolume1M': 'Relative Volume (1M)',
      'RelVolume6M': 'Relative Volume (6M)',
      'RelVolume1Y': 'Relative Volume (1Y)',
      'RSScore1W': 'RS Score (1W)',
      'RSScore1M': 'RS Score (1M)',
      'RSScore4M': 'RS Score (4M)',
      'NewHigh': 'New High',
      'NewLow': 'New Low',
      'PercOffWeekHigh': '% Off 52WeekHigh',
      'PercOffWeekLow': '% Off 52WeekLow',
      'changePerc': 'Change (%)',
      'IPO': 'IPO',
      'ADV1W': 'ADV (1W)',
      'ADV1M': 'ADV (1M)',
      'ADV4M': 'ADV (4M)',
      'ADV1Y': 'ADV (1Y)',
      'ROE': 'ROE',
      'ROA': 'ROA',
      'currentRatio': 'Current Ratio',
      'assetsCurrent': 'Current Assets',
      'liabilitiesCurrent': 'Current Liabilities',
      'debtCurrent': 'Current Debt',
      'cashAndEq': 'Cash and Equivalents',
      'freeCashFlow': 'Free Cash Flow',
      'profitMargin': 'Profit Margin',
      'grossMargin': 'Gross Margin',
      'debtEquity': 'Debt/Equity',
      'bookVal': 'Book Value',
      'EV': 'Enterprise Value',
      'RSI': 'RSI',
      'Gap': 'Gap %',
      'AssetTypes': 'Asset Types',
      'IV': 'Intrinsic Value',
      'FundFamilies': 'Fund Families',
      'FundCategories': 'Fund Categories',
      'NetExpenseRatio': 'Net Expense Ratio %',
      'CAGR': 'CAGR %'
    };

    const valueMapping: { [key: string]: string } = {
      'abv200': 'Above 200MA',
      'abv50': 'Above 50MA',
      'abv20': 'Above 20MA',
      'abv10': 'Above 10MA',
      'blw200': 'Below 200MA',
      'blw50': 'Below 50MA',
      'blw20': 'Below 20MA',
      'blw10': 'Below 20MA',
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
