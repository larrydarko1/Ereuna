<template>
<div class="center-container">
  <h1>Autoplay Watchlist</h1>
  <p>
    <strong>Note:</strong> You must have at least one watchlist with symbols in order to use the autoplay feature.
  </p>
  <p>
    On the right panel, locate the dropdown menu and hover over it to display the options.
  </p>
  <img class="img" src="/docs/autoplay.gif" alt="">
  <p>
    Select the <b>'Autoplay'</b> option from the dropdown menu to activate it.
  </p>
  <p>
    Once activated, the autoplay feature will automatically select each symbol in the watchlist, in order, every 5 seconds.
  </p>
  <p>
    To stop autoplay, simply click the 'Autoplay' option again in the dropdown menu.
  </p>
  <p>
    While autoplay is active, you can watch the symbols cycle automatically. To regain manual control, just stop the autoplay.
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

.center-container a {
    color: $accent2;
    font-size: inherit;
}

.img {
    width: 100%;
    margin-bottom: 1rem;
}
</style>