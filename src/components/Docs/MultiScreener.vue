<template>
 <div class="center-container">
    <p>
      <strong>Note:</strong> With the Multi-Screener feature, you can select multiple screeners and run them simultaneously with a single click. This will generate a compact list of all results, with duplicate symbols highlighted and hidden stocks removed. This is more efficient than running each screener individually.
    </p>
    <img class="img" src="@/assets/images/docs/image60.png" alt="">
    <h3>STEP 1: Go to the selection menu on the left panel. When you hover over it, all your screeners will be displayed.</h3>
    <h3>STEP 2: On the left of each screener, there is a checkbox. To include a screener in the Multi-Screener function, make sure its checkbox is toggled on (by default, it is on). Unchecked screeners will not be included.</h3>
    <img class="img" src="@/assets/images/docs/image61.gif" alt="">
    <img class="img" src="@/assets/images/docs/image62.png" alt="">
    <h3>STEP 3: When you're ready, go to the middle menu and click on <b>'Multi-Screener'</b>.</h3>
    <h3>STEP 4: The Multi-Screener will automatically generate the combined results list. Duplicate symbols will have an asterisk (*) attached to the ticker symbol. Hovering over the asterisk will show how many times the symbol appeared and in which screeners.</h3>
    <img class="img" src="@/assets/images/docs/image63.gif" alt="">
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