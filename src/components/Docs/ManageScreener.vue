<template>
<div class="center-container">
  <h1>Managing Screeners</h1>
  <p><strong>Note:</strong> Each user can create up to <b>20 screeners</b>. If you reach this limit, you will need to delete an existing screener before creating a new one.</p>
  <h2>Creating a Screener</h2>
  <img class="img" src="/docs/create-screener.gif" alt="">
  <p>To create a screener, click on the 'Create' button on the header menu. A popup will appear. Enter a name for the screener and click the Submit button. If the name is valid, your new screener will be created successfully.</p>
  <h2>Selecting a Screener</h2>
  <p>To select a screener, open the dropdown menu and click on the screener you want to select.</p>
  <h2>Updating Screener Parameters</h2>
    <img class="img" src="/docs/screener-param.gif" alt="">
  <p>To update a screener with parameters, select the screener you want to modify. On the left panel, you have access to the parameters. Toggle the parameters you want to use, input the required data, and click on the save icon to update the screener. To reset an individual parameter, click on the reset icon next to it.</p>
  <h2>Renaming a Screener</h2>
  <img class="img" src="/docs/rename-screener.gif" alt="">
  <p>To rename a screener, select the screener you want to rename, then click on the Rename button. A popup will appear where you can enter the new name and confirm it.</p>
  <h2>Resetting a Screener</h2>
  <img class="img" src="/docs/reset-screener.gif" alt="">
  <p>To reset an entire screener, select the screener you want to reset and click on the Reset button. A confirmation dialog will appear asking if you're sure you want to reset the screener. Confirm to reset the screener to blank.</p>
  <h2>Deleting a Screener</h2>
  <img class="img" src="/docs/delete-screener.gif" alt="">
  <p>To delete a screener, simply click on the X button on the right of each screener in the dropdown menu.</p>
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
    font-size: 2.5rem;
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
