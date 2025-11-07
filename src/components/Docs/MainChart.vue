<template>
<div class="center-container">
  <h1>Main Chart</h1>
  <p>
    The main chart component is built using <b>lightweight-charts</b> by TradingView. In the future, we plan to fork this library to add more custom features on top of it.
  </p>
  <img class="img" src="/docs/main-chart.png" alt="Main Chart Example">
  <p>
    The chart supports the following timeframes: <b>1m</b>, <b>5m</b>, <b>15m</b>, <b>30m</b>, <b>1hr</b>, <b>1d</b>, and <b>1w</b>.
  </p>
  <p>
    You can toggle between candlestick and bar chart views.
  </p>
  <p>
    The volume bars are highlighted when the relative volume exceeds 2 times the average volume over the past 365 days.
  </p>
  <p>
    There is also a button to edit the legend, allowing you to control visibility and category for indicators. Currently, we support up to 4 indicators, including SMA and EMA, where you can customize the timeframe, type, and visibility.
  </p>
  <p>
    The last indicator displays a price line aligned with the estimated intrinsic value for the selected asset, calculated using a DCF-based model (Buffett-style, including net cash). The calculation requires at least 20 quarters of financial data and uses the following approach:
  </p>
  <ul>
    <li>Extract the last 20 quarters of free cash flow (FCF).</li>
    <li>Calculate annual FCF for the last 5 years and determine the 5-year CAGR of FCF.</li>
    <li>Forecast FCF for the next 5 years based on the CAGR.</li>
    <li>Discount the projected FCFs at a 10% rate.</li>
    <li>Calculate the terminal value using the Gordon Growth Model with 2.5% terminal growth.</li>
    <li>Add net cash (cash and equivalents minus total debt) from the most recent quarter.</li>
    <li>Compute intrinsic value per share by dividing the total intrinsic equity value by shares outstanding.</li>
  </ul>
  <div class="disclaimer-box">
    <p>Many more features will be added to the main chart in the future as the platform grows.</p>
  </div>
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
}

.center-container h1 {
    text-align: center;
    font-size: 2rem;
    color: $text1;
    margin-bottom: 2rem;
}

.center-container p {
    color: $text2;
    font-size: 1.4rem;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container p strong,
.center-container b {
    font-size: inherit;
    color: $text2;
}

.center-container ul {
    margin-bottom: 1rem;
    font-size: 1.3rem;
    color: $text2;
    padding-left: 1.5rem;
}

.center-container li {
    margin-bottom: 0.5rem;
    font-size: inherit;
}

.center-container a {
    color: $accent2;
    font-size: inherit;
}

.disclaimer-box {
    background: $base2;
    border-radius: 5px;
    padding: 1.5rem;
    margin: 0 0 2rem 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.disclaimer-box h4 {
    font-size: 1.6rem;
    color: $accent1;
    margin-bottom: 1rem;
    margin-top: 0;
    font-weight: bold;
    overflow-wrap: anywhere;
}

.disclaimer-box p {
    font-size: 1.4rem;
    color: $text2;
    margin: 0;
    overflow-wrap: anywhere;
}

.img {
    width: 100%;
    margin-bottom: 1rem;
}
</style>
