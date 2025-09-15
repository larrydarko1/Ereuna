<template>
 <div class="center-container">
    <p><strong>Note:</strong> Each user can have up to <b>20 screeners</b>. You must have at least one screener in order to rename it.</p>
    <h3>STEP 1: Log in to your account and go to <a href="https://ereuna.io/screener" target="_blank">https://ereuna.io/screener</a>.</h3>
    <img class="img" src="@/assets/images/docs/image52.png" alt="">
    <h3>STEP 2: Select the screener you want to rename from the selection menu on the left.</h3>
    <h3>STEP 3: In the middle section menu, click the <b>'Rename'</b> button.</h3>
    <h3>STEP 4: A popup will appear. Type the new name for your screener and click the submit button.</h3>
    <img class="img" src="@/assets/images/docs/image53.gif" alt="">
    <p>If the name is valid, your screener will be renamed successfully.</p>
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