<template>
 <div class="center-container">
    <h3>STEP 1: Log in to your account and go to <a href="https://ereuna.io/screener" target="_blank">https://ereuna.io/screener</a>.</h3>
    <h3>STEP 2: In the selection menu on the left, each screener has an <b>X</b> button on the right.</h3>
    <h3>STEP 3: Simply click the <b>X</b> button next to the screener you want to delete. The screener will be removed immediately.</h3>
    <img class="img" src="@/assets/images/docs/image54.gif" alt="">
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