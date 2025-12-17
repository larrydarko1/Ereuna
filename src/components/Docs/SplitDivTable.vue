<template>
<div class="center-container">
  <h1>Dividend and Split Tables</h1>
  <p>
    In the <b>Charts</b> section, the left side panel also includes tables dedicated to <b>Dividends</b> and <b>Splits</b> for each company or asset.
  </p>
  <img class="img" src="/docs/divsplit-table.png" alt="">
  <p>
    The <b>Dividend Table</b> lists all dividend payment dates along with the corresponding dividend amounts, allowing you to quickly see how much the asset has paid out over time.
  </p>
  <p>
    The <b>Split Table</b> displays all split and reverse split events, showing the date and the split factor for each event. This helps you track how many times an asset has split or reverse split and the magnitude of each change.
  </p>
  <p>
    These tables provide a clear historical record of dividend payments and stock splits, making it easy to analyze the asset’s corporate actions over time.
  </p>
</div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">

.center-container {
    display: flex;
    flex-direction: column;
    text-align: left;
}

.center-container h1 {
    text-align: center;
    font-size: 2rem;
    color: var(--brand-text-primary);
    margin-bottom: 2rem;
}

.center-container p {
    color: var(--brand-text-secondary);
    font-size: 1.4rem;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container p strong,
.center-container b {
    font-size: inherit;
    color: var(--brand-text-secondary);
}

.center-container a {
    color: var(--brand-gradient-end);
    font-size: inherit;
}

.img {
    width: 100%;
    margin-bottom: 1rem;
}
</style>