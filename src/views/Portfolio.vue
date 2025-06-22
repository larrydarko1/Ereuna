<template>
  <Header/>
  <section class="portfolio-container">
    <div class="portfolio-header">
      <h1>Simulated Portfolio</h1>
      <button class="trade-btn" @click="showTradeModal = true">New Trade</button>
<TradePopup
  v-if="showTradeModal"
  :user="user"
  :api-key="apiKey"
  @close="showTradeModal = false"
  @refresh-history="handleRefreshHistory"
/>
<SellTradePopup
  v-if="showSellModal"
  :symbol="sellPosition.symbol"
  :maxShares="sellPosition.shares"
  :price="sellPosition.price"
  @close="showSellModal = false"
  @sell="handleSell"
/>
    </div>
    <div class="portfolio-summary">
      <div class="summary-card">
        <div class="summary-title">Total Value</div>
        <div class="summary-value">$100,000</div>
      </div>
      <div class="summary-card">
        <div class="summary-title">Daily P/L (%)</div>
        <div class="summary-value positive">+2.5%</div>
      </div>
       <div class="summary-card">
        <div class="summary-title">Daily P/L</div>
        <div class="summary-value negative">-$120</div>
        </div>
      <div class="summary-card">
        <div class="summary-title">Total P/L</div>
        <div class="summary-value positive">+$2,500</div>
        </div>
        <div class="summary-card">
        <div class="summary-title">Total P/L (%)</div>
        <div class="summary-value positive">+25.72%</div>
        </div>
    </div>
  <div class="portfolio-linechart-container">
  <div class="linechart-fixed-height">
    <Line :data="lineData" :options="lineOptions" :height="200" />
  </div>
</div>
    <div class="portfolio-main-flex">
      <div class="portfolio-pie-container">
        <Pie :data="pieChartData" :options="pieOptions" />
      </div>
      <div class="portfolio-table-container">
        <table class="portfolio-table">
          <thead>
  <tr>
    <th>% of Portfolio</th>
    <th>Symbol</th>
    <th>Shares</th>
    <th>Avg. Price</th>
    <th>Current Price</th>
    <th>Total Value</th>
    <th>PnL (%)</th>
    <th>Actions</th>
  </tr>
</thead>
<tbody>
  <tr v-for="position in portfolio" :key="position.Symbol">
     <td>
      <span v-if="latestQuotes[position.Symbol] !== undefined">
        {{ getPercOfPortfolio(position) }}%
      </span>
    </td>
    <td>{{ position.Symbol }}</td>
    <td>{{ position.Shares }}</td>
    <td>${{ Number(position.AvgPrice).toFixed(2) }}</td>
    <td>
      <span v-if="latestQuotes[position.Symbol] !== undefined">
        ${{ getCurrentPrice(position) }}
      </span>
    </td>
    <td>
      <span v-if="latestQuotes[position.Symbol] !== undefined">
        ${{ getTotalValue(position) }}
      </span>
    </td>
    <td :class="getPnLClass(position)">
      <span v-if="latestQuotes[position.Symbol] !== undefined">
        {{ getPnLPercent(position) > 0 ? '+' : '' }}{{ getPnLPercent(position) }}%
      </span>
    </td>
    <td>
      <button
        class="action-btn"
        @click="openSellModal({ symbol: position.Symbol, shares: position.Shares, price: position.AvgPrice })"
      >
        Sell
      </button>
    </td>
  </tr>
</tbody>
        </table>
      </div>
    </div>
    <div class="portfolio-history-container">
      <h2>Transaction History</h2>
      <table class="portfolio-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Symbol</th>
            <th>Action</th>
            <th>Shares</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
<tbody>
  <tr v-if="sortedTransactionHistory.length === 0">
    <td colspan="6" style="text-align:center; color: var(--text2);">
      No transaction history
    </td>
  </tr>
  <tr v-for="(tx, i) in sortedTransactionHistory" :key="i">
    <td>{{ tx.Date ? tx.Date.slice(0, 10) : '' }}</td>
    <td>{{ tx.Symbol }}</td>
    <td>{{ tx.Action }}</td>
    <td>{{ tx.Shares }}</td>
    <td>${{ Number(tx.Price).toFixed(2) }}</td>
    <td>${{ Number(tx.Total).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) }}</td>
  </tr>
</tbody>
      </table>
    </div>
  </section>
  <br>
  <br>
  <Footer/>
</template>

<script setup>
import Header from '@/components/Header.vue';
import Footer from '@/components/Footer.vue';
import { ref, computed, watch } from 'vue'
import TradePopup from '@/components/trade.vue'
import SellTradePopup from '@/components/SellTradePopup.vue'
import { Pie, Line } from 'vue-chartjs'
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale
} from 'chart.js'
import { useStore } from 'vuex';

// access user from store 
const store = useStore();
let user = store.getters.getUser;
const apiKey = import.meta.env.VITE_EREUNA_KEY;

const showTradeModal = ref(false)
const showSellModal = ref(false)
const sellPosition = ref({ symbol: '', shares: 0, price: 0 })

function openSellModal(position) {
  sellPosition.value = { ...position }
  showSellModal.value = true
}

function handleSell(sellOrder) {
  // Handle sell logic here (update portfolio, add to history, etc)
  showSellModal.value = false
}

Chart.register(ArcElement, Tooltip, Legend, LineElement, PointElement, LinearScale, CategoryScale)

// Helper to get CSS variable
function getVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Get theme colors from CSS variables
const accent1 = getVar('--accent1') || '#8c8dfe';
const accent2 = getVar('--accent2') || '#a9a5ff';
const base3   = getVar('--base3')   || '#8a8a90';
const base1   = getVar('--base1')   || '#181926';
const text2   = getVar('--text2')   || '#cad3f5';

// Pie chart data
const pieChartData = computed(() => {
  // Filter out positions with missing quotes
  const positionsWithQuotes = portfolio.value.filter(
    pos => latestQuotes.value[pos.Symbol] !== undefined
  );

  // Labels: stock symbols
  const labels = positionsWithQuotes.map(pos => pos.Symbol);

  // Data: total value per position
  const data = positionsWithQuotes.map(
    pos => Number(latestQuotes.value[pos.Symbol]) * Number(pos.Shares)
  );

  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: [accent1, accent2, base3, base1, text2], // add more if needed
        borderColor: base1,
        borderWidth: 2
      }
    ]
  };
});


const pieOptions = {
  plugins: {
    legend: {
      labels: {
        color: text2,
        font: { size: 14 }
      }
    }
  }
}

// Line chart data (example)
const lineData = {
  labels: ['2025-06-18', '2025-06-19', '2025-06-20', '2025-06-21', '2025-06-22'],
  datasets: [
    {
      label: 'Portfolio Value',
      data: [95000, 97000, 100000, 99500, 100000],
      borderColor: accent1,
      backgroundColor: accent1 + '20', // 20 = ~12% opacity
      tension: 0.4,
      fill: true,
      pointRadius: 3,
    }
  ]
}

const lineOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true }
  },
  scales: {
    x: { ticks: { color: text2 } },
    y: { ticks: { color: text2 } }
  }
}

const transactionHistory = ref([]); // List of Objects - This will hold the transaction history data for user

async function fetchTransactionHistory() {
  try {
    const headers = {
      'x-api-key': apiKey
    };

    const response = await fetch(`/api/trades?username=${user}`, {
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    transactionHistory.value = data.userDocument?.Trades || []; // Assign the transactions array

  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    console.error('Error fetching transaction history:', error);
  }
}

fetchTransactionHistory()


const sortedTransactionHistory = computed(() => {
  return [...transactionHistory.value].sort((a, b) => {
    // If Date is missing, treat as oldest
    if (!a.Date) return 1;
    if (!b.Date) return -1;
    return new Date(b.Date) - new Date(a.Date);
  });
});

function handleRefreshHistory() {
  showTradeModal.value = false;
  // Add a short delay to ensure backend is updated
  setTimeout(() => {
    fetchTransactionHistory();
    fetchPortfolio();
  }, 300); // 300ms delay, adjust if needed
}

const portfolio = ref([]); // List of Objects - This will hold the portfolio data for user

async function fetchPortfolio() {
  try {
    const headers = {
      'x-api-key': apiKey
    };

    const response = await fetch(`/api/portfolio?username=${user}`, {
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    portfolio.value = data.portfolio || []; // Assign the portfolio array

  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    console.error('Error fetching portfolio:', error);
  }
}

fetchPortfolio();

const latestQuotes = ref({}); // { [symbol]: price }

async function fetchQuotes() {
  if (!portfolio.value.length) return;
  const symbols = portfolio.value.map(p => p.Symbol).join(',');
  const headers = { 'x-api-key': apiKey };

  try {
    const response = await fetch(`/api/quotes?symbols=${symbols}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch quotes');
    const data = await response.json();
    latestQuotes.value = data; // { AAPL: 185, TSLA: 690, ... }
  } catch (error) {
    console.error('Error fetching quotes:', error);
  }
}

// Refetch quotes whenever portfolio changes
watch(portfolio, (newVal) => {
  if (newVal.length) fetchQuotes();
});

function getMarketPrice(position) {
  const close = latestQuotes.value[position.Symbol];
  if (close === undefined || close === null) return '';
  return (close * position.Shares).toFixed(2);
}

function getPnLPercent(position) {
  const close = latestQuotes.value[position.Symbol];
  if (close === undefined || close === null) return '';
  if (!position.AvgPrice) return '';
  const pnlPerc = ((close - position.AvgPrice) / position.AvgPrice) * 100;
  return pnlPerc.toFixed(2);
}

function getPnLClass(position) {
  const close = latestQuotes.value[position.Symbol];
  if (close === undefined || close === null) return '';
  return close - position.AvgPrice >= 0 ? 'positive' : 'negative';
}

function getCurrentPrice(position) {
  const close = latestQuotes.value[position.Symbol];
  if (close === undefined || close === null) return '';
  return close.toFixed(2);
}

function getTotalValue(position) {
  const close = latestQuotes.value[position.Symbol];
  if (close === undefined || close === null) return '';
  return (close * position.Shares).toFixed(2);
}

const totalPortfolioValue = computed(() => {
  return portfolio.value.reduce((sum, pos) => {
    const close = latestQuotes.value[pos.Symbol];
    if (close === undefined || close === null) return sum;
    return sum + close * pos.Shares;
  }, 0);
});

function getPercOfPortfolio(position) {
  const total = totalPortfolioValue.value;
  const close = latestQuotes.value[position.Symbol];
  if (!total || close === undefined || close === null) return '';
  const perc = ((close * position.Shares) / total) * 100;
  return perc.toFixed(2);
}

</script>

<style lang="scss" scoped>
.portfolio-container {
  background: var(--base4);
  color: var(--text1);
  padding: 32px 24px;
  min-height: 80vh;
}

.portfolio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--accent1);
    margin: 0;
  }
}

.trade-btn {
  background: var(--accent1);
  color: var(--text1);
  border: none;
  border-radius: 6px;
  padding: 10px 24px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: var(--accent2);
  }
}

.portfolio-summary {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}

.summary-card {
  background: var(--base2);
  border-radius: 10px;
  padding: 24px 32px;
  min-width: 100px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  .summary-title {
    color: var(--text2);
    font-size: 1rem;
    margin-bottom: 8px;
  }
  .summary-value {
    font-size: 1.5rem;
    font-weight: 700;
    &.positive { color: var(--positive); }
    &.negative { color: var(--negative); }
  }
}

/* FLEX LAYOUT FOR PIE + TABLE */
.portfolio-main-flex {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  margin-bottom: 32px;
  flex-wrap: wrap;
}

.portfolio-pie-container {
  background: var(--base2);
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.08);
  max-width: 400px;
  flex: 1 1 300px;
}

.portfolio-table-container {
  background: var(--base2);
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.08);
  overflow-x: auto;
  flex: 2 1 400px;
}

.portfolio-history-container {
  background: var(--base2);
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.08);
  margin-top: 32px;
  h2 {
    color: var(--accent1);
    margin-bottom: 16px;
    font-size: 1.2rem;
    font-weight: 600;
  }
}

.portfolio-table {
  width: 100%;
  border-collapse: collapse;
  color: var(--text1);

  th, td {
    padding: 12px 16px;
    text-align: left;
  }
  th {
    color: var(--accent1);
    font-weight: 600;
    border-bottom: 2px solid var(--base3);
  }
  td {
    border-bottom: 1px solid var(--base3);
  }
  .positive { color: var(--positive); }
  .negative { color: var(--negative); }
}

.action-btn {
  background: var(--accent4);
  color: var(--accent1);
  border: none;
  border-radius: 4px;
  padding: 6px 16px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: var(--accent2);
    color: var(--text1);
  }
}

.portfolio-linechart-container {
  background: var(--base2);
  border-radius: 10px;
  padding: 24px;
  margin-bottom: 32px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.08);
}

.linechart-fixed-height {
  height: 200px; // adjust as needed for 1/3 the original height
  canvas {
    height: 100% !important;
    max-height: 200px !important;
  }
}

</style>