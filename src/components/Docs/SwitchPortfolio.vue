<template>
<div class="center-container">
  <h1>Switching Portfolios</h1>
  <p>To switch between different portfolios in the Portfolio section, use the header section which contains buttons numbered 1 to 10. Each button represents a separate portfolio.</p>
  <img src="/docs/portfolio-switch.png" alt="Portfolio Header" class="portfolio-img" />
  <p>Simply click on the button corresponding to the portfolio you want to view or manage. The interface will instantly switch to display the selected portfolio's data.</p>
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

.portfolio-img {
    display: block;
    margin: 0 auto 2rem;
    max-width: 100%;
    height: auto;
}
</style>