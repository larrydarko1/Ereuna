<template>
 <div class="center-container">
    <p>
      <strong>Note:</strong> You can't save a screener globally. Instead, you have more control over the components: you can activate, save, and reset each individual parameter. Saving or resetting a parameter will automatically update the selected screener globally.
    </p>
    <img class="img" src="@/assets/images/docs/image55.png" alt="">
    <h3>STEP 1: On the left panel, select a screener from the selection menu.</h3>
    <h3>STEP 2: Below the selection menu, each component represents a possible screening parameter.</h3>
    <h3>STEP 3: To activate a parameter, simply toggle the button on the right of the component. This will open a menu where you can type the parameter value you want.</h3>
    <h3>STEP 4: To save a parameter, click the save icon at the bottom right of the component. This will save the parameter for the selected screener.</h3>
    <img class="img" src="@/assets/images/docs/image56.gif" alt="">
    <h3>STEP 5: To reset a parameter, click the reset icon near the save icon. This will reset only that individual parameter.</h3>
    <img class="img" src="@/assets/images/docs/image57.gif" alt="">
    <p>
      For a global reset of all parameters, refer to the instructions in <b>'Reset a Screener'</b>.
    </p>
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