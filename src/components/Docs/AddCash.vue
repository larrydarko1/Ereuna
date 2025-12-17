<template>
<div class="center-container">
  <h1>Adding Cash to Portfolio</h1>
  <img src="/docs/add-cash.gif" alt="Add Cash Process" class="add-cash-gif" />
  <p>Adding cash is typically the first step when starting a new portfolio, as it provides the liquidity needed for trades. In the header section of the Portfolio view, locate the "Add Cash" button.</p>
  <p>Click the "Add Cash" button. A popup will appear where you can enter:</p>
  <ul>
    <li>The date of the cash addition.</li>
    <li>The amount of cash to add to the account.</li>
  </ul>
  <p>If no base value has been set for the portfolio yet, adding cash will automatically set the base value to the same amount. The base value can also be manually adjusted separately.</p>
  <div class="disclaimer-box">
    <p><strong>Disclaimer:</strong> The ability to withdraw cash from the portfolio will be available in future updates.</p>
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

.center-container ul {
    margin-bottom: 1rem;
    padding-left: 2rem;
}

.center-container li {
    font-size: 1.4rem;
    color: var(--brand-text-secondary);
    margin-bottom: 0.5rem;
    line-height: 1.6;
    overflow-wrap: anywhere;
}

.center-container a {
    color: var(--brand-gradient-end);
    text-decoration: underline;
    font-size: 1.4rem;
    overflow-wrap: anywhere;
}

.add-cash-gif {
    display: block;
    margin: 0 auto 2rem;
    max-width: 100%;
    height: auto;
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
    line-height: 1.6;
    overflow-wrap: anywhere;
}
</style>