<template>
<div class="center-container">
  <h1>Adding a Position</h1>
  <img src="/docs/add-position.gif" alt="Add Position Process" class="add-position-gif" />
  <p>To add a new position to your portfolio, locate the "New Trade" button in the header section of the Portfolio view.</p>
  <p>Click the "New Trade" button. A popup will appear where you can enter the trade details:</p>
  <ul>
    <li>Select the date of the trade.</li>
    <li>Enter the symbol.</li>
    <li>Specify the position type (long or short position).</li>
    <li>Specify the number of shares (fractional shares are supported).</li>
    <li>Enter the price per share.</li>
    <li>Optionally, add a commission fee.</li>
    <li>Optionally, simulate leverage up to 10x.</li>
  </ul>
  <p>Once done, Then click the "Submit" button to create the position.</p>
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
</style>