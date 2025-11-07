<template>
<div class="center-container">
  <h1>Request Refund</h1>
  <p>To request a refund for your Ereuna subscription, follow these steps:</p>
   <img src="/docs/refund.gif" alt="Refund Request Process" class="refund-gif" />
  <p>1. In the Subscriptions subsection, click the "Ask for Refund" button.</p>
  <p>2. A popup will appear showing a summary of the amount eligible for automatic refund.</p>
  <p>3. Review the details and click the button to confirm your refund request.</p>
  <p>The refund will be processed within 5 business days to your original payment method.</p>
  <div class="disclaimer-box">
    <p><strong>Disclaimer:</strong> VAT is not refundable. Automatic refunds are processed to your original payment method within 5 business days. If you encounter any issues, please contact support at contact@ereuna.io and provide your account name and receipt ID.</p>
  </div>
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

.center-container a {
    color: $accent2;
    text-decoration: underline;
    font-size: 1.4rem;
    overflow-wrap: anywhere;
}

.refund-gif {
    display: block;
    margin: 0 auto 2rem;
    max-width: 100%;
    height: auto;
}


.disclaimer-box {
    background: $base2;
    border-radius: 5px;
    padding: 1.5rem;
    margin: 0 0 2rem 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.disclaimer-box h4 {
    font-size: 1.6rem;
    color: $accent1;
    margin-bottom: 1rem;
    margin-top: 0px;
    font-weight: bold;
    overflow-wrap: anywhere;
}

.disclaimer-box p {
    font-size: 1.4rem;
    color: $text2;
    margin: 0;
    line-height: 1.6;
    overflow-wrap: anywhere;
}
</style>