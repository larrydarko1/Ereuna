<template>
 <div class="center-container">
    <p><strong>Note:</strong> Each user can create up to <b>20 screeners</b>. If you reach this limit, you will need to delete an existing screener before creating a new one.</p>
    <h3>STEP 1: Log in to your account and go to <a href="https://ereuna.io/screener" target="_blank">https://ereuna.io/screener</a>.</h3>
    <h3>STEP 2: In the middle section, find the navigation bar and click the <b>'Create'</b> button.</h3>
    <img class="img" src="@/assets/images/docs/image48.png" alt="">
    <h3>STEP 3: A popup will appear. Type the name of your new screener and click the submit button.</h3>
    <p>If the name is valid, your new screener will be created successfully.</p>
    <img class="img" src="@/assets/images/docs/image49.gif" alt="">
    <h3>STEP 4: Done! You can select your new screener from the selection menu on the left side.</h3>
 </div>
</template>

<script setup>
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