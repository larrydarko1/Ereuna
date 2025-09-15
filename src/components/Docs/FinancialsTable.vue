<template>
<div class="center-container">
  <p>
    In the <b>Charts</b> section, the left side panel includes a button to display the full financial statements for each company, giving you access to comprehensive financial data since the company's inception.
  </p>
  <img class="img" src="@/assets/images/docs/image20.png" alt="Financial Statements Table Example">
  <p>
    To view the full financial statements, click on the <b>'View Financial Statements'</b> button. This will open a popup containing the entire set of financial statements for the selected company.
  </p>
   <img src="@/assets/images/docs/image21.gif" alt="">
  <p>
    Each value in the table displays a percentage return in the corner, calculated by comparing the value to the previous quarter or year, depending on the selected view.
  </p>
  <p>
    In the top right corner of the popup, you can switch between <b>quarterly</b> and <b>annual</b> financial statement views using the toggle button.
  </p>
  <img src="@/assets/images/docs/image22.gif" alt="">
  <p>
    If you're unsure about a specific attribute or value, a question mark icon is displayed next to it. Hovering over the icon will show a description of the attribute, helping you better understand the data.
  </p>
  <img src="@/assets/images/docs/image23.gif" alt="">
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