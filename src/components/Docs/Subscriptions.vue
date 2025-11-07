<template>
   <div class="center-container">
    <h1>Subscriptions</h1>
      <div class="disclaimer-box">
      <p><strong>Important Note:</strong> Ereuna uses a recharge-based subscription model. We do not store payment methods on our platform, and there are no automatic charges. Once your subscription expires, no automatic renewals will occur. To extend your subscription, you must manually make a payment through the renewal option. There is no need for a "cancel subscription" button, as subscriptions do not auto-renew.</p>
    </div>
    <img src="/docs/subscription.png" alt="Subscriptions Overview" class="subscription-img" />
    <p>The Subscriptions subsection allows you to manage your account's subscription details. Here, you can:</p>
    <ul>
      <li>View your username and account information.</li>
      <li>See how many days you have left on your current subscription.</li>
      <li>Check the amount eligible for automatic refund, if applicable.</li>
      <li>Renew or add more time to your subscription.</li>
      <li>Request an automatic refund.</li>
      <li>View and download all your receipts in PDF format.</li>
    </ul>
    <p>This section provides full control over your subscription lifecycle and billing history.</p>
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

.subscription-img {
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