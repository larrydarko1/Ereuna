<template>
    <Header />
  <div class="portfolio" :style="{ '--buy-bg': buyBg, '--buy-border': buyBorder, '--sell-bg': sellBg, '--sell-border': sellBorder, '--long-bg': longBg, '--long-border': longBorder, '--short-bg': shortBg, '--short-border': shortBorder, '--cash-bg': cashBg, '--cash-border': cashBorder, '--leverage-bg': leverageBg, '--leverage-border': leverageBorder }">
    <div class="portfolio-menu card">
      <div style="display: flex; margin-left: 10px;">
        <button
          v-for="n in 10"
          :key="n"
          :class="['portfolio-btn', selectedPortfolioIndex === n - 1 ? 'selected' : '']"
          @click="selectPortfolio(n - 1)"
          :aria-label="`Select portfolio ${n}`"
        >
          {{ n }}
        </button>
      </div>
      <div style="display: flex; gap: 8px; margin-right: 10px;">
        <button class="menu-btn" @click="showTradeModal = true" aria-label="Open New Trade dialog">New Trade</button>
        <button class="menu-btn" @click="showAddCashModal = true" aria-label="Open Add Cash dialog">Add Cash</button>
        <button class="menu-btn" @click="showBaseValueModal = true" aria-label="Open Set Base Value dialog">Set Base Value</button>
        <button class="menu-btn" :disabled="isPortfolioBlank" @click="showResetDialog = true" aria-label="Open Reset Portfolio dialog">Reset</button>
        <button class="menu-btn" :disabled="!(portfolio.length === 0 && transactionHistory.length === 0 && cash === 0)" @click="showImportPopup = true" aria-label="Open Import Portfolio dialog">Import</button>
        <button class="menu-btn" :disabled="isPortfolioBlank" @click="showDownloadPopup = true" aria-label="Open Export Portfolio dialog">Export</button>
        <DownloadPortfolioPopup
          v-if="showDownloadPopup"
          :user="user?.Username ?? ''"
          :api-key="apiKey"
          :portfolio="selectedPortfolioIndex"
          @close="showDownloadPopup = false"
        />
      </div>
    </div>
    <!-- Benchmarks Panel -->
   <div class="benchmark-panel">
      <button class="edit-watch-panel-btn" @click="showBenchmarkSelector = true" aria-label="Edit Benchmarks">
        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.013 2.293L13.707 4.987L12.293 6.401L9.599 3.707L11.013 2.293ZM2 11V13.5H4.5L11.8765 6.1235L9.3765 3.6235L2 11Z" fill="currentColor"/>
        </svg>
        <span>Edit Benchmarks</span>
      </button>
    </div>
    <BenchmarkSelector
      v-if="showBenchmarkSelector"
      :user="user?.Username ?? ''"
      :api-key="apiKey"
      :portfolio="selectedPortfolioIndex"
      :current-benchmarks="portfolioBenchmarks"
      @close="showBenchmarkSelector = false"
      @saved="handleBenchmarksSaved"
      @notify="(msg: any) => showNotification(msg.text)"
    />

    <!-- Benchmark Performance Comparison -->
    <div class="benchmark-performance-section card">
      <template v-if="isPortfolioBlank">
        <div class="benchmark-empty-message">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Benchmarks are not visible for empty portfolios</span>
        </div>
      </template>
      <template v-else-if="portfolioSummary?.benchmarkPerformance && portfolioSummary.benchmarkPerformance.length > 0">
        <div class="benchmark-performance-scroll">
          <div v-for="benchmark in portfolioSummary.benchmarkPerformance" :key="benchmark.symbol" class="benchmark-card">
            <div class="benchmark-header">
              <span class="benchmark-symbol">{{ benchmark.symbol }}</span>
              <span class="benchmark-status" :class="benchmark.beating ? 'outperforming' : 'underperforming'">
                <svg v-if="benchmark.beating" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 3L9.00001 4L11.2929 6.29289L8.50001 9.08579L5.50001 6.08579L0.292908 11.2929L1.70712 12.7071L5.50001 8.91421L8.50001 11.9142L12.7071 7.70711L15 10L16 9L16 3H10Z" fill="currentColor"></path>
                </svg>
                <svg v-else viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 13L9.00001 12L11.2929 9.70712L8.50001 6.91423L5.50001 9.91423L0.292908 4.70712L1.70712 3.29291L5.50001 7.0858L8.50001 4.0858L12.7071 8.29291L15 6.00001L16 7.00001L16 13H10Z" fill="currentColor"></path>
                </svg>
                <span>{{ benchmark.beating ? 'Beating' : 'Lagging' }}</span>
              </span>
            </div>
            <div class="benchmark-stats">
              <div class="stat-item">
                <span class="stat-label">Benchmark</span>
                <span class="stat-value" :class="benchmark.return >= 0 ? 'positive' : 'negative'">
                  {{ benchmark.return >= 0 ? '+' : '' }}{{ benchmark.return.toFixed(2) }}%
                </span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Portfolio</span>
                <span class="stat-value" :class="benchmark.portfolioReturn >= 0 ? 'positive' : 'negative'">
                  {{ benchmark.portfolioReturn >= 0 ? '+' : '' }}{{ benchmark.portfolioReturn.toFixed(2) }}%
                </span>
              </div>
              <div class="stat-item highlight">
                <span class="stat-label">Diff</span>
                <span class="stat-value" :class="benchmark.outperformance >= 0 ? 'positive' : 'negative'">
                  {{ benchmark.outperformance >= 0 ? '+' : '' }}{{ benchmark.outperformance.toFixed(2) }}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="benchmark-empty-message">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 2C8.44772 2 8 2.44772 8 3C8 3.55228 8.44772 4 9 4H15C15.5523 4 16 3.55228 16 3C16 2.44772 15.5523 2 15 2H9Z" fill="currentColor"/>
            <path d="M4 5C4 3.89543 4.89543 3 6 3C6 4.65685 7.34315 6 9 6H15C16.6569 6 18 4.65685 18 3C19.1046 3 20 3.89543 20 5V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V5Z" fill="currentColor"/>
          </svg>
          <span>No benchmark data available</span>
        </div>
      </template>
    </div>

    <div class="portfolio-summary-main">
      <div class="portfolio-summary card">
        <div class="summary-row">
          <div class="attribute">Base Value</div>
          <div class="value">
            ${{ portfolioSummary?.BaseValue?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }) ?? '-' }}
          </div>
        </div>
        <div class="summary-row">
          <div class="attribute">Total Value</div>
          <div class="value">
            ${{ portfolioSummary?.totalPortfolioValue2?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }) ?? '-' }}
          </div>
        </div>
        <div class="summary-row">
          <div class="attribute">Active Positions</div>
          <div class="value">
            ${{ portfolioSummary?.totalPortfolioValue?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }) ?? '-' }}
          </div>
        </div>
        <div class="summary-row">
          <div class="attribute">Cash</div>
          <div class="value">
            ${{ portfolioSummary?.cash?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }) ?? '-' }}
          </div>
        </div>
        <div class="summary-row">
          <div class="attribute">Total P/L</div>
          <div class="value" :class="(portfolioSummary?.totalPL ?? 0) >= 0 ? 'positive' : 'negative'">
            {{ (portfolioSummary?.totalPL ?? 0) >= 0 ? '+' : '' }}${{ portfolioSummary?.totalPL?.toLocaleString(undefined, {
              minimumFractionDigits: 2, maximumFractionDigits: 2
            }) ?? '-' }}
          </div>
        </div>
        <div class="summary-row">
          <div class="attribute">Total P/L (%)</div>
          <div class="value" :class="(portfolioSummary?.totalPL ?? 0) > 0 ? 'positive' : (portfolioSummary?.totalPL ?? 0) < 0 ? 'negative' : ''">
            <template v-if="portfolioSummary?.totalPLPercent !== '' && Number(portfolioSummary?.totalPLPercent) !== 0">
              {{ (portfolioSummary?.totalPL ?? 0) > 0 ? '+' : '' }}{{ portfolioSummary?.totalPLPercent }}%
            </template>
            <template v-else>
              -
            </template>
          </div>
        </div>
        <div class="summary-row">
          <div class="attribute">Unrealized P/L</div>
          <div class="value" :class="(portfolioSummary?.unrealizedPL ?? 0) >= 0 ? 'positive' : 'negative'">
            {{ (portfolioSummary?.unrealizedPL ?? 0) >= 0 ? '+' : '' }}${{ portfolioSummary?.unrealizedPL?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }) ?? '-' }}
          </div>
        </div>
        <div class="summary-row">
          <div class="attribute">Unrealized P/L (%)</div>
          <div class="value" :class="(portfolioSummary?.unrealizedPL ?? 0) > 0 ? 'positive' : (portfolioSummary?.unrealizedPL ?? 0) < 0 ? 'negative' : ''">
            <template v-if="portfolioSummary?.unrealizedPLPercent !== '' && Number(portfolioSummary?.unrealizedPLPercent) !== 0">
              {{ (portfolioSummary?.unrealizedPL ?? 0) >= 0 ? '+' : '' }}{{ portfolioSummary?.unrealizedPLPercent }}%
            </template>
            <template v-else>
              -
            </template>
          </div>
        </div>
        <div class="summary-row">
          <div class="attribute">Realized P/L</div>
          <div class="value" :class="(portfolioSummary?.realizedPL ?? 0) >= 0 ? 'positive' : 'negative'">
            {{ (portfolioSummary?.realizedPL ?? 0) >= 0 ? '+' : '' }}${{ portfolioSummary?.realizedPL?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }) ?? '-' }}
          </div>
        </div>
        <div class="summary-row">
          <div class="attribute">Realized P/L (%)</div>
          <div class="value" :class="(portfolioSummary?.realizedPL ?? 0) >= 0 ? 'positive' : 'negative'">
            {{ (portfolioSummary?.realizedPL ?? 0) >= 0 ? '+' : '' }}{{ portfolioSummary?.realizedPLPercent }}%
          </div>
        </div>
        <!-- Advanced Portfolio Stats -->
        <div class="summary-row">
          <div class="attribute">Avg. Position Size</div>
          <div class="value">{{ portfolioSummary?.avgPositionSize }}%</div>
        </div>
        <div class="summary-row">
          <div class="attribute">Avg. Hold Time (Winners)</div>
          <div class="value">{{ portfolioSummary?.avgHoldTimeWinners }} days</div>
        </div>
        <div class="summary-row">
          <div class="attribute">Avg. Hold Time (Losers)</div>
          <div class="value">{{ portfolioSummary?.avgHoldTimeLosers }} days</div>
        </div>
        <div class="summary-row">
          <div class="attribute">Avg. Gain %</div>
          <div class="value positive">+{{ portfolioSummary?.avgGain }}%</div>
        </div>
        <div class="summary-row">
          <div class="attribute">Avg. Loss %</div>
          <div class="value negative">{{ portfolioSummary?.avgLoss }}%</div>
        </div>
        <div class="summary-row">
          <div class="attribute">Avg. Gain</div>
          <div class="value positive">
            +${{ portfolioSummary?.avgGainAbs }}
          </div>
        </div>
        <div class="summary-row">
          <div class="attribute">Avg. Loss</div>
          <div class="value negative">
            -${{ portfolioSummary?.avgLossAbs }}
          </div>
        </div>
        <div class="summary-row">
          <div class="attribute">Gain/Loss Ratio</div>
          <div class="value">{{ portfolioSummary?.gainLossRatio }}</div>
        </div>
        <div class="summary-row">
          <div class="attribute">Risk/Reward Ratio</div>
          <div class="value">{{ portfolioSummary?.riskRewardRatio }}</div>
        </div>
        <div class="summary-row">
          <div class="attribute">Winning Trades</div>
          <div class="value positive">
            {{ portfolioSummary?.winnerCount }} ({{ portfolioSummary?.winnerPercent }}%)
          </div>
        </div>
        <div class="summary-row">
          <div class="attribute">Losing Trades</div>
          <div class="value negative">
            {{ portfolioSummary?.loserCount }} ({{ portfolioSummary?.loserPercent }}%)
          </div>
        </div>
        <div class="summary-row">
          <div class="attribute">Breakeven Trades</div>
          <div class="value">
            {{ portfolioSummary?.breakevenCount }} ({{ portfolioSummary?.breakevenPercent }}%)
          </div>
        </div>
        <div class="summary-row">
          <div class="attribute">Profit Factor</div>
          <div class="value">{{ portfolioSummary?.profitFactor }}</div>
        </div>
        <div class="summary-row">
          <div class="attribute">Sortino Ratio</div>
          <div class="value">{{ portfolioSummary?.sortinoRatio }}</div>
        </div>
        <div class="summary-row">
          <div class="attribute">Biggest Winner</div>
          <div class="value positive">
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
        <div class="summary-row">
          <div class="attribute">Biggest Loser</div>
          <div class="value negative">
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

      <div class="portfolio-charts">
        <div class="portfolio-linechart-container card" aria-label="Portfolio total value over time chart">
          <div class="chart-inner-wrapper">
            <h3 style="color: var(--accent1); margin-bottom: 12px; font-size: 1rem;">Portfolio Value</h3>
            <div class="linechart-fixed-height">
              <template v-if="portfolioValueHistory.length === 0">
                <div class="no-data-message" style="display:flex; align-items: center; justify-content: center; height: 100%; color: var(--text2);">
                  <strong>No Closed Trades Yet</strong>
                </div>
              </template>
              <template v-else>
                <Line :data="lineData" :options="lineOptions" />
              </template>
            </div>
          </div>
        </div>
        <div class="portfolio-bar-chart-container card" aria-label="Trade returns bar chart">
          <div class="chart-inner-wrapper">
            <h3 style="color: var(--accent1); margin-bottom: 12px; font-size: 1rem;">Trade Returns (%)</h3>
            <div class="linechart-fixed-height">
              <template v-if="!portfolioSummary?.tradeReturnsChart || !Array.isArray(portfolioSummary.tradeReturnsChart.labels) || portfolioSummary.tradeReturnsChart.labels.length === 0">
                <div class="no-data-message" style="display:flex; align-items: center; justify-content: center; height: 100%; color: var(--text2);">
                  <strong>No Closed Trades Yet</strong>
                </div>
              </template>
              <template v-else>
                <Bar :data="tradeReturnsChartData" :options="(tradeReturnsChartOptions as any)" />
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
    <section class="portfolio-container">
      <div class="portfolio-header">
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
    :user="user?.Username ?? ''"
    :api-key="apiKey"
    :portfolio="selectedPortfolioIndex"
    @close="showTradeModal = false"
    @refresh-history="{ fetchCash(); fetchPortfolio(); fetchTransactionHistory(); fetchPortfolioSummary(); showTradeModal = false }"
    :cash="cash"
    @notify="showNotification($event)"
  />
        <SellTradePopup
    v-if="showSellModal"
    :symbol="sellPosition.symbol"
    :maxShares="sellPosition.shares"
    :price="sellPosition.price"
    :currentPrice="latestQuotes[sellPosition.symbol]"
    :isShort="sellPosition.isShort"
    @close="showSellModal = false"
    @sell="handleSell"
    :user="user?.Username ?? ''"
    :api-key="apiKey"
    :portfolio="selectedPortfolioIndex"
    @notify="showNotification($event)"
  />
  <AddCashPopup
    v-if="showAddCashModal"
    :user="user?.Username ?? ''"
    :api-key="apiKey"
    :portfolio="selectedPortfolioIndex"
    @close="showAddCashModal = false"
    @refresh="() => { fetchCash(); fetchPortfolio(); fetchTransactionHistory(); fetchPortfolioSummary(); showAddCashModal = false }"
    @notify="showNotification($event)"
  />
  <WithdrawCashPopup
    v-if="showWithdrawCashModal"
    :user="user?.Username ?? ''"
    :api-key="apiKey"
    :portfolio="selectedPortfolioIndex"
    :available-cash="cash"
    @close="showWithdrawCashModal = false"
    @refresh="() => { fetchCash(); fetchPortfolio(); fetchTransactionHistory(); fetchPortfolioSummary(); showWithdrawCashModal = false }"
    @notify="showNotification($event)"
  />
  <BaseValuePopup
    v-if="showBaseValueModal"
    :user="user?.Username ?? ''"
    :api-key="apiKey"
    :portfolio="selectedPortfolioIndex"
    @close="showBaseValueModal = false"
    @base-value-updated="fetchPortfolioSummary(); fetchPortfolio(); showBaseValueModal = false"
    @notify="showNotification($event)"
  />
  <ImportPortfolioPopup
    v-if="showImportPopup"
    :user="user?.Username ?? ''"
    :api-key="apiKey"
    :portfolio="selectedPortfolioIndex"
    @close="showImportPopup = false"
    @imported="() => { fetchCash(); fetchPortfolio(); fetchTransactionHistory(); fetchPortfolioSummary(); showImportPopup = false }"
    @import-success="showNotification('Portfolio imported successfully!')"
    @notify="showNotification($event)"
  />
  <DeleteTradePopup
    v-if="showDeleteTradeModal && tradeToDelete"
    :trade="tradeToDelete"
    :user="user?.Username ?? ''"
    :api-key="apiKey"
    :portfolio="selectedPortfolioIndex"
    @close="showDeleteTradeModal = false"
    @deleted="handleTradeDeleted"
    @notify="showNotification($event)"
  />
  <EditTradePopup
    v-if="showEditTradeModal && tradeToEdit"
    :trade="tradeToEdit"
    :user="user?.Username ?? ''"
    :api-key="apiKey"
    :portfolio="selectedPortfolioIndex"
    @close="showEditTradeModal = false"
    @updated="handleTradeUpdated"
    @notify="showNotification($event)"
  />
      </div>
      <div class="portfolio-main-flex">
        <div class="portfolio-pie-container card" aria-label="Portfolio allocation pie chart">
          <div class="chart-inner-wrapper pie-chart-wrapper">
            <template v-if="(portfolioSummary?.positionsCount !== undefined ? portfolioSummary.positionsCount <= 100 : portfolio.length <= 100)">
              <template v-if="portfolio.length === 0 && cash === 0">
                <div class="no-positions-message" style="display:flex; flex-direction: column; justify-content: center; align-items: center; padding: 24px; color: var(--text2);">
                  <strong>No Positions Available</strong>
                </div>
              </template>
              <template v-else>
                <Pie :data="pieChartData" :options="pieOptions" />
              </template>
            </template>
            <template v-else>
              <div class="too-many-positions-message" style="display:flex; flex-direction: column; justify-content: center; align-items: center; padding: 24px; color: var(--text2);">
                <strong>Too many positions to display pie chart.</strong><br>
                Please reduce the number of positions to view allocation breakdown.
              </div>
            </template>
          </div>
        </div>
        <div class="portfolio-table-container card scrollable-table">
          <table class="portfolio-table-header" aria-label="Portfolio Positions Table Header">
            <thead>
              <tr>
                <th>% Portfolio</th>
                <th>Symbol</th>
                <th>Type</th>
                <th>Shares</th>
                <th>Avg. Price</th>
                <th>Current Price</th>
                <th>Total Value</th>
                <th>PnL (%)</th>
                <th>PnL ($)</th>
                <th>Actions</th>
              </tr>
            </thead>
          </table>
          <div class="portfolio-table-body-wrapper">
            <table class="portfolio-table" aria-label="Portfolio Positions Table">
              <tbody>
              <!-- Cash row always at the top -->
              <tr class="cash-row">
                <td>{{ getPercOfCash() }}%</td>
                <td>Cash</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>${{ cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                <td>-</td>
                <td>-</td>
                <td>
                  <button class="action-btn"
                    @click="showWithdrawCashModal = true"
                    :disabled="cash <= 0"
                    :aria-label="`Withdraw Cash`">
                    Withdraw
                  </button>
                </td>
              </tr>
              <tr v-if="portfolio.length === 0 && cash === 0">
                <td colspan="10" style="text-align:center; color: var(--text2);">
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
                <td>
                  <span 
                    :class="['position-type-badge', position.IsShort ? 'short' : 'long']"
                    :title="position.IsShort ? 'Short Position' : 'Long Position'"
                  >
                    {{ position.IsShort ? 'Short' : 'Long' }}
                  </span>
                  <span 
                    v-if="position.Leverage && position.Leverage > 1" 
                    class="leverage-badge"
                    :title="`${position.Leverage}x Leverage`"
                  >
                    {{ position.Leverage }}x
                  </span>
                </td>
                <td>{{ position.Shares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
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
                    {{ Number(getPnLPercent(position)) > 0 ? '+' : '' }}{{ getPnLPercent(position) }}%
                  </span>
                </td>
                <td :class="getPnLClass(position)">
                  <span v-if="latestQuotes[position.Symbol] !== undefined">
                    {{ Number(getPnLDollar(position)) > 0 ? '+' : '' }}${{ getPnLDollar(position) }}
                  </span>
                </td>
                <td>
                  <button class="action-btn"
                    @click="openSellModal({ symbol: position.Symbol, shares: position.Shares, price: position.AvgPrice, isShort: position.IsShort })"
                    :aria-label="`Sell ${position.Symbol}`">
                    Close
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>
      
      <!-- Monthly Performance Analysis Section -->
      <div class="monthly-performance-container card" v-if="monthlyPerformanceData.length > 0">
        <div class="monthly-perf-header">
          <h2>Monthly Performance Analysis <span class="beta-badge">BETA</span></h2>
          <div class="perf-summary">
            <span class="winning-months">{{ winningMonthsCount }} Winning</span>
            <span class="losing-months">{{ losingMonthsCount }} Losing</span>
            <span class="no-activity-months">{{ noActivityMonthsCount }} No Activity</span>
          </div>
        </div>
        <div class="monthly-perf-main">
          <div class="monthly-perf-scroll">
            <div v-for="month in monthlyPerformanceData" :key="month.period" class="monthly-perf-card">
            <div class="month-header">
              <div class="month-title">
                <span class="month-label">{{ month.monthName }} {{ month.year }}</span>
                <span class="trade-count">{{ month.tradeCount }} {{ month.tradeCount === 1 ? 'trade' : 'trades' }}</span>
              </div>
              <div class="month-return" :class="month.monthlyReturn >= 0 ? 'positive' : 'negative'">
                {{ month.monthlyReturn >= 0 ? '+' : '' }}{{ month.monthlyReturn.toFixed(2) }}%
              </div>
            </div>
            <div class="month-stats">
              <div class="stat-row">
                <span class="stat-label">Starting Value</span>
                <span class="stat-value">${{ month.startingValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Ending Value</span>
                <span class="stat-value">${{ month.endingValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
              </div>
              <div class="stat-row" v-if="month.netCashFlow !== 0">
                <span class="stat-label">Cash Flow</span>
                <span class="stat-value" :class="month.netCashFlow >= 0 ? 'neutral' : 'neutral'">
                  {{ month.netCashFlow >= 0 ? '+' : '' }}${{ Math.abs(month.netCashFlow).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </span>
              </div>
              <div class="stat-row">
                <span class="stat-label">P/L</span>
                <span class="stat-value" :class="month.profitLoss >= 0 ? 'positive' : 'negative'">
                  {{ month.profitLoss >= 0 ? '+' : '-' }}${{ Math.abs(month.profitLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Win Rate</span>
                <span class="stat-value">{{ month.winRate.toFixed(1) }}%</span>
              </div>
              <div class="stat-row" v-if="month.winningTrades > 0">
                <span class="stat-label">Avg. Win</span>
                <span class="stat-value positive">+${{ month.avgWin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
              </div>
              <div class="stat-row" v-if="month.losingTrades > 0">
                <span class="stat-label">Avg. Loss</span>
                <span class="stat-value negative">-${{ Math.abs(month.avgLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
              </div>
              <div class="stat-row" v-if="month.profitFactor !== null">
                <span class="stat-label">Profit Factor</span>
                <span class="stat-value">{{ month.profitFactor.toFixed(2) }}</span>
              </div>
            </div>
            </div>
          </div>
          <div class="monthly-charts-container">
            <div class="monthly-returns-chart card">
              <h3 style="color: var(--accent1); margin-bottom: 12px; font-size: 1rem;">Total P/L (%)</h3>
              <div class="chart-container">
                <Bar :data="monthlyPLDollarChartData" :options="(monthlyPLDollarChartOptions as any)" />
              </div>
            </div>
            <div class="monthly-returns-chart card">
              <h3 style="color: var(--accent1); margin-bottom: 12px; font-size: 1rem;">Monthly Returns (%)</h3>
              <div class="chart-container">
                <Bar :data="monthlyReturnsChartData" :options="(monthlyReturnsChartOptions as any)" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="portfolio-history-container card">
        <div class="history-header">
          <h2>Transaction History</h2>
          <div class="history-count" v-if="sortedTransactionHistory.length > 0">
            {{ sortedTransactionHistory.length }} {{ sortedTransactionHistory.length === 1 ? 'Transaction' : 'Transactions' }}
          </div>
        </div>
        <div class="history-table-container">
    <table class="portfolio-table history-table" aria-label="Transaction History Table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Symbol</th>
              <th>Action</th>
              <th>Type</th>
              <th class="number-col">Shares</th>
              <th class="number-col">Price</th>
              <th class="number-col">Fees</th>
              <th class="number-col">Total</th>
              <th class="action-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="sortedTransactionHistory.length === 0" class="empty-state">
              <td colspan="9">
                <div class="empty-state-content">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 2C8.44772 2 8 2.44772 8 3C8 3.55228 8.44772 4 9 4H15C15.5523 4 16 3.55228 16 3C16 2.44772 15.5523 2 15 2H9Z" fill="currentColor"/>
                    <path d="M4 5C4 3.89543 4.89543 3 6 3C6 4.65685 7.34315 6 9 6H15C16.6569 6 18 4.65685 18 3C19.1046 3 20 3.89543 20 5V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V5Z" fill="currentColor"/>
                  </svg>
                  <span>No transaction history</span>
                </div>
              </td>
            </tr>
            <tr v-for="(tx, i) in sortedTransactionHistory" :key="i" :class="{'buy-row': tx.Action === 'Buy', 'sell-row': tx.Action === 'Sell'}">
              <td class="date-col">{{ tx.Date ? tx.Date.slice(0, 10) : '' }}</td>
              <td class="symbol-col">
                <span class="symbol-text">{{ tx.Symbol }}</span>
              </td>
              <td class="action-col">
                <span class="action-badge" :class="tx.Action?.toLowerCase()">
                  {{ tx.Action }}
                </span>
              </td>
              <td class="type-col">
                <div class="badge-group">
                  <span v-if="tx.Leverage && tx.Leverage > 1" class="leverage-badge-small" :title="`${tx.Leverage}x Leverage`">
                    {{ tx.Leverage }}x
                  </span>
                  <span v-if="tx.IsShort" class="short-badge-small" title="Short Position">
                    Short
                  </span>
                  <span v-else-if="tx.Symbol && tx.Action !== 'Cash Deposit' && tx.Action !== 'Cash Withdrawal'" class="long-badge-small" title="Long Position">
                    Long
                  </span>
                  <span v-if="!tx.Symbol || tx.Action === 'Cash Deposit' || tx.Action === 'Cash Withdrawal'" class="neutral-text">-</span>
                </div>
              </td>
              <td class="number-col">{{ tx.Shares || '-' }}</td>
              <td class="number-col price-col">{{ isNaN(Number(tx.Price)) ? '-' : '$' + Number(tx.Price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
              <td class="number-col commission-col">{{ isNaN(Number(tx.Commission)) ? '-' : '$' + Number(tx.Commission).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
              <td class="number-col total-col" :class="tx.Action === 'Buy' || tx.Action === 'Cash Withdrawal' ? 'negative' : tx.Action === 'Sell' || tx.Action === 'Cash Deposit' ? 'positive' : ''">
                ${{ Number(tx.Total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </td>
              <td class="action-col-buttons">
                <button 
                  class="edit-trade-btn" 
                  @click="openEditTradeModal(tx)"
                  :title="`Edit this trade`"
                  aria-label="Edit trade"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M18.5 2.50023C18.8978 2.1024 19.4374 1.87891 20 1.87891C20.5626 1.87891 21.1022 2.1024 21.5 2.50023C21.8978 2.89805 22.1213 3.43762 22.1213 4.00023C22.1213 4.56284 21.8978 5.1024 21.5 5.50023L12 15.0002L8 16.0002L9 12.0002L18.5 2.50023Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <button 
                  class="delete-trade-btn" 
                  @click="openDeleteTradeModal(tx)"
                  :title="`Delete this trade`"
                  aria-label="Delete trade"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </section>
    <NotificationPopup ref="notification" />
  </div>
</template>

<script setup lang="ts">
import Header from '@/components/Header.vue';
import { ref, watch, onMounted, computed, onUnmounted, nextTick } from 'vue';
import TradePopup from '@/components/Portfolio/trade.vue'
import SellTradePopup from '@/components/Portfolio/SellTradePopup.vue'
import AddCashPopup from '@/components/Portfolio/addCash.vue'
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
import { useUserStore } from '@/store/store';
import annotationPlugin from 'chartjs-plugin-annotation';
import ImportPortfolioPopup from '@/components/Portfolio/ImportPortfolioPopup.vue';
import DownloadPortfolioPopup from '@/components/Portfolio/DownloadPortfolioPopup.vue'
import BaseValuePopup from '@/components/Portfolio/BaseValue.vue'
import WithdrawCashPopup from '@/components/Portfolio/withdrawCash.vue'
import NotificationPopup from '@/components/NotificationPopup.vue';
import BenchmarkSelector from '@/components/Portfolio/BenchmarkSelector.vue';
import DeleteTradePopup from '@/components/Portfolio/DeleteTradePopup.vue';
import EditTradePopup from '@/components/Portfolio/EditTradePopup.vue';

// access user from store 
const userStore = useUserStore();
const user = computed(() => userStore.getUser);
const apiKey = import.meta.env.VITE_EREUNA_KEY;

// for popup notifications
const notification = ref<InstanceType<typeof NotificationPopup> | null>(null);
const showNotification = (msg: string) => {
  if (notification.value) {
    notification.value.show(msg);
  }
};

// Types
type Position = {
  Symbol: string;
  Shares: number;
  AvgPrice: number;
  Leverage?: number;
  IsShort?: boolean;
};
type Trade = {
  _id?: string;
  Date?: string;
  Symbol?: string;
  Action?: string;
  Shares?: number;
  Price?: number;
  Commission?: number;
  Total?: number;
  Leverage?: number;
  IsShort?: boolean;
};

const showTradeModal = ref(false)
const showSellModal = ref(false)
const sellPosition = ref({ symbol: '', shares: 0, price: 0, isShort: false })
const showAddCashModal = ref(false)
const showWithdrawCashModal = ref(false)
const showImportPopup = ref(false)
const showDownloadPopup = ref(false)
const showBaseValueModal = ref(false)
const showBenchmarkSelector = ref(false)
const portfolioBenchmarks = ref<string[]>([])
const showDeleteTradeModal = ref(false)
const tradeToDelete = ref<Trade | null>(null)
const showEditTradeModal = ref(false)
const tradeToEdit = ref<Trade | null>(null)

function openSellModal(position: { symbol: string; shares: number; price: number; isShort?: boolean }) {
  sellPosition.value = { ...position, isShort: position.isShort || false }
  showSellModal.value = true
}

function openDeleteTradeModal(trade: Trade) {
  tradeToDelete.value = trade
  showDeleteTradeModal.value = true
}

function handleTradeDeleted() {
  showDeleteTradeModal.value = false
  tradeToDelete.value = null
  // Refresh all portfolio data
  setTimeout(() => {
    fetchPortfolio();
    fetchTransactionHistory();
    fetchCash();
    fetchPortfolioSummary();
  }, 300);
}

function openEditTradeModal(trade: Trade) {
  tradeToEdit.value = trade
  showEditTradeModal.value = true
}

function handleTradeUpdated() {
  showEditTradeModal.value = false
  tradeToEdit.value = null
  // Refresh all portfolio data
  setTimeout(() => {
    fetchPortfolio();
    fetchTransactionHistory();
    fetchCash();
    fetchPortfolioSummary();
  }, 300);
}

function handleSell(sellOrder: any) {
  showSellModal.value = false;
  setTimeout(() => {
    fetchTransactionHistory();
    fetchPortfolio();
    fetchCash();
    fetchPortfolioSummary();
  }, 300);
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
function getVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Get theme colors from CSS variables
const accent1 = getVar('--accent1') || '#8c8dfe';
const accent2 = getVar('--accent2') || '#a9a5ff';
const accent3 = getVar('--accent3') || '#cfcbff';
const accent4 = getVar('--accent4') || '#a9a5ff53';
const base1 = getVar('--base1') || '#1e1e2f';
const text1 = getVar('--text1') || '#ffffff';
const text2 = getVar('--text2') || '#cad3f5';
const volume = getVar('--volume') || '#4d4d4d';
const ma4 = getVar('--ma4') || '#4caf50';
const ma3 = getVar('--ma3') || '#ffeb3b';
const ma2 = getVar('--ma2') || '#2862ff';
const ma1 = getVar('--ma1') || '#00bcd4';

// Compute RGB values for theme colors
const positiveRgb = getVar('--positive').replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(', ');
const negativeRgb = getVar('--negative').replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(', ');
const accentRgb = getVar('--accent1').replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(', ');

// Compute badge backgrounds and borders
const buyBg = `rgba(${positiveRgb}, 0.15)`;
const buyBorder = `rgba(${positiveRgb}, 0.3)`;
const sellBg = `rgba(${negativeRgb}, 0.15)`;
const sellBorder = `rgba(${negativeRgb}, 0.3)`;
const longBg = `rgba(${positiveRgb}, 0.15)`;
const longBorder = `rgba(${positiveRgb}, 0.35)`;
const shortBg = `rgba(${negativeRgb}, 0.15)`;
const shortBorder = `rgba(${negativeRgb}, 0.35)`;
const cashBg = `rgba(${accentRgb}, 0.15)`;
const cashBorder = `rgba(${accentRgb}, 0.3)`;
const leverageBg = `rgba(${accentRgb}, 0.15)`;
const leverageBorder = `rgba(${accentRgb}, 0.35)`;

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
  const positionsWithQuotes = (portfolio.value as Position[]).filter(
    pos => latestQuotes.value[pos.Symbol] !== undefined
  );

  const labels = [
    ...positionsWithQuotes.map(pos => pos.Symbol),
    'CASH'
  ];

  const data = [
    ...positionsWithQuotes.map(
      pos => Number(latestQuotes.value[pos.Symbol]) * Number(pos.Shares)
    ),
    cash.value
  ];

  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: themeColors,
        borderColor: base1,
        borderWidth: 2
      }
    ]
  };
});

function getPnLDollar(position: Position): string {
  const close = latestQuotes.value[position.Symbol];
  if (close === undefined || close === null) return '';
  if (!position.AvgPrice) return '';
  
  // For short positions, profit when price goes down
  if (position.IsShort) {
    return ((position.AvgPrice - close) * position.Shares).toFixed(2);
  }
  
  // For long positions, profit when price goes up
  return ((close - position.AvgPrice) * position.Shares).toFixed(2);
}


const pieOptions = computed(() => ({
  responsive: true,
  // allow the canvas to expand to the container height set in CSS
  maintainAspectRatio: false,
  // Adjust space around the chart so the pie doesn't touch container edges
  layout: {
    padding: {
      top: 18,
      bottom: 18,
      left: 18,
      right: 18
    }
  },
  // control pie radius; smaller value means more inner padding
  radius: '70%',
  plugins: {
    legend: {
      display: false, // Hide the legend
    },
    tooltip: {
      enabled: true, // Show tooltip on hover/click
      callbacks: {
        label: function(context: any) {
          // Show label and value in tooltip
          const label = context.label || '';
          const value = context.parsed || 0;
          return `${label}: $${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
      },
    }
  }
}));

// --- Total Value Over Time (Line Chart) ---

const lineData = computed(() => {
  const history = portfolioValueHistory.value as { date: string; value: number }[];
  
  return {
    labels: history.map((h) => h.date),
    datasets: [
      {
        label: 'Total Value (Positions + Cash)',
        data: history.map((h) => h.value),
        borderColor: accent1,
        backgroundColor: accent1,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: accent1,
        borderWidth: 2,
      }
    ]
  };
});

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: { 
      display: false 
    },
    tooltip: { 
      enabled: true,
      mode: 'index' as const,
      intersect: false,
      backgroundColor: base1,
      titleColor: text1,
      bodyColor: text2,
      borderColor: accent1,
      borderWidth: 1,
      padding: 12,
      displayColors: false,
      callbacks: {
        title: (context: any) => {
          return context[0].label;
        },
        label: (context: any) => {
          return '$' + context.parsed.y.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
        }
      }
    }
  },
  elements: {
    line: {
      borderWidth: 2
    },
    point: {
      radius: 0,
      hitRadius: 10,
      hoverRadius: 6
    }
  },
  scales: {
    x: {
      display: true,
      grid: { 
        display: false,
        drawBorder: false
      },
      ticks: {
        display: false
      }
    },
    y: {
      display: true,
      position: 'right' as const,
      grid: { 
        display: false,
        drawBorder: false
      },
      ticks: { 
        color: text2,
        font: {
          size: 11
        },
        padding: 8,
        callback: function(value: any) {
          return '$' + value.toLocaleString();
        }
      }
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
      `/api/trades?username=${user.value?.Username ?? ''}&portfolio=${selectedPortfolioIndex.value}&limit=${tradesLimit.value}&skip=${tradesSkip.value}`,
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
    if ((error as any).name === 'AbortError') {
      return;
    }
  showNotification('Error fetching transaction history.');
  } finally {
    tradesLoading.value = false;
  }
}

const sortedTransactionHistory = computed(() => {
  // Only sort the windowed batch
  return [...(windowedTransactionHistory.value as Trade[])].sort((a, b) => {
    if (!a.Date) return 1;
    if (!b.Date) return -1;
    return new Date(b.Date).getTime() - new Date(a.Date).getTime();
  });
});

const portfolio = ref<Position[]>([]); // Holds loaded positions
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
      `/api/portfolio?username=${user.value?.Username ?? ''}&portfolio=${selectedPortfolioIndex.value}&limit=${portfolioLimit.value}&skip=${portfolioSkip.value}`,
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
    if ((error as any).name === 'AbortError') {
      return;
    }
  showNotification('Error fetching portfolio.');
  } finally {
    portfolioLoading.value = false;
  }
}

const latestQuotes = ref<Record<string, number>>({}); // { [symbol]: price }

let ws: WebSocket | null = null;
let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let wsTimeout: ReturnType<typeof setTimeout> | null = null;
let wsConnected = false;

async function fetchQuotes() {
  if (!portfolio.value.length) {
    return;
  }
  const symbols = portfolio.value.map((p) => p.Symbol).join(',');
  const headers = { 'x-api-key': apiKey };

  // Helper to update quotes from message
  function handleWSMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      if (data && typeof data === 'object') {
        latestQuotes.value = data;
      }
    } catch (e) {
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
  const wsUrl = `${wsProto}://${window.location.host}/ws/quotes?symbols=${symbols}`;
    ws = new WebSocket(wsUrl, apiKey);
    ws.onopen = () => {
      wsConnected = true;
      // Optionally, send a ping or subscribe message if needed
    };
    ws.onmessage = handleWSMessage;
    ws.onerror = () => {
      wsConnected = false;
      if (ws) ws.close();
      // No error logging here
    };
    ws.onclose = () => {
      wsConnected = false;
      // Try to reconnect after 60s if portfolio still exists
      if (portfolio.value.length) {
        wsReconnectTimer = setTimeout(connectWS, 60000);
      }
      // No error logging here
    };

    // Fallback to REST if no message after 2s
    wsTimeout = setTimeout(async () => {
      if (!wsConnected || Object.keys(latestQuotes.value).length === 0) {
        try {
          const response = await fetch(`/api/quotes?symbols=${symbols}`, { headers });
          if (!response.ok) return;
          const data = await response.json();
          latestQuotes.value = data;
        } catch {
          // No error logging here
        }
      }
    }, 2000);
  }

  try {
    connectWS();
  } catch {
    // If websocket fails, fallback to REST
    try {
      const response = await fetch(`/api/quotes?symbols=${symbols}`, { headers });
      if (!response.ok) return;
      const data = await response.json();
      latestQuotes.value = data;
    } catch {
      // No error logging here
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
  if (newVal.length) fetchQuotes();
});

onMounted(() => {
  fetchQuotes();
});

function getPnLPercent(position: Position): string {
  const close = latestQuotes.value[position.Symbol];
  if (close === undefined || close === null) return '';
  if (!position.AvgPrice) return '';
  
  // For short positions, profit when price goes down
  if (position.IsShort) {
    const pnlPerc = ((position.AvgPrice - close) / position.AvgPrice) * 100;
    return pnlPerc.toFixed(2);
  }
  
  // For long positions, profit when price goes up
  const pnlPerc = ((close - position.AvgPrice) / position.AvgPrice) * 100;
  return pnlPerc.toFixed(2);
}

function getPnLClass(position: Position): string {
  const close = latestQuotes.value[position.Symbol];
  if (close === undefined || close === null) return '';
  
  // For short positions, green when price goes down, red when goes up
  if (position.IsShort) {
    return close <= position.AvgPrice ? 'positive' : 'negative';
  }
  
  // For long positions, green when price goes up, red when goes down
  return close >= position.AvgPrice ? 'positive' : 'negative';
}

function getCurrentPrice(position: Position): string {
  const close = latestQuotes.value[position.Symbol];
  if (close === undefined || close === null) return '';
  return close.toFixed(2);
}

function getTotalValue(position: Position): string {
  const close = latestQuotes.value[position.Symbol];
  if (close === undefined || close === null) return '';
  return (close * position.Shares).toFixed(2);
}

function getPercOfPortfolio(position: Position): string {
  const total = totalPortfolioValue2.value;
  const close = latestQuotes.value[position.Symbol];
  if (!total || close === undefined || close === null) return '';
  const perc = ((close * position.Shares) / total) * 100;
  return perc.toFixed(2);
}

function getPercOfCash() {
  const total = totalPortfolioValue2.value;
  if (!total) return '0.00';
  return ((cash.value / total) * 100).toFixed(2);
}

const totalPortfolioValue2 = computed(() => {
  const positionsValue = (portfolio.value as Position[]).reduce((sum, pos) => {
    const close = latestQuotes.value[pos.Symbol];
    if (close === undefined || close === null) return sum;
    return sum + close * pos.Shares;
  }, 0);
  return positionsValue + cash.value;
});

// Computed: portfolioValueHistory from backend summary
type PortfolioSummary = {
  portfolioValueHistory?: { date: string; value: number }[];
  tradeReturnsChart?: {
    labels?: string[];
    bins: { count: number; positive: boolean }[];
    medianBinIndex?: number;
  };
  BaseValue?: number;
  totalPortfolioValue2?: number;
  totalPortfolioValue?: number;
  cash?: number;
  totalPL?: number;
  totalPLPercent?: string | number;
  unrealizedPL?: number;
  unrealizedPLPercent?: string | number;
  realizedPL?: number;
  realizedPLPercent?: string | number;
  avgPositionSize?: number;
  avgHoldTimeWinners?: number;
  avgHoldTimeLosers?: number;
  avgGain?: number;
  avgLoss?: number;
  avgGainAbs?: number;
  avgLossAbs?: number;
  gainLossRatio?: number;
  riskRewardRatio?: number;
  winnerCount?: number;
  winnerPercent?: number;
  loserCount?: number;
  loserPercent?: number;
  breakevenCount?: number;
  breakevenPercent?: number;
  profitFactor?: number;
  sortinoRatio?: number;
  biggestWinner?: {
    ticker?: string;
    amount?: number;
    tradeCount?: number;
  };
  biggestLoser?: {
    ticker?: string;
    amount?: number;
    tradeCount?: number;
  };
  positionsCount?: number;
  benchmarkPerformance?: {
    symbol: string;
    inceptionPrice: number;
    currentPrice: number;
    return: number;
    portfolioReturn: number;
    outperformance: number;
    beating: boolean;
  }[];
};
const portfolioSummary = ref<PortfolioSummary | null>(null);
const portfolioValueHistory = computed(() => {
  return (portfolioSummary.value?.portfolioValueHistory ?? []) as { date: string; value: number }[];
});

const showResetDialog = ref(false)
const resetError = ref('')

async function confirmResetPortfolio() {
  resetError.value = '';
  try {
    const headers = { 'x-api-key': apiKey, 'Content-Type': 'application/json' };
    const response = await fetch(
      `/api/portfolio?username=${user.value?.Username ?? ''}&portfolio=${selectedPortfolioIndex.value}`,
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
    showNotification('Portfolio reset successfully!');
  } catch (error) {
    resetError.value = 'Error resetting portfolio: ' + (error instanceof Error ? error.message : String(error));
    showNotification('Error resetting portfolio.');
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
      `/api/portfolio/cash?username=${user.value?.Username ?? ''}&portfolio=${selectedPortfolioIndex.value}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    cash.value = data.cash || 0; // Assign the cash value
    baseValue.value = data.BaseValue || 0; // Assign the BaseValue

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }
  showNotification('Error fetching cash balance.');
  }
}

const tradeReturnsChartData = computed(() => {
  const chart = portfolioSummary.value?.tradeReturnsChart;
  if (!chart || !Array.isArray(chart.labels) || !Array.isArray(chart.bins)) return { labels: [], datasets: [] };
  return {
    labels: chart.labels,
    datasets: [
      {
        label: 'Number of Trades',
        data: chart.bins.map((b: { count: number; positive: boolean }) => b.count),
        backgroundColor: chart.bins.map((b: { count: number; positive: boolean }) => b.positive ? `rgba(${getVar('--positive').replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(', ')}, 0.7)` : `rgba(${getVar('--negative').replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(', ')}, 0.7)`),
        borderColor: chart.bins.map((b: { count: number; positive: boolean }) => b.positive ? getVar('--positive') : getVar('--negative')),
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  };
});

const tradeReturnsChartOptions = computed(() => {
  const chart = portfolioSummary.value?.tradeReturnsChart;
  const medianBinLabel = Array.isArray(chart?.labels) && typeof chart?.medianBinIndex === 'number' ? chart.medianBinIndex : undefined;
  return {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
    },
    scales: {
      x: { 
        ticks: { display: false },
        grid: { display: false }
      },
      y: {
        ticks: { color: getVar('--text2') },
        title: { display: true, text: 'Number of Trades', color: getVar('--text2') },
        grid: { display: false }
      }
    }
  };
});

// --- Portfolio Switching Logic ---
const selectedPortfolioIndex = ref(0);

function selectPortfolio(idx: number) {
  selectedPortfolioIndex.value = idx;
  fetchPortfolio();
  fetchTransactionHistory();
  fetchCash();
  fetchPortfolioSummary();
  fetchBenchmarks();
}

// --- Benchmark Functions ---
async function fetchBenchmarks() {
  try {
    const headers = { 'x-api-key': apiKey };
    const response = await fetch(
      `/api/portfolio/benchmarks?username=${user.value?.Username ?? ''}&portfolio=${selectedPortfolioIndex.value}`,
      { headers }
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    portfolioBenchmarks.value = data.benchmarks || [];
  } catch (error) {
    portfolioBenchmarks.value = [];
  }
}

function handleBenchmarksSaved(benchmarks: string[]) {
  portfolioBenchmarks.value = benchmarks;
  fetchPortfolioSummary(); // Refresh to get benchmark data
}

function removeBenchmark(index: number) {
  const updatedBenchmarks = [...portfolioBenchmarks.value];
  updatedBenchmarks.splice(index, 1);
  saveBenchmarksDirectly(updatedBenchmarks);
}

async function saveBenchmarksDirectly(benchmarks: string[]) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    };
    const response = await fetch('/api/portfolio/benchmarks', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        username: user.value?.Username ?? '',
        portfolio: selectedPortfolioIndex.value,
        benchmarks
      })
    });
    if (!response.ok) throw new Error('Failed to update benchmarks');
    portfolioBenchmarks.value = benchmarks;
    showNotification('Benchmark removed successfully');
    fetchPortfolioSummary(); // Refresh to update benchmark performance data
  } catch (error) {
    showNotification('Failed to remove benchmark');
  }
}

// On mount, load the first portfolio by default
onMounted(() => {
  selectPortfolio(0);
});

// Infinite scroll for portfolio positions
let portfolioTableContainer: HTMLElement | null = null;
let transactionHistoryContainer: HTMLElement | null = null;

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
    portfolioTableContainer = document.querySelector('.portfolio-table-body-wrapper');
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

async function fetchPortfolioSummary() {
  try {
    const headers = { 'x-api-key': apiKey };
    const response = await fetch(
      `/api/portfolio/summary?username=${user.value?.Username ?? ''}&portfolio=${selectedPortfolioIndex.value}`,
      { headers }
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    portfolioSummary.value = data;
  } catch (error) {
    portfolioSummary.value = null;
  }
}

const isPortfolioBlank = computed(() => {
  return portfolio.value.length === 0 && transactionHistory.value.length === 0 && cash.value === 0;
});

// --- Monthly Performance Analysis ---
type MonthlyPerformance = {
  period: string;
  monthName: string;
  year: number;
  startingValue: number;
  endingValue: number;
  netCashFlow: number;
  profitLoss: number;
  monthlyReturn: number;
  tradeCount: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number | null;
};

const monthlyPerformanceData = computed<MonthlyPerformance[]>(() => {
  const valueHistory = portfolioValueHistory.value;
  const trades = transactionHistory.value as Trade[];
  
  if (!trades || trades.length === 0) return [];

  // Find the date of the first transaction (inception)
  const tradeDates = trades
    .map(t => t.Date ? new Date(t.Date) : null)
    .filter(d => d !== null) as Date[];
  
  if (tradeDates.length === 0) return [];
  
  const inceptionDate = new Date(Math.min(...tradeDates.map(d => d.getTime())));
  const currentDate = new Date();
  
  // Generate all month keys from inception to current month
  const allMonthKeys: string[] = [];
  let iterDate = new Date(inceptionDate.getFullYear(), inceptionDate.getMonth(), 1);
  const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  
  while (iterDate <= endDate) {
    const monthKey = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, '0')}`;
    allMonthKeys.push(monthKey);
    iterDate.setMonth(iterDate.getMonth() + 1);
  }

  // Group ALL trades by month
  const monthlyTrades = new Map<string, Trade[]>();
  trades.forEach(trade => {
    if (!trade.Date) return;
    const date = new Date(trade.Date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyTrades.has(monthKey)) {
      monthlyTrades.set(monthKey, []);
    }
    monthlyTrades.get(monthKey)?.push(trade);
  });

  // Group portfolio values by month using actual data
  const monthlyValues = new Map<string, { values: number[], dates: string[] }>();
  
  if (valueHistory && valueHistory.length > 0) {
    valueHistory.forEach(entry => {
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyValues.has(monthKey)) {
        monthlyValues.set(monthKey, { values: [], dates: [] });
      }
      monthlyValues.get(monthKey)?.values.push(entry.value);
      monthlyValues.get(monthKey)?.dates.push(entry.date);
    });
  }
  
  const monthlyData: MonthlyPerformance[] = [];
  let previousEndingValue = 0; // Start from 0, not BaseValue

  allMonthKeys.forEach((monthKey, index) => {
    const [year, month] = monthKey.split('-').map(Number);
    const monthDate = new Date(year, month - 1, 1);
    const monthName = monthDate.toLocaleString('default', { month: 'short' });

    // Get portfolio values for this month
    const monthData = monthlyValues.get(monthKey);
    
    // Starting value should always be the previous month's ending value for continuity
    // Exception: first month starts at 0
    let startingValue = previousEndingValue;
    let endingValue = previousEndingValue;

    if (monthData && monthData.values.length > 0) {
      // Use the last value of this month as the ending value
      const sortedDates = [...monthData.dates].sort();
      const lastDateIndex = monthData.dates.indexOf(sortedDates[sortedDates.length - 1]);
      endingValue = monthData.values[lastDateIndex];
    }

    // Get trades for this month
    const monthTrades = monthlyTrades.get(monthKey) || [];
    
    // Calculate net cash flow for this month (deposits - withdrawals)
    let netCashFlow = 0;
    monthTrades.forEach(trade => {
      if (trade.Action === 'Cash Deposit') {
        netCashFlow += trade.Total || 0;
      } else if (trade.Action === 'Cash Withdrawal') {
        netCashFlow += trade.Total || 0; // Total is already negative for withdrawals
      }
    });
    
    // Calculate trade statistics from actual closed positions
    let totalGains = 0;
    let totalLosses = 0;
    let winningTrades = 0;
    let losingTrades = 0;

    // Track buy and sell transactions to match them
    const positionMap = new Map<string, { avgPrice: number, shares: number }>();

    monthTrades.forEach(trade => {
      // Skip cash transactions
      if (trade.Action === 'Cash Deposit' || trade.Action === 'Cash Withdrawal') return;
      if (!trade.Symbol || trade.Symbol === '-') return;
      
      const symbol = trade.Symbol;
      const shares = trade.Shares || 0;
      const price = trade.Price || 0;
      const commission = trade.Commission || 0;
      
      if (trade.Action === 'Buy' && !trade.IsShort) {
        // Opening or adding to long position
        const current = positionMap.get(symbol) || { avgPrice: 0, shares: 0 };
        const totalCost = (current.avgPrice * current.shares) + (price * shares);
        const totalShares = current.shares + shares;
        positionMap.set(symbol, {
          avgPrice: totalCost / totalShares,
          shares: totalShares
        });
      } else if (trade.Action === 'Sell' && !trade.IsShort) {
        // Closing long position - calculate P/L
        const current = positionMap.get(symbol);
        if (current && current.shares > 0) {
          const costBasis = current.avgPrice * shares;
          const saleProceeds = (price * shares) - commission;
          const pl = saleProceeds - costBasis;
          
          if (pl > 0) {
            totalGains += pl;
            winningTrades++;
          } else if (pl < 0) {
            totalLosses += Math.abs(pl);
            losingTrades++;
          }
          
          // Update position
          const remainingShares = current.shares - shares;
          if (remainingShares > 0) {
            positionMap.set(symbol, { avgPrice: current.avgPrice, shares: remainingShares });
          } else {
            positionMap.delete(symbol);
          }
        }
      }
    });

    // Update for next iteration
    previousEndingValue = endingValue;

    // Calculate metrics with TIME-WEIGHTED return (excluding cash flows)
    const profitLoss = endingValue - startingValue;
    let monthlyReturn = 0;
    
    // If previous month was 0 and we had cash deposits, this is inception month
    if (index === 0 || (startingValue === 0 && netCashFlow > 0)) {
      // First month or first month with activity: calculate return based on growth from deposits
      monthlyReturn = netCashFlow > 0 ? ((endingValue - netCashFlow) / netCashFlow) * 100 : 0;
    } else {
      // Normal months: use time-weighted return
      // Adjust for cash flows: (Ending - Starting - NetCashFlow) / (Starting + NetCashFlow)
      const baseWithCash = startingValue + netCashFlow;
      const investmentReturn = endingValue - baseWithCash;
      monthlyReturn = baseWithCash > 0 ? (investmentReturn / baseWithCash) * 100 : 0;
    }
    
    const totalTrades = winningTrades + losingTrades;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgWin = winningTrades > 0 ? totalGains / winningTrades : 0;
    const avgLoss = losingTrades > 0 ? totalLosses / losingTrades : 0;
    const profitFactor = totalLosses > 0 ? totalGains / totalLosses : totalGains > 0 ? 999 : null;

    monthlyData.push({
      period: monthKey,
      monthName,
      year,
      startingValue,
      endingValue,
      netCashFlow,
      profitLoss,
      monthlyReturn,
      tradeCount: monthTrades.length,
      winningTrades,
      losingTrades,
      winRate,
      avgWin,
      avgLoss,
      profitFactor
    });
  });

  // Return in reverse chronological order (most recent first)
  return monthlyData.reverse();
});

const winningMonthsCount = computed(() => {
  return monthlyPerformanceData.value.filter(m => m.monthlyReturn > 0).length;
});

const losingMonthsCount = computed(() => {
  return monthlyPerformanceData.value.filter(m => m.monthlyReturn < 0).length;
});

const noActivityMonthsCount = computed(() => {
  return monthlyPerformanceData.value.filter(m => m.monthlyReturn === 0).length;
});

// Monthly Returns Chart Data
const monthlyReturnsChartData = computed(() => {
  const data = [...monthlyPerformanceData.value].reverse(); // Chronological order for chart
  
  return {
    labels: data.map(m => `${m.monthName} '${String(m.year).slice(2)}`),
    datasets: [
      {
        label: 'Monthly Return %',
        data: data.map(m => m.monthlyReturn),
        backgroundColor: data.map(m => 
          m.monthlyReturn >= 0 
            ? `rgba(${positiveRgb}, 0.7)` 
            : `rgba(${negativeRgb}, 0.7)`
        ),
        borderColor: data.map(m => 
          m.monthlyReturn >= 0 
            ? getVar('--positive') 
            : getVar('--negative')
        ),
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  };
});

const monthlyReturnsChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      backgroundColor: base1,
      titleColor: text1,
      bodyColor: text2,
      borderColor: accent1,
      borderWidth: 1,
      padding: 12,
      callbacks: {
        label: (context: any) => {
          const value = context.parsed.y;
          return `Return: ${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
        }
      }
    }
  },
  scales: {
    x: {
      ticks: { 
        color: text2,
        font: { size: 10 },
        maxRotation: 45,
        minRotation: 45
      },
      grid: { display: false }
    },
    y: {
      ticks: { 
        color: text2,
        callback: function(value: any) {
          return value + '%';
        }
      },
      grid: { 
        color: 'rgba(255, 255, 255, 0.05)',
        drawBorder: false
      },
      beginAtZero: true
    }
  }
}));

// Monthly P/L Percentage Chart Data (Cumulative Total P/L % change)
const monthlyPLDollarChartData = computed(() => {
  const data = [...monthlyPerformanceData.value].reverse(); // Chronological order for chart
  
  if (data.length === 0) return { labels: [], datasets: [] };
  
  // Calculate cumulative total P/L percentage for each month
  const cumulativePLPercentages = data.map((m, index) => {
    // Find the initial invested capital (first month's starting value + net cash flow)
    const firstMonth = data[0];
    let baseValue = firstMonth.startingValue + firstMonth.netCashFlow;
    
    // If still 0, use the first month with actual value
    if (baseValue === 0) {
      const firstNonZeroMonth = data.find(month => month.endingValue > 0);
      if (!firstNonZeroMonth) return 0;
      baseValue = firstNonZeroMonth.startingValue + firstNonZeroMonth.netCashFlow;
    }
    
    if (baseValue === 0) return 0;
    
    // Calculate total invested up to this month (sum of all net cash flows up to this point)
    let totalInvested = 0;
    for (let i = 0; i <= index; i++) {
      totalInvested += data[i].netCashFlow;
    }
    
    // If no money invested yet, return 0
    if (totalInvested === 0) return 0;
    
    // Calculate cumulative P/L percentage: (current ending value - total invested) / total invested * 100
    const cumulativePL = ((m.endingValue - totalInvested) / totalInvested) * 100;
    return cumulativePL;
  });
  
  return {
    labels: data.map(m => `${m.monthName} '${String(m.year).slice(2)}`),
    datasets: [
      {
        label: 'Total P/L %',
        data: cumulativePLPercentages,
        backgroundColor: cumulativePLPercentages.map(pl => 
          pl >= 0 
            ? `rgba(${positiveRgb}, 0.7)` 
            : `rgba(${negativeRgb}, 0.7)`
        ),
        borderColor: cumulativePLPercentages.map(pl => 
          pl >= 0 
            ? getVar('--positive') 
            : getVar('--negative')
        ),
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  };
});

const monthlyPLDollarChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      backgroundColor: base1,
      titleColor: text1,
      bodyColor: text2,
      borderColor: accent1,
      borderWidth: 1,
      padding: 12,
      callbacks: {
        label: (context: any) => {
          const value = context.parsed.y;
          return `Total P/L: ${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
        }
      }
    }
  },
  scales: {
    x: {
      ticks: { 
        color: text2,
        font: { size: 10 },
        maxRotation: 45,
        minRotation: 45
      },
      grid: { display: false }
    },
    y: {
      ticks: { 
        color: text2,
        callback: function(value: any) {
          return value + '%';
        }
      },
      grid: { 
        color: 'rgba(255, 255, 255, 0.05)',
        drawBorder: false
      },
      beginAtZero: true
    }
  }
}));

</script>

<style lang="scss" scoped>
.portfolio {
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

.portfolio-row {
  display: flex;
  gap: 5px;
  margin-bottom: 5px;
}

.portfolio-row-main {
  display: flex;
  gap: 5px;
  margin-bottom: 5px;
  flex: 1 1 0;
  min-height: 0;
}

.card {
  background: var(--base2);
  padding: 22px;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(10, 20, 30, 0.08);
  border: 1px solid rgba(0,0,0,0.04);
  transition: transform 0.14s ease, box-shadow 0.14s ease;
}

.portfolio-container {
  background: var(--base1);
  color: var(--text1);
  min-height: 80vh;
}

.portfolio-menu {
  display: flex;
  flex-direction: row;
  background-color: var(--base2);
  width: 100%;
  padding: 5px 0px;
  justify-content: space-between; 
  margin-bottom: 5px;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(10, 20, 30, 0.08);
  border: 1px solid rgba(0,0,0,0.04);
}

.benchmark-menu {
  display: flex;
  flex-direction: row;
  background-color: var(--base2);
  width: 100%;
  padding: 5px 0px;
  justify-content: space-between; 
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(10, 20, 30, 0.08);
  border: 1px solid rgba(0,0,0,0.04);
}

.benchmark-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  background-color: var(--base2);
  width: 100%;
  gap: 0px;
  position: relative;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(10, 20, 30, 0.08);
  border: 1px solid rgba(0,0,0,0.04);

  .benchmarks-row {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: flex-start;

    .no-benchmarks {
      color: var(--text2);
      font-size: 0.85rem;
      font-style: italic;
      padding: 8px 12px;
    }
  }

  .edit-watch-panel-btn {
    background-color: transparent;
    position: absolute;
    top: 4px;
    right: 4px;
    color: var(--text2);
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: auto;
    white-space: nowrap;
    margin-right: 6px;

    &:hover {
      background-color: var(--base3);
      color: var(--accent1);
    }

    svg {
      width: 12px;
      height: 12px;
      flex-shrink: 0;
    }

    span {
      font-size: 0.8rem;
      font-weight: 500;
    }
  }
}

.menu-btn {
    background: var(--base3);
    color: var(--text1);
    border: none;
    border-radius: 3px;
    padding: 10px 10px;
    min-width: 100px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
    margin: 2px; 

    &.selected {
      background: var(--accent1);
      color: var(--text3);
    }

    &:hover:enabled {
      background: var(--accent2);
      color: var(--text3);
    }

    &:disabled {
      background: var(--base1);
      color: var(--text2);
      cursor: not-allowed;
      opacity: 1;
    }
}

.portfolio-btn {
    background: var(--base3);
    color: var(--text1);
    border: none;
    border-radius: 3px;
    padding: 10px 10px;
    min-width: 30px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    margin: 2px;

    &.selected {
      background: var(--accent1);
      color: var(--text3);
    }

    &:hover {
      background: var(--accent2);
      color: var(--text3);
    }
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


.portfolio-summary-main {
  display: flex;
  width: 100%;
  align-items: stretch;
  margin-top: 5px;
  gap: 5px;
  height: auto;
}


.portfolio-summary {
  flex: 1 1 0;
  max-width: 33.33%;
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  margin-top: 0;
  height: auto;
  box-sizing: border-box;
  padding: 8px 0;
}

.portfolio-charts {
  flex: 2 1 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: auto;
  box-sizing: border-box;
}

.summary-row {
  display: flex;
  flex-direction: row;
  width: 50%;
  box-sizing: border-box;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--base1);
  transition: background-color 0.15s ease;

  .attribute, .value {
    flex: 1;
    padding-left: 12px;
    padding-right: 12px;
    font-weight: 600;
  }

  .attribute {
    color: var(--text2);
    font-size: 0.85em;
    font-weight: 500;
  }

  .value {
    color: var(--text1);
    text-align: right;
    font-size: 0.9em;

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
  align-items: flex-start;
  flex-wrap: wrap;
  margin-top: 5px;
}

.portfolio-pie-container {
  flex: 1 1 0;
  padding: 6px;
  border-radius: 8px;
  display: flex;
  align-items: stretch;
  justify-content: center;
  
  .pie-chart-wrapper {
    height: 100%;
    padding: 20px;
  }
}

.portfolio-table-container {
  flex: 2 1 0;
  margin-left: 5px;
  height: 310px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.portfolio-table-header {
  width: 100%;
  border-collapse: collapse;
  color: var(--text1);
  table-layout: fixed;

  thead {
    th {
      text-transform: uppercase;
      font-size: 0.7rem;
      letter-spacing: 0.05em;
      color: var(--text2);
      font-weight: 600;
      padding: 12px 16px;
      border-bottom: 2px solid var(--base3);
      background: var(--base1);
      text-align: left;
    }
  }
}

.portfolio-table-body-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
}

.portfolio-table {
  width: 100%;
  border-collapse: collapse;
  color: var(--text1);
  table-layout: fixed;

  tbody {
    tr {
      transition: background-color 0.15s ease;
      
      &:hover {
        background: var(--base2);
      }
    }
  }

  th,
  td {
    padding: 12px 16px;
    text-align: left;
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

.portfolio-history-container {
  margin-top: 5px;
  border-radius: 12px;
  overflow: visible;
}

.history-table-container {
  max-height: 400px;
  overflow-y: auto;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--base2);
  border-bottom: 1px solid var(--base1);

  h2 {
    color: var(--text1);
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.025em;
  }
}

.history-count {
  font-size: 1rem;
  color: var(--text3);
  background: var(--accent1);
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: bold;
}

.history-table {
  thead {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--base1);

    th {
      text-transform: uppercase;
      font-size: 0.7rem;
      letter-spacing: 0.05em;
      color: var(--text2);
      font-weight: 600;
      padding: 12px 16px;
      border-bottom: 2px solid var(--base3);
      background: var(--base1);
    }
  }

  tbody {
    tr {
      transition: background-color 0.15s ease;
      
      &:hover {
        background: var(--base2);
      }

      &.buy-row {
        border-left: 3px solid transparent;
      }

      &.sell-row {
        border-left: 3px solid transparent;
      }
    }

    td {
      padding: 14px 16px;
      font-size: 0.9rem;
      color: var(--text1);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      vertical-align: middle;
    }
  }

  .number-col {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
  }

  .date-col {
    color: var(--text2);
    font-size: 0.85rem;
    font-weight: 500;
  }

  .symbol-col {
    .symbol-text {
      font-weight: 600;
      color: var(--text1);
      font-size: 0.95rem;
    }
  }

  .action-col {
    .action-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;

      &.buy {
        background: var(--buy-bg);
        color: var(--positive);
        border: 1px solid var(--buy-border);
      }

      &.sell {
        background: var(--sell-bg);
        color: var(--negative);
        border: 1px solid var(--sell-border);
      }

      &.cash {
        background: var(--cash-bg);
        color: var(--accent1);
        border: 1px solid var(--cash-border);
      }
    }
  }

  .type-col {
    .badge-group {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    .neutral-text {
      color: var(--text2);
      font-size: 0.85rem;
    }
  }

  .price-col,
  .commission-col {
    color: var(--text2);
    font-size: 0.88rem;
  }

  .total-col {
    font-weight: 600;
    font-size: 0.92rem;
    
    &.positive {
      color: var(--positive);
    }

    &.negative {
      color: var(--text1);
    }
  }

  .empty-state {
    &:hover {
      background: transparent !important;
    }

    td {
      border: none;
      padding: 48px 24px;
    }
  }

  .empty-state-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: var(--text2);

    svg {
      width: 48px;
      height: 48px;
      opacity: 0.3;
    }

    span {
      font-size: 0.95rem;
      font-weight: 500;
    }
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
    color: var(--text3);
  }
}

.delete-trade-btn {
  background: transparent;
  border: none;
  color: var(--text2);
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 0, 0, 0.1);
    color: var(--negative);
  }

  svg {
    pointer-events: none;
  }
}

.edit-trade-btn {
  background: transparent;
  border: none;
  color: var(--text2);
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: color-mix(in srgb, var(--accent1) 15%, transparent);
    color: var(--accent1);
  }

  svg {
    pointer-events: none;
  }
}

.action-col-buttons {
  text-align: center;
  padding: 8px !important;
  display: flex;
  gap: 4px;
  justify-content: center;
  align-items: center;
}

.action-header {
  text-align: center;
}


.portfolio-linechart-container,
.portfolio-bar-chart-container {
  border-radius: 8px;
  padding: 6px;
  overflow: hidden;
}

.portfolio-linechart-container {
  margin-bottom: 5px;
}

.chart-inner-wrapper {
padding: 0px;
  background: var(--base1);
  border-radius: 6px;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.linechart-fixed-height {
  width: 100%;
  max-width: 100%;
  height: 180px;
  position: relative;
  overflow: hidden;
  
  canvas {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    height: 100% !important;
    max-height: 180px !important;
    display: block;
    box-sizing: border-box;
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

/* --- MOBILE RESPONSIVE DESIGN (<=1150px) --- */
@media (max-width: 1150px) {
  .portfolio-menu {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 8px 0;
  }
  .portfolio-menu > div {
    margin: 0 !important;
    flex-wrap: wrap;
    gap: 6px;
  }
  .portfolio-btn, .menu-btn {
    min-width: 40px;
    font-size: 0.85rem;
    padding: 8px 6px;
  }
  .portfolio-summary-main {
    flex-direction: column;
    gap: 10px;
  }
  .portfolio-summary {
    max-width: 100%;
    width: 100%;
    flex-direction: column;
    flex-wrap: nowrap;
  }
  .summary-row {
    width: 100%;
    flex-direction: row;
    font-size: 0.95em;
    padding: 0 2px;
  }
  .portfolio-charts {
    flex-direction: column;
    min-width: 0;
    width: 100%;
    gap: 10px;
  }
  .portfolio-main-flex {
    flex-direction: column;
    gap: 10px;
  }
  .portfolio-pie-container,
  .portfolio-table-container {
    width: 100%;
    margin-left: 0;
    min-width: 0;
    height: auto;
    max-height: 350px;
  }
  
  .portfolio-pie-container {
    padding: 4px;
    
    .chart-inner-wrapper {
      padding: 12px;
    }
  }
  .portfolio-table-container {
    margin-top: 10px;
    max-height: 300px;
  }
  .portfolio-history-container {
    margin-top: 10px;
    max-height: 300px;
    overflow-y: auto;
  }
  .portfolio-table th, .portfolio-table td {
    padding: 8px 6px;
    font-size: 0.92em;
  }
  .portfolio-table {
    font-size: 0.95em;
  }
  .portfolio-linechart-container, .portfolio-bar-chart-container {
    padding: 4px;
  }
  
  .chart-inner-wrapper {
    padding: 12px;
  }
  
  .linechart-fixed-height {
    height: 160px;
    
    canvas {
      max-height: 160px !important;
    }
  }
  .reset-modal {
    min-width: 90vw;
    padding: 18px 4px;
  }
  .portfolio-container {
    min-height: 60vh;
    padding: 0 2px;
  }
  .scrollable-table {
    max-height: 220px;
  }
  .portfolio-table th, .portfolio-table td {
    word-break: break-word;
  }

  /* Hide Import/Export buttons on mobile */
  .portfolio-menu > div:last-child .menu-btn:nth-child(5),
  .portfolio-menu > div:last-child .menu-btn:nth-child(6) {
    display: none !important;
  }
  /* Center and shrink the 10 portfolio buttons */
  .portfolio-menu > div:first-child {
    justify-content: center !important;
    width: 100%;
    display: flex !important;
    margin: 0 auto !important;
    padding: 0;
  }
  .portfolio-btn {
    min-width: 22px;
    max-width: 30px;
    width: 8vw;
    font-size: 0.82rem;
    padding: 7px 2px;
    margin: 2px 2px;
  }
    /* Center the menu-btn area (second div) */
    .portfolio-menu > div:last-child {
      justify-content: center !important;
      width: 100%;
      display: flex !important;
      margin: 0 auto !important;
      padding: 0;
    }

    .menu-btn {
    min-width: 80px;
  }

    .attribute, .value {
    padding: 8px 12px;
  }
}

/* Badge styles for position types and leverage */
.position-type-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 600;
  margin-right: 4px;
}

.position-type-badge.long {
  background: color-mix(in srgb, var(--positive) 20%, transparent);
  color: var(--positive);
  border: 1px solid color-mix(in srgb, var(--positive) 40%, transparent);
}

.position-type-badge.short {
  background: color-mix(in srgb, var(--negative) 20%, transparent);
  color: var(--negative);
  border: 1px solid color-mix(in srgb, var(--negative) 40%, transparent);
}

.leverage-badge {
  display: inline-block;
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: 700;
  background: color-mix(in srgb, var(--accent1) 20%, transparent);
  color: var(--accent1);
  border: 1px solid color-mix(in srgb, var(--accent1) 40%, transparent);
}

.leverage-badge-small,
.short-badge-small,
.long-badge-small {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.leverage-badge-small {
  background: var(--leverage-bg);
  color: var(--accent1);
  border: 1px solid var(--leverage-border);
}

.short-badge-small {
  background: var(--short-bg);
  color: var(--negative);
  border: 1px solid var(--short-border);
}

.long-badge-small {
  background: var(--long-bg);
  color: var(--positive);
  border: 1px solid var(--long-border);
}

/* Benchmark Cards */
.benchmark-performance-section {
  border-radius: 12px;
  padding: 12px 16px;
  overflow: hidden;
  min-height: 80px;
}

.benchmark-empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  color: var(--text2);
  
  svg {
    width: 40px;
    height: 40px;
    opacity: 0.4;
  }
  
  span {
    font-size: 0.9rem;
    font-style: italic;
  }
}

.benchmark-performance-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 0;
  
  &::-webkit-scrollbar {
    height: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--base3);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--accent1);
    border-radius: 3px;
  }
}
.benchmark-card {
  background: var(--base1);
  border-radius: 6px;
  padding: 12px 14px;
  border: 1px solid var(--base4);
  min-width: 180px;
  flex-shrink: 0;
  transition: all 0.2s;
  cursor: default;
}

.benchmark-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 8px;
}

.benchmark-symbol {
  font-size: 1rem;
  font-weight: bold;
  color: var(--accent1);
  white-space: nowrap;
}

.benchmark-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 10px;
  white-space: nowrap;
  
  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
  
  &.outperforming {
    background: color-mix(in srgb, var(--positive) 15%, transparent);
    color: var(--positive);
    border: 1px solid color-mix(in srgb, var(--positive) 30%, transparent);
  }
  
  &.underperforming {
    background: color-mix(in srgb, var(--negative) 15%, transparent);
    color: var(--negative);
    border: 1px solid color-mix(in srgb, var(--negative) 30%, transparent);
  }
}

.benchmark-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  
  &.highlight {
    padding-top: 6px;
    margin-top: 2px;
    border-top: 1px solid var(--base4);
  }
}

.stat-label {
  color: var(--text1);
  font-size: 0.8rem;
  white-space: nowrap;
}

.stat-value {
  font-weight: 600;
  font-size: 0.85rem;
  white-space: nowrap;
  
  &.positive {
    color: var(--positive);
  }
  
  &.negative {
    color: var(--negative);
  }
}

@media (max-width: 768px) {
  .benchmark-card {
    min-width: 160px;
  }
}

/* Monthly Performance Analysis Styles */
.monthly-performance-container {
  margin-top: 5px;
  margin-bottom: 5px;
  border-radius: 12px;
  padding: 20px;
  overflow: hidden;
}

.monthly-perf-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--base3);

  h2 {
    color: var(--text1);
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.025em;

    .beta-badge {
      display: inline-block;
      background: var(--text2);
      color: var(--base1);
      font-size: 0.8rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      margin-left: 8px;
      vertical-align: middle;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
  }

  .perf-summary {
    display: flex;
    gap: 12px;
    align-items: center;

    span {
      font-size: 0.9rem;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 12px;
    }

    .winning-months {
      background: color-mix(in srgb, var(--positive) 15%, transparent);
      color: var(--positive);
      border: 1px solid color-mix(in srgb, var(--positive) 30%, transparent);
    }

    .losing-months {
      background: color-mix(in srgb, var(--negative) 15%, transparent);
      color: var(--negative);
      border: 1px solid color-mix(in srgb, var(--negative) 30%, transparent);
    }

    .no-activity-months {
      background: color-mix(in srgb, var(--text2) 15%, transparent);
      color: var(--text2);
      border: 1px solid color-mix(in srgb, var(--text2) 30%, transparent);
    }
  }
}

.monthly-perf-main {
  display: flex;
  gap: 16px;
  align-items: stretch;
}

.monthly-perf-scroll {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 8px 0;
  flex: 5;
  min-width: 0;

  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: var(--base3);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--volume);
    border-radius: 4px;
  }
}

.monthly-charts-container {
  flex: 5;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.monthly-returns-chart {
  padding: 16px;
  background: var(--base1);
  
  .chart-container {
    height: 200px;
    width: 100%;
  }
}

.monthly-perf-card {
  background: var(--base1);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--base4);
  min-width: 220px;
  max-width: 230px;
  flex-shrink: 0;
  transition: all 0.2s;

  &:hover {
    border-color: var(--base3);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

.month-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--base3);

  .month-title {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .month-label {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--accent1);
    }

    .trade-count {
      font-size: 0.75rem;
      color: var(--text2);
      font-weight: 500;
    }
  }

  .month-return {
    font-size: 1.3rem;
    font-weight: 700;
    text-align: right;

    &.positive {
      color: var(--positive);
    }

    &.negative {
      color: var(--negative);
    }
  }
}

.month-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;

    .stat-label {
      color: var(--text2);
      font-size: 0.85rem;
      font-weight: 500;
    }

    .stat-value {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--text1);

      &.positive {
        color: var(--positive);
      }

      &.negative {
        color: var(--negative);
      }

      &.neutral {
        color: var(--text2);
      }
    }
  }
}

@media (max-width: 1150px) {
  .monthly-perf-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;

    .perf-summary {
      width: 100%;
      justify-content: flex-start;
    }
  }

  .monthly-perf-main {
    flex-direction: column;
  }

  .monthly-perf-scroll {
    flex: 1;
  }

  .monthly-charts-container {
    max-width: 100%;
    min-width: 100%;
  }

  .monthly-returns-chart {
    max-width: 100%;
    min-width: 100%;
  }

  .monthly-perf-card {
    min-width: 240px;
    max-width: 280px;
  }
}


</style>