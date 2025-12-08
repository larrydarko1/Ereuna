<template>
<div class="center-container">
  <h1>Portfolio Overview</h1>
  <img src="/docs/portfolio-overview.png" alt="Portfolio Overview" class="portfolio-img" />
  <p>The Portfolio section allows users to simulate up to 10 different portfolios. You can manually simulate trades and positions (including commissions), add cash, set base values for each portfolio, and export or import portfolios.</p>
  <p>The section is structured as follows:</p>
  <p>1. <strong>Header Section:</strong> Contains buttons to switch between portfolios and a menu for additional options.</p>
  <p>2. <strong>Benchmark Section:</strong> Since patch 2025.248, you can now select up to 5 benchmarks for each portfolio.</p>
  <p>3. <strong>Summary Section:</strong> Displays key statistics such as:</p>
  <ul>
    <li><strong>Base Value:</strong> The initial amount of capital set for the portfolio.</li>
    <li><strong>Total Value:</strong> The current total value of the portfolio, including cash and positions.</li>
    <li><strong>Active Positions:</strong> The value of all open positions in the portfolio.</li>
    <li><strong>Cash:</strong> The amount of cash available in the portfolio.</li>
    <li><strong>Total P/L:</strong> Total profit or loss, calculated as Total Value minus Base Value.</li>
    <li><strong>Total P/L (%):</strong> Total profit or loss as a percentage of the Base Value.</li>
    <li><strong>Unrealized P/L:</strong> Profit or loss on open positions that have not been closed.</li>
    <li><strong>Unrealized P/L (%):</strong> Unrealized P/L as a percentage of the Base Value.</li>
    <li><strong>Realized P/L:</strong> Profit or loss from closed positions.</li>
    <li><strong>Realized P/L (%):</strong> Realized P/L as a percentage of the Base Value.</li>
    <li><strong>Avg. Position Size:</strong> The average size of positions as a percentage of the total portfolio value.</li>
    <li><strong>Avg. Hold Time (Winners):</strong> Average time held for winning trades.</li>
    <li><strong>Avg. Hold Time (Losers):</strong> Average time held for losing trades.</li>
    <li><strong>Avg. Gain %:</strong> Average percentage gain on winning trades.</li>
    <li><strong>Avg. Loss %:</strong> Average percentage loss on losing trades.</li>
    <li><strong>Avg. Gain:</strong> Average dollar gain on winning trades.</li>
    <li><strong>Avg. Loss:</strong> Average dollar loss on losing trades.</li>
    <li><strong>Gain/Loss Ratio:</strong> Ratio of average gain to average loss.</li>
    <li><strong>Risk/Reward Ratio:</strong> Measure of risk versus reward, often based on stop-loss and target levels.</li>
    <li><strong>Winning Trades:</strong> Number and percentage of trades that resulted in profit.</li>
    <li><strong>Losing Trades:</strong> Number and percentage of trades that resulted in loss.</li>
    <li><strong>Breakeven Trades:</strong> Number and percentage of trades that broke even.</li>
    <li><strong>Profit Factor:</strong> Ratio of gross profit to gross loss.</li>
    <li><strong>Sortino Ratio:</strong> Risk-adjusted return measure focusing on downside volatility.</li>
    <li><strong>Biggest Winner:</strong> The trade with the highest profit.</li>
    <li><strong>Biggest Loser:</strong> The trade with the highest loss.</li>
  </ul>
  <p>This section also includes a line chart for the P/L curve and a bar chart showing the distribution of closed trades based on number of trades and returns.</p>
  <p>4. <strong>Position Section:</strong> Displays all open positions (including cash as a separate position) and a pie chart to graphically visualize the portfolio allocation.</p>
  <p>5. <strong>Transaction History:</strong> Shows the simulated history of the portfolio, including all closed transactions (cash deposits are stored here as well).</p>
  <p>More features will be added in the future.</p>
</div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">
@use '@/style.scss' as *;

.center-container {
    display: flex;
    flex-direction: column;
    text-align: left;
    width: 100%;
    padding: 2rem 0;
}

.center-container h1 {
    font-size: 2.5rem;
    color: $text1;
    margin-bottom: 1.5rem;
    text-align: center;
}

.center-container p,
.center-container strong,
.center-container b {
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 1rem;
    line-height: 1.6;
    overflow-wrap: anywhere;
}

.center-container ul {
    margin-bottom: 1rem;
    padding-left: 2rem;
}

.center-container li {
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 0.5rem;
    line-height: 1.6;
    overflow-wrap: anywhere;
}

.center-container a {
    color: $accent2;
    text-decoration: underline;
    font-size: 1.4rem;
    overflow-wrap: anywhere;
}

.portfolio-img {
    display: block;
    margin: 0 auto 2rem;
    max-width: 100%;
    height: auto;
}
</style>