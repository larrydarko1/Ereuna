<template>
  <div class="center-container">
    <h1>Dashboard Overview</h1>
    <img src="@/assets/images/docs/dashboard.gif" alt="Dashboard Overview" class="dashboard-gif" />
    <p>The Dashboard is your central hub for market insights and portfolio monitoring. Currently, users cannot customize the dashboard layout, but as Ereuna continues active development, customizable dashboards are planned for future updates.</p>
    
    <h3>Archie AI Placeholder</h3>
    <p>A section is reserved for Archie, the AI trading agent currently in development. Once available, this will integrate AI-powered insights directly into your dashboard.</p>
    
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

  <h3>Quarter Sector / Industry Strength</h3>
  <p>Here, we analyze the top 5 weakest / strongest sectors and industries based on performance over the most recent 4 months. For each, we show the average percentage return and the number of assets in that category. Sectors use market-cap-weighted average returns (larger companies have more influence), while industries use median returns (less sensitive to outliers).</p>
  <h3>Daily Top Movers</h3>
  <p>This section highlights the top 10 daily winners and losers based on percentage returns, giving you a quick view of the day's most volatile stocks.</p>
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

.center-container h3 {
    font-size: 1.8rem;
    color: $text1;
    margin-bottom: 1rem;
    margin-top: 2rem;
    overflow-wrap: anywhere;
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

.dashboard-gif {
    display: block;
    margin: 0 auto 2rem;
    max-width: 100%;
    height: auto;
}
</style>
