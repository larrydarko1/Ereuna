<template>
 <div class="center-container">
    <p>
      <strong>Note:</strong> You must have at least one watchlist with symbols in order to use the autoplay feature.
    </p>
    <h3>STEP 1: Log in to your account and go to <a href="https://ereuna.io/charts" target="_blank">https://ereuna.io/charts</a>.</h3>
    <h3>STEP 2: On the right panel, locate the dropdown menu. Hover over it to make the menu appear.</h3>
    <img class="img" src="@/assets/images/docs/image32.png" alt="">
    <h3>STEP 3: Select the option <b>'Autoplay'</b> from the dropdown menu to activate it.</h3>
    <h3>STEP 4: Once activated, the autoplay feature will automatically select each symbol in the watchlist, in order, every 5 seconds.</h3>
    <h3>STEP 5: To stop autoplay, simply click the 'Autoplay' option again in the dropdown menu.</h3>
     <img class="img" src="@/assets/images/docs/image47.gif" alt="">
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