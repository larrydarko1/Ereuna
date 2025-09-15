<template>
<div class="center-container">
  <p>
    In the <b>Charts</b> section, the left side panel also includes tables dedicated to <b>Dividends</b> and <b>Splits</b> for each company or asset.
  </p>
  <img class="img" src="@/assets/images/docs/image19.png" alt="">
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

.center-container p,
.center-container b {
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.img {
    width: 100%;
}
</style>