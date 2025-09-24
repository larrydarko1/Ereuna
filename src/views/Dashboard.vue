<template>
  <Header />
  <main class="dashboard" aria-label="Dashboard main content">

     <!-- Top Section: Date/Time & Market Status -->
    <section class="dashboard-top" aria-label="Market status and date/time">
      <div class="datetime" aria-label="Current date and time">
        <span class="date" aria-label="Current date">{{ currentDate }}</span>
        <span class="time" aria-label="Current time">{{ currentTime }}</span>
        <div class="dashboard-disclaimer">
          <span class="disclaimer-label">Last update: </span>
          <span class="disclaimer-value">{{ lastUpdateString }}</span>
          <span class="disclaimer-note">&mdash; Stats update every trading day at market close</span>
        </div>
      </div>
      <div class="market-status" :class="marketStatusClass" role="status" aria-live="polite">
        <span class="status-label">US Markets </span>
        <span class="status-value">
          <template v-if="marketStatus === 'Holiday'">
            Holiday: {{ holidayName }}
          </template>
          <template v-else>
            {{ marketStatus }}
          </template>
        </span>
      </div>
    </section>
         <!-- Third Row: Placeholder for future widgets -->
  <div class="dashboard-row3">
    <section style="width: 100%; margin-bottom: 5px;">
    <div class="e-card playing archie-card" style="width: 100%;">
      <div class="wave"></div>
      <div class="wave"></div>
      <div class="wave"></div>
      <div class="infotop">
        <span class="archie-title">Meet <span class="archie-name">Archie</span></span>
        <div class="archie-tagline">Your Adaptive AI Trading Agent</div>
        <div class="archie-loader">
          <span class="loader-line"></span>
          <span class="loader-text">Archie is in training...</span>
        </div>
        <p class="archie-desc">
          Archie is powered by deep learning and trained on millions of financial documents.<br>
          He recognizes patterns, adapts to your style, and suggests the best trading strategies for you.<br>
          <span class="archie-highlight">Coming soon: AI-generated trades, market insights, and personalized
            strategies.</span>
        </p>
        <div class="archie-disclaimer">
          <strong>Disclaimer:</strong> Archie is an experimental AI agent. All suggestions are for informational
          purposes only and do not constitute legal financial advice. Use of Archie is optional and available to all
          subscription tiers; Ereuna assumes no responsibility for trading outcomes.
        </div>
      </div>
    </div>
  </section>
  </div>

    <!-- First Row: Market Indexes & SMA Distribution -->
    <div class="dashboard-row">
      <section class="market-indexes card" aria-label="Market Indexes">
        <h2 id="market-indexes-heading">Market Indexes</h2>
        <table aria-labelledby="market-indexes-heading">
          <thead>
            <tr>
              <th scope="col">ETF</th>
              <th scope="col">Price</th>
              <th scope="col">% Change</th>
              <th scope="col">1M</th>
              <th scope="col">1Q</th>
              <th scope="col">1Y</th>
              <th scope="col">YTD</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="statsLoading">
              <td colspan="7">Loading...</td>
            </tr>
            <tr v-else-if="statsError">
              <td colspan="7">{{ statsError }}</td>
            </tr>
            <tr v-else v-for="idx in indexData" :key="idx.symbol">
              <td>{{ idx.symbol }}</td>
              <td>{{ idx.lastPrice !== '-' ? '$' + Number(idx.lastPrice).toFixed(2) : '-' }}</td>
              <td :class="getPerfClass(idx.d1)">{{ idx.d1 }}</td>
              <td :class="getPerfClass(idx.m1)">{{ idx.m1 }}</td>
              <td :class="getPerfClass(idx.m4)">{{ idx.m4 }}</td>
              <td :class="getPerfClass(idx.y1)">{{ idx.y1 }}</td>
              <td :class="getPerfClass(idx.ytd)">{{ idx.ytd }}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section class="sma-distribution card" aria-label="SMA Distribution">
        <h2 id="sma-distribution-heading">SMA Distribution</h2>
        <div class="sma-bars" aria-labelledby="sma-distribution-heading">
          <div class="sma-bar" v-for="sma in smaData" :key="sma.period" :aria-label="`${sma.period} SMA distribution`">
            <div class="sma-label">{{ sma.period }} SMA</div>
            <div class="bar-container" role="progressbar" :aria-valuenow="sma.abovePercent" aria-valuemin="0" aria-valuemax="100" :aria-label="`${sma.abovePercent}% above, ${sma.belowPercent}% below`">
              <div class="bar-positive" :style="{ width: sma.abovePercent + '%' }"></div>
              <div class="bar-negative" :style="{ width: sma.belowPercent + '%' }"></div>
            </div>
            <div class="bar-values">
              <span class="positive">{{ sma.above }}%</span>
              <span class="negative">{{ sma.below }}%</span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Second Row: Sectors & Movers/Volume/Sentiment -->
    <div class="dashboard-row2">
        <section class="movers-volume-sentiment card" aria-label="Quarter Sector and Industry Strength">
          <h2 id="sector-strength-heading">Quarter Sector / Industry Strength</h2>
          <div class="sector-lists" aria-labelledby="sector-strength-heading">
          <div>
            <h3>Strongest Sectors</h3>
            <ul>
              <li v-for="s in topSectors" :key="s.sector">
                {{ s.sector }} <span class="positive">{{ s.avgReturnStr }}</span>
                <span class="count">({{ s.count }})</span>
              </li>
            </ul>
          </div>
          <div>
            <h3>Weakest Sectors</h3>
            <ul>
              <li v-for="s in bottomSectors" :key="s.sector">
                {{ s.sector }} <span class="negative">{{ s.avgReturnStr }}</span>
                <span class="count">({{ s.count }})</span>
              </li>
            </ul>
          </div>
          <div>
            <h3>Strongest Industries</h3>
            <ul>
              <li v-for="i in topIndustries" :key="i.industry">
                {{ i.industry }} <span class="positive">{{ i.avgReturnStr }}</span>
                <span class="count">({{ i.count }})</span>
              </li>
            </ul>
          </div>
          <div>
            <h3>Weakest Industries</h3>
            <ul>
              <li v-for="i in bottomIndustries" :key="i.industry">
                {{ i.industry }} <span class="negative">{{ i.avgReturnStr }}</span>
                <span class="count">({{ i.count }})</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    <section class="sectors-movers card" aria-label="Daily Top Movers">
      <h2 id="top-movers-heading">Daily Top Movers</h2>
      <div class="movers-volume" aria-labelledby="top-movers-heading">
          <div>
            <h3>Top 10 Gainers</h3>
            <ul>
              <li v-if="statsLoading">Loading...</li>
              <li v-else-if="statsError">{{ statsError }}</li>
              <li v-else-if="!topGainers.length">No data</li>
              <li v-else v-for="g in topGainers" :key="g.symbol">
                {{ g.symbol }} <span class="positive">+{{ g.daily_return }}%</span>
              </li>
            </ul>
          </div>
          <div>
            <h3>Top 10 Losers</h3>
            <ul>
              <li v-if="statsLoading">Loading...</li>
              <li v-else-if="statsError">{{ statsError }}</li>
              <li v-else-if="!topLosers.length">No data</li>
              <li v-else v-for="l in topLosers" :key="l.symbol">
                {{ l.symbol }} <span class="negative">{{ l.daily_return > 0 ? '+' : '' }}{{ l.daily_return }}%</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
</main>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import Header from '../components/Header.vue';

// --- TypeScript interfaces for API data ---
interface IndexPerformance {
  lastPrice: number;
  '1D': number;
  '1M': number;
  '4M': number;
  '1Y': number;
  YTD: number;
}

interface SmaData {
  period: number;
  above: number;
  below: number;
  abovePercent: number;
  belowPercent: number;
}

interface IndexData {
  symbol: string;
  lastPrice: number | string;
  d1: string;
  m1: string;
  m4: string;
  y1: string;
  ytd: string;
}

interface MarketStats {
  top10DailyGainers: Array<{ symbol: string; daily_return: number }>;
  top10DailyLosers: Array<{ symbol: string; daily_return: number }>;
  sectorTierList: Array<{ sector: string; average_return: number; count: number }>;
  industryTierList: Array<{ industry: string; average_return: number; count: number }>;
  indexPerformance: Record<string, IndexPerformance>;
  [key: string]: any;
}

// Helper for index performance class
function getPerfClass(val: string) {
  if (!val || val === '-') return '';
  // Remove % and + if present
  const num = parseFloat(val.replace('%', '').replace('+', ''));
  if (isNaN(num)) return '';
  if (num > 0) return 'positive';
  if (num < 0) return 'negative';
  return '';
}

const topGainers = computed(() => {
  if (!marketStats.value?.top10DailyGainers) return [];
  return marketStats.value.top10DailyGainers.map((g: any) => ({
    symbol: g.symbol,
    daily_return: g.daily_return.toFixed(2)
  }));
});

const topLosers = computed(() => {
  if (!marketStats.value?.top10DailyLosers) return [];
  return marketStats.value.top10DailyLosers.map((l: any) => ({
    symbol: l.symbol,
    daily_return: l.daily_return.toFixed(2)
  }));
});

// Expose to template
defineExpose({ topGainers, topLosers, getPerfClass });

const topSectors = computed(() => {
  if (!marketStats.value?.sectorTierList) return [];
  return [...marketStats.value.sectorTierList]
    .sort((a, b) => b.average_return - a.average_return)
    .slice(0, 5)
    .map(s => ({
      sector: s.sector,
      avgReturnStr: (s.average_return * 100 > 0 ? '+' : '') + (s.average_return * 100).toFixed(2) + '%',
      count: s.count
    }));
});

const bottomSectors = computed(() => {
  if (!marketStats.value?.sectorTierList) return [];
  return [...marketStats.value.sectorTierList]
    .sort((a, b) => a.average_return - b.average_return)
    .slice(0, 5)
    .map(s => ({
      sector: s.sector,
      avgReturnStr: (s.average_return * 100 > 0 ? '+' : '') + (s.average_return * 100).toFixed(2) + '%',
      count: s.count
    }));
});

const topIndustries = computed(() => {
  if (!marketStats.value?.industryTierList) return [];
  return [...marketStats.value.industryTierList]
    .sort((a, b) => b.average_return - a.average_return)
    .slice(0, 5)
    .map(i => ({
      industry: i.industry,
      avgReturnStr: (i.average_return * 100 > 0 ? '+' : '') + (i.average_return * 100).toFixed(2) + '%',
      count: i.count
    }));
});

const bottomIndustries = computed(() => {
  if (!marketStats.value?.industryTierList) return [];
  return [...marketStats.value.industryTierList]
    .sort((a, b) => a.average_return - b.average_return)
    .slice(0, 5)
    .map(i => ({
      industry: i.industry,
      avgReturnStr: (i.average_return * 100 > 0 ? '+' : '') + (i.average_return * 100).toFixed(2) + '%',
      count: i.count
    }));
});

// --- Market stats state ---
const marketStats = ref<MarketStats | null>(null);
const statsLoading = ref(true);
const statsError = ref('');

// --- Last update logic ---
const lastUpdateString = ref('');

function updateLastUpdateString() {
  // Use the time when marketStats was last fetched as the update time
  // If API provides a timestamp, use it instead
  if (marketStats.value && marketStats.value.updatedAt) {
    // Assume ISO string or timestamp
    const d = new Date(marketStats.value.updatedAt);
    lastUpdateString.value = d.toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', year: 'numeric', month: 'short', day: 'numeric' });
  } else {
    // Fallback: use current time in US Eastern
    const now = new Date();
    const estString = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', year: 'numeric', month: 'short', day: 'numeric' });
    lastUpdateString.value = estString;
  }
}

// --- Fetch market stats from backend ---
async function fetchMarketStats() {
  statsLoading.value = true;
  statsError.value = '';
  try {
    const res = await fetch('/api/market-stats', {
      headers: {
        'x-api-key': import.meta.env.VITE_EREUNA_KEY || ''
      }
    });
    if (!res.ok) throw new Error('Failed to fetch market stats');
    marketStats.value = await res.json();
    updateLastUpdateString();
  } catch (e: any) {
    statsError.value = e?.message || 'Error fetching market stats';
    marketStats.value = null;
    updateLastUpdateString();
  } finally {
    statsLoading.value = false;
  }
}

// Date & Time logic
const currentDate = ref('');
const currentTime = ref('');
const marketStatus = ref('Closed');
const marketStatusClass = ref('closed');
const holidayName = ref('');

// US market hours: 9:30am - 4:00pm ET (Eastern Time)
const MARKET_OPEN_HOUR = 9;
const MARKET_OPEN_MINUTE = 30;
const MARKET_CLOSE_HOUR = 16;
const MARKET_CLOSE_MINUTE = 0;

// US market holidays (sample, add more as needed)
const usMarketHolidays = [
  { date: '2025-01-01', name: "New Year's Day" },
  { date: '2025-07-04', name: 'Independence Day' },
  { date: '2025-12-25', name: 'Christmas Day' },
  { date: '2025-11-27', name: 'Thanksgiving Day' },
  { date: '2025-09-01', name: 'Labor Day' },
  // Add more holidays as needed
];

function getUSEasternDate() {
  // Get current time in US Eastern Time (New York)
  const now = new Date();
  const estString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  return new Date(estString);
}

function updateDateTime() {
  const now = new Date();
  currentDate.value = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  currentTime.value = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Get YYYY-MM-DD for holiday check (in US Eastern Time)
  const estDate = getUSEasternDate();
  const yyyy = estDate.getFullYear();
  const mm = String(estDate.getMonth() + 1).padStart(2, '0');
  const dd = String(estDate.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  // Check for holiday
  const holiday = usMarketHolidays.find(h => h.date === todayStr);
  if (holiday) {
    marketStatus.value = 'Holiday';
    marketStatusClass.value = 'holiday';
    holidayName.value = holiday.name;
    return;
  }

  // Get hour and minute in US Eastern Time
  const hour = estDate.getHours();
  const minute = estDate.getMinutes();

  // Market open logic
  if (
    (hour > MARKET_OPEN_HOUR || (hour === MARKET_OPEN_HOUR && minute >= MARKET_OPEN_MINUTE)) &&
    (hour < MARKET_CLOSE_HOUR || (hour === MARKET_CLOSE_HOUR && minute < MARKET_CLOSE_MINUTE))
  ) {
    marketStatus.value = 'Open';
    marketStatusClass.value = 'open';
    holidayName.value = '';
  } else {
    marketStatus.value = 'Closed';
    marketStatusClass.value = 'closed';
    holidayName.value = '';
  }
}

// SMA data from API
const smaPeriods = [5, 10, 20, 50, 100, 150, 200];
const smaData = ref<SmaData[]>([]);

function updateSmaData() {
  if (!marketStats.value) return;
  smaData.value = smaPeriods.map(period => {
    const key = 'SMA' + period;
    const obj = marketStats.value ? marketStats.value[key] : null;
    if (!obj) return { period, above: 0, below: 0, abovePercent: 0, belowPercent: 0 };
    const above = obj.up;
    const below = obj.down;
    const abovePercent = Math.round(above * 100);
    const belowPercent = Math.round(below * 100);
    return {
      period,
      above: abovePercent,
      below: belowPercent,
      abovePercent,
      belowPercent
    };
  });
}

// Indexes from API
const indexList = ['SPY', 'QQQ', 'DIA', 'IWM', 'EFA', 'EEM'];
const indexData = ref<IndexData[]>([]);
function updateIndexData() {
  if (!marketStats.value || !marketStats.value.indexPerformance) return;
  indexData.value = indexList.map(symbol => {
    const idx = marketStats.value && marketStats.value.indexPerformance ? marketStats.value.indexPerformance[symbol] : null;
    if (!idx) return { symbol, lastPrice: '-', d1: '-', m1: '-', m4: '-', y1: '-', ytd: '-' };
    return {
      symbol,
      lastPrice: idx.lastPrice != null ? idx.lastPrice : '-',
      d1: idx['1D'] != null ? (idx['1D'] * 100).toFixed(2) + '%' : '-',
      m1: idx['1M'] != null ? (idx['1M'] * 100).toFixed(2) + '%' : '-',
      m4: idx['4M'] != null ? (idx['4M'] * 100).toFixed(2) + '%' : '-',
      y1: idx['1Y'] != null ? (idx['1Y'] * 100).toFixed(2) + '%' : '-',
      ytd: idx['YTD'] != null ? (idx['YTD'] * 100).toFixed(2) + '%' : '-'
    };
  });
}

onMounted(() => {
  updateDateTime();
  setInterval(updateDateTime, 60000);
  fetchMarketStats().then(() => {
    updateSmaData();
    updateIndexData();
  });
  // Update last update string every minute in case time zone changes
  setInterval(updateLastUpdateString, 60000);
});
</script>

<style scoped>
.dashboard-disclaimer {
  margin-top: 4px;
  font-size: 0.98rem;
  color: var(--text2);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.disclaimer-label {
  font-weight: 600;
}
.disclaimer-note {
  font-style: italic;
  color: var(--accent2);
}
.dashboard {
  min-height: 100vh;
  width: 100vw;
  box-sizing: border-box;
  background-color: var(--base4);
  overflow-x: scroll;
}
.dashboard-row {
  display: flex;
  gap: 5px;
  margin-bottom: 5px;
}
.dashboard-row2 {
  display: flex;
  gap: 5px;
  margin-bottom: 5px;
}
.dashboard-row3 {
  display: flex;
  gap: 5px;
  flex: 1 1 0;
  min-height: 0;
  margin-bottom: 0;
}
.dashboard-row3-content {
  flex: 1 1 0;
  min-width: 320px;
  max-width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 120px;
}
.dashboard-row .market-indexes.card {
  flex: 0 0 350px;
  min-width: 280px;
  max-width: 350px;
}
.dashboard-row .sma-distribution.card {
  flex: 1 1 0;
  min-width: 320px;
  max-width: 100%;
}
.dashboard-row2 .sectors-movers.card {
  flex: 0 0 320px;
  min-width: 220px;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.sector-lists {
  display: flex;
  gap: 24px;
  justify-content: space-between;
}
.sector-lists h3 {
  margin-bottom: 8px;
  font-size: 1.1rem;
  color: var(--accent1);
}
.sector-lists ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.sector-lists li {
  color: var(--text1);
  font-size: 1rem;
  margin-bottom: 4px;
}
.dashboard-row2 .movers-volume-sentiment.card {
  flex: 1 1 0;
  min-width: 320px;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.movers-volume {
  display: flex;
  gap: 24px;
  justify-content: space-between;
  margin-bottom: 5px;
}
.movers-volume h3 {
  margin-bottom: 8px;
  font-size: 1.1rem;
  color: var(--accent1);
}
.movers-volume ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.movers-volume li {
  color: var(--text1);
  font-size: 1rem;
  margin-bottom: 4px;
}
.sentiment-overview {
  margin-top: 12px;
}
.sentiment-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sentiment-label {
  color: var(--text2);
  font-size: 1rem;
}
.sentiment-progress {
  display: flex;
  width: 120px;
  height: 14px;
  border-radius: 7px;
  overflow: hidden;
  background: var(--base3);
}
.sentiment-positive {
  background: var(--positive);
  height: 100%;
}
.sentiment-negative {
  background: var(--negative);
  height: 100%;
}
.sma-bars {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 16px;
}
.sma-bar {
  display: flex;
  align-items: center;
  gap: 16px;
}
.sma-label {
  width: 80px;
  color: var(--accent1);
  font-weight: 600;
}
.bar-container {
  display: flex;
  height: 18px;
  width: 90%;
  background: var(--base3);
  border-radius: 8px;
  overflow: hidden;
}
.bar-positive {
  background: var(--positive);
  height: 100%;
}
.bar-negative {
  background: var(--negative);
  height: 100%;
}
.bar-values {
  display: flex;
  gap: 8px;
  font-size: 1rem;
  margin-left: 8px;
}
.dashboard-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  margin-bottom: 5px;
  background-color: var(--base2);
}
.datetime {
  color: var(--text1);
  display: flex;
  flex-direction: column;
}
.date{
    font-size: 2.5rem;
}
.time {
  font-size: 2rem;
}
.market-status {
  font-size: 1.2rem;
  padding: 8px 16px;
  border-radius: 5px;
  background: var(--base3);
  color: var(--text1);
  font-weight: bold;
}
.market-status.open {
  background: var(--positive);
  color: var(--base4);
}
.market-status.closed {
  background: var(--negative);
  color: var(--base4);
}
.market-status.holiday {
  background: var(--accent2);
  color: var(--base4);
}
.card {
  background: var(--base2);
  padding: 24px;
}
.market-indexes table,
.sma-distribution table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
}
.market-indexes th,
.market-indexes td,
.sma-distribution th,
.sma-distribution td {
  padding: 10px 8px;
  text-align: left;
  border-bottom: 1px solid var(--base3);
}
.market-indexes th,
.sma-distribution th {
  color: var(--accent1);
  font-size: 1rem;
}
.market-indexes td,
.sma-distribution td {
  color: var(--text1);
  font-size: 1rem;
}
.positive {
  color: var(--positive) !important;
}
.negative {
  color: var(--negative) !important;
}

h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text2);
  font-weight: 700;
}

.e-card.archie-card {
  background: transparent;
  position: relative;
  height: 330px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wave {
  position: absolute;
  width: 1700px;
  height: 2000px;
  opacity: 0.6;
  left: 0;
  top: 0;
  margin-left: -50%;
  margin-top: -70%;
  background: linear-gradient(744deg, var(--base1), var(--base2) 60%, var(--base3));
  border-radius: 40%;
  animation: wave 300s infinite linear;
}

.wave:nth-child(2),
.wave:nth-child(3) {
  top: 210px;
}

.e-card.playing .wave {
  animation: wave 9000ms infinite linear;
}

.e-card.playing .wave:nth-child(2) {
  animation-duration: 12000ms;
}

.e-card.playing .wave:nth-child(3) {
  animation-duration: 15000ms;
}

.wave:nth-child(2) {
  animation-duration: 300s;
}

.wave:nth-child(3) {
  animation-duration: 270s;
}

@keyframes wave {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.icon {
  width: 3em;
  margin-top: -1em;
  padding-bottom: 1em;
  color: var(--accent1);
}

.infotop {
  text-align: center;
  font-size: 20px;
  position: absolute;
  left: 0;
  right: 0;
  color: var(--text1);
  font-weight: 600;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
}

.archie-title {
  font-size: 3rem;
  font-weight: 800;
  color: var(--text1);
  margin-bottom: 0.2em;
  letter-spacing: 0.01em;
}

.archie-name {
  color: var(--accent1);
  font-size: 2.2rem;
  font-weight: 800;
}

.archie-tagline {
  color: var(--accent2);
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 12px 0;
  letter-spacing: 0.01em;
}

.archie-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.loader-line {
  width: 36px;
  height: 4px;
  background: var(--accent1);
  border-radius: 2px;
  animation: spin 1s linear infinite;
  margin-right: 12px;
}

@keyframes spin {
  0% {
    transform: scaleX(1);
  }

  50% {
    transform: scaleX(0.5);
  }

  100% {
    transform: scaleX(1);
  }
}

.loader-text {
  color: var(--text2);
  font-size: 1.01rem;
  font-style: italic;
}

.archie-desc {
  color: var(--text2);
  font-size: 1.01rem;
  text-align: center;
  margin-bottom: 12px;
}

.archie-highlight {
  color: var(--accent3);
  font-weight: 700;
  font-size: 1.05em;
}

.archie-disclaimer {
  color: var(--text2);
  background: rgba(40, 42, 60, 0.85);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.93rem;
  margin-top: 10px;
  text-align: left;
  border-left: 4px solid var(--accent1);
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.07);
}

@media (max-width: 1150px) {
  .dashboard-row > .sma-distribution.card {
    margin-bottom: 5px !important;
  }
  .dashboard {
    width: 100vw;
    min-width: 0;
    overflow-x: hidden;
    padding: 0;
  }
  .dashboard-top {
    margin-bottom: 5px !important;
  }
  .dashboard-row {
    flex-direction: column !important;
    margin-bottom: 0;
    gap: 0;
    width: 100vw;
    min-width: 0;
    max-width: 100vw;
  }
  .dashboard-row2 {
    flex-direction: column !important;
    margin-bottom: 0;
    gap: 0;
    width: 100vw;
    min-width: 0;
    max-width: 100vw;
  }
  .dashboard-row > .card:not(:last-child),
  .dashboard-row2 > .card:not(:last-child) {
    margin-bottom: 5px !important;
  }
  .dashboard-row > .card,
  .dashboard-row2 > .card {
    min-width: 0 !important;
    max-width: 100vw !important;
    width: 100vw !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    box-sizing: border-box;
  }
  .dashboard-row > .card,
  .dashboard-row2 > .card {
    min-width: 0 !important;
    max-width: 100vw !important;
    width: 100vw !important;
    margin: 0 !important;
    box-sizing: border-box;
  }
  .dashboard-row3-content {
    min-width: 0;
    width: 100vw;
    max-width: 100vw;
  }
  .sector-lists {
    flex-direction: column;
    gap: 0;
  }
  .movers-volume {
    flex-direction: row;
    gap: 8px;
  }
  .movers-volume > div {
    flex: 1 1 0;
  }
  .dashboard-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin: 0;
    width: 100vw;
    max-width: 100vw;
    min-width: 0;
    box-sizing: border-box;
  }
  .dashboard-disclaimer {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    font-size: 0.95rem;
    margin-top: 2px;
    line-height: 1.3;
  }
  .date {
    font-size: 2.5rem;
  }
  .time {
    font-size: 2rem;
  }
  .market-status {
    font-size: 1rem;
    padding: 6px 10px;
  }
}

</style>