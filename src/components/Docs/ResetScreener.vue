<template>
 <div class="center-container">
    <p>
      <strong>Note:</strong> To reset all parameters for a screener at once, use the global reset option.
    </p>
    <img class="img" src="@/assets/images/docs/image58.png" alt="">
    <h3>STEP 1: On the left panel, select the screener you want to reset from the selection menu.</h3>
    <h3>STEP 2: In the middle menu, click the <b>'Reset'</b> button.</h3>
    <h3>STEP 3: The selected screener will be immediately reset to its default state.</h3>
    <img class="img" src="@/assets/images/docs/image59.gif" alt="">
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