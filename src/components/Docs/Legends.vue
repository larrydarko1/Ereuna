<template>
<div class="center-container">
  <p>
    In the <b>Charts</b> section, the center chart area includes a top legend bar with key information and controls:
  </p>
    <img class="img" src="@/assets/images/docs/image28.png">
  <ul>
    <li>
      <b>Left side:</b> Displays OHLC (Open, High, Low, Close) values, percentage changes for different timeframes (1W, 1M, 3M, 6M, 1Y, 3Y, 5Y), the company logo, company name, company ticker, and the moving average (see more in the 'Indicators' section).
    </li>
    <li>
      <b>Right side:</b> Contains two buttons:
      <ul>
        <li>One to switch between daily and weekly chart views.</li>
        <li>One to toggle between candlestick chart (default) and bar chart.</li>
      </ul>
    </li>
  </ul>
  <img class="img" src="@/assets/images/docs/image29.gif">
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

.center-container h2 {
    font-size: 1.7rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container p{
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container li{
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container b {
    font-size: inherit;
    color: $text2;
}

.img {
    width: 100%;
}
</style>