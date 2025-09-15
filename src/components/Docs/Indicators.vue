<template>
<div class="center-container">
  <p>
    In the <b>Charts</b> section, the only available indicators are Simple Moving Averages (SMAs) for four time periods: <b>200DMA</b>, <b>50DMA</b>, <b>20DMA</b>, and <b>10DMA</b>.
  </p>
  <img class="img" src="@/assets/images/docs/image30.png">
  <p>
    You can toggle the visibility of each indicator by simply clicking on it in the legend bar above the chart.
  </p>
    <img class="img" src="@/assets/images/docs/image31.gif">
  <p>
    In the future, more indicators and customization options will be available.
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

.center-container p{
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container li{
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container b {
    font-size: inherit;
    color: $text2;
}

.img {
    width: 100%;
}
</style>