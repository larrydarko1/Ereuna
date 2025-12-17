<template>
<div class="center-container">
  <h1>Setting Base Value</h1>
  <img src="/docs/set-base-value.gif" alt="Set Base Value Process" class="set-base-value-gif" />
  <p>The base value represents the initial capital of your portfolio and is used in performance calculations. In the header section of the Portfolio view, locate the "Set Base Value" button.</p>
  <p>Click the "Set Base Value" button. A popup will appear where you can enter the desired base value for the selected portfolio.</p>
  <p>Enter the amount and confirm to set the base value. This can be adjusted at any time to reflect changes in your portfolio's starting point.</p>
</div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">

.center-container {
    display: flex;
    flex-direction: column;
    text-align: left;
    width: 100%;
    padding: 2rem 0;
}

.center-container h1 {
    font-size: 2.5rem;
    color: var(--brand-text-primary);
    margin-bottom: 1.5rem;
    text-align: center;
}

.center-container p,
.center-container strong,
.center-container b {
    font-size: 1.4rem;
    color: var(--brand-text-secondary);
    margin-bottom: 1rem;
    line-height: 1.6;
    overflow-wrap: anywhere;
}

.center-container a {
    color: var(--brand-gradient-end);
    text-decoration: underline;
    font-size: 1.4rem;
    overflow-wrap: anywhere;
}

.set-base-value-gif {
    display: block;
    margin: 0 auto 2rem;
    max-width: 100%;
    height: auto;
}
</style>