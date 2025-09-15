<template>
 <div class="center-container">
    <p>
      <strong>Note:</strong> Each user can have up to <b>20 watchlists</b>. You must have at least one watchlist in order to add a symbol. Each watchlist can contain up to <b>100 symbols</b>.
    </p>
    <img src="@/assets/images/docs/image37.png" alt="">
    <h3>METHOD 1: Add a symbol using the search input</h3>
    <p>
      <b>Step 1:</b> On the right panel, type a ticker symbol or ISIN in the search input.<br>
      <b>Step 2:</b> Either press <b>Enter</b> on your keyboard or click the search button on the right to select the symbol.<br>
      <b>Step 3:</b> In the menu below, select the watchlist you want to add the symbol to.<br>
      <b>Step 4:</b> Click the <b>Add Symbol</b> button. The symbol will be added to the selected watchlist.<br>
      <b>Alternative:</b> You can simply type the ticker in the input and press <b>Add Symbol</b> without pressing Enter or the search button.
    </p>
    <img class="img" src="@/assets/images/docs/image38.gif" alt="">
    <h3>METHOD 2: Add or remove a symbol from multiple watchlists at once</h3>
    <p>
      <b>Step 1:</b> If you have multiple watchlists and want to add a symbol to several at once, start from a selected watchlist.<br>
      <b>Step 2:</b> Each symbol has a menu on the left—hover over it to reveal a dropdown menu of all your watchlists.<br>
      <b>Step 3:</b> Each watchlist in the dropdown has a checkbox. Checked boxes indicate the symbol is present in that watchlist.<br>
      <b>Step 4:</b> To add or remove the symbol, check or uncheck the box for each desired watchlist.
    </p>
    <img class="img" src="@/assets/images/docs/image39.gif" alt="">
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