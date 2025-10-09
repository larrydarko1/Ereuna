<template>
<div class="center-container">
  <h1>Managing Watchlists</h1>
  <p><strong>Note:</strong> Each user can create up to <b>20 watchlists</b>. If you reach this limit, you will need to delete an existing watchlist before creating a new one.</p>
    <img class="img" src="@/assets/images/docs/watchlists.gif" alt="">
  <h2>Creating a Watchlist</h2>
  <p>Log in to your account and navigate to <a href="https://ereuna.io/charts" target="_blank">https://ereuna.io/charts</a>.</p>
  <p>On the right panel, locate the dropdown menu and hover over it to display the options.</p>
  <p>Select the <b>'New Watchlist'</b> option from the dropdown menu.</p>
  <p>A popup will appear. Enter a new watchlist name and click the submit button. If the name is valid, your new watchlist will be created successfully.</p>
  <h2>Selecting a Watchlist</h2>
  <p>To select a watchlist, open the dropdown menu in the right panel and choose the desired watchlist. Each menu item displays a number indicating how many elements are in the watchlist.</p>
  <h2>Renaming a Watchlist</h2>
  <p>While viewing the watchlist you want to rename, click on the dropdown menu and select 'Rename Watchlist'. A popup will appear where you can enter the new name and confirm it.</p>
  <h2>Deleting a Watchlist</h2>
  <p>To delete a watchlist, click the X button on the right of the watchlist you want to remove.</p>
  <h2>Exporting a Watchlist</h2>
  <p>To export a watchlist, select the watchlist you want to export. Then, go to the dropdown menu on the right and click on 'Export Watchlist'. This will download a TXT file containing the watchlist information.</p>
  <h2>Importing a Watchlist</h2>
  <p>To import a watchlist, first create a new watchlist. An 'Import Watchlist' option will be available inside the new watchlist. Click on it to display a popup that allows you to load the TXT file. If successful, the watchlist will be imported correctly.</p>
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

.center-container a {
    color: $accent2;
    font-size: inherit;
}

.img {
    width: 100%;
    margin-bottom: 1rem;
}
</style>