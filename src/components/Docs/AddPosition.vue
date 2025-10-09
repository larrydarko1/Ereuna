<template>
<div class="center-container">
  <h1>Adding a Position</h1>
  <img src="@/assets/images/docs/add-position.gif" alt="Add Position Process" class="add-position-gif" />
  <p>To add a new position to your portfolio, locate the "New Trade" button in the header section of the Portfolio view.</p>
  <p>Click the "New Trade" button. A popup will appear where you can enter the trade details:</p>
  <ul>
    <li>Select the date of the trade.</li>
    <li>Enter the symbol.</li>
    <li>Specify the number of shares.</li>
    <li>Enter the price per share.</li>
    <li>Optionally, add a commission fee.</li>
  </ul>
  <p>Ensure there is sufficient cash in the portfolio to cover the total cost (shares × price + commission). Then click the "Submit" button to create the position.</p>
  <div class="disclaimer-box">
    <p><strong>Disclaimer:</strong> Currently, only long positions are supported (buying assets). Short positions and fractional shares support will be available in future updates. You can set custom prices and dates for each symbol to simulate various scenarios, but ensure the account does not go into a negative balance.</p>
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

.add-position-gif {
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