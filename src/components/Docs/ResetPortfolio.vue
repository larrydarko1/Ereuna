<template>
<div class="center-container">
  <h1>Resetting a Portfolio</h1>
  <img src="/docs/portfolio-reset.gif" alt="Portfolio Reset Process" class="reset-gif" />
  <p>Resetting a portfolio is straightforward. In the header section of the Portfolio view, locate the "Reset" button.</p>
  <p>Click the "Reset" button. A confirmation popup will appear.</p>
  <p>Click to confirm the reset, and the selected portfolio will be cleared of all positions, transactions, and reset to its base value.</p>
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

.center-container a {
    color: $accent2;
    text-decoration: underline;
    font-size: 1.4rem;
    overflow-wrap: anywhere;
}

.reset-gif {
    display: block;
    margin: 0 auto 2rem;
    max-width: 100%;
    height: auto;
}
</style>