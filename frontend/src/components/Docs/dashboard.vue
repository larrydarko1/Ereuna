<template>
  <div class="doc-content">
    <h1>Dashboard Overview</h1>
    
    <section>
      
      <h2>Overview</h2>
      <p>
        The Dashboard is your central hub for market insights. It provides comprehensive 
        market analytics, sector analysis, and valuation metrics to help you make informed trading decisions.
      </p>
      <p>
        Currently, users cannot customize the dashboard layout, but as Ereuna continues active development, 
        customizable dashboards are planned for future updates.
      </p>
    </section>

    <section>
      <h2>Market Outlook</h2>
      <p>
        This section provides market outlook assessments across three different timeframes: short-term, mid-term, 
        and long-term. Currently, we evaluate market outlook using Simple Moving Average (SMA) distributions to 
        gauge overall market sentiment and momentum.
      </p>
      <div class="note-box">
        <h3>Future Enhancements</h3>
        <p>
          More sophisticated analytical methods will be incorporated in future updates to provide deeper insights 
          into market conditions and trends.
        </p>
      </div>
    </section>

    <section>
      <h2>Market Breadth</h2>
      <p>This subsection measures market breadth through two key indicators:</p>
      
      <div class="note-box">
        <h3>Advance/Decline</h3>
        <p>
          Shows the percentage of stocks that advanced (closed higher), declined (closed lower), or remained 
          unchanged for the trading day. This provides insight into the overall market participation and direction.
        </p>
      </div>

      <div class="note-box">
        <h3>New Highs/Lows</h3>
        <p>
          Displays the percentage of stocks that made new highs (today's close higher than yesterday's high), 
          new lows (today's close lower than yesterday's low), or were neutral. This helps assess market strength 
          and momentum by identifying how many stocks are breaking through previous price levels.
        </p>
      </div>

      <p>
        These metrics are visualized as horizontal bar charts, with green representing positive indicators, 
        red for negative, and gray for neutral. The percentages are calculated based on all tracked stocks 
        in our database.
      </p>
    </section>

    <section>
      <h2>Archie AI Placeholder</h2>
      <p>
        A section reserved for Archie, the AI trading agent currently in development. Once available, this will 
        integrate AI-powered insights directly into your dashboard.
      </p>
    </section>

    <section>
      <h2>Major Index Funds Summary</h2>
      <p>
        This section provides insights into key market indices through their corresponding ETFs. We track historical 
        returns over 1 month (1M), 3 months (3M), 6 months (6M), 1 year (1Y), and year-to-date (YTD).
      </p>
      <p>Tracked indices include:</p>
      <ul>
        <li><strong>SPY:</strong> Tracks the S&P 500 index, representing large-cap U.S. stocks</li>
        <li><strong>QQQ:</strong> Tracks the Nasdaq-100 index, focusing on technology and growth stocks</li>
        <li><strong>DIA:</strong> Tracks the Dow Jones Industrial Average, comprising 30 large-cap U.S. companies</li>
        <li><strong>IWM:</strong> Tracks the Russell 2000 index, representing small-cap U.S. stocks</li>
        <li><strong>EFA:</strong> Tracks developed markets outside North America (Europe, Asia, Australia)</li>
        <li><strong>EEM:</strong> Tracks emerging market equities (e.g., China, India, Brazil)</li>
      </ul>
    </section>

    <section>
      <h2>SMA Distribution</h2>
      <p>
        This feature analyzes how many traded assets in our database are above or below specific Simple Moving 
        Averages (SMAs), expressed as percentages. It uses periods of 5, 10, 20, 50, 100, 150, and 200 days 
        to provide insights into general market conditions.
      </p>

      <div class="note-box">
        <h3>Asset Type Filter</h3>
        <p>You can filter the SMA distribution by asset type using the dropdown menu:</p>
        <ul>
          <li><strong>All Assets:</strong> Shows SMA distribution for all securities in the database (default view)</li>
          <li><strong>Stocks (NYSE/NASDAQ):</strong> Filters to show only major exchange stocks, excluding OTC markets</li>
          <li><strong>ETFs Only:</strong> Shows distribution for Exchange-Traded Funds, which tend to be more stable</li>
          <li><strong>Mutual Funds Only:</strong> Displays distribution for mutual funds, typically long-term oriented</li>
          <li><strong>Cryptocurrencies:</strong> Shows distribution for cryptocurrency assets tracked in the database</li>
          <li><strong>OTC Stocks:</strong> Shows only over-the-counter stocks (excluding NYSE/NASDAQ)</li>
          <li><strong>PINK Stocks:</strong> Shows only Pink Sheet stocks with limited regulatory requirements</li>
        </ul>
        <p>
          This breakdown helps you understand market conditions for specific asset classes. By separating OTC 
          stocks from major exchanges, you get a cleaner picture of institutional market health.
        </p>
      </div>
    </section>

    <section>
      <h2>Quarter Sector / Industry Strength</h2>
      <p>
        This section analyzes the top 5 weakest and strongest sectors, and top 10 weakest and strongest 
        industries based on performance over the most recent 4 months. For each, we show the average percentage 
        return and the number of assets in that category.
      </p>
      <div class="note-box">
        <h3>Calculation Methods</h3>
        <p>
          Sectors use market-cap-weighted average returns (larger companies have more influence), while 
          industries use median returns (less sensitive to outliers).
        </p>
      </div>
    </section>

    <section>
      <h2>Daily Top Movers</h2>
      <p>
        This section highlights the top 10 daily winners and losers based on percentage returns from 
        <strong>NYSE and NASDAQ exchanges only</strong>, filtering out OTC stocks to reduce edge cases and 
        focus on institutional-grade securities.
      </p>
    </section>

    <section>
      <h2>AI Stock Valuation Analysis <span class="beta-badge">BETA</span></h2>
      <p>
        This advanced feature uses AI-powered analysis to calculate intrinsic values for stocks, helping you 
        identify potential investment opportunities. <strong>Only NYSE and NASDAQ stocks are included</strong> 
        to ensure data quality and reduce edge cases from OTC markets.
      </p>

      <div class="note-box">
        <h3>Top 10 Undervalued Stocks</h3>
        <p>
          Displays stocks where the calculated intrinsic value significantly exceeds the current market price. 
          The percentage shown represents the potential upside if the stock were to trade at its intrinsic value. 
          These may represent buying opportunities, though further research is always recommended.
        </p>
      </div>

      <div class="note-box">
        <h3>Top 10 Overvalued Stocks</h3>
        <p>
          Shows stocks where the current market price exceeds the calculated intrinsic value. The percentage 
          indicates how much the stock is trading above its estimated fair value. These stocks may be overpriced 
          or priced for exceptional future growth.
        </p>
      </div>

      <div class="note-box">
        <h3>How It Works</h3>
        <p>
          This feature uses a black box AI approach trained on our extensive financial dataset. The model 
          analyzes multiple years of financial data including cash flows, earnings, debt levels, and growth 
          patterns to estimate intrinsic stock values. While the exact internal workings are complex, the AI 
          considers both quantitative fundamentals and market dynamics to arrive at fair value estimates.
        </p>
      </div>
    </section>

    <section>
      <h2>Important Disclaimer</h2>
      <div class="troubleshoot">
        <p>
          Intrinsic value calculations are estimates based on historical financial data and assumptions about 
          future performance. They should not be considered as investment advice or guarantees of future returns.
        </p>
        <p>
          Always conduct thorough research and consider multiple factors before making investment decisions. 
          Market prices may differ from intrinsic values for valid reasons, including growth expectations, 
          market sentiment, and company-specific factors.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Dashboard Overview
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
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.beta-badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  background: linear-gradient(135deg, rgba(255, 165, 0, 0.2) 0%, rgba(255, 140, 0, 0.2) 100%);
  color: #ff9500;
  border: 1px solid rgba(255, 165, 0, 0.3);
  border-radius: 6px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
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

.note-box ul {
  margin-bottom: 0;
  margin-top: 0.5rem;
}

.troubleshoot {
  background: var(--brand-bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid var(--brand-glass-border);
}

.troubleshoot p {
  margin-bottom: 1rem;
}

.troubleshoot p:last-child {
  margin-bottom: 0;
}

strong {
  color: var(--brand-text-primary);
  font-weight: 600;
}
</style>
