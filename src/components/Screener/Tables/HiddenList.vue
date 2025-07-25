<template>
  <div class="ml-RES" :style="{ minWidth: columnsMinWidth + 'px' }">
    <div class="ml-Header">
      <div style="min-width: 100px;">
        <h1 style="background-color: var(--base1)" :key="resultListLength">RESULTS: {{ resultListLength }}</h1>
      </div>
      <div style="min-width: 0px;"></div>
      <div class="ml-btsymbol">Ticker</div>
      <div v-for="col in selectedAttributes" :key="col" :style="getColumnStyle(col)">
        {{ getColumnLabel(col) }}
      </div>
    </div>
    <div class="ml-wlist-container" @scroll.passive="handleScroll3">
      <div
        id="ml-wlist"
        :style="{ display: 'flex', flexDirection: 'row', height: '35px', alignItems: 'center'}"
        tabindex="0"
        @keydown="handleKeydown"
        @click="selectRow(asset.Symbol)"
        v-for="(asset, index) in currentResults"
        :key="asset.Symbol"
        :class="[
          index % 2 === 0 ? 'ml-even' : 'ml-odd',
          { 'ml-selected': selectedItem === asset.Symbol }
        ]"
        :data-symbol="asset.Symbol"
      >
        <div style="min-width: 50px; position: relative;">
          <button class="ml-dropdown-btn">
            <svg class="ml-img" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <path d="M8 12C9.10457 12 10 12.8954 10 14C10 15.1046 9.10457 16 8 16C6.89543 16 6 15.1046 6 14C6 12.8954 6.89543 12 8 12Z" fill="var(--text1)"></path>
                <path d="M8 6C9.10457 6 10 6.89543 10 8C10 9.10457 9.10457 10 8 10C6.89543 10 6 9.10457 6 8C6 6.89543 6.89543 6 8 6Z" fill="var(--text1)"></path>
                <path d="M10 2C10 0.89543 9.10457 -4.82823e-08 8 0C6.89543 4.82823e-08 6 0.895431 6 2C6 3.10457 6.89543 4 8 4C9.10457 4 10 3.10457 10 2Z" fill="var(--text1)"></path>
              </g>
            </svg>
          </button>
          <div class="ml-dropdown-menu">
            <div @click="ShowStock(asset)" @click.stop style="display: flex; flex-direction: row; align-items: center; height: 14px;">
              <svg style="width: 15px; height: 15px; margin-right: 5px;" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="var(--text1)">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path d="M0 0h48v48H0z" fill="none"></path>
                  <g id="Shopicon">
                    <circle cx="24" cy="24" r="4"></circle>
                    <path d="M24,38c12,0,20-14,20-14s-8-14-20-14S4,24,4,24S12,38,24,38z M24,16c4.418,0,8,3.582,8,8s-3.582,8-8,8s-8-3.582-8-8 S19.582,16,24,16z"></path>
                  </g>
                </g>
              </svg>
              <p>Show Asset</p>
            </div>
            <div class="ml-nested-dropdown" style="display: flex; flex-direction: row; align-items: center; height: 14px;">
              <svg style="width: 15px; height: 15px; margin-right: 5px;" class="img" viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="var(--text1)">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <title>new-indicator</title>
                  <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                    <g id="scheduler" fill="var(--text1)" transform="translate(85.333333, 85.333333)">
                      <path d="M170.666667,1.42108547e-14 C264.923264,-3.10380131e-15 341.333333,76.4100694 341.333333,170.666667 C341.333333,264.923264 264.923264,341.333333 170.666667,341.333333 C76.4100694,341.333333 2.57539587e-14,264.923264 1.42108547e-14,170.666667 C2.6677507e-15,76.4100694 76.4100694,3.15255107e-14 170.666667,1.42108547e-14 Z M170.666667,42.6666667 C99.9742187,42.6666667 42.6666667,99.9742187 42.6666667,170.666667 C42.6666667,241.359115 99.9742187,298.666667 170.666667,298.666667 C241.359115,298.666667 298.666667,241.359115 298.666667,170.666667 C298.666667,99.9742187 241.359115,42.6666667 170.666667,42.6666667 Z M192,85.3333333 L191.999333,149.333333 L256,149.333333 L256,192 L191.999333,191.999333 L192,256 L149.333333,256 L149.333333,191.999333 L85.3333333,192 L85.3333333,149.333333 L149.333333,149.333333 L149.333333,85.3333333 L192,85.3333333 Z" id="Combined-Shape"> </path>
                    </g>
                  </g>
                </g>
              </svg>
              <p>Add to Watchlist</p>
              <div class="ml-nested-dropdown-menu">
                <div v-for="(ticker, index) in watchlist.tickers" :key="index" class="ml-watchlist-item">
                  <label :for="'watchlist-' + index" class="ml-checkbox-label">
                    <div @click.stop="toggleWatchlist(ticker, asset.Symbol)" style="cursor: pointer;">
                      <div v-html="getWatchlistIcon(ticker, asset.Symbol)"></div>
                    </div>
                    <span></span>
                    {{ ticker.Name }}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style="min-width: 50px;">
          <img :src="getImagePath(asset)" class="ml-img" />
        </div>
        <div class="ml-btsymbol">{{ asset.Symbol }}</div>
        <div v-for="col in selectedAttributes" :key="col" :style="getColumnStyle(col)" :class="getColumnClass(asset, col)">
          {{ getColumnValue(asset, col) }}
        </div>
      </div>
      <div class="ml-results2"></div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue';

const props = defineProps({
  resultListLength: Number,
  currentResults: Array,
  selectedItem: String,
  watchlist: Object,
  getImagePath: Function,
  getWatchlistIcon: Function,
  selectedAttributes: { type: Array, required: true },
});

const emit = defineEmits(['toggle-watchlist', 'show-stock', 'select-row', 'keydown', 'scroll']);

function toggleWatchlist(ticker, symbol) {
  emit('toggle-watchlist', { ticker, symbol });
}

function ShowStock(asset) {
  emit('show-stock', asset);
}

function selectRow(symbol) {
  emit('select-row', symbol);
}

function handleKeydown(event) {
  emit('keydown', event);
}

function handleScroll3(event) {
  emit('scroll', event);
}

// --- Dynamic column logic ---
const attributes = [
  { label: 'Symbol', value: 'symbol', backend: 'Symbol' },
  { label: 'Name', value: 'name', backend: 'Name' },
  { label: 'ISIN', value: 'isin', backend: 'ISIN' },
  { label: 'Market Cap', value: 'market_cap', backend: 'MarketCapitalization' },
  { label: 'Price', value: 'price', backend: 'Close' },
  { label: 'Volume', value: 'volume', backend: 'Volume' },
  { label: 'IPO', value: 'ipo', backend: 'IPO' },
  { label: 'Asset Type', value: 'assettype', backend: 'AssetType' },
  { label: 'P/E Ratio', value: 'pe_ratio', backend: 'PERatio' },
  { label: 'PEG', value: 'peg', backend: 'PEGRatio' },
  { label: 'PB Ratio', value: 'pb_ratio', backend: 'PriceToBookRatio' },
  { label: 'Price/Sales', value: 'ps_ratio', backend: 'PriceToSalesRatioTTM' },
  { label: 'Dividend Yield', value: 'dividend_yield', backend: 'DividendYield' },
  { label: 'EPS', value: 'eps', backend: 'EPS' },
  { label: 'FCF', value: 'fcf', backend: 'freeCashFlow' },
  { label: 'Cash', value: 'cash', backend: 'cashAndEq' },
  { label: 'Current Debt', value: 'current_debt', backend: 'debtCurrent' },
  { label: 'Current Assets', value: 'current_assets', backend: 'assetsCurrent' },
  { label: 'Current Liabilities', value: 'current_liabilities', backend: 'liabilitiesCurrent' },
  { label: 'Current Ratio', value: 'current_ratio', backend: 'currentRatio' },
  { label: 'ROE', value: 'roe', backend: 'roe' },
  { label: 'ROA', value: 'roa', backend: 'roa' },
  { label: 'Currency', value: 'currency', backend: 'Currency' },
  { label: 'Book Value', value: 'book_value', backend: 'BookValue' },
  { label: 'Shares Outstanding', value: 'shares', backend: 'SharesOutstanding' },
  { label: 'Sector', value: 'sector', backend: 'Sector' },
  { label: 'Industry', value: 'industry', backend: 'Industry' },
  { label: 'Exchange', value: 'exchange', backend: 'Exchange' },
  { label: 'Country', value: 'country', backend: 'Country' },
  { label: 'Technical Score (1W)', value: 'rs_score1w', backend: 'RSScore1W' },
  { label: 'Technical Score (1M)', value: 'rs_score1m', backend: 'RSScore1M' },
  { label: 'Technical Score (4M)', value: 'rs_score4m', backend: 'RSScore4M' },
  { label: 'ADV (1W)', value: 'adv1w', backend: 'ADV1W' },
  { label: 'ADV (1M)', value: 'adv1m', backend: 'ADV1M' },
  { label: 'ADV (4M)', value: 'adv4m', backend: 'ADV4M' },
  { label: 'ADV (1Y)', value: 'adv1y', backend: 'ADV1Y' },
  { label: '% Change', value: 'perc_change', backend: 'todaychange' },
  { label: 'All Time High', value: 'all_time_high', backend: 'AlltimeHigh' },
  { label: 'All Time Low', value: 'all_time_low', backend: 'AlltimeLow' },
  { label: '52W High', value: 'high_52w', backend: 'fiftytwoWeekHigh' },
  { label: '52W Low', value: 'low_52w', backend: 'fiftytwoWeekLow' },
  { label: 'Gap', value: 'gap', backend: 'Gap' },
  { label: 'EV', value: 'ev', backend: 'EV' },
  { label: 'RSI', value: 'rsi', backend: 'RSI' },
  { label: 'Price Target', value: 'price_target', backend: 'PriceTarget' },
];

function getColumnLabel(col) {
  const found = attributes.find(a => a.value === col);
  return found ? found.label : col;
}

function getColumnValue(asset, col) {
  const attr = attributes.find(a => a.value === col);
  if (!attr) return '-';
  const value = asset[attr.backend];
  // Map backend keys to formatting rules (type-safe)
  const formatRules = {
    DividendYield: v => (typeof v === 'number' ? (v * 100).toFixed(2) + '%' : '-'),
    EPS: v => (typeof v === 'number' ? v.toFixed(2) : '-'),
    todaychange: v => (typeof v === 'number' ? (v * 100).toFixed(2) + '%' : '-'),
    ADV1W: v => (typeof v === 'number' ? v.toFixed(2) : '-'),
    ADV1M: v => (typeof v === 'number' ? v.toFixed(2) : '-'),
    ADV4M: v => (typeof v === 'number' ? v.toFixed(2) : '-'),
    ADV1Y: v => (typeof v === 'number' ? v.toFixed(2) : '-'),
    MarketCapitalization: v => (v != null && !isNaN(v) ? parseInt(v).toLocaleString() : '-'),
    SharesOutstanding: v => (v != null && !isNaN(v) ? parseInt(v).toLocaleString() : '-'),
    PERatio: v => (typeof v === 'number' && v > 0 ? Math.round(v) : '-'),
    PriceToSalesRatioTTM: v => (typeof v === 'number' && v > 0 ? Math.round(v) : '-'),
    PEGRatio: v => (typeof v === 'number' && v > 0 ? Math.round(v) : '-'),
    Volume: v => (v != null && !isNaN(v) ? parseInt(v).toLocaleString() : '-'),
    EV: v => (v != null && !isNaN(v) ? parseInt(v).toLocaleString() : '-'),
    Gap: v => (typeof v === 'number' ? v.toFixed(2) + '%' : '-'),
    PriceTarget: v => (typeof v === 'number' && v > 0 ? v.toFixed(2) : '-'),
    RSI: v => (typeof v === 'number' && v >= 0 ? v.toFixed(2) : '-'),
    fiftytwoWeekHigh: v => (typeof v === 'number' && v > 0 ? v.toFixed(2) : '-'),
    fiftytwoWeekLow: v => (typeof v === 'number' && v > 0 ? v.toFixed(2) : '-'),
    AlltimeHigh: v => (typeof v === 'number' && v > 0 ? v.toFixed(2) : '-'),
    AlltimeLow: v => (typeof v === 'number' && v > 0 ? v.toFixed(2) : '-'),
    BookValue: v => (typeof v === 'number' && v > 0 ? v.toFixed(2) : '-'),
    PriceToBookRatio: v => (typeof v === 'number' && v > 0 ? v.toFixed(2) : '-'),
    freeCashFlow: v => (v != null && !isNaN(v) ? parseInt(v).toLocaleString() : '-'),
    cashAndEq: v => (v != null && !isNaN(v) ? parseInt(v).toLocaleString() : '-'),
    debtCurrent: v => (v != null && !isNaN(v) ? parseInt(v).toLocaleString() : '-'),
    assetsCurrent: v => (v != null && !isNaN(v) ? parseInt(v).toLocaleString() : '-'),
    liabilitiesCurrent: v => (v != null && !isNaN(v) ? parseInt(v).toLocaleString() : '-'),
    currentRatio: v => (typeof v === 'number' && v > 0 ? v.toFixed(2) : '-'),
    roe: v => (typeof v === 'number' ? (v * 100).toFixed(2) + '%' : '-'),
    roa: v => (typeof v === 'number' ? (v * 100).toFixed(2) + '%' : '-'),
    IPO: v => {
      if (!v) return '-';
      const date = new Date(v);
      if (isNaN(date.getTime())) return '-';
      return date.toISOString().slice(0, 10);
    },
    Currency: v => (typeof v === 'string' ? v.toUpperCase() : (v ?? '-')),
  };
  const formatter = formatRules[attr.backend];
  if (formatter) return formatter(value);
  return value ?? '-';
}

function getColumnClass(asset, col) {
  const attr = attributes.find(a => a.value === col);
  if (!attr) return '';
  if (attr.backend === 'todaychange') {
    const value = asset[attr.backend];
    if (typeof value === 'number') {
      if (value > 0) return 'positive';
      if (value < 0) return 'negative';
    }
  }
  return '';
}

const styleMap = {
  price: 100,
  market_cap: 150,
  volume: 100,
  ipo: 120,
  assettype: 120,
  sector: 120,
  exchange: 120,
  country: 120,
  pe_ratio: 70,
  ps_ratio: 70,
  fcf: 100,
  cash: 100,
  current_debt: 100,
  current_assets: 100,
  current_liabilities: 100,
  current_ratio: 100,
  roe: 100,
  roa: 100,
  peg: 70,
  eps: 70,
  name: 300,
  pb_ratio: 70,
  dividend_yield: 100,
  currency: 70,
  industry: 200,
  book_value: 100,
  shares: 100,
  rs_score1w: 120,
  rs_score1m: 120,
  rs_score4m: 120,
  all_time_high: 100,
  all_time_low: 100,
  high_52w: 100,
  low_52w: 100,
  perc_change: 70,
  isin: 100,
  gap: 70,
  ev: 100,
  adv1w: 100,
  adv1m: 100,
  adv4m: 100,
  adv1y: 100,
  rsi: 70,
  price_target: 100,
};

function getColumnStyle(col) {
  const width = styleMap[col] || 100;
  return `min-width: ${width}px;`;
}

const columnsMinWidth = computed(() => {
  // Always include Ticker column (min-width: 70px) and image column (min-width: 50px)
  let sum = 70 + 50 + 51; // 51px for the dropdown button
  for (const col of props.selectedAttributes) {
    sum += styleMap[col] || 100;
  }
  return sum;
});
</script>

<style scoped>

.ml-RES {
  border: none;
}

.ml-Header {
  background-color: var(--base1);
  text-align: center;
  color: var(--text1);
  border: none;
  display: flex;
  flex-direction: row;
  height: 30px;
  align-items: center;
}

.ml-wlist-container {
  height: 800px;
  overflow-y: scroll;
  z-index: 1000;
}

#ml-wlist {
  outline: none;
}

.ml-even {
  background-color: var(--base2);
  text-align: center;
  color: var(--text1);
  border: none;
  word-break: break-all;
}

.ml-odd {
  background-color: var(--base2);
  text-align: center;
  color: var(--text1);
  word-break: break-all;
}

.ml-even:hover,
.ml-odd:hover {
  background-color: var(--accent4);
  cursor: pointer;
}

.ml-selected {
  background-color: var(--accent4);
  color: var(--text1);
}

.ml-dropdown-btn {
  cursor: pointer;
  border: none;
  outline: none;
  background: transparent;
}

.ml-img {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 25px;
}

.ml-dropdown-menu {
  display: none;
  cursor: pointer;
  width: 125px;
  position: absolute;
  z-index: 1000;
  top: -10px;
  left: 20px;
  padding: 5px;
  border-radius: 5px;
  background-color: var(--base4);
}

.ml-dropdown-menu>div {
  background-color: var(--base4);
  padding: 5px;
  height: 14px;
  display: flex;
  align-items: center;
  border-radius: 5px;
}

.ml-dropdown-menu>div:hover {
  background-color: var(--accent2);
}

.ml-dropdown-btn:hover + .ml-dropdown-menu,
.ml-dropdown-menu:hover {
  display: block;
}

.ml-nested-dropdown {
  position: relative;
}

.ml-nested-dropdown-menu {
  display: none;
  position: absolute;
  left: 100%;
  top: 0;
  background-color: var(--base4);
  max-height: 185px;
  overflow-y: scroll;
  padding: 5px;
  border-radius: 5px;
  min-width: 150px;
  z-index: 1001;
  align-items: center;
  justify-content: center;
}

.ml-nested-dropdown:hover .ml-nested-dropdown-menu {
  display: block;
}

.ml-checkbox-label {
  display: flex;
  align-items: center;
}

.ml-watchlist-item {
  padding: 5px;
  display: flex;
  align-items: center;
  height: 24px;
  box-sizing: border-box;
  border-radius: 5px;
}

.ml-watchlist-item:hover {
  background-color: var(--accent2);
}

.ml-watchlist-item input[type="checkbox"] {
  margin-right: 5px;
}

.ml-results2 {
  background-color: var(--base1);
  color: var(--text1);
  border: none;
  height: 200px;
}

.ml-btsymbol {
  min-width: 70px;
  border-right: solid 1px var(--base3);
  height: 100%;
  align-items: center;
  display: flex;
  justify-content: center;
}
</style>