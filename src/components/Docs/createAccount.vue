<template>
<div class="center-container">
  <h1>Creating an Account</h1>
  <p>Follow these steps to create your Ereuna account.</p>
  
  <h3>STEP 1: Navigate to the Sign-Up Page</h3>
  <p>Go to <a href="/signup" target="_blank">https://ereuna.io/signup</a> to begin the registration process.</p>
  
  <h3>STEP 2: Enter Your Information</h3>
  <p>Provide the following details:</p>
  <ul>
    <li><strong>Username:</strong> Choose a unique username.</li>
    <li><strong>Password:</strong> Create a strong password.</li>
    <li><strong>Credit Card:</strong> Enter your credit card details for payment.</li>
    <li><strong>VAT / Country:</strong> Select your country for VAT calculation.</li>
  </ul>
  
  <h3>STEP 3: Select Subscription Duration</h3>
  <p>Choose your initial subscription period. Ereuna uses a recharge-based system with no recurring charges. If your subscription expires, no automatic charges will be attempted. To extend your subscription, log in and go to the Account section under Subscription. When your subscription expires, you'll be prompted to make a payment upon logging in—if successful, your access will be restored.</p>
  
  <h3>STEP 4: Accept Terms and Policies</h3>
  <p>Review and accept the Terms of Service and Privacy Policy.</p>
  
  <h3>STEP 5: Create Your Account</h3>
  <p>Click the "Create" button. If the payment is successful, your account will be created.</p>
  <p><strong>Congratulations!</strong> Your Ereuna account is now active.</p>
  
  <div class="disclaimer-box">
    <h4>Refund Policy</h4>
    <p>You are eligible for an automatic refund within the first 14 days from purchase (VAT is not refundable). To initiate a refund, go to the Account section under Subscription. Normal refunds are processed within 5 business days on the original payment method.</p>
  </div>
  
  <div class="disclaimer-box">
    <h4>Payment Methods</h4>
    <p>Crypto payments will be added in the future, but for now, only credit cards are accepted as a payment method.</p>
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

.center-container h3 {
    font-size: 1.8rem;
    color: var(--brand-text-primary);
    margin-bottom: 1rem;
    margin-top: 2rem;
    overflow-wrap: anywhere;
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
</style>