<template>
 <div class="center-container">
    <p>
      <strong>Note:</strong> Each user can have up to <b>20 watchlists</b>. You must have at least one watchlist in order to remove a symbol. Each watchlist can contain up to <b>100 symbols</b>.
    </p>
    <img src="@/assets/images/docs/image40.png" alt="">
    <h3>METHOD 1: Remove a symbol using the watchlist panel</h3>
    <p>
      <b>Step 1:</b> On the right panel, select the watchlist containing the symbol you want to remove.<br>
      <b>Step 2:</b> Each symbol in the watchlist has an <b>X</b> button on the right, visible only when you hover over the symbol.<br>
      <b>Step 3:</b> Click the <b>X</b> button to remove the symbol from the selected watchlist.
    </p>
    <img class="img" src="@/assets/images/docs/image41.gif" alt="">
    <h3>METHOD 2: Add or remove a symbol from multiple watchlists at once</h3>
    <p>
      <b>Step 1:</b> If you have multiple watchlists and want to remove a symbol from several at once, start from a selected watchlist.<br>
      <b>Step 2:</b> Each symbol has a menu on the left—hover over it to reveal a dropdown menu of all your watchlists.<br>
      <b>Step 3:</b> Each watchlist in the dropdown has a checkbox. Checked boxes indicate the symbol is present in that watchlist.<br>
      <b>Step 4:</b> To add or remove the symbol, check or uncheck the box for each desired watchlist.
    </p>
    <img class="img" src="@/assets/images/docs/image42.gif" alt="">
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