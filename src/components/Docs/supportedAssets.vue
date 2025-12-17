<template>
<div class="center-container">
  <h1>Supported Tickers</h1>
  <p>As of patch 2025.248, Ereuna supports and maintains a database of 60,000+ ticker symbols across all supported asset classes (stocks, ETFs, mutual funds, and cryptocurrencies).</p>

  <h3>Stocks</h3>
  <p>Ereuna provides access to over 19,000 stocks traded on major markets:</p>
  <ul>
    <li><strong>NASDAQ:</strong> Comprehensive coverage of NASDAQ-listed securities</li>
    <li><strong>NYSE:</strong> Full access to New York Stock Exchange listings</li>
    <li><strong>OTC Markets:</strong> Support for over-the-counter traded securities</li>
  </ul>

  <h3>ETFs</h3>
  <p>Access to 3,400+ Exchange-Traded Funds (ETFs) for diversified investment analysis.</p>

  <h3>Mutual Funds</h3>
  <p>Support for 21,000+ mutual funds with the following update characteristics:</p>
  <ul>
    <li><strong>Price Updates:</strong> Data updates a few hours after market close due to data availability</li>
    <li><strong>Fundamentals:</strong> Quarterly updates for fundamental financial data</li>
  </ul>

  <h3>Cryptocurrencies</h3>
  <p>Access to 2,400+ cryptocurrency pairs with End-of-Day (EOD) data:</p>
  <ul>
    <li><strong>Active Trading Pairs:</strong> 1,380+ actively traded cryptocurrencies</li>
    <li><strong>EOD Price Updates:</strong> Daily price data updated at market close</li>
    <li><strong>Historical Data:</strong> Full historical price data available for analysis</li>
    <li><strong>Real-time Updates:</strong> Coming in future patches</li>
  </ul>

  <h3>Delisted Assets</h3>
  <p>15,000+ delisted assets are also available for historical analysis.</p>
  <img src="/docs/delisted.png" alt="Delisted Stocks" class="delisted-pic" />

  <div class="disclaimer-box">
    <h4>Future Expansions</h4>
    <p>In upcoming patches, Ereuna will expand support to include:</p>
    <ul>
      <li>Forex (foreign exchange) markets</li>
    </ul>
    <p>Stay updated with our release notes for the latest additions.</p>
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
    overflow-wrap: anywhere;
}

.disclaimer-box ul {
    margin: 0;
    padding-left: 2rem;
}

.disclaimer-box li {
    font-size: 1.4rem;
    color: var(--brand-text-secondary);
    margin-bottom: 0.5rem;
    line-height: 1.6;
    overflow-wrap: anywhere;
}

.delisted-pic {
    display: block;
    margin: 0 auto 2rem;
    max-width: 100%;
    height: auto;
}
</style>