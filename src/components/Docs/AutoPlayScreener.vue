<template>
 <div class="center-container">
    <p>
      <strong>Note:</strong> You can autoplay any results list.
    </p>
    <img class="img" src="@/assets/images/docs/image64.png" alt="">
    <h3>STEP 1: In the middle menu, click on the <b>'Autoplay'</b> button.</h3>
    <h3>STEP 2: While autoplay is active, each result in the list will be automatically selected every 5 seconds.</h3>
    <h3>STEP 3: To disable autoplay, simply click the <b>'Autoplay'</b> button again.</h3>
    <img class="img" src="@/assets/images/docs/image65.gif" alt="">
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