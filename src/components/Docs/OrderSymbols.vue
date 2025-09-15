<template>
 <div class="center-container">
    <p>
      <strong>Note:</strong> You must have at least one watchlist in order to reorder symbols. Each watchlist can contain up to <b>100 symbols</b>.
    </p>
    <img src="@/assets/images/docs/image40.png" alt="">
    <h3>Reordering symbols in a watchlist</h3>
    <p>
      You can rearrange the order of symbols in any watchlist. Simply drag and drop the symbols within the watchlist until you have the order you want.
    </p>
    <img class="img" src="@/assets/images/docs/image43.gif" alt="">
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