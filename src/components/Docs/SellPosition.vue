<template>
<div class="center-container">
  <h1>Selling a Position</h1>
  <img src="@/assets/images/docs/sell-position.gif" alt="Sell Position Process" class="sell-position-gif" />
  <p>To sell an existing position in your portfolio, navigate to the Positions section.</p>
  <p>Each active position will have a "Sell" button attached to it. Click the "Sell" button for the position you want to sell.</p>
  <p>A popup will appear where you can enter the sell details:</p>
  <ul>
    <li>Select the date of the sale.</li>
    <li>Specify the number of shares to sell.</li>
    <li>Enter the sell price per share.</li>
    <li>Optionally, add a commission fee.</li>
  </ul>
  <p>Review the details and click the "Sell" button to confirm and execute the sell trade.</p>
  <div class="disclaimer-box">
    <p><strong>Disclaimer:</strong> Currently, only long positions are supported (selling assets you own). Short selling (selling assets you don't own) and fractional shares support will be available in future updates. You can set custom prices and dates for each symbol to simulate various scenarios.</p>
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
    width: 100%;
    padding: 2rem 0;
}

.center-container h1 {
    font-size: 2.5rem;
    color: $text1;
    margin-bottom: 1.5rem;
    text-align: center;
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

.sell-position-gif {
    display: block;
    margin: 0 auto 2rem;
    max-width: 100%;
    height: auto;
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
    line-height: 1.6;
    overflow-wrap: anywhere;
}
</style>