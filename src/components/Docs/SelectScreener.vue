<template>
 <div class="center-container">
    <p><strong>Note:</strong> You need to create at least one screener in order to select it and start applying filters.</p>
    <h3>STEP 1: Log in to your account and go to <a href="https://ereuna.io/screener" target="_blank">https://ereuna.io/screener</a>.</h3>
    <h3>STEP 2: On the left panel, find the selection menu. Hover over it to display all available screeners.</h3>
    <img class="img" src="@/assets/images/docs/image50.png" alt="">
    <h3>STEP 3: Pick the screener you want and click on it to select it.</h3>
    <img class="img" src="@/assets/images/docs/image51.gif" alt="">
    <p>Once selected, you can start applying filters to your screener.</p>
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