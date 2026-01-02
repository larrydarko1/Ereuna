<template>
  <div class="doc-content">
    <h1>Portfolio Overview</h1>
    
    <section>
      
      <h2>Overview</h2>
      <p>
        The Portfolio section is a comprehensive simulation tool that allows you to manage up to 10 different 
        portfolios with full trading capabilities. Simulate everything from basic trades to advanced strategies 
        including long positions, short selling, leverage up to 10x, and fractional shares. Track cash deposits 
        and withdrawals, analyze performance by month, and export or import portfolios for backup or analysis.
      </p>
      <p>
        This powerful platform helps you test trading strategies, track performance metrics, and analyze your 
        investment decisions across multiple portfolios simultaneously with institutional-grade analytics.
      </p>
    </section>

    <section>
      <h2>Advanced Trading Simulation</h2>
      <p>The portfolio system simulates realistic trading scenarios with comprehensive features:</p>

      <div class="note-box">
        <h3>Trade Types</h3>
        <ul>
          <li><strong>Long Positions:</strong> Traditional buy-and-hold trades with unlimited upside potential</li>
          <li><strong>Short Positions:</strong> Profit from declining prices by borrowing and selling securities</li>
          <li><strong>Leverage Trading:</strong> Amplify positions up to 10x with borrowed capital for increased exposure</li>
          <li><strong>Fractional Shares:</strong> Buy partial shares to maximize capital efficiency and diversification</li>
        </ul>
      </div>

      <div class="note-box">
        <h3>Cash Management</h3>
        <p>
          Full control over portfolio cash flow with deposits and withdrawals. All cash movements are tracked 
          in transaction history, allowing you to simulate realistic funding scenarios and capital management 
          strategies. Cash is displayed as a separate position in your allocation breakdown.
        </p>
      </div>

      <div class="note-box">
        <h3>Commission Tracking</h3>
        <p>
          Simulate real trading costs by including commissions in your trades. This ensures your performance 
          metrics reflect realistic net returns after accounting for transaction costs.
        </p>
      </div>
    </section>

    <section>
      <h2>Portfolio Structure</h2>
      <p>The Portfolio section is organized into the following components:</p>

      <div class="note-box">
        <h3>1. Header Section</h3>
        <p>
          Contains buttons to switch between your portfolios (up to 10) and a menu for additional options 
          including export, import, and portfolio settings.
        </p>
      </div>

      <div class="note-box">
        <h3>2. Benchmark Section</h3>
        <p>
          Since patch 2025.248, you can now select up to 5 benchmarks for each portfolio. This allows you 
          to compare your portfolio's performance against major indices, ETFs, or other securities.
        </p>
      </div>

      <div class="note-box">
        <h3>3. Summary Section</h3>
        <p>
          Displays comprehensive statistics and performance metrics for your portfolio, including profitability, 
          risk metrics, and trading statistics.
        </p>
      </div>

      <div class="note-box">
        <h3>4. Monthly Performance Analysis</h3>
        <p>
          Analyze your portfolio performance month by month with detailed breakdowns. Track which months are 
          most profitable, unprofitable, or neutral to identify seasonal patterns and refine your trading strategy.
        </p>
      </div>

      <div class="note-box">
        <h3>5. Position Section</h3>
        <p>
          Displays all open positions (including cash as a separate position) and includes a pie chart to 
          graphically visualize your portfolio allocation.
        </p>
      </div>

      <div class="note-box">
        <h3>6. Transaction History</h3>
        <p>
          Complete record of all trades and cash operations with full editing capabilities. You can delete or 
          edit specific transactions, and the system will automatically recalculate the entire portfolio from 
          scratch to maintain accuracy across all metrics.
        </p>
      </div>
    </section>

    <section>
      <h2>Key Statistics</h2>
      <p>The Summary Section provides the following metrics:</p>

      <h3>Portfolio Value</h3>
      <ul>
        <li><strong>Base Value:</strong> The initial amount of capital set for the portfolio</li>
        <li><strong>Total Value:</strong> Current total value including cash and positions</li>
        <li><strong>Active Positions:</strong> Value of all open positions</li>
        <li><strong>Cash:</strong> Amount of cash available in the portfolio</li>
      </ul>

      <h3>Profit & Loss Metrics</h3>
      <ul>
        <li><strong>Total P/L:</strong> Total profit or loss (Total Value minus Base Value)</li>
        <li><strong>Total P/L (%):</strong> Total profit or loss as percentage of Base Value</li>
        <li><strong>Unrealized P/L:</strong> Profit or loss on open positions not yet closed</li>
        <li><strong>Unrealized P/L (%):</strong> Unrealized P/L as percentage of Base Value</li>
        <li><strong>Realized P/L:</strong> Profit or loss from closed positions</li>
        <li><strong>Realized P/L (%):</strong> Realized P/L as percentage of Base Value</li>
      </ul>

      <h3>Trading Statistics</h3>
      <ul>
        <li><strong>Avg. Position Size:</strong> Average size of positions as percentage of total portfolio value</li>
        <li><strong>Avg. Hold Time (Winners):</strong> Average time held for winning trades</li>
        <li><strong>Avg. Hold Time (Losers):</strong> Average time held for losing trades</li>
        <li><strong>Avg. Gain %:</strong> Average percentage gain on winning trades</li>
        <li><strong>Avg. Loss %:</strong> Average percentage loss on losing trades</li>
        <li><strong>Avg. Gain:</strong> Average dollar gain on winning trades</li>
        <li><strong>Avg. Loss:</strong> Average dollar loss on losing trades</li>
      </ul>

      <h3>Performance Ratios</h3>
      <ul>
        <li><strong>Gain/Loss Ratio:</strong> Ratio of average gain to average loss</li>
        <li><strong>Risk/Reward Ratio:</strong> Measure of risk versus reward</li>
        <li><strong>Profit Factor:</strong> Ratio of gross profit to gross loss</li>
        <li><strong>Sortino Ratio:</strong> Risk-adjusted return measure focusing on downside volatility</li>
      </ul>

      <h3>Trade Distribution</h3>
      <ul>
        <li><strong>Winning Trades:</strong> Number and percentage of profitable trades</li>
        <li><strong>Losing Trades:</strong> Number and percentage of losing trades</li>
        <li><strong>Breakeven Trades:</strong> Number and percentage of trades that broke even</li>
        <li><strong>Biggest Winner:</strong> The trade with the highest profit</li>
        <li><strong>Biggest Loser:</strong> The trade with the highest loss</li>
      </ul>
    </section>

    <section>
      <h2>Visual Analytics</h2>
      <div class="note-box">
        <h3>P/L Curve Chart</h3>
        <p>
          A line chart displaying your portfolio's profit and loss over time, showing how your total value 
          has evolved throughout your trading history.
        </p>
      </div>

      <div class="note-box">
        <h3>Trade Distribution Bar Chart</h3>
        <p>
          A bar chart showing the distribution of closed trades based on number of trades and returns, helping 
          you visualize your trading patterns and outcomes.
        </p>
      </div>

      <div class="note-box">
        <h3>Monthly Returns Chart</h3>
        <p>
          Track your monthly returns over time to identify seasonal patterns and performance trends. This chart 
          helps you understand which months historically perform better or worse for your trading strategy.
        </p>
      </div>

      <div class="note-box">
        <h3>Total P/L Percentage by Month</h3>
        <p>
          Visualize the cumulative profit/loss percentage for each month, making it easy to spot your most 
          profitable, unprofitable, and neutral trading periods at a glance.
        </p>
      </div>

      <div class="note-box">
        <h3>Allocation Pie Chart</h3>
        <p>
          A pie chart in the Position Section that graphically visualizes your portfolio allocation across 
          different positions and cash holdings.
        </p>
      </div>
    </section>

    <section>
      <h2>Portfolio Management</h2>
      <ul>
        <li><strong>Multiple Portfolios:</strong> Create and manage up to 10 separate portfolios</li>
        <li><strong>Advanced Trading:</strong> Simulate long, short, leveraged (up to 10x), and fractional share trades</li>
        <li><strong>Cash Operations:</strong> Add deposits or withdrawals to simulate realistic funding scenarios</li>
        <li><strong>Commission Tracking:</strong> Include transaction costs for accurate net return calculations</li>
        <li><strong>Base Value Setting:</strong> Set initial capital amounts for each portfolio</li>
        <li><strong>Export/Import:</strong> Backup portfolios or share them across devices</li>
        <li><strong>Benchmark Comparison:</strong> Compare against up to 5 benchmarks per portfolio</li>
        <li><strong>Monthly Analysis:</strong> Track performance month by month to identify seasonal patterns</li>
        <li><strong>Transaction Editing:</strong> Delete or edit specific trades with automatic recalculation from scratch</li>
        <li><strong>Complete History:</strong> Full record of all trades and cash operations</li>
      </ul>
    </section>

    <section>
      <h2>Transaction History Management</h2>
      <div class="note-box">
        <h3>Edit and Delete Transactions</h3>
        <p>
          Full control over your transaction history with the ability to edit or delete specific trades. When 
          you modify a transaction, the system automatically recalculates the entire portfolio from that point 
          forward, creating a "snowball effect" that ensures all subsequent metrics, statistics, and performance 
          data remain accurate and consistent.
        </p>
      </div>
      <div class="note-box">
        <h3>Automatic Recalculation</h3>
        <p>
          The portfolio engine recalculates everything from scratch when transactions are modified, including 
          position values, P/L metrics, monthly performance data, and all statistical measures. This ensures 
          data integrity and allows you to experiment with different trading scenarios by adjusting past decisions.
        </p>
      </div>
    </section>

    <section>
      <h2>Future Enhancements</h2>
      <p>
        More features will be added in future updates to enhance portfolio simulation and analysis capabilities. 
        Stay tuned for announcements about new functionality and improvements.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Portfolio Overview
</script>

<style scoped>
.doc-content {
  max-width: 900px;
  color: var(--brand-text-primary);
  line-height: 1.8;
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--brand-text-primary);
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, var(--brand-gradient-start) 0%, var(--brand-gradient-end) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

h2 {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--brand-text-primary);
  margin-top: 2.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--brand-glass-border);
}

h3 {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--brand-text-primary);
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

section {
  margin-bottom: 2rem;
}

p {
  font-size: 1rem;
  color: var(--brand-text-secondary);
  margin-bottom: 1rem;
}

ol, ul {
  margin-left: 1.5rem;
  margin-bottom: 1rem;
  list-style: none;
  padding-left: 0;
}

li {
  font-size: 1rem;
  color: var(--brand-text-secondary);
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

a {
  color: var(--brand-gradient-end);
  text-decoration: underline;
  transition: opacity 0.2s ease;
}

a:hover {
  opacity: 0.8;
}

.doc-img {
  width: 100%;
  max-width: 800px;
  border-radius: 12px;
  margin: 1.5rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--brand-glass-border);
}

.note-box {
  background: linear-gradient(135deg, rgba(122, 162, 247, 0.08) 0%, rgba(137, 221, 255, 0.08) 100%);
  border: 1px solid var(--brand-glass-border);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.note-box h3 {
  margin-top: 0;
  color: var(--brand-gradient-start);
  font-size: 1.1rem;
}

.note-box p {
  margin-bottom: 0;
}

strong {
  color: var(--brand-text-primary);
  font-weight: 600;
}
</style>