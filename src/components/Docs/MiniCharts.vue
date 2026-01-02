<template>
  <div class="doc-content">
    <h1>Mini-Charts and Screener Summary</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        In the screener's right side panel, you will find two mini charts for each asset
      </p>
      <img class="img" src="/docs/mini-charts.png" alt="Mini-charts showing weekly and daily views">
    </section>

    <section>
      <h2>Chart Customization</h2>
      <p>
        Each mini chart includes the following customization options:
      </p>
      
      <h3>Timeframe Selection</h3>
      <p>
        You can switch between multiple timeframes using the buttons at the top of each chart:
      </p>
      <ul>
        <li><strong>5m:</strong> 5-minute intraday chart</li>
        <li><strong>15m:</strong> 15-minute intraday chart</li>
        <li><strong>30m:</strong> 30-minute intraday chart</li>
        <li><strong>1h:</strong> 1-hour intraday chart</li>
        <li><strong>1D:</strong> Daily chart</li>
        <li><strong>1W:</strong> Weekly chart</li>
      </ul>

      <h3>Chart Type Options</h3>
      <p>
        Use the dropdown menu to select your preferred chart visualization:
      </p>
      <ul>
        <li><strong>Candlestick:</strong> Traditional OHLC candlestick chart</li>
        <li><strong>Bar:</strong> OHLC bar chart</li>
        <li><strong>Line:</strong> Simple line chart based on closing prices</li>
        <li><strong>Area:</strong> Filled area chart based on closing prices</li>
      </ul>

      <h3>Technical Indicators</h3>
      <p>
        Each chart automatically displays:
      </p>
      <ul>
        <li><strong>Moving Averages:</strong> Four customizable moving averages (MA1, MA2, MA3, MA4) overlay on the price chart</li>
        <li><strong>Volume Histogram:</strong> Volume bars displayed at the bottom of the chart, with special highlighting when volume exceeds 2x the average</li>
        <li><strong>Relative Volume Coloring:</strong> Volume bars change color when they exceed twice the rolling average, making unusual volume activity easy to spot</li>
      </ul>
    </section>

    <section>
      <h2>Chart Features</h2>
      <div class="note-box">
        <h3>Advanced Functionality</h3>
        <ul>
          <li><strong>Real-time Updates:</strong> Charts use WebSocket connections for real-time data updates</li>
          <li><strong>Lazy Loading:</strong> Scroll left to automatically load more historical data</li>
          <li><strong>Zoom & Pan:</strong> Use mouse or trackpad to zoom and pan through the chart data</li>
          <li><strong>Custom Library:</strong> Charts are powered by a forked and customized version of Lightweight Charts, optimized for performance</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Screener Summary</h2>
      <p>
        Below the mini charts, you will find the Screener Summary section. This section provides a summary 
        of all values for the current screener, including all filters used and their values.
      </p>
      <img class="img" src="/docs/summary.png" alt="Screener summary showing all active filters">
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Mini-Charts and Screener Summary
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
  margin-bottom: 0.5rem;
}

.note-box ul {
  margin-top: 0.5rem;
  margin-bottom: 0;
}

strong {
  color: var(--brand-text-primary);
  font-weight: 600;
}

a {
  color: var(--brand-gradient-end);
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover {
  color: var(--brand-gradient-start);
  text-decoration: underline;
}

.img {
  width: 100%;
  margin-bottom: 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>