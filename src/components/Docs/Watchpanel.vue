<template>
<div class="center-container">
  <h1>Watch Panel</h1>
  <p>
    The Watch Panel is a Wall Street-style quotation area in the <b>Charts</b> section where you can add symbols to monitor closely.
  </p>
  <img class="img" src="/docs/edit-watchpanel.png" alt="">
  <p>
    On the right side of the panel, there is an edit button. Clicking it opens a popup where you can add or remove symbols as desired, with a limit of 20 symbols.
  </p>
  <img class="img" src="/docs/watchpanel-popup.png" alt="">
</div>
</template><script setup lang="ts">
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