<template>
  <Header />
  <main class="dashboard" :aria-label="t('dashboard.title')">

     <!-- Top Section: Date/Time & Market Status -->
    <section class="dashboard-top card" aria-label="Market status and date/time">
      <div class="dashboard-top-left">
        <div class="datetime" aria-label="Current date and time">
          <span class="date" aria-label="Current date">{{ currentDate }}</span>
          <span class="time" aria-label="Current time">{{ currentTime }}</span>
          <div class="dashboard-disclaimer">
            <span class="disclaimer-label">{{ t('dashboard.lastUpdate') }}</span>
            <span class="disclaimer-value">{{ lastUpdateString }}</span>
          </div>
        </div>
      </div>

      <div class="dashboard-top-center">
        <div class="outlook-pills">
          <div class="outlook-pill" @mouseenter="showTooltip('shortTerm')" @mouseleave="hideTooltip">
            <span class="pill-label">{{ t('dashboard.outlook.shortTerm') }}</span>
            <span class="pill-badge" :class="getOutlookClass(marketOutlook.shortTerm)">{{ formatOutlook(marketOutlook.shortTerm) }}</span>
            <div v-if="tooltipVisible === 'shortTerm'" class="outlook-tooltip">
              <strong>{{ t('dashboard.outlook.shortTermTooltipTitle') }}</strong>
              <p>{{ t('dashboard.outlook.shortTermTooltipDesc') }}</p>
              <div class="tooltip-metric">
                <span class="metric-label">{{ marketOutlook.shortTermPercent }}% {{ t('dashboard.outlook.assetsUp') }}</span>
              </div>
            </div>
          </div>
          <div class="outlook-pill" @mouseenter="showTooltip('midTerm')" @mouseleave="hideTooltip">
            <span class="pill-label">{{ t('dashboard.outlook.midTerm') }}</span>
            <span class="pill-badge" :class="getOutlookClass(marketOutlook.midTerm)">{{ formatOutlook(marketOutlook.midTerm) }}</span>
            <div v-if="tooltipVisible === 'midTerm'" class="outlook-tooltip">
              <strong>{{ t('dashboard.outlook.midTermTooltipTitle') }}</strong>
              <p>{{ t('dashboard.outlook.midTermTooltipDesc') }}</p>
              <div class="tooltip-metric">
                <span class="metric-label">{{ marketOutlook.midTermPercent }}% {{ t('dashboard.outlook.assetsUp') }}</span>
              </div>
            </div>
          </div>
          <div class="outlook-pill" @mouseenter="showTooltip('longTerm')" @mouseleave="hideTooltip">
            <span class="pill-label">{{ t('dashboard.outlook.longTerm') }}</span>
            <span class="pill-badge" :class="getOutlookClass(marketOutlook.longTerm)">{{ formatOutlook(marketOutlook.longTerm) }}</span>
            <div v-if="tooltipVisible === 'longTerm'" class="outlook-tooltip">
              <strong>{{ t('dashboard.outlook.longTermTooltipTitle') }}</strong>
              <p>{{ t('dashboard.outlook.longTermTooltipDesc') }}</p>
              <div class="tooltip-metric">
                <span class="metric-label">{{ marketOutlook.longTermPercent }}% {{ t('dashboard.outlook.assetsUp') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="dashboard-top-right">
        <div class="breadth-compact">
          <div class="breadth-item" @mouseenter="showTooltip('advanceDecline')" @mouseleave="hideTooltip">
            <h3>{{ t('dashboard.breadth.advanceDecline') }}</h3>
            <div class="meter-container">
              <div class="meter-segment bar-positive" :style="{ width: (advanceDecline.advancing * 100) + '%' }"></div>
              <div class="meter-segment bar-negative" :style="{ width: (advanceDecline.declining * 100) + '%' }"></div>
              <div class="meter-segment bar-neutral" :style="{ width: (advanceDecline.unchanged * 100) + '%' }"></div>
            </div>
            <div class="meter-compact-values">
              <span class="meter-value positive">{{ (advanceDecline.advancing * 100).toFixed(1) }}%</span>
              <span class="meter-value negative">{{ (advanceDecline.declining * 100).toFixed(1) }}%</span>
              <span class="meter-value neutral">{{ (advanceDecline.unchanged * 100).toFixed(1) }}%</span>
            </div>
            <div v-if="tooltipVisible === 'advanceDecline'" class="breadth-tooltip">
              <strong>{{ t('dashboard.breadth.advanceDeclineTitle') }}</strong>
              <p>{{ t('dashboard.breadth.advanceDeclineDesc') }}</p>
              <ul>
                <li><span class="positive">●</span> {{ t('dashboard.breadth.advancing') }}</li>
                <li><span class="negative">●</span> {{ t('dashboard.breadth.declining') }}</li>
                <li><span class="neutral">●</span> {{ t('dashboard.breadth.unchanged') }}</li>
              </ul>
            </div>
          </div>
          <div class="breadth-item" @mouseenter="showTooltip('newHighsLows')" @mouseleave="hideTooltip">
            <h3>{{ t('dashboard.breadth.newHighsLows') }}</h3>
            <div class="meter-container">
              <div class="meter-segment bar-positive" :style="{ width: (newHighsLows.newHighs * 100) + '%' }"></div>
              <div class="meter-segment bar-negative" :style="{ width: (newHighsLows.newLows * 100) + '%' }"></div>
              <div class="meter-segment bar-neutral" :style="{ width: (newHighsLows.neutral * 100) + '%' }"></div>
            </div>
            <div class="meter-compact-values">
              <span class="meter-value positive">{{ (newHighsLows.newHighs * 100).toFixed(1) }}%</span>
              <span class="meter-value negative">{{ (newHighsLows.newLows * 100).toFixed(1) }}%</span>
              <span class="meter-value neutral">{{ (newHighsLows.neutral * 100).toFixed(1) }}%</span>
            </div>
            <div v-if="tooltipVisible === 'newHighsLows'" class="breadth-tooltip">
              <strong>{{ t('dashboard.breadth.newHighsLowsTitle') }}</strong>
              <p>{{ t('dashboard.breadth.newHighsLowsDesc') }}</p>
              <ul>
                <li><span class="positive">●</span> {{ t('dashboard.breadth.newHighs') }}</li>
                <li><span class="negative">●</span> {{ t('dashboard.breadth.newLows') }}</li>
                <li><span class="neutral">●</span> {{ t('dashboard.breadth.neutral') }}</li>
              </ul>
            </div>
          </div>
        </div>
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
        <span class="archie-title">{{ t('dashboard.archie.meet') }} <span class="archie-name">{{ t('dashboard.archie.name') }}<svg class="archie-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
            <g id="SVGRepo_iconCarrier">
              <path d="M12 3C12 7.97056 16.0294 12 21 12C16.0294 12 12 16.0294 12 21C12 16.0294 7.97056 12 3 12C7.97056 12 12 7.97056 12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            </g>
          </svg></span></span>
        <div class="archie-tagline">{{ t('dashboard.archie.tagline') }}</div>
        <div class="archie-loader">
          <span class="loader-line"></span>
          <span class="loader-text">{{ t('dashboard.archie.training') }}</span>
        </div>
        <p class="archie-desc">
          {{ t('dashboard.archie.description') }}<br>
          {{ t('dashboard.archie.description2') }}<br>
          <span class="archie-highlight">{{ t('dashboard.archie.comingSoon') }}</span>
        </p>
        <div class="archie-disclaimer">
          <strong>{{ t('dashboard.archie.disclaimer') }}</strong> {{ t('dashboard.archie.disclaimerText') }}
        </div>
      </div>
    </div>
  </section>
  </div>
    <!-- First Row: Market Indexes & SMA Distribution -->
    <div class="dashboard-row">
      <section class="market-indexes card" aria-label="Market Indexes">
        <h2 id="market-indexes-heading">{{ t('dashboard.indexes.title') }}</h2>
        <table aria-labelledby="market-indexes-heading">
          <thead>
            <tr>
              <th scope="col">{{ t('dashboard.indexes.etf') }}</th>
              <th scope="col">{{ t('dashboard.indexes.price') }}</th>
              <th scope="col">{{ t('dashboard.indexes.change') }}</th>
              <th scope="col">{{ t('dashboard.indexes.oneMonth') }}</th>
              <th scope="col">{{ t('dashboard.indexes.oneQuarter') }}</th>
              <th scope="col">{{ t('dashboard.indexes.oneYear') }}</th>
              <th scope="col">{{ t('dashboard.indexes.ytd') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="statsLoading">
              <td colspan="7">{{ t('dashboard.loading') }}</td>
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
        <div class="sma-header">
          <h2 id="sma-distribution-heading">{{ t('dashboard.sma.title') }}</h2>
          <div class="asset-type-dropdown" @click="toggleAssetDropdown">
            <div class="dropdown-selected">
              {{ assetTypeOptions.find(o => o.value === selectedAssetType)?.label }}
              <span class="dropdown-arrow" :class="{ open: assetDropdownOpen }">&#9662;</span>
            </div>
            <div class="dropdown-list" v-if="assetDropdownOpen">
              <div
                v-for="opt in assetTypeOptions"
                :key="opt.value"
                class="dropdown-item"
                @click.stop="selectAssetType(opt.value)"
              >
                {{ opt.label }}
              </div>
            </div>
          </div>
        </div>
        <div class="sma-bars" aria-labelledby="sma-distribution-heading">
          <div class="sma-bar" v-for="sma in smaData" :key="sma.period" :aria-label="`${sma.period} SMA distribution`">
            <div class="sma-label">{{ sma.period }} {{ t('dashboard.sma.sma') }}</div>
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
          <h2 id="sector-strength-heading">{{ t('dashboard.sectors.title') }}</h2>
          <div class="sector-lists" aria-labelledby="sector-strength-heading">
          <div>
            <h3>{{ t('dashboard.sectors.strongestSectors') }}</h3>
            <ul>
              <li v-for="s in topSectors" :key="s.sector">
                {{ s.sector }} <span class="positive">{{ s.avgReturnStr }}</span>
                <span class="count">({{ s.count }})</span>
              </li>
            </ul>
          </div>
          <div>
            <h3>{{ t('dashboard.sectors.weakestSectors') }}</h3>
            <ul>
              <li v-for="s in bottomSectors" :key="s.sector">
                {{ s.sector }} <span class="negative">{{ s.avgReturnStr }}</span>
                <span class="count">({{ s.count }})</span>
              </li>
            </ul>
          </div>
          <div>
            <h3>{{ t('dashboard.sectors.strongestIndustries') }}</h3>
            <ul>
              <li v-for="i in topIndustries" :key="i.industry">
                {{ i.industry }} <span class="positive">{{ i.avgReturnStr }}</span>
                <span class="count">({{ i.count }})</span>
              </li>
            </ul>
          </div>
          <div>
            <h3>{{ t('dashboard.sectors.weakestIndustries') }}</h3>
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
      <h2 id="top-movers-heading">{{ t('dashboard.movers.title') }}</h2>
      <div class="movers-volume" aria-labelledby="top-movers-heading">
          <div>
            <h3>{{ t('dashboard.movers.topGainers') }}</h3>
            <ul>
              <li v-if="statsLoading">{{ t('dashboard.loading') }}</li>
              <li v-else-if="statsError">{{ statsError }}</li>
              <li v-else-if="!topGainers.length">{{ t('dashboard.noData') }}</li>
              <li v-else v-for="g in topGainers" :key="g.symbol">
                {{ g.symbol }} <span class="positive">+{{ g.daily_return }}%</span>
              </li>
            </ul>
          </div>
          <div>
            <h3>{{ t('dashboard.movers.topLosers') }}</h3>
            <ul>
              <li v-if="statsLoading">{{ t('dashboard.loading') }}</li>
              <li v-else-if="statsError">{{ statsError }}</li>
              <li v-else-if="!topLosers.length">{{ t('dashboard.noData') }}</li>
              <li v-else v-for="l in topLosers" :key="l.symbol">
                {{ l.symbol }} <span class="negative">{{ l.daily_return > 0 ? '+' : '' }}{{ l.daily_return }}%</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>

    <!-- Third Row: Valuation Analysis -->
    <div class="dashboard-row-valuation">
      <section class="valuation-section card" aria-label="Stock Valuation Analysis">
        <h2 id="valuation-heading">
          <svg class="chart-type-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
            <g id="SVGRepo_iconCarrier">
              <path d="M12 3C12 7.97056 16.0294 12 21 12C16.0294 12 12 16.0294 12 21C12 16.0294 7.97056 12 3 12C7.97056 12 12 7.97056 12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            </g>
          </svg>
          <span class="archie-full"><span class="archie-text">{{ t('dashboard.archie.name') }}</span>'s</span> {{ t('dashboard.valuation.title') }}
          <span class="beta-badge">{{ t('dashboard.valuation.beta') }}</span>
        </h2>
        <div class="valuation-content" aria-labelledby="valuation-heading">
          <div class="valuation-column undervalued">
            <h3>
              <span class="badge-undervalued">{{ t('dashboard.valuation.undervalued') }}</span>
            </h3>
            <div class="valuation-list">
              <div v-if="statsLoading" class="loading-state">{{ t('dashboard.loading') }}</div>
              <div v-else-if="statsError" class="error-state">{{ statsError }}</div>
              <div v-else-if="!topUndervalued.length" class="empty-state">{{ t('dashboard.noDataAvailable') }}</div>
              <div v-else v-for="(stock, index) in topUndervalued" :key="stock.symbol" class="valuation-item">
                <div class="stock-header">
                  <span class="ranking-number">#{{ index + 1 }}</span>
                  <span class="stock-symbol">{{ stock.symbol }}</span>
                  <span class="upside-badge">+{{ stock.upside }}%</span>
                </div>
                <div class="stock-prices">
                  <div class="price-row">
                    <span class="price-label">{{ t('dashboard.valuation.current') }}</span>
                    <span class="price-value">${{ stock.currentPrice }}</span>
                  </div>
                  <div class="price-row">
                    <span class="price-label">{{ t('dashboard.valuation.intrinsic') }}</span>
                    <span class="price-value intrinsic">${{ stock.intrinsicValue }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="valuation-column overvalued">
            <h3>
              <span class="badge-overvalued">{{ t('dashboard.valuation.overvalued') }}</span>
            </h3>
            <div class="valuation-list">
              <div v-if="statsLoading" class="loading-state">{{ t('dashboard.loading') }}</div>
              <div v-else-if="statsError" class="error-state">{{ statsError }}</div>
              <div v-else-if="!topOvervalued.length" class="empty-state">{{ t('dashboard.noDataAvailable') }}</div>
              <div v-else v-for="(stock, index) in topOvervalued" :key="stock.symbol" class="valuation-item">
                <div class="stock-header">
                  <span class="ranking-number">#{{ index + 1 }}</span>
                  <span class="stock-symbol">{{ stock.symbol }}</span>
                  <span class="downside-badge">-{{ stock.downside }}%</span>
                </div>
                <div class="stock-prices">
                  <div class="price-row">
                    <span class="price-label">{{ t('dashboard.valuation.current') }}</span>
                    <span class="price-value">${{ stock.currentPrice }}</span>
                  </div>
                  <div class="price-row">
                    <span class="price-label">{{ t('dashboard.valuation.intrinsic') }}</span>
                    <span class="price-value intrinsic">${{ stock.intrinsicValue }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="valuation-disclaimer">
          <strong>{{ t('dashboard.valuation.note') }}</strong> {{ t('dashboard.valuation.disclaimer') }}
        </div>
      </section>
    </div>

    <!-- Calendar Events Section - Compact Version -->
    <div class="dashboard-row-calendar">
      <section class="calendar-events-compact card" aria-label="Today's Calendar Events">
        <h2 id="calendar-events-heading">
          <svg class="section-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 7V11H16V7M8 2V6M16 2V6M3 10H21M21 10V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Today's Calendar Events
          <span class="event-count-badge" v-if="!calendarLoading && todayEvents.length > 0">{{ todayEvents.length }}</span>
        </h2>
        <div v-if="calendarLoading" class="calendar-loading-compact">
          <div class="loader-spinner-small"></div>
          <span>Loading events...</span>
        </div>
        <div v-else-if="calendarError" class="calendar-error-compact">
          {{ calendarError }}
        </div>
        <div v-else-if="!todayEvents.length" class="calendar-empty-compact">
          No events scheduled for today
        </div>
        <div v-else class="calendar-table-wrapper">
          <table class="calendar-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Symbol</th>
                <th>Estimate</th>
                <th>Fiscal Period</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="event in paginatedEvents" :key="event._id">
                <td>
                  <span class="event-type-badge" :class="`type-${event.type.toLowerCase()}`">
                    {{ event.type }}
                  </span>
                </td>
                <td class="symbol-cell">{{ event.symbol }}</td>
                <td>{{ formatEstimate(event.estimate) }}</td>
                <td>{{ formatFiscalQuarter(event.fiscalDateEnding) }}</td>
                <td>{{ event.timeOfTheDay || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="todayEvents.length > itemsPerPage" class="calendar-pagination-compact">
          <button @click="previousPage" :disabled="currentPage === 1" class="pagination-btn-compact">
            ←
          </button>
          <span class="pagination-info-compact">
            {{ currentPage }} / {{ totalPages }} <span class="page-detail">({{ todayEvents.length }} total)</span>
          </span>
          <button @click="nextPage" :disabled="currentPage === totalPages" class="pagination-btn-compact">
            →
          </button>
        </div>
      </section>
    </div>
</main>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Header from '../components/Header.vue';

const { t, locale } = useI18n();

// --- TypeScript interfaces for API data ---
interface CalendarEvent {
  _id: string;
  symbol: string;
  reportDate: string;
  fiscalDateEnding: string;
  estimate: number | null;
  currency: string;
  timeOfTheDay: string;
  type: string;
  lastUpdated: string;
}

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

interface ValuationStock {
  symbol: string;
  current_price: number;
  intrinsic_value: number;
  valuation_ratio: number;
}

interface MarketStats {
  top10DailyGainers: Array<{ symbol: string; daily_return: number }>;
  top10DailyLosers: Array<{ symbol: string; daily_return: number }>;
  top10Undervalued: Array<ValuationStock>;
  top10Overvalued: Array<ValuationStock>;
  sectorTierList: Array<{ sector: string; average_return: number; count: number }>;
  industryTierList: Array<{ industry: string; average_return: number; count: number }>;
  indexPerformance: Record<string, IndexPerformance>;
  [key: string]: any;
}

interface NewsArticle {
  publishedDate: string;
  title: string;
  url: string;
  description: string;
  source: string;
  tickers: string[];
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

// --- Asset type selector for SMA distribution ---
const selectedAssetType = ref<'ALL' | 'Stock' | 'ETF' | 'Mutual Fund' | 'OTC' | 'PINK' | 'Crypto'>('ALL');
const assetDropdownOpen = ref(false);
const assetTypeOptions = [
  { value: 'ALL' as const, label: 'All Assets' },
  { value: 'Stock' as const, label: 'Stocks (NYSE/NASDAQ)' },
  { value: 'ETF' as const, label: 'ETFs Only' },
  { value: 'Mutual Fund' as const, label: 'Mutual Funds Only' },
  { value: 'OTC' as const, label: 'OTC Stocks' },
  { value: 'PINK' as const, label: 'PINK Stocks' },
  { value: 'Crypto' as const, label: 'Cryptocurrencies' }
];

function toggleAssetDropdown() {
  assetDropdownOpen.value = !assetDropdownOpen.value;
}

function selectAssetType(value: 'ALL' | 'Stock' | 'ETF' | 'Mutual Fund' | 'OTC' | 'PINK' | 'Crypto') {
  selectedAssetType.value = value;
  assetDropdownOpen.value = false;
}

// --- Valuation stocks computeds ---
const topUndervalued = computed(() => {
  if (!marketStats.value?.top10Undervalued) return [];
  return marketStats.value.top10Undervalued.map((s: ValuationStock) => ({
    symbol: s.symbol,
    currentPrice: s.current_price.toFixed(2),
    intrinsicValue: s.intrinsic_value.toFixed(2),
    upside: s.valuation_ratio.toFixed(2)
  }));
});

const topOvervalued = computed(() => {
  if (!marketStats.value?.top10Overvalued) return [];
  return marketStats.value.top10Overvalued.map((s: ValuationStock) => ({
    symbol: s.symbol,
    currentPrice: s.current_price.toFixed(2),
    intrinsicValue: s.intrinsic_value.toFixed(2),
    downside: Math.abs(s.valuation_ratio).toFixed(2)
  }));
});

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
    .slice(0, 10)
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
    .slice(0, 10)
    .map(i => ({
      industry: i.industry,
      avgReturnStr: (i.average_return * 100 > 0 ? '+' : '') + (i.average_return * 100).toFixed(2) + '%',
      count: i.count
    }));
});

// --- Market Outlook ---
const marketOutlook = computed(() => {
  if (!marketStats.value?.marketOutlook) {
    return {
      shortTerm: 'neutral',
      midTerm: 'neutral',
      longTerm: 'neutral',
      shortTermPercent: '0.00',
      midTermPercent: '0.00',
      longTermPercent: '0.00'
    };
  }
  const outlook = marketStats.value.marketOutlook;
  return {
    shortTerm: outlook.shortTerm?.outlook || 'neutral',
    midTerm: outlook.midTerm?.outlook || 'neutral',
    longTerm: outlook.longTerm?.outlook || 'neutral',
    shortTermPercent: outlook.shortTerm?.percentageUp?.toFixed(2) || '0.00',
    midTermPercent: outlook.midTerm?.percentageUp?.toFixed(2) || '0.00',
    longTermPercent: outlook.longTerm?.percentageUp?.toFixed(2) || '0.00'
  };
});

function getOutlookClass(outlook: string) {
  if (outlook === 'positive') return 'outlook-positive';
  if (outlook === 'negative') return 'outlook-negative';
  return 'outlook-neutral';
}

function formatOutlook(outlook: string) {
  return outlook.charAt(0).toUpperCase() + outlook.slice(1);
}

// --- Market Breadth ---
const newHighsLows = computed(() => {
  if (!marketStats.value?.newHighsLows) {
    return { newHighs: 0, newLows: 0, neutral: 0 };
  }
  return marketStats.value.newHighsLows;
});

const advanceDecline = computed(() => {
  if (!marketStats.value?.advanceDecline) {
    return { advancing: 0, declining: 0, unchanged: 0 };
  }
  return marketStats.value.advanceDecline;
});

// --- Market stats state ---
const marketStats = ref<MarketStats | null>(null);
const statsLoading = ref(true);
const statsError = ref('');

// Tooltip state
const tooltipVisible = ref<string | null>(null);

function showTooltip(type: string) {
  tooltipVisible.value = type;
}

function hideTooltip() {
  tooltipVisible.value = null;
}

// --- Calendar Events State ---
const todayEvents = ref<CalendarEvent[]>([]);
const calendarLoading = ref(true);
const calendarError = ref('');
const currentPage = ref(1);
const itemsPerPage = 10;

const totalPages = computed(() => Math.ceil(todayEvents.value.length / itemsPerPage));

const paginatedEvents = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return todayEvents.value.slice(start, end);
});

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
}

function previousPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
}

function formatCalendarDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatEstimate(estimate: number | null): string {
  if (estimate === null) return '-';
  return estimate.toFixed(2);
}

function formatFiscalQuarter(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth();
  const year = date.getFullYear();
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter} ${year}`;
}

// --- Fetch Calendar Events ---
async function fetchCalendarEvents() {
  calendarLoading.value = true;
  calendarError.value = '';
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/calendar-events?date=${today}`, {
      headers: {
        'x-api-key': import.meta.env.VITE_EREUNA_KEY || ''
      }
    });
    if (!res.ok) throw new Error('Failed to fetch calendar events');
    const data = await res.json();
    todayEvents.value = data.events || [];
    currentPage.value = 1; // Reset to first page
  } catch (err: any) {
    calendarError.value = err.message || 'Failed to load calendar events';
    console.error('Calendar fetch error:', err);
  } finally {
    calendarLoading.value = false;
  }
}

// Expose to template
defineExpose({ 
  topGainers, 
  topLosers, 
  getPerfClass, 
  marketOutlook, 
  getOutlookClass, 
  formatOutlook,
  newHighsLows,
  advanceDecline,
  formatNewsDate,
  truncateText,
  tooltipVisible,
  showTooltip,
  hideTooltip
});

// --- Last update logic ---
const lastUpdateString = ref('');

function updateLastUpdateString() {
  // Use the time when marketStats was last fetched as the update time
  // If API provides a timestamp, use it instead
  // NOTE: Show only the plain date (no timezone conversion, no hours/minutes)
  if (marketStats.value && marketStats.value.updatedAt) {
    // Assume ISO string or timestamp
    const d = new Date(marketStats.value.updatedAt);
    // Use plain date only, no timezone, no time-of-day
    lastUpdateString.value = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } else {
    // Fallback: use current time in US Eastern
    // Use plain date only
    const now = new Date();
    lastUpdateString.value = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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

function formatNewsDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Date & Time logic
const currentDate = ref('');
const currentTime = ref('');
// market status badge removed — we no longer display market open/close


// removed getUSEasternDate() and market hours logic since market badge has been removed

function updateDateTime() {
  const now = new Date();
  currentDate.value = now.toLocaleDateString(locale.value, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  currentTime.value = now.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' });

  // Market status removed — we only update date/time here
}

// SMA data from API
const smaPeriods = [5, 10, 20, 50, 100, 150, 200];
const smaData = ref<SmaData[]>([]);

function updateSmaData() {
  if (!marketStats.value) return;
  const assetType = selectedAssetType.value;
  smaData.value = smaPeriods.map(period => {
    const key = 'SMA' + period;
    const obj = marketStats.value ? marketStats.value[key] : null;
    if (!obj || !obj[assetType]) return { period, above: 0, below: 0, abovePercent: 0, belowPercent: 0 };
    const above = obj[assetType].up;
    const below = obj[assetType].down;
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

// Watch for asset type changes and update SMA data
watch(selectedAssetType, () => {
  updateSmaData();
});

onMounted(() => {
  updateDateTime();
  setInterval(updateDateTime, 60000);
  fetchMarketStats().then(() => {
    updateSmaData();
    updateIndexData();
  });
  fetchCalendarEvents();
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
  background-color: var(--base1);
  overflow-x: scroll;
  padding-top: 5px;
  padding-left: 10px;
  padding-right: 10px;
  padding-bottom: 10px;
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
  flex: 0 0 420px;
  min-width: 300px;
  max-width: 420px;
}
.dashboard-row .sma-distribution.card {
  flex: 1 1 0;
  min-width: 280px;
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
.sector-lists .count {
  color: var(--text2);
  font-size: 0.9rem;
  margin-left: 6px;
  font-weight: 600;
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
.sma-bar .bar-container { 
  height: 14px;
  border-radius: 18px;
  background: linear-gradient(90deg, rgba(0,0,0,0.02), rgba(0,0,0,0.02));
}

.sma-bar .bar-positive,
.sma-bar .bar-negative { 
  border-radius: 18px;
}
.bar-container {
  display: flex;
  height: 18px;
  width: 90%;
  background: var(--base3);
  border-radius: 5px;
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

.bar-negative, .bar-positive {
  transition: width 0.4s cubic-bezier(.2,.9,.2,1);
}
.bar-values {
  display: flex;
  gap: 8px;
  font-size: 1rem;
  margin-left: 8px;
}
.bar-neutral {
  background: var(--base3);
  height: 100%;
}

/* Breadth meter container shared styles */
.meter-container {
  display: flex;
  height: 20px;
  width: 100%;
  background: var(--base3);
  border-radius: 5px;
  overflow: hidden;
}

.meter-segment {
  height: 100%;
}

.meter-value {
  font-weight: 600;
}

.meter-value.positive {
  color: var(--positive);
}

.meter-value.negative {
  color: var(--negative);
}

.meter-value.neutral {
  color: var(--text2);
}
.dashboard-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px; /* slightly more padding for card-like spacing */
  margin-bottom: 5px;
  background-color: var(--base2);
  box-shadow: 0 6px 18px rgba(10, 20, 30, 0.06);
  border: 1px solid rgba(0,0,0,0.035);
}

.dashboard-top-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 240px;
}

.dashboard-top-center {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dashboard-top-right {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 300px;
  justify-content: flex-end;
}
.datetime {
  color: var(--text1);
  display: flex;
  flex-direction: column;
}
.date{
    font-size: 2.2rem;
    font-weight: 800;
    color: var(--text1);
}
.time {
  font-size: 1.25rem;
  color: var(--text2);
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
  padding: 22px;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(10, 20, 30, 0.08);
  border: 1px solid rgba(0,0,0,0.04);
  transition: transform 0.14s ease, box-shadow 0.14s ease;
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
  padding: 12px 10px;
  text-align: left;
  border-bottom: 1px solid rgba(0,0,0,0.04);
}
.market-indexes th,
.sma-distribution th {
  color: var(--accent1);
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  background: linear-gradient(180deg, rgba(0,0,0,0.02), transparent);
}
.market-indexes td,
.sma-distribution td {
  color: var(--text1);
  font-size: 0.98rem;
}

.market-indexes tbody tr:hover,
.sma-distribution tbody tr:hover {
  background: rgba(0,0,0,0.02);
}

.market-indexes tbody tr:nth-child(even),
.sma-distribution tbody tr:nth-child(even) {
  background: rgba(0,0,0,0.01);
}
.positive {
  color: var(--positive) !important;
}
.negative {
  color: var(--negative) !important;
}

/* SMA Header with Dropdown */
.sma-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.asset-type-dropdown {
  position: relative;
  width: 180px;
  cursor: pointer;
  user-select: none;
}

.asset-type-dropdown .dropdown-selected {
  background: var(--base3);
  color: var(--text1);
  border-radius: 7px;
  padding: 10px 12px;
  border: 1.5px solid var(--base3);
  font-size: 0.95rem;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: border-color 0.18s;
}

.asset-type-dropdown .dropdown-selected:hover {
  border-color: rgba(0,0,0,0.06);
}

.asset-type-dropdown .dropdown-arrow {
  margin-left: 6px;
  font-size: 0.9em;
  transition: transform 0.2s;
}

.asset-type-dropdown .dropdown-arrow.open {
  transform: rotate(180deg);
}

.asset-type-dropdown .dropdown-list {
  position: absolute;
  top: 105%;
  right: 0;
  width: 100%;
  background: var(--base2);
  border: 1.5px solid var(--base3);
  border-radius: 7px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 100;
  /* Removed max-height and overflow-y to allow full dropdown without scrolling */
}

.asset-type-dropdown .dropdown-item {
  padding: 10px 12px;
  color: var(--text1);
  text-align: left;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  transition: background 0.18s, color 0.18s;
}

.asset-type-dropdown .dropdown-item:first-child {
  border-radius: 7px 7px 0 0;
}

.asset-type-dropdown .dropdown-item:last-child {
  border-radius: 0 0 7px 7px;
}

.asset-type-dropdown .dropdown-item:hover {
  background: var(--accent1);
  color: var(--text3);
}

/* Market Overview Section (Combined Outlook + Breadth) */
.dashboard-row-outlook {
  display: flex;
  gap: 5px;
  margin-bottom: 5px;
}

.market-overview-section {
  width: 100%;
}

.market-overview-section h2 {
  margin-bottom: 16px;
}

.overview-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Compact Outlook Pills */
.outlook-pills {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  position: relative;
}

.outlook-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  background: var(--base4);
  border-radius: 8px;
  border: 1.5px solid var(--base3);
  position: relative;
  cursor: help;
  transition: background 0.2s;
}

.pill-label {
  color: var(--text2);
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.pill-badge {
  padding: 6px 12px;
  border-radius: 5px;
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  min-width: 80px;
  text-align: center;
}

.pill-badge {
  box-shadow: 0 6px 18px rgba(10,20,30,0.04);
}

.pill-badge.outlook-positive {
  background: var(--positive);
  color: var(--base1);
}

.pill-badge.outlook-neutral {
  background: var(--accent1);
  color: var(--base1);
}

.pill-badge.outlook-negative {
  background: var(--negative);
  color: var(--base1);
}

/* Compact Breadth Section */
.breadth-compact {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  position: relative;
}

.breadth-compact .breadth-item {
  background: linear-gradient(180deg, rgba(0,0,0,0.01), transparent);
  padding: 12px;
  border-radius: 10px;
  position: relative;
  cursor: help;
  transition: background 0.2s;
}

.breadth-compact .breadth-item:hover {
  background: linear-gradient(180deg, rgba(0,0,0,0.03), rgba(0,0,0,0.01));
}

.breadth-item h3 {
  margin-bottom: 10px;
  font-size: 1rem;
  color: var(--accent1);
  font-weight: 600;
}

.meter-compact-values {
  display: flex;
  gap: 12px;
  justify-content: center;
  font-size: 0.85rem;
  margin-top: 6px;
}

/* Breadth Tooltip */
.breadth-tooltip {
  position: absolute;
  top: 100%;
  left: -10%;
  transform: translateX(-50%);
  margin-top: 8px;
  background: var(--base1);
  border: 2px solid var(--accent1);
  border-radius: 8px;
  padding: 14px 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 280px;
  max-width: 320px;
  animation: fadeInTooltip 0.2s ease;
  pointer-events: none;
}

@keyframes fadeInTooltip {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.breadth-tooltip strong {
  display: block;
  color: var(--accent1);
  font-size: 1rem;
  margin-bottom: 8px;
  font-weight: 700;
}

.breadth-tooltip p {
  color: var(--text1);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 10px 0;
}

.breadth-tooltip ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.breadth-tooltip li {
  color: var(--text1);
  font-size: 0.85rem;
  line-height: 1.6;
  margin-bottom: 6px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.breadth-tooltip li:last-child {
  margin-bottom: 0;
}

.breadth-tooltip li span {
  font-size: 1.2rem;
  line-height: 1;
  flex-shrink: 0;
}

.breadth-tooltip li .positive {
  color: var(--positive);
}

.breadth-tooltip li .negative {
  color: var(--negative);
}

.breadth-tooltip li .neutral {
  color: var(--text2);
}

/* Outlook Tooltip */
.outlook-tooltip {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 8px;
  background: var(--base1);
  border: 2px solid var(--accent1);
  border-radius: 8px;
  padding: 14px 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 260px;
  max-width: 300px;
  animation: fadeInTooltip 0.2s ease;
  pointer-events: none;
}

.outlook-tooltip strong {
  display: block;
  color: var(--accent1);
  font-size: 1rem;
  margin-bottom: 8px;
  font-weight: 700;
}

.outlook-tooltip p {
  color: var(--text1);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 10px 0;
}

.tooltip-metric {
  background: var(--base3);
  padding: 8px 10px;
  border-radius: 6px;
  border-left: 3px solid var(--accent1);
}

.tooltip-metric .metric-label {
  color: var(--text1);
  font-size: 0.85rem;
  font-weight: 600;
}

/* Market News Section */
.dashboard-row-news {
  display: flex;
  gap: 5px;
  margin-bottom: 5px;
  width: 100%;
  overflow-x: hidden;
}

.market-news-section {
  width: 100%;
  overflow-x: hidden;
}

.market-news-section h2 {
  margin-bottom: 20px;
}

.news-ticker-container {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  overflow-x: hidden;
  width: 100%;
}

.nav-arrow {
  background: var(--base3);
  border: 1.5px solid var(--base3);
  color: var(--text1);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;
  flex-shrink: 0;
  z-index: 10;
}

.nav-arrow:hover {
  background: var(--accent1);
  color: var(--base1);
  transform: scale(1.1);
}

.nav-arrow:active {
  transform: scale(0.95);
}

.news-carousel {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-behavior: smooth;
  flex: 1;
  padding: 8px 0;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.news-carousel::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.news-article {
  min-width: 320px;
  max-width: 320px;
  flex-shrink: 0;
  background: var(--base4);
  border-radius: 8px;
  padding: 14px;
  border: 1.5px solid var(--base3);
  text-decoration: none;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.news-article:hover {
  transform: translateY(-2px);
  border-color: var(--accent1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.article-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.article-source {
  color: var(--accent2);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.article-date {
  color: var(--text2);
  font-style: italic;
}

.article-title {
  color: var(--text1);
  font-weight: 600;
  font-size: 0.95rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-description {
  color: var(--text2);
  font-size: 0.85rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-tickers {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.ticker-badge {
  background: var(--accent1);
  color: var(--base1);
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.3px;
}

/* Valuation Section */
.dashboard-row-valuation {
  display: flex;
  gap: 5px;
  margin-bottom: 5px;
}

.valuation-section {
  width: 100%;
}

.valuation-section h2 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
  color: var(--text1);
}

.archie-text {
  color: var(--accent1);
  font-size: inherit;
}

.archie-full {
  color: var(--text1);
  font-size: inherit;
}

.valuation-subtitle {
  font-size: 0.85rem;
  color: var(--text1);
  font-weight: 700;
  margin-left: auto;
  background: var(--base2);
  padding: 4px 10px;
  border-radius: 5px;
  border: 1px solid var(--base3);
  letter-spacing: 0.2px;
}

.valuation-content {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.valuation-column {
  flex: 1;
  min-width: 0;
}

.valuation-column h3 {
  margin-bottom: 8px;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text1);
}

.badge-undervalued,
.badge-overvalued {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.badge-undervalued {
  background: var(--positive);
  color: var(--base1);
}

.badge-overvalued {
  background: var(--negative);
  color: var(--base1);
}

.valuation-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.valuation-item {
  background: var(--base4);
  padding: 10px;
  border-radius: 8px;
  border: 1.5px solid var(--base3);
}

.stock-header {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  gap: 8px;
}

.ranking-number {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text1);
  background: var(--base2);
  padding: 2px 6px;
  border-radius: 5px;
  margin-right: 8px;
  min-width: 24px;
  text-align: center;
}

.stock-symbol {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text1);
  letter-spacing: 0.5px;
  flex: 1;
}

.upside-badge,
.downside-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
}

.upside-badge {
  background: var(--positive);
  color: var(--base1);
}

.downside-badge {
  background: var(--negative);
  color: var(--base1);
}

.stock-prices {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.price-label {
  color: var(--text1);
  font-weight: 600;
}

.price-value {
  color: var(--text1);
  font-weight: 700;
}

.price-value.intrinsic {
  color: var(--text1);
  font-weight: 700;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 24px;
  color: var(--text2);
  font-style: italic;
}

.valuation-disclaimer {
  background: var(--base4);
  border-left: 4px solid var(--accent1);
  padding: 8px 12px;
  border-radius: 6px;
  color: var(--text1);
  font-size: 0.85rem;
  line-height: 1.5;
}

.valuation-disclaimer strong {
  color: var(--text1);
  font-weight: 700;
}

.chart-type-icon {
  width: 20px;
  height: 20px;
  color: var(--accent1);
  animation: sparkle 2s ease-in-out infinite;
}

.beta-badge {
  display: inline-block;
  background: var(--text2);
  color: var(--base1);
  font-size: 0.8rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  vertical-align: middle;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text2);
  font-weight: 700;
}

.card h2 {
  display: flex;
  align-items: center;
  gap: 12px;
}
.card h2::after {
  content: '';
  flex: 1 1 0;
  height: 1px;
  background: rgba(0,0,0,0.03);
  margin-left: 12px;
}

.e-card.archie-card {
  background: transparent;
  position: relative;
  height: 330px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px; /* make archie card match other card radii */
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

.archie-icon {
  width: 13px;
  height: 13px;
  margin-left: 4px;
  margin-bottom: 6px;
  color: var(--accent1);
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

@keyframes sparkle {
  0%, 100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1) rotate(180deg);
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
  background: var(--base2);
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
  .dashboard-row-outlook {
    margin-bottom: 5px !important;
  }
  .dashboard-row-news {
    margin-bottom: 5px !important;
  }
  .outlook-grid {
    flex-direction: column;
    gap: 12px;
  }
  .news-article {
    min-width: 280px;
    max-width: 280px;
  }
  .nav-arrow {
    width: 35px;
    height: 35px;
    font-size: 1rem;
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
  .dashboard-row-valuation {
    flex-direction: column !important;
    margin-bottom: 0;
    gap: 0;
    width: 100vw;
    min-width: 0;
    max-width: 100vw;
  }
  .dashboard-row-outlook {
    flex-direction: column !important;
    margin-bottom: 5px;
    gap: 0;
    width: 100vw;
    min-width: 0;
    max-width: 100vw;
  }
  .dashboard-row-news {
    flex-direction: column !important;
    margin-bottom: 5px;
    gap: 0;
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }
  .dashboard-row > .card:not(:last-child),
  .dashboard-row2 > .card:not(:last-child),
  .dashboard-row-valuation > .card:not(:last-child),
  .dashboard-row-outlook > .card:not(:last-child),
  .dashboard-row-news > .card:not(:last-child) {
    margin-bottom: 5px !important;
  }
  .dashboard-row > .card,
  .dashboard-row2 > .card,
  .dashboard-row-valuation > .card,
  .dashboard-row-outlook > .card,
  .dashboard-row-news > .card {
    min-width: 0 !important;
    max-width: 100vw !important;
    width: 100vw !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    box-sizing: border-box;
  }
  .dashboard-row > .card,
  .dashboard-row2 > .card,
  .dashboard-row-valuation > .card,
  .dashboard-row-outlook > .card,
  .dashboard-row-news > .card {
    min-width: 0 !important;
    max-width: 100vw !important;
    width: 100vw !important;
    margin: 0 !important;
    box-sizing: border-box;
  }
  .valuation-content {
    flex-direction: column;
    gap: 20px;
  }
  .sma-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .asset-type-dropdown {
    width: 100%;
  }
  .valuation-subtitle {
    margin-left: 0;
    font-size: 0.85rem;
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

@media (max-width: 900px) {
  .dashboard-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .dashboard-top-left { min-width: 0; }
  .dashboard-top-right { min-width: 0; justify-content: flex-start; }
  .dashboard-top-center { justify-content: flex-start; }
}

/* Additional responsive styles for market news to prevent overflow */
@media (max-width: 768px) {
  .news-article {
    min-width: 250px;
    max-width: 250px;
  }
  .nav-arrow {
    width: 30px;
    height: 30px;
    font-size: 0.9rem;
  }
  .news-ticker-container {
    gap: 6px;
  }
}

@media (max-width: 480px) {
  .news-article {
    min-width: 200px;
    max-width: 200px;
  }
  .nav-arrow {
    width: 25px;
    height: 25px;
    font-size: 0.8rem;
  }
  .news-ticker-container {
    gap: 4px;
  }
  .article-title {
    font-size: 0.9rem;
  }
  .article-description {
    font-size: 0.8rem;
  }
}

/* Calendar Events Section - Compact */
.dashboard-row-calendar {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.calendar-events-compact {
  padding: 16px;
}

.calendar-events-compact h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.2rem;
  color: var(--text1);
  font-weight: 700;
  margin-bottom: 16px;
}

.section-icon {
  width: 20px;
  height: 20px;
  color: var(--text2);
}

.event-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--text2);
  color: var(--base1);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
  margin-left: 8px;
}

.calendar-loading-compact {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 30px;
  color: var(--text2);
  font-size: 0.9rem;
}

.calendar-error-compact {
  text-align: center;
  padding: 20px;
  color: var(--negative);
  font-size: 0.9rem;
}

.calendar-empty-compact {
  text-align: center;
  padding: 30px;
  color: var(--text2);
  font-size: 0.95rem;
}

.calendar-table-wrapper {
  overflow-x: auto;
  border-radius: 6px;
  border: 1px solid var(--base3);
}

.calendar-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.calendar-table thead {
  background: var(--base3);
  border-bottom: 2px solid color-mix(in srgb, var(--text2) 20%, transparent);
}

.calendar-table th {
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
  color: var(--text2);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.calendar-table tbody tr {
  border-bottom: 1px solid var(--base3);
  transition: background 0.2s ease;
}

.calendar-table tbody tr:hover {
  background: color-mix(in srgb, var(--base3) 40%, transparent);
}

.calendar-table td {
  padding: 10px 12px;
  color: var(--text1);
}

.symbol-cell {
  font-weight: 700;
  font-size: 0.9rem;
  letter-spacing: 0.3px;
}

.event-type-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.event-type-badge.type-earnings {
  background: color-mix(in srgb, var(--accent1) 20%, transparent);
  color: var(--accent1);
  border: 1px solid color-mix(in srgb, var(--accent1) 40%, transparent);
}

.event-type-badge.type-dividend {
  background: color-mix(in srgb, var(--accent3) 20%, transparent);
  color: var(--accent3);
  border: 1px solid color-mix(in srgb, var(--accent3) 40%, transparent);
}

.event-type-badge.type-split {
  background: color-mix(in srgb, var(--ma3) 20%, transparent);
  color: var(--ma3);
  border: 1px solid color-mix(in srgb, var(--ma3) 40%, transparent);
}

.calendar-pagination-compact {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--base3);
}

.pagination-btn-compact {
  background: var(--base3);
  color: var(--text1);
  border: 1px solid color-mix(in srgb, var(--text2) 15%, transparent);
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination-btn-compact:hover:not(:disabled) {
  background: var(--base2);
  border-color: color-mix(in srgb, var(--text2) 30%, transparent);
}

.pagination-btn-compact:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.pagination-info-compact {
  color: var(--text2);
  font-size: 0.85rem;
  font-weight: 600;
}

.page-detail {
  color: var(--text2);
  opacity: 0.7;
  font-size: 0.8rem;
}

@media (max-width: 1024px) {
  .calendar-table {
    font-size: 0.8rem;
  }
  
  .calendar-table th,
  .calendar-table td {
    padding: 8px 10px;
  }
}

@media (max-width: 768px) {
  .calendar-table-wrapper {
    overflow-x: scroll;
  }
  
  .calendar-table {
    min-width: 600px;
  }
}

</style>