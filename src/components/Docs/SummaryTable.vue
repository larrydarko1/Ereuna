<template>
  <div class="doc-content">
    <h1>The Summary Table</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        The <strong>Summary Table</strong> is the first default element of the left panel in the <strong>Charts</strong> section. 
        It provides a comprehensive overview of the company or financial asset you are viewing, displaying fundamental data, 
        technical indicators, and market statistics all in one place.
      </p>
      <img class="img" src="/docs/summary-table.png" alt="Summary Table displaying asset information">
    </section>

    <section>
      <h2>Available Data Fields</h2>
      <p>
        The Summary Table can display a wide range of data points. You can customize which fields are visible 
        using the panel editing features.
      </p>

      <h3>Basic Information</h3>
      <ul>
        <li><strong>Symbol:</strong> The ticker symbol used to identify the asset</li>
        <li><strong>Company Name:</strong> The official name of the company or asset</li>
        <li><strong>Asset Type:</strong> The type of asset (e.g., Common Stock, ETF, etc.)</li>
        <li><strong>Exchange:</strong> The financial exchange where the asset is listed</li>
        <li><strong>ISIN:</strong> International Securities Identification Number</li>
        <li><strong>IPO Date:</strong> The date when the company went public</li>
        <li><strong>Location:</strong> The headquarters location of the company</li>
        <li><strong>Company Website:</strong> The official company website</li>
        <li><strong>Description:</strong> A summary describing the company or asset</li>
      </ul>

      <h3>Classification</h3>
      <ul>
        <li><strong>Sector:</strong> The sector to which the company belongs</li>
        <li><strong>Industry:</strong> The industry classification of the company</li>
        <li><strong>Reported Currency:</strong> The currency in which the asset is reported/traded</li>
      </ul>

      <h3>Valuation Metrics</h3>
      <ul>
        <li><strong>Market Cap:</strong> Total market value of the company's outstanding shares</li>
        <li><strong>Shares Outstanding:</strong> Total number of shares held by all shareholders</li>
        <li><strong>Book Value:</strong> The book value per share</li>
        <li><strong>PE Ratio:</strong> Price/Earnings ratio</li>
        <li><strong>PEG Ratio:</strong> Price/Earnings to Growth ratio</li>
        <li><strong>PS Ratio:</strong> Price/Sales ratio</li>
        <li><strong>Intrinsic Value:</strong> Calculated intrinsic value of the asset</li>
      </ul>

      <h3>Fund-Specific Information</h3>
      <ul>
        <li><strong>Fund Category:</strong> The category classification of the fund (for ETFs/mutual funds)</li>
        <li><strong>Fund Family:</strong> The fund family or provider (for ETFs/mutual funds)</li>
        <li><strong>Net Expense Ratio:</strong> The annual expense ratio for the fund (for ETFs/mutual funds)</li>
      </ul>

      <h3>Dividend Information</h3>
      <ul>
        <li><strong>Dividend Date:</strong> The most recent or upcoming dividend date</li>
        <li><strong>Dividend Yield TTM:</strong> Trailing twelve month dividend yield percentage</li>
      </ul>

      <h3>Growth Metrics</h3>
      <ul>
        <li><strong>CAGR:</strong> Compound Annual Growth Rate</li>
        <li><strong>CAGR Years:</strong> Number of years used for CAGR calculation</li>
      </ul>

      <h3>Price Levels & Ranges</h3>
      <ul>
        <li><strong>All Time High:</strong> The highest price ever recorded</li>
        <li><strong>All Time Low:</strong> The lowest price ever recorded</li>
        <li><strong>52wk High:</strong> The highest price in the last 52 weeks</li>
        <li><strong>52wk Low:</strong> The lowest price in the last 52 weeks</li>
        <li><strong>% Off 52wk High:</strong> Percentage difference from 52-week high</li>
        <li><strong>% Off 52wk Low:</strong> Percentage difference from 52-week low</li>
      </ul>

      <h3>Technical Indicators</h3>
      <ul>
        <li><strong>Technical Score (1W):</strong> 1-week technical analysis score</li>
        <li><strong>Technical Score (1M):</strong> 1-month technical analysis score</li>
        <li><strong>Technical Score (4M):</strong> 4-month technical analysis score</li>
        <li><strong>RSI:</strong> Relative Strength Index</li>
        <li><strong>Gap (%):</strong> The percentage gap in price</li>
      </ul>

      <h3>Volume & Volatility</h3>
      <ul>
        <li><strong>ADV 1W:</strong> Average Daily Volatility for 1 week</li>
        <li><strong>ADV 1M:</strong> Average Daily Volatility for 1 month</li>
        <li><strong>ADV 4M:</strong> Average Daily Volatility for 4 months</li>
        <li><strong>ADV 1Y:</strong> Average Daily Volatility for 1 year</li>
        <li><strong>Relative Volume 1W:</strong> Relative trading volume for 1 week</li>
        <li><strong>Relative Volume 1M:</strong> Relative trading volume for 1 month</li>
        <li><strong>Relative Volume 6M:</strong> Relative trading volume for 6 months</li>
        <li><strong>Relative Volume 1Y:</strong> Relative trading volume for 1 year</li>
        <li><strong>Average Volume 1W:</strong> Average trading volume for 1 week</li>
        <li><strong>Average Volume 1M:</strong> Average trading volume for 1 month</li>
        <li><strong>Average Volume 6M:</strong> Average trading volume for 6 months</li>
        <li><strong>Average Volume 1Y:</strong> Average trading volume for 1 year</li>
      </ul>

      <h3>AI Features</h3>
      <ul>
        <li><strong>AI Recommendation:</strong> AI-generated investment recommendation and analysis</li>
      </ul>
    </section>

    <section>
      <h2>How to Customize</h2>
      <p>
        You can customize which elements are visible in your Summary Table by using the panel editing features. 
        Click the <strong>Edit Summary</strong> button in the Summary component to add, remove, or reorder fields 
        according to your preferences.
      </p>
    </section>

    <section>
      <h2>Important Notes</h2>
      <div class="note-box">
        <h3>Asset-Specific Fields</h3>
        <p>
          Not all fields are available for every asset type. For example, Fund-specific information only 
          appears for ETFs and mutual funds, while dividend information only shows for dividend-paying stocks.
        </p>
      </div>

      <div class="note-box">
        <h3>Data Availability</h3>
        <p>
          Some fields may not have data available depending on the asset, exchange, and data provider coverage. 
          Empty fields will be hidden automatically.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Summary Table feature
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

ol {
  counter-reset: item;
}

ol > li {
  counter-increment: item;
  position: relative;
  padding-left: 2rem;
}

ol > li::before {
  content: counter(item) ".";
  position: absolute;
  left: 0;
  color: var(--brand-gradient-start);
  font-weight: 600;
}

ul > li {
  position: relative;
  padding-left: 1.5rem;
}

ul > li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: var(--brand-gradient-start);
  font-weight: 600;
}

li {
  font-size: 1rem;
  color: var(--brand-text-secondary);
  margin-bottom: 0.5rem;
  line-height: 1.6;
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

.img {
  width: 100%;
  margin: 1.5rem 0;
  border-radius: 8px;
  border: 1px solid var(--brand-glass-border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
