<template>
<div class="center-container">
  <h1>Financial Statements</h1>
  <p>
    In the <b>Charts</b> section, the left side panel includes a button to display the full financial statements for each company, giving you access to comprehensive financial data since the company's inception.
  </p>
  <p>
    To view the full financial statements, click on the <b>'View Financial Statements'</b> button. This will open a popup containing the entire set of financial statements for the selected company.
  </p>
   <img class="img" src="/docs/financial-table.gif" alt="">
  <p>
    Each value in the table displays a percentage return in the corner, calculated by comparing the value to the previous quarter or year, depending on the selected view.
  </p>
  <p>
    In the top right corner of the popup, you can switch between <b>quarterly</b> and <b>annual</b> financial statement views using the toggle button.
  </p>
  <p>
    If you're unsure about a specific attribute or value, a question mark icon is displayed next to it. Hovering over the icon will show a description of the attribute, helping you better understand the data.
  </p>
</div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">

.center-container {
    display: flex;
    flex-direction: column;
    text-align: left;
}

.center-container h1 {
    text-align: center;
    font-size: 2rem;
    color: var(--brand-text-primary);
    margin-bottom: 2rem;
}

.center-container p {
    color: var(--brand-text-secondary);
    font-size: 1.4rem;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container p strong,
.center-container b {
    font-size: inherit;
    color: var(--brand-text-secondary);
}

.center-container a {
    color: var(--brand-gradient-end);
    font-size: inherit;
}

.img {
    width: 100%;
    margin-bottom: 1rem;
}
</style>