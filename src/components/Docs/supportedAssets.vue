<template>
  <div class="doc-content">
    <h1>Supported Tickers</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        As of patch 2025.260, Ereuna supports and maintains a comprehensive database of over 60,000 ticker 
        symbols across multiple asset classes. Our platform provides extensive coverage of stocks, ETFs, 
        mutual funds, and cryptocurrencies, ensuring you have access to a wide range of investment options 
        for analysis and tracking.
      </p>
    </section>

    <section>
      <h2>Stocks</h2>
      <p>Ereuna provides access to over 19,000 stocks traded on major markets:</p>
      <div class="note-box">
        <h3>NASDAQ</h3>
        <p>Comprehensive coverage of NASDAQ-listed securities including tech stocks and growth companies.</p>
      </div>

      <div class="note-box">
        <h3>NYSE</h3>
        <p>Full access to New York Stock Exchange listings, covering established companies and blue-chip stocks.</p>
      </div>

      <div class="note-box">
        <h3>OTC Markets</h3>
        <p>Support for over-the-counter traded securities, including penny stocks and smaller companies.</p>
      </div>
    </section>

    <section>
      <h2>ETFs</h2>
      <p>
        Access to over 3,400 Exchange-Traded Funds (ETFs) for diversified investment analysis. ETFs provide 
        exposure to various sectors, indices, commodities, and investment strategies, all available for 
        tracking and analysis on Ereuna.
      </p>
    </section>

    <section>
      <h2>Mutual Funds</h2>
      <p>Support for over 21,000 mutual funds with the following characteristics:</p>
      <div class="note-box">
        <h3>Price Updates</h3>
        <p>
          Mutual fund data updates a few hours after market close due to the nature of mutual fund pricing. 
          NAV (Net Asset Value) is calculated once daily after market close.
        </p>
      </div>

      <div class="note-box">
        <h3>Fundamental Data</h3>
        <p>
          Fundamental financial data for mutual funds is updated quarterly, reflecting the fund's holdings, 
          expenses, and performance metrics.
        </p>
      </div>
    </section>

    <section>
      <h2>Cryptocurrencies</h2>
      <p>Access to over 2,400 cryptocurrency pairs with End-of-Day (EOD) data:</p>
      <div class="note-box">
        <h3>Active Trading Pairs</h3>
        <p>
          Over 1,380 actively traded cryptocurrencies are available for analysis, covering major coins, 
          altcoins, and various trading pairs.
        </p>
      </div>

      <div class="note-box">
        <h3>EOD Price Updates</h3>
        <p>
          Daily price data is updated at market close. Full historical price data is available for 
          comprehensive technical analysis and backtesting.
        </p>
      </div>

      <div class="note-box">
        <h3>Real-time Updates</h3>
        <p>
          Real-time cryptocurrency price updates are planned for future patches, bringing live market 
          data to the platform.
        </p>
      </div>
    </section>

    <section>
      <h2>Delisted Assets</h2>
      <p>
        Over 15,000 delisted assets remain available in the database for historical analysis. This includes 
        companies that have been acquired, merged, or ceased trading. Historical data for these assets 
        remains accessible for research and backtesting purposes.
      </p>
      
      <img src="/docs/delisted.png" alt="Delisted Stocks" class="doc-img" />
    </section>

    <section>
      <h2>Future Expansions</h2>
      <div class="note-box">
        <h3>Forex Markets</h3>
        <p>
          In upcoming patches, Ereuna will expand support to include Forex (foreign exchange) markets, 
          providing coverage of currency pairs for comprehensive market analysis.
        </p>
      </div>

      <div class="note-box">
        <h3>Stay Updated</h3>
        <p>
          Check our release notes and patch announcements for the latest additions to supported assets. 
          We continuously expand our database to provide more comprehensive market coverage.
        </p>
      </div>
    </section>

    <section>
      <h2>Data Quality</h2>
      <ul>
        <li><strong>Regular Updates:</strong> Database is maintained and updated regularly with new listings</li>
        <li><strong>Historical Coverage:</strong> Extensive historical data available for all asset classes</li>
        <li><strong>Accurate Pricing:</strong> Data sourced from reliable market data providers</li>
        <li><strong>Corporate Actions:</strong> Splits, dividends, and other corporate actions are tracked</li>
        <li><strong>Delisting Tracking:</strong> Assets are properly marked when delisted but remain searchable</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Supported Tickers
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