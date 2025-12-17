<template>
<div class="center-container">
  <h1>Themes</h1>
  <p>Ereuna offers 40+ custom themes to personalize your app experience, with more themes planned for future updates.</p>
  <p>To change your theme, follow these steps:</p>
  <p>1. Log in to your account and navigate to the Account section at <a href="https://ereuna.io/account" target="_blank">https://ereuna.io/account</a>. Open the Themes subsection.</p>
  <p>2. Browse the available themes and click on the one you prefer.</p>
  <img class="img" src="/docs/themes.gif" alt="Theme Selection Animation" />
  <p>3. The app will immediately apply your selected theme.</p>
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

.img {
    width: 100%;
    margin-bottom: 1rem;
}
</style>