<template>
<div class="center-container">
  <h1>News</h1>
  <p>
    In the left panel of the <b>Charts</b> section, you can now view the 5 most recent news articles related to the selected symbol.
  </p>
  <img class="img" src="/docs/news.png" alt="News Section Example">
  <p>
    Clicking on "Read More" for any article will redirect you to the full blog post containing the complete content.
  </p>
  <div class="disclaimer-box">
    <p>Disclaimer: Ereuna and its creators take no responsibility for the safety or content of external news websites. Additionally, some articles may become unavailable over time.</p>
  </div>
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

.disclaimer-box {
    background: var(--brand-bg-secondary);
    border-radius: 5px;
    padding: 1.5rem;
    margin: 0 0 2rem 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.disclaimer-box h4 {
    font-size: 1.6rem;
    color: var(--brand-gradient-start);
    margin-bottom: 1rem;
    margin-top: 0;
    font-weight: bold;
    overflow-wrap: anywhere;
}

.disclaimer-box p {
    font-size: 1.4rem;
    color: var(--brand-text-secondary);
    margin: 0;
    overflow-wrap: anywhere;
}
.img {
    width: 100%;
    margin-bottom: 1rem;
}
</style>
