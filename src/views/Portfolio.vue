<template>
    <Header />
  <Assistant />
  <section class="portfolio-container scrollable-content">
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
        <button class="trade-btn" style="margin-left: 12px;" @click="showBaseValueModal = true">Set Base Value</button>
        <button class="trade-btn2" style="margin-left: 12px;" @click="showResetDialog = true">Reset</button>
       <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px;">
      <button class="trade-btn" :disabled="!(portfolio.length === 0 && transactionHistory.length === 0 && cash === 0)" @click="showImportPopup = true">Import</button>
<button class="trade-btn" :disabled="isPortfolioBlank" @click="showDownloadPopup = true">Export</button>
<DownloadPortfolioPopup
  v-if="showDownloadPopup"
  :user="user"
  :api-key="apiKey"
  :portfolio="selectedPortfolioIndex"
  @close="showDownloadPopup = false"
/>
    </div>
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
  @refresh-history="{ fetchCash(); fetchPortfolio(); fetchTransactionHistory(); fetchPortfolioSummary(); showTradeModal = false }"
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
  @cash-added="() => { fetchCash(); fetchPortfolio(); fetchTransactionHistory(); fetchPortfolioSummary(); showAddCashModal = false }"
/>
<BaseValuePopup
  v-if="showBaseValueModal"
  :user="user"
  :api-key="apiKey"
  :portfolio="selectedPortfolioIndex"
  @close="showBaseValueModal = false"
  @base-value-updated="fetchPortfolioSummary(); fetchPortfolio(); showBaseValueModal = false"
/>
<Archetypes v-if="showLossesInfo" @close="showLossesInfo = false" />
<ImportPortfolioPopup
          v-if="showImportPopup"
          :user="user"
          :api-key="apiKey"
          :portfolio="selectedPortfolioIndex"
          @close="showImportPopup = false"
          @imported="() => { fetchCash(); fetchPortfolio(); fetchTransactionHistory(); fetchPortfolioSummary(); showImportPopup = false }"
        />
    </div>
   <div class="portfolio-archetype">
  <div class="archetype-flex">
    <svg class="archetype-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <g id="SVGRepo_iconCarrier">
        <circle cx="34.52" cy="11.43" r="5.82" :stroke="text2" :fill="text2"/>
        <circle cx="53.63" cy="31.6" r="5.82" :stroke="text2" :fill="text2"/>
        <circle cx="34.52" cy="50.57" r="5.82" :stroke="text2" :fill="text2" />
        <circle cx="15.16" cy="42.03" r="5.82" :stroke="text2" :fill="text2" />
        <circle cx="15.16" cy="19.27" r="5.82" :stroke="text2" :fill="text2" />
        <circle cx="34.51" cy="29.27" r="4.7" :stroke="text2" :fill="text2" />
        <line x1="20.17" y1="16.3" x2="28.9" y2="12.93" :stroke="text2" />
        <line x1="38.6" y1="15.59" x2="49.48" y2="27.52" :stroke="text2" />
        <line x1="50.07" y1="36.2" x2="38.67" y2="46.49" :stroke="text2" />
        <line x1="18.36" y1="24.13" x2="30.91" y2="46.01" :stroke="text2" />
        <line x1="20.31" y1="44.74" x2="28.7" y2="48.63" :stroke="text2" />
        <line x1="17.34" y1="36.63" x2="31.37" y2="16.32" :stroke="text2" />
        <line x1="20.52" y1="21.55" x2="30.34" y2="27.1" :stroke="text2" />
        <line x1="39.22" y1="29.8" x2="47.81" y2="30.45" :stroke="text2" />
        <line x1="34.51" y1="33.98" x2="34.52" y2="44.74" :stroke="text2" />
      </g>
    </svg>
    <div class="archetype-content">
      <div class="archetype-header">
        <h2>Archetype: {{ currentArchetype.name }}</h2>
        <span @click="showLossesInfo = true" :class="['archetype-badge', currentArchetype.type]">
          {{ currentArchetype.type === 'good' ? 'Good Archetype' : 'Bad Archetype' }}
        </span>
      </div>
      <p>{{ currentArchetype.desc }}</p>
    </div>
  </div>
</div>
    <div class="portfolio-summary">
      <div class="summary-card">
      <div class="summary-title">Base Value</div>
      <div class="summary-value">
        ${{ portfolioSummary?.BaseValue?.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }) ?? '-' }}
      </div>
    </div>
      <div class="summary-card">
      <div class="summary-title">Total Value</div>
      <div class="summary-value">
        ${{ portfolioSummary?.totalPortfolioValue2?.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }) ?? '-' }}
      </div>
    </div>
  <div class="summary-card">
  <div class="summary-title">Active Positions</div>
  <div class="summary-value">
    ${{ portfolioSummary?.totalPortfolioValue?.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) ?? '-' }}
  </div>
</div>
      <div class="summary-card">
  <div class="summary-title">Cash</div>
  <div class="summary-value">
    ${{ portfolioSummary?.cash?.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) ?? '-' }}
  </div>
</div>
      <div class="summary-card">
        <div class="summary-title">Total P/L</div>
        <div class="summary-value" :class="portfolioSummary?.totalPL >= 0 ? 'positive' : 'negative'">
          {{ portfolioSummary?.totalPL >= 0 ? '+' : '' }}${{ portfolioSummary?.totalPL?.toLocaleString(undefined, {
            minimumFractionDigits: 2, maximumFractionDigits: 2
          }) ?? '-' }}
        </div>
      </div>
      <div class="summary-card">
      <div class="summary-title">Total P/L (%)</div>
      <div class="summary-value" :class="portfolioSummary?.totalPL > 0 ? 'positive' : portfolioSummary?.totalPL < 0 ? 'negative' : ''">
        <template v-if="portfolioSummary?.totalPLPercent !== '' && Number(portfolioSummary?.totalPLPercent) !== 0">
          {{ portfolioSummary?.totalPL > 0 ? '+' : '' }}{{ portfolioSummary?.totalPLPercent }}%
        </template>
        <template v-else>
          -
        </template>
      </div>
    </div>
      <div class="summary-card">
        <div class="summary-title">Unrealized P/L</div>
        <div class="summary-value" :class="portfolioSummary?.unrealizedPL >= 0 ? 'positive' : 'negative'">
          {{ portfolioSummary?.unrealizedPL >= 0 ? '+' : '' }}${{ portfolioSummary?.unrealizedPL?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }) ?? '-' }}
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-title">Unrealized P/L (%)</div>
        <div class="summary-value" :class="portfolioSummary?.unrealizedPL > 0 ? 'positive' : portfolioSummary?.unrealizedPL < 0 ? 'negative' : ''">
  <template v-if="portfolioSummary?.unrealizedPLPercent !== '' && Number(portfolioSummary?.unrealizedPLPercent) !== 0">
    {{ portfolioSummary?.unrealizedPL >= 0 ? '+' : '' }}{{ portfolioSummary?.unrealizedPLPercent }}%
  </template>
  <template v-else>
    -
  </template>
</div>
      </div>
      <div class="summary-card">
        <div class="summary-title">Realized P/L</div>
        <div class="summary-value" :class="portfolioSummary?.realizedPL >= 0 ? 'positive' : 'negative'">
          {{ portfolioSummary?.realizedPL >= 0 ? '+' : '' }}${{ portfolioSummary?.realizedPL?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }) ?? '-' }}
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-title">Realized P/L (%)</div>
        <div class="summary-value" :class="portfolioSummary?.realizedPL >= 0 ? 'positive' : 'negative'">
          {{ portfolioSummary?.realizedPL >= 0 ? '+' : '' }}{{ portfolioSummary?.realizedPLPercent }}%
        </div>
      </div>
      <!-- Advanced Portfolio Stats -->
  <div class="summary-card">
  <div class="summary-title">Avg. Position Size</div>
  <div class="summary-value">{{ portfolioSummary?.avgPositionSize }}%</div>
</div>
  <div class="summary-card">
    <div class="summary-title">Avg. Hold Time (Winners)</div>
    <div class="summary-value">{{ portfolioSummary?.avgHoldTimeWinners }} days</div>
  </div>
  <div class="summary-card">
    <div class="summary-title">Avg. Hold Time (Losers)</div>
    <div class="summary-value">{{ portfolioSummary?.avgHoldTimeLosers }} days</div>
  </div>
  <div class="summary-card">
    <div class="summary-title">Avg. Gain %</div>
    <div class="summary-value positive">+{{ portfolioSummary?.avgGain }}%</div>
  </div>
  <div class="summary-card">
    <div class="summary-title">Avg. Loss %</div>
    <div class="summary-value negative">{{ portfolioSummary?.avgLoss }}%</div>
  </div>
  <div class="summary-card">
  <div class="summary-title">Avg. Gain</div>
  <div class="summary-value positive">
    +${{ portfolioSummary?.avgGainAbs }}
  </div>
</div>
<div class="summary-card">
  <div class="summary-title">Avg. Loss</div>
  <div class="summary-value negative">
    -${{ portfolioSummary?.avgLossAbs }}
  </div>
</div>
<div class="summary-card">
  <div class="summary-title">Gain/Loss Ratio</div>
  <div class="summary-value">{{ portfolioSummary?.gainLossRatio }}</div>
</div>
<div class="summary-card">
  <div class="summary-title">Risk/Reward Ratio</div>
  <div class="summary-value">{{ portfolioSummary?.riskRewardRatio }}</div>
</div>
<div class="summary-card">
  <div class="summary-title">Winning Trades</div>
  <div class="summary-value positive">
    {{ portfolioSummary?.winnerCount }} ({{ portfolioSummary?.winnerPercent }}%)
  </div>
</div>
<div class="summary-card">
  <div class="summary-title">Losing Trades</div>
  <div class="summary-value negative">
    {{ portfolioSummary?.loserCount }} ({{ portfolioSummary?.loserPercent }}%)
  </div>
</div>
<div class="summary-card">
  <div class="summary-title">Breakeven Trades</div>
  <div class="summary-value">
    {{ portfolioSummary?.breakevenCount }} ({{ portfolioSummary?.breakevenPercent }}%)
  </div>
</div>
<div class="summary-card">
  <div class="summary-title">Profit Factor</div>
  <div class="summary-value">{{ portfolioSummary?.profitFactor }}</div>
</div>
<div class="summary-card">
  <div class="summary-title">Sortino Ratio</div>
  <div class="summary-value">{{ portfolioSummary?.sortinoRatio }}</div>
</div>
<div class="summary-card">
  <div class="summary-title">Biggest Winner</div>
  <div class="summary-value positive">
    <template v-if="portfolioSummary?.biggestWinner?.ticker">
      {{ portfolioSummary.biggestWinner.ticker }} (+${{ portfolioSummary.biggestWinner.amount }})
    </template>
    <template v-else>
      -
    </template>
    <div v-if="portfolioSummary?.biggestWinner?.ticker" style="font-size: 0.7em; color: var(--text2); margin-top: 2px;">
      Trades: {{ portfolioSummary.biggestWinner.tradeCount }}
    </div>
  </div>
</div>
<div class="summary-card">
  <div class="summary-title">Biggest Loser</div>
  <div class="summary-value negative">
    <template v-if="portfolioSummary?.biggestLoser?.ticker">
      {{ portfolioSummary.biggestLoser.ticker }} (-${{ portfolioSummary.biggestLoser.amount }})
    </template>
    <template v-else>
      -
    </template>
    <div v-if="portfolioSummary?.biggestLoser?.ticker" style="font-size: 0.7em; color: var(--text2); margin-top: 2px;">
      Trades: {{ portfolioSummary.biggestLoser.tradeCount }}
    </div>
  </div>
</div>
    </div>
    <div class="portfolio-linechart-container">
      <div class="linechart-fixed-height">
        <Line :data="lineData" :options="lineOptions" :height="200" />
      </div>
    </div>
    <div class="portfolio-main-flex">
      <div class="portfolio-pie-container">
          <template v-if="portfolioSummary?.positionsCount !== undefined ? portfolioSummary.positionsCount <= 100 : portfolio.length <= 100">
            <Pie :data="pieChartData" :options="pieOptions" />
          </template>
          <template v-else>
            <div class="too-many-positions-message" style="display:flex; flex-direction: column; justify-content: center; align-items: center; padding: 24px; height: 350px ;color: var(--text2); background: var(--base2); border-radius: 10px;">
              <strong>Too many positions to display pie chart.</strong><br>
              Please reduce the number of positions to view allocation breakdown.
            </div>
          </template>
      </div>
      <div class="portfolio-table-container scrollable-table">
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
                <th>PnL ($)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Cash row always at the top -->
            <tr class="cash-row">
              <td>{{ getPercOfCash() }}%</td>
              <td>Cash</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>${{ cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
              <td>-</td>
              <td>-</td>
              <td></td>
            </tr>
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
              <td :class="getPnLClass(position)">
                <span v-if="latestQuotes[position.Symbol] !== undefined">
                  {{ getPnLDollar(position) > 0 ? '+' : '' }}${{ getPnLDollar(position) }}
                </span>
              </td>
              <td>
                <button class="action-btn"
                  @click="openSellModal({ symbol: position.Symbol, shares: position.Shares, price: position.AvgPrice })">
                  Sell
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
 <div class="portfolio-bar-chart-container" style="margin-bottom: 32px; background: var(--base2); border-radius: 10px; padding: 24px; box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);">
  <h3 style="color: var(--accent1); margin-bottom: 12px;">Trade Returns (%)</h3>
  <Bar :data="tradeReturnsChartData" :options="tradeReturnsChartOptions" :height="70" />
</div>
    <div class="portfolio-history-container scrollable-table">
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
        <tbody>
          <tr v-if="sortedTransactionHistory.length === 0">
            <td colspan="7" style="text-align:center; color: var(--text2);">
              No transaction history
            </td>
          </tr>
          <tr v-for="(tx, i) in sortedTransactionHistory" :key="i">
            <td>{{ tx.Date ? tx.Date.slice(0, 10) : '' }}</td>
            <td>{{ tx.Symbol }}</td>
            <td>{{ tx.Action }}</td>
            <td>{{ tx.Shares }}</td>
            <td>{{ isNaN(Number(tx.Price)) ? '-' : '$' + Number(tx.Price).toFixed(2) }}</td>
            <td>{{ isNaN(Number(tx.Commission)) ? '-' : '$' + Number(tx.Commission).toFixed(2) }}</td>
            <td>${{ Number(tx.Total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
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
import { ref, watch, onMounted, computed, onUnmounted, nextTick } from 'vue';
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
import DownloadPortfolioPopup from '@/components/Portfolio/DownloadPortfolioPopup.vue'
import BaseValuePopup from '@/components/Portfolio/BaseValue.vue'

// access user from store 
const store = useStore();
let user = store.getters.getUser;
const apiKey = import.meta.env.VITE_EREUNA_KEY;

const showTradeModal = ref(false)
const showSellModal = ref(false)
const sellPosition = ref({ symbol: '', shares: 0, price: 0 })
const showAddCashModal = ref(false)
const showLossesInfo = ref(false)
const showImportPopup = ref(false)
const showDownloadPopup = ref(false)
const showBaseValueModal = ref(false)

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
    fetchPortfolioSummary();
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

function getPnLDollar(position) {
  const close = latestQuotes.value[position.Symbol];
  if (close === undefined || close === null) return '';
  if (!position.AvgPrice) return '';
  return ((close - position.AvgPrice) * position.Shares).toFixed(2);
}


const pieOptions = computed(() => {
  return {
    plugins: {
      legend: {
        display: portfolio.value.length <= 32,
        labels: {
          color: text2,
          font: { size: 14 }
        }
      }
    }
  };
});

// --- Total Value Over Time (Line Chart) ---

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

const transactionHistory = ref([]); // Holds loaded trades
const tradesTotal = ref(0); // Total trades available
const tradesLimit = ref(100); // Trades per page
const tradesSkip = ref(0); // Current skip
const tradesLoading = ref(false); // Loading state

// Windowed/virtualized transaction history
const visibleBatchIndex = ref(0); // Which batch is currently visible
const batchSize = ref(tradesLimit.value); // How many items per batch

// Only display the current batch
const windowedTransactionHistory = computed(() => {
  return transactionHistory.value;
});

async function fetchTransactionHistory() {
  try {
    tradesLoading.value = true;
    const headers = {
      'x-api-key': apiKey
    };
    const response = await fetch(
      `/api/trades?username=${user}&portfolio=${selectedPortfolioIndex.value}&limit=${tradesLimit.value}&skip=${tradesSkip.value}`,
      { headers }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    tradesTotal.value = data.total || 0;
    // Always replace with the new batch
    transactionHistory.value = data.trades || [];
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    console.error('Error fetching transaction history:', error);
  } finally {
    tradesLoading.value = false;
  }
}

const sortedTransactionHistory = computed(() => {
  // Only sort the windowed batch
  return [...windowedTransactionHistory.value].sort((a, b) => {
    // If Date is missing, treat as oldest
    if (!a.Date) return 1;
    if (!b.Date) return -1;
    return new Date(b.Date) - new Date(a.Date);
  });
});

const portfolio = ref([]); // Holds loaded positions
const portfolioTotal = ref(0); // Total positions available
const portfolioLimit = ref(100); // Positions per page
const portfolioSkip = ref(0); // Current skip
const portfolioLoading = ref(false); // Loading state

async function fetchPortfolio({ append = false } = {}) {
  try {
    portfolioLoading.value = true;
    const headers = {
      'x-api-key': apiKey
    };
    const response = await fetch(
      `/api/portfolio?username=${user}&portfolio=${selectedPortfolioIndex.value}&limit=${portfolioLimit.value}&skip=${portfolioSkip.value}`,
      { headers }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    portfolioTotal.value = data.total || 0;
    if (append) {
      portfolio.value = [...portfolio.value, ...(data.portfolio || [])];
    } else {
      portfolio.value = data.portfolio || [];
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    console.error('Error fetching portfolio:', error);
  } finally {
    portfolioLoading.value = false;
  }
}

const latestQuotes = ref({}); // { [symbol]: price }

let ws = null;
let wsReconnectTimer = null;
let wsTimeout = null;
let wsConnected = false;

async function fetchQuotes() {
  console.log('[fetchQuotes] called, portfolio:', portfolio.value);
  if (!portfolio.value.length) {
    console.log('[fetchQuotes] portfolio is empty, aborting');
    return;
  }
  const symbols = portfolio.value.map(p => p.Symbol).join(',');
  const headers = { 'x-api-key': apiKey };

  // Helper to update quotes from message
  function handleWSMessage(event) {
    console.log('[WebSocket] Message received:', event.data);
    try {
      const data = JSON.parse(event.data);
      if (data && typeof data === 'object') {
        latestQuotes.value = data;
      }
    } catch (e) {
      console.warn('[WebSocket] Failed to parse message:', e);
    }
  }

  // Clean up any previous websocket
  if (ws) {
    ws.onclose = null;
    ws.onerror = null;
    ws.onmessage = null;
    ws.close();
    ws = null;
  }
  if (wsTimeout) clearTimeout(wsTimeout);
  if (wsReconnectTimer) clearTimeout(wsReconnectTimer);

  // Try websocket first
  function connectWS() {
    wsConnected = false;
  const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  // Use port 8000 for local development
  const wsPort = 8000;
  const wsUrl = `${wsProto}://${window.location.hostname}:${wsPort}/ws/quotes?symbols=${symbols}&x-api-key=${apiKey}`;
    console.log('[WebSocket] Attempting to connect:', wsUrl, { symbols, apiKey });
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      wsConnected = true;
      console.log('[WebSocket] Connection opened:', ws.url);
      // Optionally, send a ping or subscribe message if needed
    };
    ws.onmessage = handleWSMessage;
    ws.onerror = (err) => {
      wsConnected = false;
      console.error('[WebSocket] Error:', err);
      ws.close();
    };
    ws.onclose = (event) => {
      wsConnected = false;
      console.warn('[WebSocket] Connection closed:', event);
      // Try to reconnect after 2s if portfolio still exists
      if (portfolio.value.length) {
        wsReconnectTimer = setTimeout(connectWS, 2000);
      }
    };

    // Fallback to REST if no message after 2s
    wsTimeout = setTimeout(async () => {
      if (!wsConnected || Object.keys(latestQuotes.value).length === 0) {
        try {
          const response = await fetch(`/api/quotes?symbols=${symbols}`, { headers });
          if (!response.ok) throw new Error('Failed to fetch quotes');
          const data = await response.json();
          latestQuotes.value = data;
        } catch (error) {
          console.error('Error fetching quotes (REST fallback):', error);
        }
      }
    }, 2000);
  }

  try {
    connectWS();
  } catch (error) {
    // If websocket fails, fallback to REST
    try {
      const response = await fetch(`/api/quotes?symbols=${symbols}`, { headers });
      if (!response.ok) throw new Error('Failed to fetch quotes');
      const data = await response.json();
      latestQuotes.value = data;
    } catch (err) {
      console.error('Error fetching quotes (REST fallback):', err);
    }
  }
}

// Clean up websocket on unmount
onUnmounted(() => {
  if (ws) {
    ws.onclose = null;
    ws.onerror = null;
    ws.onmessage = null;
    ws.close();
    ws = null;
  }
  if (wsTimeout) clearTimeout(wsTimeout);
  if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
});

// Fetch quotes whenever portfolio changes
watch(portfolio, (newVal) => {
  console.log('[portfolio watcher] triggered, newVal:', newVal);
  if (newVal.length) fetchQuotes();
});

onMounted(() => {
  fetchQuotes();
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

function getPercOfPortfolio(position) {
  const total = totalPortfolioValue2.value; // includes cash
  const close = latestQuotes.value[position.Symbol];
  if (!total || close === undefined || close === null) return '';
  const perc = ((close * position.Shares) / total) * 100;
  return perc.toFixed(2);
}

function getPercOfCash() {
  const total = totalPortfolioValue2.value; // includes cash
  if (!total) return '0.00';
  return ((cash.value / total) * 100).toFixed(2);
}

const totalPortfolioValue2 = computed(() => {
  const positionsValue = portfolio.value.reduce((sum, pos) => {
    const close = latestQuotes.value[pos.Symbol];
    if (close === undefined || close === null) return sum;
    return sum + close * pos.Shares;
  }, 0);
  return positionsValue + cash.value; // Add cash to the total
});

// Computed: portfolioValueHistory from backend summary
const portfolioValueHistory = computed(() => {
  return portfolioSummary.value?.portfolioValueHistory || [];
});

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
    fetchPortfolioSummary();
    showResetDialog.value = false;
  } catch (error) {
    resetError.value = 'Error resetting portfolio: ' + error.message;
  }
}

const cash = ref(0); // Holds the user's cash balance
const baseValue = ref(0); // Holds the BaseValue from backend

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
    baseValue.value = data.BaseValue || 0; // Assign the BaseValue

  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    console.error('Error fetching cash balance:', error);
  }
}

// Helper: Find all round-trips (buy then sell) for stats
// Use backend-provided tradeReturnsChart data
const tradeReturnsChartData = computed(() => {
  const chart = portfolioSummary.value?.tradeReturnsChart;
  if (!chart || !chart.labels || !chart.bins) return { labels: [], datasets: [] };
  return {
    labels: chart.labels,
    datasets: [
      {
        label: 'Number of Trades',
        data: chart.bins.map(b => b.count),
        backgroundColor: chart.bins.map(b => b.positive ? 'rgba(76, 175, 80, 0.7)' : 'rgba(244, 67, 54, 0.7)'),
        borderColor: chart.bins.map(b => b.positive ? '#4caf50' : '#f44336'),
        borderWidth: 1,
      }
    ]
  };
});

const tradeReturnsChartOptions = computed(() => {
  const chart = portfolioSummary.value?.tradeReturnsChart;
  const medianBinLabel = chart?.labels?.[chart?.medianBinIndex];
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

// --- Portfolio Switching Logic ---
const selectedPortfolioIndex = ref(0);

function selectPortfolio(idx) {
  selectedPortfolioIndex.value = idx;
  fetchPortfolio();
  fetchTransactionHistory();
  fetchCash();
  fetchPortfolioSummary();
}

// On mount, load the first portfolio by default
onMounted(() => {
  selectPortfolio(0);
});

// --- Archetype Definitions --- for the Portfolio Archetype feature
const archetypes = [
  { name: "The Disciplined Planner", desc: "Follows a tested strategy, manages risk well, and sticks to the plan.", type: "good" },
  { name: "The Adaptive Strategist", desc: "Adjusts to market conditions, maximizes opportunities, and learns from mistakes.", type: "good" },
  { name: "The Patient Investor", desc: "Benefits from compounding and long-term trends, rarely trades on emotion.", type: "good" },
  { name: "The Diversifier", desc: "Reduces risk through diversification across assets and strategies.", type: "good" },
  { name: "The Boom & Buster", desc: "Goes all-in with leverage, riding big wins—until one loss wipes out everything.", type: "bad" },
  { name: "The Stopless Hero", desc: "Refuses to use stop-losses, letting small losses snowball into disasters.", type: "bad" },
  { name: "The FOMO Chaser", desc: "Buys tops and sells bottoms, always late to the party, driven by hype and fear of missing out.", type: "bad" },
  { name: "The Averager", desc: "Keeps doubling down on losers, hoping for a turnaround that rarely comes.", type: "bad" },
  { name: "The Risk Ignorer", desc: "Puts too much on one trade or ignores diversification, exposing themselves to huge drawdowns.", type: "bad" },
  { name: "The Planless Gambler", desc: "Trades on gut feeling, rumors, or tips—never with a real plan or system.", type: "bad" },
  { name: "The Revenge Trader", desc: "Tries to win back losses with bigger, riskier bets, digging the hole deeper.", type: "bad" },
  { name: "The Emotional Reactor", desc: "Lets fear, greed, or frustration dictate every move, abandoning logic and discipline.", type: "bad" },
  { name: "The Market Ignorer", desc: "Uses the same strategy in all conditions, never adapting to volatility or trends.", type: "bad" },
  { name: "The Overtrader", desc: "Trades too often, chasing every move and racking up fees and mistakes.", type: "bad" }
];

// Computed property to determine the current archetype based on selected portfolio index
const currentArchetype = computed(() => {
  // Placeholder: assign archetype by selectedPortfolioIndex
  return archetypes[selectedPortfolioIndex.value % archetypes.length];
});

// Infinite scroll for portfolio positions
let portfolioTableContainer = null;
let transactionHistoryContainer = null;

function handlePortfolioScroll() {
  if (!portfolioTableContainer || portfolioLoading.value) return;
  const threshold = 120; // px from bottom
  const { scrollTop, scrollHeight, clientHeight } = portfolioTableContainer;
  if (
    scrollHeight - scrollTop - clientHeight < threshold &&
    portfolio.value.length < portfolioTotal.value
  ) {
    portfolioSkip.value += portfolioLimit.value;
    fetchPortfolio({ append: true });
  }
}

function handleTransactionHistoryScroll() {
  if (!transactionHistoryContainer || tradesLoading.value) return;
  const threshold = 120; // px from bottom
  const { scrollTop, scrollHeight, clientHeight } = transactionHistoryContainer;
  // Scroll down: load next batch
  if (
    scrollHeight - scrollTop - clientHeight < threshold &&
    (visibleBatchIndex.value + 1) * batchSize.value < tradesTotal.value
  ) {
    visibleBatchIndex.value += 1;
    tradesSkip.value = visibleBatchIndex.value * batchSize.value;
    fetchTransactionHistory();
  }
  // Scroll up: load previous batch
  if (
    scrollTop < threshold &&
    visibleBatchIndex.value > 0
  ) {
    visibleBatchIndex.value -= 1;
    tradesSkip.value = visibleBatchIndex.value * batchSize.value;
    fetchTransactionHistory();
  }
}

function setupPortfolioScroll() {
  nextTick(() => {
    portfolioTableContainer = document.querySelector('.portfolio-table-container');
    if (portfolioTableContainer) {
      portfolioTableContainer.addEventListener('scroll', handlePortfolioScroll);
    }
  });
}

function setupTransactionHistoryScroll() {
  nextTick(() => {
    transactionHistoryContainer = document.querySelector('.portfolio-history-container');
    if (transactionHistoryContainer) {
      transactionHistoryContainer.addEventListener('scroll', handleTransactionHistoryScroll);
    }
  });
}

function cleanupPortfolioScroll() {
  if (portfolioTableContainer) {
    portfolioTableContainer.removeEventListener('scroll', handlePortfolioScroll);
    portfolioTableContainer = null;
  }
}

function cleanupTransactionHistoryScroll() {
  if (transactionHistoryContainer) {
    transactionHistoryContainer.removeEventListener('scroll', handleTransactionHistoryScroll);
    transactionHistoryContainer = null;
  }
}

watch(selectedPortfolioIndex, () => {
  portfolioSkip.value = 0;
  tradesSkip.value = 0;
  visibleBatchIndex.value = 0;
  nextTick(() => {
    setupPortfolioScroll();
    setupTransactionHistoryScroll();
  });
});

onMounted(() => {
  setupPortfolioScroll();
  setupTransactionHistoryScroll();
});

onUnmounted(() => {
  cleanupPortfolioScroll();
  cleanupTransactionHistoryScroll();
});

const portfolioSummary = ref(null);

async function fetchPortfolioSummary() {
  try {
    const headers = { 'x-api-key': apiKey };
    const response = await fetch(
      `/api/portfolio/summary?username=${user}&portfolio=${selectedPortfolioIndex.value}`,
      { headers }
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    portfolioSummary.value = await response.json();
  } catch (error) {
    console.error('Error fetching portfolio summary:', error);
    portfolioSummary.value = null;
  }
}

const isPortfolioBlank = computed(() => {
  return portfolio.value.length === 0 && transactionHistory.value.length === 0 && cash.value === 0;
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
    padding: 10px 10px;
    min-width: 30px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;

    &.selected {
      background: var(--accent1);
      color: var(--text3);
    }

    &:hover {
      background: var(--accent2);
      color: var(--text3);
    }
  }
}
/* Archetype display styling */
.portfolio-archetype {
  background: var(--base2);
  border-radius: 10px;
  border: 1px solid var(--base3);
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.08);
  padding: 10px 14px;
  margin: 18px 0 24px 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 260px;
  color: var(--text1);
  position: relative;

    .archetype-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .archetype-header {
    display: flex;
    align-items: center;
    width: 100%;
    position: relative;
  }

    .archetype-icon {
    width: 32px;
    min-width: 32px;
    margin-right: 18px;
    margin-top: 2px;
  }

    .archetype-flex {
    display: flex;
    align-items: flex-start;
    width: 100%;
    position: relative;
  }

  h2 {
    color: var(--accent1);
    font-size: 1.3rem;
    font-weight: 700;
    margin-bottom: 0;
  }
}

.archetype-badge {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 5px;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: 0 1px 6px 0 rgba(0,0,0,0.08);
  border: none;
  margin-left: 2px;
  position: absolute;
  top: 10px;
  right: 14px;
  z-index: 2;
  cursor: pointer;

  &.good {
    background: linear-gradient(90deg, var(--positive) 60%, var(--positive) 100%);
    color: var(--text3);
  }

  &.bad {
    background: linear-gradient(90deg, var(--negative) 60%, var(--negative) 100%);
    color: var(--text3);
  }
}

.portfolio-archetype p {
  color: var(--text2);
  font-size: 1.05rem;
  margin-bottom: 0;
  line-height: 1.5;
}

.trade-btn {
  background: var(--accent1);
  color: var(--text3);
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
  color: var(--text3);
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
    background: var(--base2);
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

.scrollable-content {
  height: calc(100vh - 72px);
  overflow-y: auto;
}
/* Limit height and add scroll for portfolio and history tables */
.scrollable-table {
  max-height: 400px;
  overflow-y: auto;
}

</style>