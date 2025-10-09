<template>
 <div class="center-container">
    <h1>Mini-Charts and Screener Summary</h1>
    <p>In the screener's right side panel, you will find two mini charts for each stock: one displays the weekly chart and the other displays the daily chart. This allows you to quickly view both timeframes at a glance while screening.</p>
    <img class="import-img" src="@/assets/images/docs/mini-charts.png" alt="">
    <p>Below the mini charts, you will find the Screener Summary section. This section provides a summary of all values for the current screener, including all filters used and their values.</p>
    <img class="import-img" src="@/assets/images/docs/summary.png" alt="">
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

.import-img {
    width: 100%;
    margin-bottom: 1rem;
}
</style>