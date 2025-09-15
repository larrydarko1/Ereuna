<template>
<div class="center-container">
  <p>
    In the <b>Charts</b> section, the top center panel includes a dedicated area for fixed benchmarks, specifically the following indexes: <b>SPX</b>, <b>NDX</b>, <b>DJI</b>, and <b>RUT</b>
  (In the future, more will be added and you'll be able to customize this center panel).
</p>
  <img class="img" src="@/assets/images/docs/image26.png">
  <p>
    To view the chart for any of these indexes, simply click on the desired index in the list. The main chart will update to display the selected benchmark.
  </p>
   <img class="img" src="@/assets/images/docs/image27.gif">
  <p>
    To return to your previous view, either click on another value or click the same index again to toggle back to your original selection.
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

.center-container h2 {
    font-size: 1.7rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container p,
.center-container b {
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.img {
    width: 100%;
}
</style>