<template>
  <div class="doc-content">
    <h1>Renew Subscription</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        Renewing your Ereuna subscription is quick and straightforward. The renewal process allows you to 
        add more time to your existing subscription, ensuring uninterrupted access to all platform features. 
        Your new subscription time will be added to any remaining time you currently have.
      </p>
    </section>

    <section>
      <h2>How to Renew Your Subscription</h2>
      <ol>
        <li>Log in to your account and navigate to <a href="https://ereuna.io/account" target="_blank">https://ereuna.io/account</a></li>
        <li>Click on the <strong>Subscriptions</strong> tab</li>
        <li>Click the <strong>Renew</strong> button</li>
        <li>A popup will appear where you can select your desired subscription duration</li>
        <li>Enter your payment method details</li>
        <li>Select the appropriate VAT option if applicable</li>
        <li>Review your order and click the <strong>Complete Payment</strong> button</li>
      </ol>
      
      <p>Your subscription will be extended immediately upon successful payment.</p>
    </section>

    <section>
      <h2>Payment Options</h2>
      <div class="note-box">
        <h3>Subscription Duration</h3>
        <p>
          You can choose from various subscription durations when renewing. Longer durations typically 
          offer better value per month. Select the duration that best fits your needs and budget.
        </p>
      </div>

      <div class="note-box">
        <h3>VAT Options</h3>
        <p>
          If you're based in a region that requires VAT, you can specify your VAT status during checkout. 
          The system will automatically calculate and display the appropriate tax amount before you complete 
          the payment.
        </p>
      </div>

      <div class="note-box">
        <h3>Secure Payment Processing</h3>
        <p>
          All payments are processed securely through our payment provider. Ereuna does not store your 
          payment method or credit card information on our servers.
        </p>
      </div>
    </section>

    <section>
      <h2>Important Information</h2>
      <div class="note-box">
        <h3>Immediate Activation</h3>
        <p>
          Your subscription time is added immediately after successful payment. There's no waiting period, 
          and you'll receive a confirmation receipt via the platform.
        </p>
      </div>

      <div class="note-box">
        <h3>Time Accumulation</h3>
        <p>
          When you renew before your subscription expires, the new time is added to your remaining time. 
          For example, if you have 5 days left and purchase 30 more days, you'll have 35 days total.
        </p>
      </div>

      <div class="note-box">
        <h3>Receipt Available</h3>
        <p>
          After each payment, a receipt is generated and available for download in the Subscriptions section. 
          You can access all your payment history and download receipts in PDF format at any time.
        </p>
      </div>
    </section>

    <section>
      <h2>Troubleshooting</h2>
      <div class="troubleshoot">
        <h3>Payment not processing?</h3>
        <ul>
          <li>Verify your payment details are entered correctly</li>
          <li>Ensure your payment method has sufficient funds</li>
          <li>Check if your bank or card provider is blocking the transaction</li>
        </ul>

        <h3>Subscription not updated after payment?</h3>
        <ul>
          <li>Refresh the page to see the updated subscription time</li>
          <li>Check your receipts in the Subscriptions section to verify the payment went through</li>
          <li>If payment was successful but time wasn't added, contact support with your receipt</li>
        </ul>

        <h3>VAT calculation seems incorrect?</h3>
        <ul>
          <li>Verify you selected the correct VAT option for your region</li>
          <li>VAT rates vary by country and business status</li>
          <li>Contact support if you believe there's an error in the calculation</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Tips</h2>
      <ul>
        <li><strong>Renew Early:</strong> Renew before expiration to avoid any service interruption</li>
        <li><strong>Bulk Purchase:</strong> Longer subscription periods typically offer better value</li>
        <li><strong>Save Receipts:</strong> Download your receipts immediately for your records</li>
        <li><strong>Check Duration:</strong> Double-check the selected duration before completing payment</li>
        <li><strong>Payment Confirmation:</strong> Wait for the confirmation message before closing the payment popup</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Renew Subscription feature
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