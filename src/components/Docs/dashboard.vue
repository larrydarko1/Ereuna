<template>
  <div class="center-container">
    <h1>Dashboard Overview</h1>
    <img src="/docs/dashboard.gif" alt="Dashboard Overview" class="dashboard-gif" />
    <p>The Dashboard is your central hub for market insights and portfolio monitoring. Currently, users cannot customize the dashboard layout, but as Ereuna continues active development, customizable dashboards are planned for future updates.</p>
    
    <h3>Market Outlook</h3>
    <p>This section provides market outlook assessments across three different timeframes: short-term, mid-term, and long-term. Currently, we evaluate market outlook using Simple Moving Average (SMA) distributions to gauge overall market sentiment and momentum. In the future, more sophisticated analytical methods will be incorporated to provide deeper insights.</p>
    
    <h3>Market Breadth</h3>
    <p>This subsection measures market breadth through two key indicators:</p>
    <ul>
      <li><strong>Advance/Decline:</strong> Shows the percentage of stocks that advanced (closed higher), declined (closed lower), or remained unchanged for the trading day. This provides insight into the overall market participation and direction.</li>
      <li><strong>New Highs/Lows:</strong> Displays the percentage of stocks that made new highs (today's close higher than yesterday's high), new lows (today's close lower than yesterday's low), or were neutral. This helps assess market strength and momentum by identifying how many stocks are breaking through previous price levels.</li>
    </ul>
    <p>These metrics are visualized as horizontal bar charts, with green representing positive indicators, red for negative, and gray for neutral. The percentages are calculated based on all tracked stocks in our database.</p>
    
    <h3>Archie AI Placeholder</h3>
    <p>A section reserved for Archie, the AI trading agent currently in development. Once available, this will integrate AI-powered insights directly into your dashboard.</p>
    
  <h3>Major Index Funds Summary</h3>
  <p>This section provides insights into key market indices through their corresponding ETFs. We track historical returns over 1 month (1M), 3 months (3M), 6 months (6M), 1 year (1Y), and year-to-date (YTD). Here's the list of tracked indices:</p>
  <ul>
    <li><strong>SPY:</strong> Tracks the S&P 500 index, representing large-cap U.S. stocks.</li>
    <li><strong>QQQ:</strong> Tracks the Nasdaq-100 index, focusing on technology and growth stocks.</li>
    <li><strong>DIA:</strong> Tracks the Dow Jones Industrial Average, comprising 30 large-cap U.S. companies.</li>
    <li><strong>IWM:</strong> Tracks the Russell 2000 index, representing small-cap U.S. stocks.</li>
    <li><strong>EFA:</strong> Tracks developed markets outside North America (Europe, Asia, Australia).</li>
    <li><strong>EEM:</strong> Tracks emerging market equities (e.g., China, India, Brazil).</li>
  </ul>
  <h3>SMA Distribution</h3>
  <p>This feature analyzes how many traded assets in our database are above or below specific Simple Moving Averages (SMAs), expressed as percentages. It uses periods of 5, 10, 20, 50, 100, 150, and 200 days to provide insights into general market conditions.</p>
  <p><strong>Asset Type Filter:</strong> You can now filter the SMA distribution by asset type using the dropdown menu. Choose between:</p>
  <ul>
    <li><strong>All Assets:</strong> Shows SMA distribution for all securities in the database (default view).</li>
    <li><strong>Stocks (NYSE/NASDAQ):</strong> Filters to show only major exchange stocks, excluding OTC markets. This provides a cleaner view of institutional-grade equities.</li>
    <li><strong>ETFs Only:</strong> Shows distribution for Exchange-Traded Funds, which tend to be more stable.</li>
    <li><strong>Mutual Funds Only:</strong> Displays distribution for mutual funds, typically long-term oriented.</li>
    <li><strong>OTC Stocks:</strong> Shows only over-the-counter stocks (excluding NYSE/NASDAQ). These are typically smaller, more volatile securities.</li>
    <li><strong>PINK Stocks:</strong> Shows only Pink Sheet stocks, a subset of OTC stocks with limited regulatory requirements and higher risk profiles.</li>
  </ul>
  <p>This breakdown helps you understand market conditions for specific asset classes. By separating OTC stocks from major exchanges, you get a cleaner picture of institutional market health.</p>

  <h3>Quarter Sector / Industry Strength</h3>
  <p>Here, we analyze the top 5 weakest / strongest sectors and industries based on performance over the most recent 4 months. For each, we show the average percentage return and the number of assets in that category. Sectors use market-cap-weighted average returns (larger companies have more influence), while industries use median returns (less sensitive to outliers).</p>
  
  <h3>Daily Top Movers</h3>
  <p>This section highlights the top 10 daily winners and losers based on percentage returns from <strong>NYSE and NASDAQ exchanges only</strong>, filtering out OTC stocks to reduce edge cases and focus on institutional-grade securities.</p>
  
  <h3>Stock Valuation Analysis</h3>
  <p>This advanced feature uses Discounted Cash Flow (DCF) analysis to calculate intrinsic values for stocks, helping you identify potential investment opportunities. <strong>Only NYSE and NASDAQ stocks are included</strong> to ensure data quality and reduce edge cases from OTC markets:</p>
  <ul>
    <li><strong>Top 10 Undervalued Stocks:</strong> Displays stocks where the calculated intrinsic value significantly exceeds the current market price. The percentage shown represents the potential upside if the stock were to trade at its intrinsic value. These may represent buying opportunities, though further research is always recommended.</li>
    <li><strong>Top 10 Overvalued Stocks:</strong> Shows stocks where the current market price exceeds the calculated intrinsic value. The percentage indicates how much the stock is trading above its estimated fair value. These stocks may be overpriced or priced for exceptional future growth.</li>
  </ul>
  <p><strong>How It Works:</strong> Our DCF model analyzes the last 5 years of quarterly free cash flow data, calculates growth rates, and projects future cash flows using a 10% discount rate and 2.5% terminal growth rate. We also factor in net cash (cash minus debt) from the most recent quarter to arrive at a per-share intrinsic value.</p>
  
  <div class="disclaimer-box">
    <h4>Important Disclaimer</h4>
    <p>Intrinsic value calculations are estimates based on historical financial data and assumptions about future performance. They should not be considered as investment advice or guarantees of future returns. Always conduct thorough research and consider multiple factors before making investment decisions. Market prices may differ from intrinsic values for valid reasons, including growth expectations, market sentiment, and company-specific factors.</p>
  </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">

.center-container {
    display: flex;
    flex-direction: column;
    text-align: left;
    width: 100%;
    padding: 2rem 0;
}

.center-container h1 {
    font-size: 2.5rem;
    color: var(--brand-text-primary);
    margin-bottom: 1.5rem;
    text-align: center;
}

.center-container h3 {
    font-size: 1.8rem;
    color: var(--brand-text-primary);
    margin-bottom: 1rem;
    margin-top: 2rem;
    overflow-wrap: anywhere;
}

.center-container p,
.center-container strong,
.center-container b {
    font-size: 1.4rem;
    color: var(--brand-text-secondary);
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
    color: var(--brand-text-secondary);
    margin-bottom: 0.5rem;
    line-height: 1.6;
    overflow-wrap: anywhere;
}

.center-container a {
    color: var(--brand-gradient-end);
    text-decoration: underline;
    font-size: 1.4rem;
    overflow-wrap: anywhere;
}

.dashboard-gif {
    display: block;
    margin: 0 auto 2rem;
    max-width: 100%;
    height: auto;
}

.disclaimer-box {
    background: var(--brand-bg-secondary);
    border-radius: 5px;
    padding: 1.5rem;
    margin: 0 0 2rem 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.disclaimer-box h4 {
    font-size: 1.6rem;
    color: var(--brand-gradient-start);
    margin-bottom: 1rem;
    margin-top: 0;
    font-weight: bold;
    overflow-wrap: anywhere;
}

.disclaimer-box p {
    font-size: 1.4rem;
    color: var(--brand-text-secondary);
    margin: 0;
    line-height: 1.6;
    overflow-wrap: anywhere;
}
</style>
