<template>
<div class="center-container">
  <p>
    The <b>Summary Table</b> is the first default element of the left panel in the <b>Charts</b> section. It provides a brief but complete overview of the company or financial asset you are viewing.
  </p>
  <img class="img" src="@/assets/images/docs/image16.png" alt="">
  <p>
    As of today, you can view and edit the following information:
  </p>
  <ul>
    <li><b>Ticker:</b> The unique symbol used to identify the asset on financial markets.</li>
    <li><b>Company Name:</b> The official name of the company or asset.</li>
    <li><b>Asset Type:</b> The type of asset (e.g., Common Stock, ETF, etc.).</li>
    <li><b>Exchange:</b> The financial exchange where the asset is listed.</li>
    <li><b>ISIN:</b> The International Securities Identification Number for the asset.</li>
    <li><b>IPO Date:</b> The date when the company went public.</li>
    <li><b>Sector:</b> The sector to which the company belongs.</li>
    <li><b>Industry:</b> The industry classification of the company.</li>
    <li><b>Reported Currency:</b> The currency in which the asset is reported/traded.</li>
    <li><b>Technical Score (1W, 1M, 4M):</b> Technical analysis scores for different timeframes.</li>
    <li><b>Market Cap:</b> The total market value of the company’s outstanding shares.</li>
    <li><b>Shares Outstanding:</b> The total number of shares currently held by all shareholders.</li>
    <li><b>Location:</b> The headquarters or main location of the company.</li>
    <li><b>Dividend Date:</b> The most recent or upcoming dividend date.</li>
    <li><b>Dividend Yield:</b> The dividend yield percentage.</li>
    <li><b>Book Value:</b> The book value per share.</li>
    <li><b>PEG Ratio:</b> Price/Earnings to Growth ratio.</li>
    <li><b>PE Ratio:</b> Price/Earnings ratio.</li>
    <li><b>PS Ratio:</b> Price/Sales ratio.</li>
    <li><b>All Time High / Low:</b> The highest and lowest prices ever recorded for the asset.</li>
    <li><b>52Wk High / Low:</b> The highest and lowest prices in the last 52 weeks.</li>
    <li><b>% Off 52Wk High / Low:</b> Percentage difference from the 52-week high and low.</li>
    <li><b>RSI:</b> Relative Strength Index, a technical indicator.</li>
    <li><b>Gap (%):</b> The percentage gap in price.</li>
    <li><b>ADV (1W, 1M, 4M, 1Y):</b> Average Daily Volatility for different timeframes.</li>
    <li><b>Relative Volume (1W, 1M, 6M, 1Y):</b> Relative trading volume for different periods.</li>
    <li><b>Average Volume (1W, 1M, 6M, 1Y):</b> Average trading volume for different periods.</li>
    <li><b>Description:</b> A short summary describing the company or asset.</li>
  </ul>
  <p>
    You can customize which of these elements are visible in your Summary Table by using the panel editing features.
  </p>
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

.center-container h3 {
    font-size: 1.7rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container p strong,
.center-container b {
    font-size: inherit;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container p {
    color: $text2;
    overflow-wrap: anywhere;
    font-size: 1.4rem;
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
    overflow-wrap: anywhere;
    font-size: inherit;
}

.img {
    width: 100%;
}
</style>