
<template>
  <div class="ml-RES" :style="{ minWidth: columnsMinWidth + 'px' }">
    <div class="ml-Header">
      <div style="min-width: 50px;">
      </div>
      <div style="min-width: 0px;"></div>
      <div class="ml-btsymbol">Ticker</div>
      <div v-for="col in selectedAttributes" :key="col" :style="getColumnStyle(col)">
        {{ getColumnLabel(col) }}
      </div>
    </div>
    <div class="ml-wlist-container" @scroll.passive="handleScroll2">
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
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <path
                  d="M8 12C9.10457 12 10 12.8954 10 14C10 15.1046 9.10457 16 8 16C6.89543 16 6 15.1046 6 14C6 12.8954 6.89543 12 8 12Z"
                  fill="var(--text1)"></path>
                <path
                  d="M8 6C9.10457 6 10 6.89543 10 8C10 9.10457 9.10457 10 8 10C6.89543 10 6 9.10457 6 8C6 6.89543 6.89543 6 8 6Z"
                  fill="var(--text1)"></path>
                <path
                  d="M10 2C10 0.89543 9.10457 -4.82823e-08 8 0C6.89543 4.82823e-08 6 0.895431 6 2C6 3.10457 6.89543 4 8 4C9.10457 4 10 3.10457 10 2Z"
                  fill="var(--text1)"></path>
              </g>
            </svg>
          </button>
          <div class="ml-dropdown-menu">
            <div @click="hideStock(asset)" @click.stop
              style="display: flex; flex-direction: row; align-items: center; height: 14px;">
              <svg style="width: 15px; height: 15px; margin-right: 5px;" class="img" viewBox="0 0 24 24"
                fill="none" xmlns="http://www.w3.org/2000/svg">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <g id="Edit / Hide">
                    <path id="Vector"
                      d="M3.99989 4L19.9999 20M16.4999 16.7559C15.1473 17.4845 13.6185 17.9999 11.9999 17.9999C8.46924 17.9999 5.36624 15.5478 3.5868 13.7788C3.1171 13.3119 2.88229 13.0784 2.7328 12.6201C2.62619 12.2933 2.62616 11.7066 2.7328 11.3797C2.88233 10.9215 3.11763 10.6875 3.58827 10.2197C4.48515 9.32821 5.71801 8.26359 7.17219 7.42676M19.4999 14.6335C19.8329 14.3405 20.138 14.0523 20.4117 13.7803L20.4146 13.7772C20.8832 13.3114 21.1182 13.0779 21.2674 12.6206C21.374 12.2938 21.3738 11.7068 21.2672 11.38C21.1178 10.9219 20.8827 10.6877 20.4133 10.2211C18.6338 8.45208 15.5305 6 11.9999 6C11.6624 6 11.3288 6.02241 10.9999 6.06448M13.3228 13.5C12.9702 13.8112 12.5071 14 11.9999 14C10.8953 14 9.99989 13.1046 9.99989 12C9.99989 11.4605 10.2135 10.9711 10.5608 10.6113"
                      stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    </path>
                  </g>
                </g>
              </svg>
              <p>Hide Asset</p>
            </div>
            <div class="ml-nested-dropdown"
              style="display: flex; flex-direction: row; align-items: center; height: 14px;">
              <svg style="width: 15px; height: 15px; margin-right: 5px;" class="img" viewBox="0 0 512 512"
                version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                fill="var(--text1)">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <title>new-indicator</title>
                  <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                    <g id="scheduler" fill="var(--text1)" transform="translate(85.333333, 85.333333)">
                      <path
                        d="M170.666667,1.42108547e-14 C264.923264,-3.10380131e-15 341.333333,76.4100694 341.333333,170.666667 C341.333333,264.923264 264.923264,341.333333 170.666667,341.333333 C76.4100694,341.333333 2.57539587e-14,264.923264 1.42108547e-14,170.666667 C2.6677507e-15,76.4100694 76.4100694,3.15255107e-14 170.666667,1.42108547e-14 Z M170.666667,42.6666667 C99.9742187,42.6666667 42.6666667,99.9742187 42.6666667,170.666667 C42.6666667,241.359115 99.9742187,298.666667 170.666667,298.666667 C241.359115,298.666667 298.666667,241.359115 298.666667,170.666667 C298.666667,99.9742187 241.359115,42.6666667 170.666667,42.6666667 Z M192,85.3333333 L191.999333,149.333333 L256,149.333333 L256,192 L191.999333,191.999333 L192,256 L149.333333,256 L149.333333,191.999333 L85.3333333,192 L85.3333333,149.333333 L149.333333,149.333333 L149.333333,85.3333333 L192,85.3333333 Z"
                        id="Combined-Shape"> </path>
                    </g>
                  </g>
                </g>
              </svg>
              <p>Add to Watchlist</p>
              <div class="ml-nested-dropdown-menu">
                <div v-for="(ticker, index) in watchlist.tickers" :key="index" class="ml-watchlist-item">
                  <label :for="'watchlist-' + index" class="ml-checkbox-label">
                    <div @click.stop="toggleWatchlist(ticker, asset.Symbol)" style="cursor: pointer;">
                      <div v-html="getWatchlistIcon(ticker.Name ?? ticker, asset.Symbol)"></div>
                    </div>
                    <span></span>
                    {{ ticker.Name }}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="ml-btsymbol">{{ asset.Symbol }}</div>
        <div v-for="col in selectedAttributes" :key="col" :style="getColumnStyle(col)"
          :class="getColumnClass(asset, col)">
          {{ getColumnValue(asset, col) }}
        </div>
      </div>
      <div class="ml-results2">
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { computed } from 'vue';
type Asset = Record<string, any>;
type Watchlist = {
  tickers: Array<{ Name: string }>
};

const props = defineProps<{
  currentResults: Asset[],
  selectedItem: string,
  watchlist: Watchlist,
  getWatchlistIcon: (ticker: any, symbol: string) => string,
  selectedAttributes: string[],
}>();

const emit = defineEmits(['scroll', 'keydown', 'select-row', 'hide-stock', 'toggle-watchlist']);

function handleScroll2(event: Event) {
  emit('scroll', event);
}

function handleKeydown(event: KeyboardEvent) {
  emit('keydown', event);
}

function selectRow(symbol: string) {
  emit('select-row', symbol);
}

function hideStock(asset: Asset) {
  emit('hide-stock', asset);
}

function toggleWatchlist(ticker: any, symbol: string) {
  const name = typeof ticker === 'string' ? ticker : ticker?.Name ?? String(ticker);
  emit('toggle-watchlist', { tickerName: name, symbol });
}

// Returns a class for todaychange column based on value
function getColumnClass(asset: Asset, col: string): string {
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
  { label: 'Intrinsic Value', value: 'intrinsic_value', backend: 'IntrinsicValue' },
  { label: 'CAGR', value: 'cagr', backend: 'CAGR' },
  { label: 'Fund Family', value: 'fund_family', backend: 'fundFamily' },
  { label: 'Fund Category', value: 'fund_category', backend: 'FundCategory' },
  { label: 'Net Expense Ratio', value: 'net_expense_ratio', backend: 'netExpenseRatio' },
];
// Returns a class for todaychange column based on value

function getColumnLabel(col: string): string {
  const found = attributes.find(a => a.value === col);
  return found ? found.label : col;
}

function getColumnValue(asset: Asset, col: string): string {
  const attr = attributes.find(a => a.value === col);
  if (!attr) return '-';
  const value = asset[attr.backend];
  // Map backend keys to formatting rules (type-safe)
  const formatRules: { [key: string]: (v: any) => string } = {
    DividendYield: (v: any) => (typeof v === 'number' ? (v * 100).toFixed(2) + '%' : '-'),
     Close: (v: any) => { if (typeof v === 'number') return v.toFixed(2); if (v != null && !isNaN(Number(v))) return Number(v).toFixed(2); return '-';},
    EPS: (v: any) => (typeof v === 'number' ? v.toFixed(2) : '-'),
    todaychange: (v: any) => (typeof v === 'number' ? (v * 100).toFixed(2) + '%' : '-'),
    ADV1W: (v: any) => (typeof v === 'number' ? v.toFixed(2) : '-'),
    ADV1M: (v: any) => (typeof v === 'number' ? v.toFixed(2) : '-'),
    ADV4M: (v: any) => (typeof v === 'number' ? v.toFixed(2) : '-'),
    ADV1Y: (v: any) => (typeof v === 'number' ? v.toFixed(2) : '-'),
    MarketCapitalization: (v: any) => (v != null && !isNaN(v) ? parseInt(v).toLocaleString() : '-'),
    SharesOutstanding: (v: any) => (v != null && !isNaN(v) ? parseInt(v).toLocaleString() : '-'),
    PERatio: (v: any) => (typeof v === 'number' && v > 0 ? Math.round(v).toString() : '-'),
    PriceToSalesRatioTTM: (v: any) => (typeof v === 'number' && v > 0 ? Math.round(v).toString() : '-'),
    PEGRatio: (v: any) => (typeof v === 'number' && v > 0 ? Math.round(v).toString() : '-'),
    Volume: (v: any) => (v != null && !isNaN(v) ? parseInt(v).toLocaleString() : '-'),
    EV: (v: any) => (v != null && !isNaN(v) ? parseInt(v).toLocaleString() : '-'),
    Gap: (v: any) => (typeof v === 'number' ? v.toFixed(2) + '%' : '-'),
    RSI: (v: any) => (typeof v === 'number' && v >= 0 ? v.toFixed(2) : '-'),
    fiftytwoWeekHigh: (v: any) => (typeof v === 'number' && v > 0 ? v.toFixed(2) : '-'),
    fiftytwoWeekLow: (v: any) => (typeof v === 'number' && v > 0 ? v.toFixed(2) : '-'),
    AlltimeHigh: (v: any) => (typeof v === 'number' && v > 0 ? v.toFixed(2) : '-'),
    AlltimeLow: (v: any) => (typeof v === 'number' && v > 0 ? v.toFixed(2) : '-'),
    BookValue: (v: any) => (typeof v === 'number' && v > 0 ? v.toFixed(2) : '-'),
    PriceToBookRatio: (v: any) => (typeof v === 'number' && v > 0 ? v.toFixed(2) : '-'),
    freeCashFlow: (v: any) => (v != null && !isNaN(v) ? parseInt(v).toLocaleString() : '-'),
    cashAndEq: (v: any) => (v != null && !isNaN(v) ? parseInt(v).toLocaleString() : '-'),
    debtCurrent: (v: any) => (v != null && !isNaN(v) ? parseInt(v).toLocaleString() : '-'),
    assetsCurrent: (v: any) => (v != null && !isNaN(v) ? parseInt(v).toLocaleString() : '-'),
    liabilitiesCurrent: (v: any) => (v != null && !isNaN(v) ? parseInt(v).toLocaleString() : '-'),
    currentRatio: (v: any) => (typeof v === 'number' && v > 0 ? v.toFixed(2) : '-'),
    roe: (v: any) => (typeof v === 'number' ? (v * 100).toFixed(2) + '%' : '-'),
    roa: (v: any) => (typeof v === 'number' ? (v * 100).toFixed(2) + '%' : '-'),
    IPO: (v: any) => {
      if (!v) return '-';
      const date = new Date(v);
      if (isNaN(date.getTime())) return '-';
      return date.toISOString().slice(0, 10);
    },
    Currency: (v: any) => (typeof v === 'string' ? v.toUpperCase() : (v ?? '-')),
    netExpenseRatio: (v: any) => (typeof v === 'number' && v >= 0 ? v.toFixed(2) + '%' : '-'),
    CAGR: (v: any) => (typeof v === 'number' ? (v * 100).toFixed(2) + '%' : '-'),
  };
  const formatter = formatRules[attr.backend];
  if (formatter) return formatter(value);
  return value ?? '-';
}

const styleMap: { [key: string]: number } = {
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
  name: 350,
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
  intrinsic_value: 150,
  cagr: 100,
  fund_family: 250,
  fund_category: 250,
  net_expense_ratio: 120,
};

function getColumnStyle(col: string): string {
  const width = styleMap[col] || 100;
  return `min-width: ${width}px;`;
}

const columnsMinWidth = computed(() => {
  // Always include Ticker column (min-width: 70px) and image column (min-width: 50px)
  let sum = 70 + 50 + 51; // 51px for the dropdown button
  for (const col of props.selectedAttributes) {
    sum += styleMap[col as keyof typeof styleMap] || 100;
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
  background-color: var(--base3);
  cursor: pointer;
}

.ml-selected {
  background-color: var(--base3);
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
  border-radius: 25%;
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
  background-color: var(--base2);
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
  background-color: var(--base2);
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