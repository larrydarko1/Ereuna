<template>
 <div class="center-container">
    <p><strong>Note:</strong> Each user can create up to <b>20 watchlists</b>. If you reach this limit, you will need to delete an existing watchlist before creating a new one.</p>
    <h3>STEP 1: Log in to your account and go to <a href="https://ereuna.io/charts" target="_blank">https://ereuna.io/charts</a>.</h3>
    <h3>STEP 2: On the right panel, locate the dropdown menu. Hover over it to make the menu appear.</h3>
    <img class="img" src="@/assets/images/docs/image32.png" alt="">
    <h3>STEP 3: Select the option <b>'Create Watchlist'</b> from the dropdown menu.</h3>
    <img class="img" src="@/assets/images/docs/image33.gif" alt="">
    <h3>STEP 4: A popup will appear. Type a new watchlist name and click the submit button.</h3>
    <p>If the name is valid, your new watchlist will be created successfully.</p>
    <img class="img" src="@/assets/images/docs/image34.gif" alt="">
    <h3>STEP 5: Done! You have successfully created a new watchlist. You can view and select watchlists in the same right panel by hovering and selecting values in the dropdown menu.</h3>
    <p>Each menu item will have a number indicating how many elements are inside the watchlist.</p>
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