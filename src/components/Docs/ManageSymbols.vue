<template>
<div class="center-container">
  <h1>Managing Symbols in Watchlists</h1>
  <p>
    There are two primary methods to add and remove symbols from watchlists in the Charts section.
  </p>
  <h2>Method 1: Using the Search Input</h2>
  <img class="img" src="@/assets/images/docs/searchinput.gif" alt="">
  <p>
    Enter a symbol in the search input field and click 'Add Symbol'. If a watchlist is currently selected, the symbol will be added to it.
  </p>
  <p>
    To remove a symbol, hover over the symbol within the watchlist and click the X button that appears.
  </p>
  <h2>Method 2: Using the Dropdown Menu</h2>
  <img class="img" src="@/assets/images/docs/dropdown.gif" alt=""></img>
  <p>
    Each symbol in the watchlist features a dropdown menu. Hover over the symbol to reveal a menu listing all existing watchlists. Toggle the checkboxes for the watchlists to which you wish to add the symbol. If a symbol is already present in a watchlist, untoggle the checkbox to remove it.
  </p>
  <h2>Reordering Symbols</h2>
   <img class="img" src="@/assets/images/docs/drag-drop.gif" alt=""></img>
  <p>
    Symbols within a watchlist can be reordered by dragging and dropping them.
  </p>
  <h2>Sorting Symbols</h2>
  <img class="img" src="@/assets/images/docs/sort.gif" alt="">
  <p>
    The watchlist header enables temporary sorting of symbols in ascending or descending order by the following criteria:
  </p>
  <ul>
    <li><b>Ticker:</b> Alphabetical order</li>
    <li><b>Last:</b> Highest price</li>
    <li><b>Chg:</b> Most numerical gain</li>
    <li><b>Chg%:</b> Highest percentage gain</li>
  </ul>
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

.center-container h2 {
    font-size: 1.8rem;
    color: $text1;
    margin-bottom: 1rem;
    margin-top: 2rem;
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

.center-container ul {
    margin-bottom: 1rem;
    font-size: 1.3rem;
    color: $text2;
    padding-left: 1.5rem;
}

.center-container li {
    margin-bottom: 0.5rem;
    font-size: inherit;
}

.img {
    width: 100%;
    margin-bottom: 1rem;
}
</style>