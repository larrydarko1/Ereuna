<template>
  <div class="doc-content">
    <h1>Creating an Account</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        Creating your Ereuna account is a straightforward process that takes just a few minutes. You'll need 
        a credit card for payment and will choose your initial subscription duration during registration. 
        Ereuna uses a recharge-based system with no recurring charges, giving you full control over your subscription.
      </p>
    </section>

    <section>
      <h2>Step-by-Step Guide</h2>
      <ol>
        <li>
          <strong>Navigate to Sign-Up:</strong> Go to <a href="/signup" target="_blank">https://ereuna.io/signup</a> 
          to begin the registration process
        </li>
        <li>
          <strong>Enter Username:</strong> Choose a unique username (3-25 characters, letters, numbers, and underscores only)
        </li>
        <li>
          <strong>Create Password:</strong> Create a strong password (5-40 characters)
        </li>
        <li>
          <strong>Payment Details:</strong> Enter your credit card information for payment processing
        </li>
        <li>
          <strong>Select Country:</strong> Choose your country for VAT calculation and tax compliance
        </li>
        <li>
          <strong>Choose Duration:</strong> Select your initial subscription period (1 month, 3 months, 6 months, etc.)
        </li>
        <li>
          <strong>Accept Terms:</strong> Review and accept the Terms of Service and Privacy Policy
        </li>
        <li>
          <strong>Create Account:</strong> Click the <strong>Create</strong> button to process payment and create your account
        </li>
      </ol>
      
      <p>If the payment is successful, your account will be created and activated immediately!</p>
    </section>

    <section>
      <h2>Important Information</h2>
      <div class="note-box">
        <h3>No Recurring Charges</h3>
        <p>
          Ereuna uses a recharge-based subscription model. When your subscription expires, no automatic charges 
          will occur. You maintain full control and must manually renew to continue access.
        </p>
      </div>

      <div class="note-box">
        <h3>Payment Methods</h3>
        <p>
          Currently, only credit cards are accepted as a payment method. Cryptocurrency payment options will 
          be added in future updates.
        </p>
      </div>

      <div class="note-box">
        <h3>14-Day Refund Policy</h3>
        <p>
          You are eligible for an automatic refund within the first 14 days from purchase. VAT is not refundable. 
          To initiate a refund, navigate to Account → Subscriptions. Refunds are processed within 5 business days 
          to your original payment method.
        </p>
      </div>

      <div class="note-box">
        <h3>Privacy First</h3>
        <p>
          Ereuna does not store personal information like email addresses or phone numbers. Your username and 
          password are your only credentials. Make sure to generate and save a Recovery Key immediately after 
          account creation.
        </p>
      </div>
    </section>

    <section>
      <h2>After Account Creation</h2>
      <div class="troubleshoot">
        <h3>First Steps</h3>
        <ul>
          <li>Generate and download your Recovery Key from Account Settings</li>
          <li>Store your Recovery Key in a secure location</li>
          <li>Consider enabling 2FA for additional security</li>
          <li>Explore the platform and customize your preferences</li>
          <li>Set up your first portfolio or watchlist</li>
        </ul>

        <h3>When Subscription Expires</h3>
        <ul>
          <li>You'll be prompted to renew upon logging in</li>
          <li>Make payment to restore access immediately</li>
          <li>No automatic charges will be attempted</li>
          <li>All your data remains saved and secure</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Tips for New Users</h2>
      <ul>
        <li><strong>Recovery Key:</strong> Generate and save your Recovery Key immediately after creating your account</li>
        <li><strong>Strong Password:</strong> Use a unique, strong password for maximum security</li>
        <li><strong>Choose Wisely:</strong> Longer subscription periods typically offer better value</li>
        <li><strong>Save Receipt:</strong> Download your payment receipt for your records</li>
        <li><strong>Enable 2FA:</strong> Set up two-factor authentication for enhanced account security</li>
        <li><strong>Explore Features:</strong> Take time to familiarize yourself with the platform's capabilities</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Creating an Account
</script>

<style scoped>
.doc-content {
  max-width: 900px;
  color: var(--brand-text-primary);
  line-height: 1.8;
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--brand-text-primary);
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, var(--brand-gradient-start) 0%, var(--brand-gradient-end) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

h2 {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--brand-text-primary);
  margin-top: 2.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--brand-glass-border);
}

h3 {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--brand-text-primary);
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

section {
  margin-bottom: 2rem;
}

p {
  font-size: 1rem;
  color: var(--brand-text-secondary);
  margin-bottom: 1rem;
}

ol, ul {
  margin-left: 1.5rem;
  margin-bottom: 1rem;
  list-style: none;
  padding-left: 0;
}

li {
  font-size: 1rem;
  color: var(--brand-text-secondary);
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

a {
  color: var(--brand-gradient-end);
  text-decoration: underline;
  transition: opacity 0.2s ease;
}

a:hover {
  opacity: 0.8;
}

.note-box {
  background: linear-gradient(135deg, rgba(122, 162, 247, 0.08) 0%, rgba(137, 221, 255, 0.08) 100%);
  border: 1px solid var(--brand-glass-border);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.note-box h3 {
  margin-top: 0;
  color: var(--brand-gradient-start);
  font-size: 1.1rem;
}

.note-box p {
  margin-bottom: 0;
}

.troubleshoot {
  background: var(--brand-bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid var(--brand-glass-border);
}

.troubleshoot h3 {
  color: var(--brand-gradient-start);
  margin-top: 1rem;
  font-size: 1.1rem;
}

.troubleshoot h3:first-child {
  margin-top: 0;
}

.troubleshoot ul {
  margin-left: 1.5rem;
  margin-bottom: 1.5rem;
}

.troubleshoot ul:last-child {
  margin-bottom: 0;
}

strong {
  color: var(--brand-text-primary);
  font-weight: 600;
}
</style>