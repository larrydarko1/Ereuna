<template>
  <Header />
  <Assistant />
  <section class="portfolio-container">
    <div class="portfolio-header">
      <div>
         <h1>Simulated Portfolio</h1>
      <div class="portfolio-selector">
  <button
    v-for="n in 10"
    :key="n"
    :class="['portfolio-btn', selectedPortfolioIndex === n - 1 ? 'selected' : '']"
    @click="selectPortfolio(n - 1)"
  >
    {{ n }}
  </button>
</div>
      </div>
      <div>
        <button class="trade-btn" @click="showTradeModal = true">New Trade</button>
        <button class="trade-btn" style="margin-left: 12px;" @click="showAddCashModal = true">Add Cash</button>
        <button class="trade-btn2" style="margin-left: 12px;" @click="showResetDialog = true">Reset All</button>
        <button class="trade-btn" style="margin-left: 12px;" @click="showLossesInfo = true">Archetypes</button>
       <button class="trade-btn" style="margin-left: 12px;" :disabled="!(portfolio.length === 0 && transactionHistory.length === 0 && cash === 0)" @click="showImportPopup = true">Import</button>
        <button class="trade-btn" style="margin-left: 12px;" @click="exportPortfolioData">Export</button>
      </div>
       <div v-if="showResetDialog" class="reset-modal-overlay">
      <div class="reset-modal">
        <h3>Reset Portfolio</h3>
        <p>Are you sure you want to reset your entire portfolio? This cannot be undone.</p>
        <div style="margin-top: 16px;">
          <button class="trade-btn" @click="confirmResetPortfolio">Yes, Reset</button>
          <button class="trade-btn" style="margin-left: 12px; background: var(--base3); color: #fff;" @click="showResetDialog = false">Cancel</button>
        </div>
        <div v-if="resetError" style="color: var(--negative); margin-top: 12px;">{{ resetError }}</div>
      </div>
    </div>
      <TradePopup
  v-if="showTradeModal"
  :user="user"
  :api-key="apiKey"
  :portfolio="selectedPortfolioIndex"
  @close="showTradeModal = false"
  @refresh-history="{ fetchCash(); fetchPortfolio(); fetchTransactionHistory(); showTradeModal = false }"
  :cash="cash"
/>
      <SellTradePopup
  v-if="showSellModal"
  :symbol="sellPosition.symbol"
  :maxShares="sellPosition.shares"
  :price="sellPosition.price"
  :currentPrice="latestQuotes[sellPosition.symbol]"
  @close="showSellModal = false"
  @sell="handleSell"
  :user="user"
  :api-key="apiKey"
  :portfolio="selectedPortfolioIndex"
/>
<AddCashPopup
  v-if="showAddCashModal"
  :user="user"
  :api-key="apiKey"
  :portfolio="selectedPortfolioIndex"
  @close="showAddCashModal = false"
  @cash-added="() => { fetchCash(); fetchPortfolio(); fetchTransactionHistory(); showAddCashModal = false }"
/>
<Archetypes v-if="showLossesInfo" @close="showLossesInfo = false" />
<ImportPortfolioPopup
          v-if="showImportPopup"
          :user="user"
          :api-key="apiKey"
          :portfolio="selectedPortfolioIndex"
          @close="showImportPopup = false"
          @imported="() => { fetchPortfolio(); fetchTransactionHistory(); fetchCash(); }"
        />
    </div>
    <div class="portfolio-summary">
      <div class="summary-card">
  <div class="summary-title">Total Value</div>
  <div class="summary-value">
    ${{ totalPortfolioValue2.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) }}
  </div>
</div>
  <div class="summary-card">
  <div class="summary-title">Portfolio Value</div>
  <div class="summary-value">
    ${{ totalPortfolioValue.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) }}
  </div>
</div>
      <div class="summary-card">
  <div class="summary-title">Cash</div>
  <div class="summary-value">
    ${{ cash.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) }}
  </div>
</div>
      <div class="summary-card">
        <div class="summary-title">Total P/L</div>
        <div class="summary-value" :class="totalPL >= 0 ? 'positive' : 'negative'">
          {{ totalPL >= 0 ? '+' : '' }}${{ totalPL.toLocaleString(undefined, {
            minimumFractionDigits:
              2, maximumFractionDigits: 2
          }) }}
        </div>
      </div>
      <div class="summary-card">
  <div class="summary-title">Total P/L (%)</div>
  <div class="summary-value" :class="totalPL > 0 ? 'positive' : totalPL < 0 ? 'negative' : ''">
    <template v-if="totalPLPercent !== '' && Number(totalPLPercent) !== 0">
      {{ totalPL > 0 ? '+' : '' }}{{ totalPLPercent }}%
    </template>
    <template v-else>
      -
    </template>
  </div>
</div>
      <div class="summary-card">
        <div class="summary-title">Unrealized P/L</div>
        <div class="summary-value" :class="unrealizedPL >= 0 ? 'positive' : 'negative'">
          {{ unrealizedPL >= 0 ? '+' : '' }}${{ unrealizedPL.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }) }}
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-title">Unrealized P/L (%)</div>
        <div class="summary-value" :class="unrealizedPL > 0 ? 'positive' : unrealizedPL < 0 ? 'negative' : ''">
  <template v-if="unrealizedPLPercent !== '' && Number(unrealizedPLPercent) !== 0">
    {{ unrealizedPL >= 0 ? '+' : '' }}{{ unrealizedPLPercent }}%
  </template>
  <template v-else>
    -
  </template>
</div>
      </div>
      <div class="summary-card">
        <div class="summary-title">Realized P/L</div>
        <div class="summary-value" :class="realizedPL >= 0 ? 'positive' : 'negative'">
          {{ realizedPL >= 0 ? '+' : '' }}${{ realizedPL.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }) }}
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-title">Realized P/L (%)</div>
        <div class="summary-value" :class="realizedPL >= 0 ? 'positive' : 'negative'">
          {{ realizedPL >= 0 ? '+' : '' }}{{ realizedPLPercent }}%
        </div>
      </div>
      <!-- Advanced Portfolio Stats -->
  <div class="summary-card">
  <div class="summary-title">Avg. Position Size</div>
  <div class="summary-value">{{ avgPositionSize }}%</div>
</div>
  <div class="summary-card">
    <div class="summary-title">Avg. Hold Time (Winners)</div>
    <div class="summary-value">{{ avgHoldTimeWinners }} days</div>
  </div>
  <div class="summary-card">
    <div class="summary-title">Avg. Hold Time (Losers)</div>
    <div class="summary-value">{{ avgHoldTimeLosers }} days</div>
  </div>
  <div class="summary-card">
    <div class="summary-title">Avg. Gain %</div>
    <div class="summary-value positive">+{{ avgGain }}%</div>
  </div>
  <div class="summary-card">
    <div class="summary-title">Avg. Loss %</div>
    <div class="summary-value negative">{{ avgLoss }}%</div>
  </div>
  <div class="summary-card">
  <div class="summary-title">Avg. Gain</div>
  <div class="summary-value positive">
    +${{ avgGainAbs }}
  </div>
</div>
<div class="summary-card">
  <div class="summary-title">Avg. Loss</div>
  <div class="summary-value negative">
    -${{ avgLossAbs }}
  </div>
</div>
<div class="summary-card">
  <div class="summary-title">Gain/Loss Ratio</div>
  <div class="summary-value">{{ gainLossRatio }}</div>
</div>
<div class="summary-card">
  <div class="summary-title">Risk/Reward Ratio</div>
  <div class="summary-value">{{ riskRewardRatio }}</div>
</div>
<div class="summary-card">
  <div class="summary-title">Winning Trades</div>
  <div class="summary-value positive">
    {{ winnerCount }} ({{ winnerPercent }}%)
  </div>
</div>
<div class="summary-card">
  <div class="summary-title">Losing Trades</div>
  <div class="summary-value negative">
    {{ loserCount }} ({{ loserPercent }}%)
  </div>
</div>
<div class="summary-card">
  <div class="summary-title">Breakeven Trades</div>
  <div class="summary-value">
    {{ breakevenCount }} ({{ breakevenPercent }}%)
  </div>
</div>
<div class="summary-card">
  <div class="summary-title">Profit Factor</div>
  <div class="summary-value">{{ profitFactor }}</div>
</div>
<div class="summary-card">
  <div class="summary-title">Sortino Ratio</div>
  <div class="summary-value">{{ sortinoRatio }}</div>
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
  <tr v-if="portfolio.length === 0 && cash === 0">
    <td colspan="8" style="text-align:center; color: var(--text2);">
      No Active Positions
    </td>
  </tr>
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
      <button class="action-btn"
        @click="openSellModal({ symbol: position.Symbol, shares: position.Shares, price: position.AvgPrice })">
        Sell
      </button>
    </td>
  </tr>
  <!-- Add cash as a row -->
  <tr class="cash-row">
    <td>{{ getPercOfCash() }}%</td>
    <td>Cash</td>
    <td>-</td>
    <td>-</td>
    <td>-</td>
    <td>${{ cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
    <td>-</td>
    <td></td>
  </tr>
</tbody>
        </table>
      </div>
    </div>
 <div class="portfolio-bar-chart-container" style="margin-bottom: 32px; background: var(--base2); border-radius: 10px; padding: 24px; box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);">
  <h3 style="color: var(--accent1); margin-bottom: 12px;">Trade Returns (%)</h3>
  <Bar :data="tradeReturnsChartData" :options="tradeReturnsChartOptions" :height="70" />
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
            <th>Commissions</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody >
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
            <td>
  {{ isNaN(Number(tx.Price)) ? '-' : '$' + Number(tx.Price).toFixed(2) }}
</td>
<td>
  {{ isNaN(Number(tx.Commission)) ? '-' : '$' + Number(tx.Commission).toFixed(2) }}
</td>
            <td>${{ Number(tx.Total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
  <br>
  <br>
</template>

<script setup>
import Header from '@/components/Header.vue';
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import TradePopup from '@/components/Portfolio/trade.vue'
import SellTradePopup from '@/components/Portfolio/SellTradePopup.vue'
import AddCashPopup from '@/components/Portfolio/addCash.vue'
import Archetypes from '@/components/Portfolio/archetypes.vue'
import { Pie, Line, Bar } from 'vue-chartjs'
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  BarElement 
} from 'chart.js'
import { useStore } from 'vuex';
import annotationPlugin from 'chartjs-plugin-annotation';
import Assistant from '@/components/assistant.vue';
import ImportPortfolioPopup from '@/components/Portfolio/ImportPortfolioPopup.vue';

// access user from store 
const store = useStore();
let user = store.getters.getUser;
const apiKey = import.meta.env.VITE_EREUNA_KEY;
let Tier = ref(); // user tier

// function to retrieve the tier for each user
async function fetchTier() {
  try {
    const headers = {
      'x-api-key': apiKey
    };

    const response = await fetch(`/api/tier?username=${user}`, {
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const newTier = await response.json();
    Tier.value = newTier.Tier;

  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    console.error('Error fetching tier:', error);
  }
}
fetchTier()

const showTradeModal = ref(false)
const showSellModal = ref(false)
const sellPosition = ref({ symbol: '', shares: 0, price: 0 })
const showAddCashModal = ref(false)
const showLossesInfo = ref(false)
const showImportPopup = ref(false)

function openSellModal(position) {
  sellPosition.value = { ...position }
  showSellModal.value = true
}

function handleSell(sellOrder) {
  showSellModal.value = false;
  // Add a short delay to ensure backend is updated
  setTimeout(() => {
    fetchTransactionHistory();
    fetchPortfolio();
    fetchCash();
  }, 300); // 300ms delay, adjust if needed
}

Chart.register(
  ArcElement,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  BarElement,
  annotationPlugin
)

// Helper to get CSS variable
function getVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Get theme colors from CSS variables
const accent1 = getVar('--accent1') || '#8c8dfe';
const accent2 = getVar('--accent2') || '#a9a5ff';
const accent3 = getVar('--accent3') || '#cfcbff';
const accent4 = getVar('--accent4') || '#a9a5ff53';
const base3 = getVar('--base3') || '#8a8a90';
const base1 = getVar('--base1') || '#1e1e2f';
const text1 = getVar('--text1') || '#ffffff';
const text2 = getVar('--text2') || '#cad3f5';
const volume = getVar('--volume') || '#4d4d4d';
const ma4 = getVar('--ma4') || '#4caf50';
const ma3 = getVar('--ma3') || '#ffeb3b';
const ma2 = getVar('--ma2') || '#2862ff';
const ma1 = getVar('--ma1') || '#00bcd4';

const themeColors = [
  accent1,
  accent2,
  accent3,
  accent4,
  text1,
  text2,
  volume,
  ma4,
  ma3,
  ma2,
  ma1
];

// Pie chart data
const pieChartData = computed(() => {
  // Filter out positions with missing quotes
  const positionsWithQuotes = portfolio.value.filter(
    pos => latestQuotes.value[pos.Symbol] !== undefined
  );

  // Add cash as a "position"
  const labels = [
    ...positionsWithQuotes.map(pos => pos.Symbol),
    'CASH'
  ];

  const data = [
    ...positionsWithQuotes.map(
      pos => Number(latestQuotes.value[pos.Symbol]) * Number(pos.Shares)
    ),
    cash.value // Add cash as a slice
  ];

  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: themeColors, // add more if needed
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

// --- Total Value Over Time (Line Chart) ---
const portfolioValueHistory = computed(() => {
  const txs = [...transactionHistory.value].sort((a, b) => new Date(a.Date) - new Date(b.Date));
  let holdings = {};
  let cash = 0;
  let history = [];
  let lastDate = null;

  for (const tx of txs) {
    if (!tx.Date) continue;
    // Update holdings and cash
    if (tx.Action === 'Buy') {
      holdings[tx.Symbol] = (holdings[tx.Symbol] || 0) + tx.Shares;
      cash -= tx.Total;
    } else if (tx.Action === 'Sell') {
      holdings[tx.Symbol] = (holdings[tx.Symbol] || 0) - tx.Shares;
      cash += tx.Total;
    } else if (tx.Action === 'Cash Deposit') {
      cash += tx.Total;
    }
    // Calculate total value for this date (positions + cash)
    let positionsValue = 0;
    for (const [symbol, shares] of Object.entries(holdings)) {
      if (shares === 0) continue;
      // Use the last tx price for this symbol up to this date
      let price = 0;
      for (let i = txs.length - 1; i >= 0; i--) {
        if (txs[i].Symbol === symbol && new Date(txs[i].Date) <= new Date(tx.Date)) {
          price = txs[i].Price;
          break;
        }
      }
      positionsValue += shares * price;
    }
    const totalValue = positionsValue + cash;
    if (lastDate !== tx.Date) {
      history.push({ date: tx.Date.slice(0, 10), value: Math.max(0, totalValue) });
      lastDate = tx.Date;
    } else {
      history[history.length - 1] = { date: tx.Date.slice(0, 10), value: Math.max(0, totalValue) };
    }
  }
  return history;
});

const lineData = computed(() => {
  const history = portfolioValueHistory.value;
  return {
    labels: history.map(h => h.date),
    datasets: [
      {
        label: 'Total Value (Positions + Cash)',
        data: history.map(h => h.value),
        borderColor: accent1,
        backgroundColor: 'rgba(140, 141, 254, 0.7)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
      }
    ]
  };
});

const lineOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true }
  },
  scales: {
    x: {
      ticks: {
        color: text2,
        display: false 
      },
      title: { display: false }
    },
    y: {
      ticks: { color: text2 }
    }
  }
}

const transactionHistory = ref([]); // List of Objects - This will hold the transaction history data for user

async function fetchTransactionHistory() {
  try {
    const headers = {
      'x-api-key': apiKey
    };

    const response = await fetch(
      `/api/trades?username=${user}&portfolio=${selectedPortfolioIndex.value}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    transactionHistory.value = data.trades || []; // Assign the trades array from the new backend

  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    console.error('Error fetching transaction history:', error);
  }
}

const sortedTransactionHistory = computed(() => {
  return [...transactionHistory.value].sort((a, b) => {
    // If Date is missing, treat as oldest
    if (!a.Date) return 1;
    if (!b.Date) return -1;
    return new Date(b.Date) - new Date(a.Date);
  });
});

const portfolio = ref([]); // List of Objects - This will hold the portfolio data for user

async function fetchPortfolio() {
  try {
    const headers = {
      'x-api-key': apiKey
    };

    const response = await fetch(
      `/api/portfolio?username=${user}&portfolio=${selectedPortfolioIndex.value}`,
      { headers }
    );

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

const latestQuotes = ref({}); // { [symbol]: price }
const wsRef = ref(null);

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

function connectWebSocket() {
  if (wsRef.value) wsRef.value.close();
  if (!portfolio.value.length) return;

  const symbols = portfolio.value.map(p => p.Symbol).join(',');
  const ws = new WebSocket(`ws://localhost:8000/ws/symbols?symbols=${symbols}`);
  wsRef.value = ws;

 ws.onmessage = (event) => {
  // Expecting format: "AAPL: 213.805"
  const text = event.data;
  const [symbol, price] = text.split(':').map(s => s.trim());
  if (symbol && price && !isNaN(price)) {
    // Ensure Vue reactivity
    latestQuotes.value = { ...latestQuotes.value, [symbol]: parseFloat(price) };
  }
};

  ws.onclose = () => {
    wsRef.value = null;
  };
}

function disconnectWebSocket() {
  if (wsRef.value) {
    wsRef.value.close();
    wsRef.value = null;
  }
}

// Watch for changes in Tier or portfolio to switch logic
watch([Tier, portfolio], ([newTier]) => {
  if (newTier === 'Premium') {
    disconnectWebSocket();
    connectWebSocket();
  } else {
    disconnectWebSocket();
    fetchQuotes();
  }
}, { immediate: true, deep: true });

onMounted(() => {
  if (Tier.value === 'Core') {
    fetchQuotes();
    // Optionally, set up polling interval
    // setInterval(fetchQuotes, 10000);
  } else if (Tier.value === 'Premium') {
    connectWebSocket();
  }
});

onUnmounted(() => {
  disconnectWebSocket();
});

// Refetch quotes whenever portfolio changes
watch(portfolio, (newVal) => {
  if (newVal.length) fetchQuotes();
});

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

const totalPortfolioCost = computed(() => {
  return portfolio.value.reduce((sum, pos) => {
    if (!pos.AvgPrice) return sum;
    return sum + pos.AvgPrice * pos.Shares;
  }, 0);
});

// --- Realized, Unrealized, and Total P/L ---
const realizedPL = computed(() => {
  // Track realized P/L for each symbol
  let realized = 0;
  let lots = {};
  for (const tx of sortedTransactionHistory.value.slice()) {
    if (!tx.Symbol || !tx.Action) continue;
    if (tx.Action === 'Buy') {
      lots[tx.Symbol] = lots[tx.Symbol] || [];
      lots[tx.Symbol].push({ shares: tx.Shares, price: tx.Price });
    } else if (tx.Action === 'Sell') {
      let sharesToSell = tx.Shares;
      lots[tx.Symbol] = lots[tx.Symbol] || [];
      while (sharesToSell > 0 && lots[tx.Symbol].length > 0) {
        let lot = lots[tx.Symbol][0];
        let sellShares = Math.min(lot.shares, sharesToSell);
        realized += (tx.Price - lot.price) * sellShares;
        lot.shares -= sellShares;
        sharesToSell -= sellShares;
        if (lot.shares === 0) lots[tx.Symbol].shift();
      }
    }
  }
  return realized;
});

const unrealizedPL = computed(() => {
  // For current holdings, use current price
  let pl = 0;
  for (const pos of portfolio.value) {
    const close = latestQuotes.value[pos.Symbol];
    if (close === undefined || close === null) continue;
    pl += (close - pos.AvgPrice) * pos.Shares;
  }
  return pl;
});

const totalPL = computed(() => realizedPL.value + unrealizedPL.value);

const totalPLPercent = computed(() => {
  const cost = totalPortfolioCost.value;
  if (!cost) return '';
  return ((totalPL.value / cost) * 100).toFixed(2);
});

const unrealizedPLPercent = computed(() => {
  const cost = totalPortfolioCost.value;
  if (!cost) return '';
  return ((unrealizedPL.value / cost) * 100).toFixed(2);
});

const realizedPLPercent = computed(() => {
  // Track realized P/L and cost basis for sold shares only
  let realized = 0;
  let costBasis = 0;
  let lots = {};
  for (const tx of sortedTransactionHistory.value.slice()) {
    if (!tx.Symbol || !tx.Action) continue;
    if (tx.Action === 'Buy') {
      lots[tx.Symbol] = lots[tx.Symbol] || [];
      lots[tx.Symbol].push({ shares: tx.Shares, price: tx.Price });
    } else if (tx.Action === 'Sell') {
      let sharesToSell = tx.Shares;
      lots[tx.Symbol] = lots[tx.Symbol] || [];
      while (sharesToSell > 0 && lots[tx.Symbol].length > 0) {
        let lot = lots[tx.Symbol][0];
        let sellShares = Math.min(lot.shares, sharesToSell);
        realized += (tx.Price - lot.price) * sellShares;
        costBasis += lot.price * sellShares;
        lot.shares -= sellShares;
        sharesToSell -= sellShares;
        if (lot.shares === 0) lots[tx.Symbol].shift();
      }
    }
  }
  if (!costBasis) return '';
  return ((realized / costBasis) * 100).toFixed(2);
});

function getPercOfPortfolio(position) {
  const total = totalPortfolioValue2.value; // includes cash
  const close = latestQuotes.value[position.Symbol];
  if (!total || close === undefined || close === null) return '';
  const perc = ((close * position.Shares) / total) * 100;
  return perc.toFixed(2);
}

const showResetDialog = ref(false)
const resetError = ref('')

async function confirmResetPortfolio() {
  resetError.value = '';
  try {
    const headers = { 'x-api-key': apiKey, 'Content-Type': 'application/json' };
    const response = await fetch(
      `/api/portfolio?username=${user}&portfolio=${selectedPortfolioIndex.value}`,
      {
        method: 'DELETE',
        headers
      }
    );
    if (!response.ok) throw new Error('Failed to reset portfolio');
    fetchTransactionHistory();
    fetchPortfolio();
    fetchCash();
    showResetDialog.value = false;
  } catch (error) {
    resetError.value = 'Error resetting portfolio: ' + error.message;
  }
}

const cash = ref(0); // Holds the user's cash balance

async function fetchCash() {
  try {
    const headers = {
      'x-api-key': apiKey
    };

    const response = await fetch(
      `/api/portfolio/cash?username=${user}&portfolio=${selectedPortfolioIndex.value}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    cash.value = data.cash || 0; // Assign the cash value

  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    console.error('Error fetching cash balance:', error);
  }
}



const totalPortfolioValue2 = computed(() => {
  const positionsValue = portfolio.value.reduce((sum, pos) => {
    const close = latestQuotes.value[pos.Symbol];
    if (close === undefined || close === null) return sum;
    return sum + close * pos.Shares;
  }, 0);
  return positionsValue + cash.value; // Add cash to the total
});

// Average position size as a percentage of total portfolio value (including cash)
const avgPositionSize = computed(() => {
  const buys = sortedTransactionHistory.value.filter(tx => tx.Action === 'Buy' && tx.Total && tx.Date);
  if (!buys.length) return '0.00';

  // For each buy, estimate portfolio value at that time (cash + all positions up to that date)
  let avgPercents = [];
  for (const buy of buys) {
    // Get all transactions up to and including this buy
    const txsUpToBuy = sortedTransactionHistory.value.filter(tx => tx.Date && new Date(tx.Date) <= new Date(buy.Date));
    // Calculate cash and positions up to this buy
    let cash = 0;
    let holdings = {};
    for (const tx of txsUpToBuy) {
      if (tx.Action === 'Buy') {
        holdings[tx.Symbol] = (holdings[tx.Symbol] || 0) + tx.Shares;
        cash -= tx.Total;
      } else if (tx.Action === 'Sell') {
        holdings[tx.Symbol] = (holdings[tx.Symbol] || 0) - tx.Shares;
        cash += tx.Total;
      } else if (tx.Action === 'Cash Deposit') {
        cash += tx.Total;
      }
    }
    // Estimate positions value at buy price
    let positionsValue = 0;
    for (const [symbol, shares] of Object.entries(holdings)) {
      // Use the last buy price up to this date for each symbol
      let price = 0;
      for (let i = txsUpToBuy.length - 1; i >= 0; i--) {
        if (txsUpToBuy[i].Symbol === symbol && txsUpToBuy[i].Action === 'Buy') {
          price = txsUpToBuy[i].Price;
          break;
        }
      }
      positionsValue += shares * price;
    }
    const portfolioValueAtBuy = positionsValue + cash;
    if (portfolioValueAtBuy > 0) {
      avgPercents.push((buy.Total / portfolioValueAtBuy) * 100);
    }
  }
  if (!avgPercents.length) return '0.00';
  return (avgPercents.reduce((a, b) => a + b, 0) / avgPercents.length).toFixed(2);
});

// Helper: Find all round-trips (buy then sell) for stats
function getClosedPositions() {
  // Always sort by date ascending (oldest to newest)
  const txs = [...transactionHistory.value]
    .filter(tx => tx.Date)
    .sort((a, b) => new Date(a.Date) - new Date(b.Date));
  const positions = [];
  const lots = {};

  for (const tx of txs) {
    if (!tx.Symbol || !tx.Action) continue;
    if (tx.Action === 'Buy') {
      lots[tx.Symbol] = lots[tx.Symbol] || [];
      lots[tx.Symbol].push({ shares: tx.Shares, price: tx.Price, date: tx.Date });
    } else if (tx.Action === 'Sell') {
      let sharesToSell = tx.Shares;
      lots[tx.Symbol] = lots[tx.Symbol] || [];
      while (sharesToSell > 0 && lots[tx.Symbol].length > 0) {
        let lot = lots[tx.Symbol][0];
        let sellShares = Math.min(lot.shares, sharesToSell);
        positions.push({
          symbol: tx.Symbol,
          buyDate: lot.date,
          sellDate: tx.Date,
          buyPrice: lot.price,
          sellPrice: tx.Price,
          shares: sellShares,
          pnl: ((tx.Price - lot.price) / lot.price) * 100,
          holdDays: Math.max(0, Math.round((new Date(tx.Date) - new Date(lot.date)) / (1000 * 60 * 60 * 24)))
        });
        lot.shares -= sellShares;
        sharesToSell -= sellShares;
        if (lot.shares === 0) lots[tx.Symbol].shift();
      }
    }
  }
  return positions;
}

// Average hold time for winners (days)
const avgHoldTimeWinners = computed(() => {
  const closed = getClosedPositions().filter(p => p.pnl > 0);
  if (!closed.length) return 0;
  const avg = closed.reduce((sum, p) => sum + p.holdDays, 0) / closed.length;
  return avg.toFixed(1);
});

// Average hold time for losers (days)
const avgHoldTimeLosers = computed(() => {
  const closed = getClosedPositions().filter(p => p.pnl < 0);
  if (!closed.length) return 0;
  const avg = closed.reduce((sum, p) => sum + p.holdDays, 0) / closed.length;
  return avg.toFixed(1);
});

// Average gain (%)
const avgGain = computed(() => {
  const closed = getClosedPositions().filter(p => p.pnl > 0);
  if (!closed.length) return '0.00';
  const avg = closed.reduce((sum, p) => sum + p.pnl, 0) / closed.length;
  return avg.toFixed(2);
});

// Average loss (%)
const avgLoss = computed(() => {
  const closed = getClosedPositions().filter(p => p.pnl < 0);
  if (!closed.length) return '0.00';
  const avg = closed.reduce((sum, p) => sum + p.pnl, 0) / closed.length;
  return avg.toFixed(2);
});

// Gain/Loss Ratio (absolute value of avg gain divided by avg loss)
const gainLossRatio = computed(() => {
  const gain = Number(avgGainAbs.value);
  const loss = Math.abs(Number(avgLossAbs.value));
  if (!gain || !loss) return '-';
  return (gain / loss).toFixed(2);
});

// Risk/Reward Ratio (avg loss divided by avg gain, absolute value)
const riskRewardRatio = computed(() => {
  const gain = Number(avgGain.value);
  const loss = Math.abs(Number(avgLoss.value));
  if (!gain || !loss) return '-';
  return (gain / loss).toFixed(2);
});

const avgGainAbs = computed(() => {
  const closed = getClosedPositions().filter(p => p.pnl > 0);
  if (!closed.length) return '0.00';
  const avg = closed.reduce((sum, p) => sum + ((p.sellPrice - p.buyPrice) * p.shares), 0) / closed.length;
  return avg.toFixed(2);
});

const avgLossAbs = computed(() => {
  const closed = getClosedPositions().filter(p => p.pnl < 0);
  if (!closed.length) return '0.00';
  const avg = closed.reduce((sum, p) => sum + Math.abs((p.sellPrice - p.buyPrice) * p.shares), 0) / closed.length;
  return avg.toFixed(2);
});

const closedPositions = computed(() => getClosedPositions());

const winnerCount = computed(() => closedPositions.value.filter(p => p.pnl > 0).length);
const loserCount = computed(() => closedPositions.value.filter(p => p.pnl < 0).length);
const breakevenCount = computed(() => closedPositions.value.filter(p => Number(p.pnl) === 0).length);
const totalClosed = computed(() => closedPositions.value.length);

const winnerPercent = computed(() => {
  if (!totalClosed.value) return '0.00';
  return ((winnerCount.value / totalClosed.value) * 100).toFixed(2);
});
const loserPercent = computed(() => {
  if (!totalClosed.value) return '0.00';
  return ((loserCount.value / totalClosed.value) * 100).toFixed(2);
});
const breakevenPercent = computed(() => {
  if (!totalClosed.value) return '0.00';
  return ((breakevenCount.value / totalClosed.value) * 100).toFixed(2);
});

function getPercOfCash() {
  const total = totalPortfolioValue2.value; // includes cash
  if (!total) return '0.00';
  return ((cash.value / total) * 100).toFixed(2);
}

const profitFactor = computed(() => {
  const closed = getClosedPositions();
  const grossProfit = closed.filter(p => p.pnl > 0).reduce((sum, p) => sum + ((p.sellPrice - p.buyPrice) * p.shares), 0);
  const grossLoss = closed.filter(p => p.pnl < 0).reduce((sum, p) => sum + Math.abs((p.sellPrice - p.buyPrice) * p.shares), 0);
  if (grossLoss === 0) return grossProfit > 0 ? '∞' : '-';
  return (grossProfit / grossLoss).toFixed(2);
});

const riskFreeRate = ref(0.02); // Set your risk-free rate here (e.g. 0.02 for 2%)

const sortinoRatio = computed(() => {
  const closed = getClosedPositions();
  if (!closed.length) return '-';
  const returns = closed.map(p => p.pnl / 100); // Convert % to decimal
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const downsideReturns = returns.filter(r => r < riskFreeRate.value);
  if (!downsideReturns.length) return '∞';
  const downsideDev = Math.sqrt(
    downsideReturns.reduce((sum, r) => sum + Math.pow(r - riskFreeRate.value, 2), 0) / downsideReturns.length
  );
  if (downsideDev === 0) return '∞';
  return ((avgReturn - riskFreeRate.value) / downsideDev).toFixed(2);
});

const tradeReturnsMedianBinIndex = computed(() => {
  const closed = getClosedPositions();
  if (!closed.length) return -1;

  // Bin setup (must match your chart binning)
  const minReturn = Math.floor(Math.min(...closed.map(p => p.pnl)) / 2) * 2;
  const maxReturn = Math.ceil(Math.max(...closed.map(p => p.pnl)) / 2) * 2;
  const bins = [];
  for (let i = minReturn; i < maxReturn; i += 2) {
    bins.push({ min: i, max: i + 2 });
  }

  // Sort returns and find the median value
  const sorted = closed.map(p => p.pnl).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianValue = sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;

  // Find which bin contains the median value
  return bins.findIndex(b => medianValue >= b.min && medianValue < b.max);
});

const tradeReturnsChartData = computed(() => {
  const closed = getClosedPositions();
  if (!closed.length) return { labels: [], datasets: [] };

  // Find min and max return to determine bins
  const minReturn = Math.floor(Math.min(...closed.map(p => p.pnl)) / 2) * 2;
  const maxReturn = Math.ceil(Math.max(...closed.map(p => p.pnl)) / 2) * 2;

  // Create bins
  const bins = [];
  for (let i = minReturn; i < maxReturn; i += 2) {
    bins.push({ range: `${i} to ${i + 2}%`, count: 0, positive: i + 2 > 0 });
  }

  // Count trades in each bin
  closed.forEach(p => {
    const binIdx = Math.floor((p.pnl - minReturn) / 2);
    if (bins[binIdx]) bins[binIdx].count += 1;
  });

  return {
    labels: bins.map(b => b.range),
    datasets: [
      {
        label: 'Number of Trades',
        data: bins.map(b => b.count),
        backgroundColor: bins.map(b => b.positive ? 'rgba(76, 175, 80, 0.7)' : 'rgba(244, 67, 54, 0.7)'),
        borderColor: bins.map(b => b.positive ? '#4caf50' : '#f44336'),
        borderWidth: 1,
      }
    ]
  };
});

const tradeReturnsChartOptions = computed(() => {
  // Get the label of the median bin
  const medianBinLabel = tradeReturnsChartData.value.labels[tradeReturnsMedianBinIndex.value];
  return {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
      annotation: {
        annotations: {
          medianLine: medianBinLabel !== undefined ? {
            type: 'line',
            xMin: medianBinLabel,
            xMax: medianBinLabel,
            borderColor: accent1,
            borderWidth: 2,
            // No borderDash for solid line
            label: {
              enabled: true,
              content: 'Median',
              position: 'top',
              color: accent1,
              backgroundColor: 'rgba(30,30,47,0.85)',
              font: { weight: 'bold' }
            }
          } : undefined
        }
      }
    },
    scales: {
      x: { ticks: { color: getVar('--text2') } },
      y: {
        ticks: { color: getVar('--text2') },
        title: { display: true, text: 'Number of Trades', color: getVar('--text2') }
      }
    }
  };
});

// --- Export Portfolio Data ---
function exportPortfolioData() {
  // Helper to convert array of objects to CSV
   function arrayToCSV(arr, headers) {
    const escape = v => {
      let str = String(v ?? '');
      // Prefix dangerous values with a single quote to prevent CSV injection
      if (/^[=+\-@]/.test(str)) str = "'" + str;
      return '"' + str.replace(/"/g, '""') + '"';
    };
    return [
      headers.join(','),
      ...arr.map(row => headers.map(h => escape(row[h] ?? '')).join(','))
    ].join('\n');
  }

  // Portfolio section
  const portfolioHeaders = ['Symbol', 'Shares', 'AvgPrice'];
  const portfolioCSV = arrayToCSV(portfolio.value, portfolioHeaders);

  // Transaction history section
  const txHeaders = ['Date', 'Symbol', 'Action', 'Shares', 'Price', 'Commission', 'Total'];
  const txCSV = arrayToCSV(transactionHistory.value, txHeaders);

  // Cash section
  const cashCSV = `Cash Balance\n${cash.value}`;

  // Combine sections
  const csvContent = [
    'Portfolio',
    portfolioCSV,
    '',
    'Transaction History',
    txCSV,
    '',
    cashCSV
  ].join('\n\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `portfolio_export_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Portfolio Switching Logic ---
const selectedPortfolioIndex = ref(0);

function selectPortfolio(idx) {
  selectedPortfolioIndex.value = idx;
  fetchPortfolio();
  fetchTransactionHistory();
  fetchCash();
}

// On mount, load the first portfolio by default
onMounted(() => {
  selectPortfolio(0);
});


</script>

<style lang="scss" scoped>
.portfolio-container {
  background: linear-gradient(90deg, var(--base4) 0%, var(--base2) 100%);
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

.portfolio-selector {
  display: flex;
  gap: 8px;
  margin-top: 8px;

  .portfolio-btn {
    background: var(--base3);
    color: var(--text1);
    border: none;
    border-radius: 6px;
    padding: 10px 16px;
    min-width: 50px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;

    &.selected {
      background: var(--accent1);
      color: var(--text1);
    }

    &:hover {
      background: var(--accent2);
    }
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

.trade-btn:disabled {
  background: var(--base3);
  color: var(--text2);
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
  border: none;
  transition: background 0.2s, color 0.2s, opacity 0.2s;
}

.trade-btn2 {
  background: var(--negative);
  color: var(--text1);
  border: none;
  border-radius: 6px;
  padding: 10px 24px;
  font-size: 1rem;
  font-weight: 600;
  margin-left: 12px;
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
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);
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

    &.positive {
      color: var(--positive);
    }

    &.negative {
      color: var(--negative);
    }
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
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);
  max-width: 400px;
  flex: 1 1 300px;
}

.portfolio-table-container {
  background: var(--base2);
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);
  overflow-x: auto;
  flex: 2 1 400px;
  max-height: 520px; // 8 rows * ~60px per row + header
  overflow-y: auto;
}

.portfolio-history-container {
  background: var(--base2);
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);
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

  th,
  td {
    padding: 12px 16px;
    text-align: left;
  }

  th {
    color: var(--accent1);
    font-weight: 600;
    border-bottom: 2px solid var(--base3);
    position: sticky;
    top: 0;
    background: var(--base2);
    z-index: 1;
  }

  td {
    border-bottom: 1px solid var(--base3);
  }

  .positive {
    color: var(--positive);
  }

  .negative {
    color: var(--negative);
  }
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
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);
}

.linechart-fixed-height {
  height: 200px; // adjust as needed for 1/3 the original height

  canvas {
    height: 100% !important;
    max-height: 200px !important;
  }
}

.reset-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.reset-modal {
  background: var(--base2);
  padding: 32px 24px;
  border-radius: 10px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.12);
  min-width: 320px;
  text-align: center;
}

.cash-row {
  background: var(--base1);
  color: var(--accent1);
  font-weight: 600;
}
</style>