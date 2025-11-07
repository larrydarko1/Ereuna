<template>
<div class="center-container">
  <h1>Exporting a Portfolio</h1>
  <p>To export your portfolio data, locate the "Export" button in the header section of the Portfolio view.</p>
  <img src="/docs/export-button.png" alt="Export Button" class="export-img" />
  <p>Click the "Export" button. A popup will appear with two options:</p>
  <img src="/docs/export-popup.png" alt="Export Popup" class="export-img" />
  <ul>
    <li><strong>PDF:</strong> Download a formatted PDF for presentation purposes.</li>
    <li><strong>CSV:</strong> Download a CSV file for data analysis and future importing. Ensure the CSV format is preserved exactly if you plan to import it back.</li>
  </ul>
  <p>Select your preferred format and download the file.</p>
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
    width: 100%;
    padding: 2rem 0;
}

.center-container h1 {
    font-size: 2.5rem;
    color: $text1;
    margin-bottom: 1.5rem;
    text-align: center;
}

.center-container p,
.center-container strong,
.center-container b {
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 1rem;
    line-height: 1.6;
    overflow-wrap: anywhere;
}

.center-container ul {
    margin-bottom: 1rem;
    padding-left: 2rem;
}

.center-container li {
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 0.5rem;
    line-height: 1.6;
    overflow-wrap: anywhere;
}

.center-container a {
    color: $accent2;
    text-decoration: underline;
    font-size: 1.4rem;
    overflow-wrap: anywhere;
}

.export-img {
    width: 100%;
    margin-bottom: 1rem;
}
</style>