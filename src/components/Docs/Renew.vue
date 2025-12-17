<template>
<div class="center-container">
  <h1>Renew Subscription</h1>
  <p>To renew your subscription on Ereuna, follow these steps:</p>
    <img src="/docs/renew-subscription.gif" alt="Renew Subscription Process" class="renew-gif" />
  <p>1. In the Subscriptions subsection, click the "Renew" button.</p>
  <p>2. A popup will appear where you can select your desired subscription duration.</p>
  <p>3. Add your payment method details.</p>
  <p>4. Select the appropriate VAT option if applicable.</p>
  <p>5. Click the "Renew" button to complete the process.</p>
  <p>Your subscription will be extended immediately upon successful payment.</p>
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

.renew-gif {
    display: block;
    margin: 0 auto 2rem;
    max-width: 100%;
    height: auto;
}
</style>