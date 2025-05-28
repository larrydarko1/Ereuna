<template>
 <div class="center-container">
    <p>
      <strong>Note:</strong> You must have at least one watchlist in order to sort symbols. Each watchlist can contain up to <b>100 symbols</b>.
    </p>
    <img src="@/assets/images/docs/image44.png" alt="">
    <h3>Sorting symbols in a watchlist</h3>
    <p>
      At the top of the watchlist, there is a header with sortable attributes. You can click on any attribute to reorder the symbols in the selected watchlist (this does not change the permanent order). You can sort by: alphabetical order, price, number gain, and percentage gain.
    </p>
    <img class="img" src="@/assets/images/docs/image45.gif" alt="">
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