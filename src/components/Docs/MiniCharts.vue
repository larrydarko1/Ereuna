<template>
 <div class="center-container">
        <h3>Mini-Charts</h3>
    <p>
      In the screener's right side panel, you will find two mini charts for each stock: one displays the weekly chart and the other displays the daily chart. This allows you to quickly view both timeframes at a glance while screening.
    </p>
    <img class="img" src="@/assets/images/docs/image69.png" alt="">

    <h3>Screener Summary</h3>
    <p>
      Below the mini charts, you will find the Screener Summary section. This section provides a summary of all values for the current screener, including all filters used and their values.
    </p>
    <img class="img" src="@/assets/images/docs/image70.png" alt="">
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

.center-container h3{
    font-size: 1.7rem;
    color: $text2;
    margin-bottom: 1rem;
}

.center-container b{
    font-size: inherit;
    color: $text2;
}

.center-container strong{
    font-size: inherit;
    color: $text2;
}

.center-container p{
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container a{
    font-size: 1.7rem;
    color: $accent2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.img {
    width: 100%;
}
</style>