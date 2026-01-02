<template>
  <div class="doc-content">
    <h1>Subscriptions</h1>
    
    <section>
      <div class="note-box">
        <h3>Recharge-Based Model</h3>
        <p>
          Ereuna uses a recharge-based subscription model. We do not store payment methods on our platform, 
          and there are no automatic charges. Once your subscription expires, no automatic renewals will occur. 
          To extend your subscription, you must manually make a payment through the renewal option.
        </p>
      </div>
    </section>

    <section>
      <h2>Overview</h2>
      <p>
        The Subscriptions section provides a complete overview of your account's subscription status and 
        billing history. This is your central hub for managing subscription time, viewing payment records, 
        and handling refunds if needed.
      </p>
    </section>

    <section>
      <h2>What You Can Do</h2>
      <p>In the Subscriptions section, you have access to the following features:</p>
      <ul>
        <li><strong>View Account Information:</strong> See your username and current subscription status</li>
        <li><strong>Check Remaining Time:</strong> See how many days you have left on your current subscription</li>
        <li><strong>Check Refund Eligibility:</strong> View the amount eligible for automatic refund, if applicable</li>
        <li><strong>Renew Subscription:</strong> Add more time to your subscription with a new payment</li>
        <li><strong>Request Refund:</strong> Request an automatic refund for eligible unused time</li>
        <li><strong>Download Receipts:</strong> View and download all your payment receipts in PDF format</li>
      </ul>
    </section>

    <section>
      <h2>Accessing Subscriptions</h2>
      <ol>
        <li>Log in to your account</li>
        <li>Navigate to <a href="https://ereuna.io/account" target="_blank">https://ereuna.io/account</a></li>
        <li>Click on the <strong>Subscriptions</strong> tab in the Account section</li>
        <li>View your subscription details and available actions</li>
      </ol>
    </section>

    <section>
      <h2>Important Information</h2>
      <div class="note-box">
        <h3>No Auto-Renewal</h3>
        <p>
          Since subscriptions do not auto-renew, there is no need for a "cancel subscription" button. 
          Simply let your subscription expire naturally, and you won't be charged again unless you 
          manually renew.
        </p>
      </div>

      <div class="note-box">
        <h3>Payment Security</h3>
        <p>
          Ereuna does not store your payment methods or credit card information. Each payment is 
          processed securely through our payment provider, and no payment data is retained on our servers.
        </p>
      </div>

      <div class="note-box">
        <h3>Receipts Available</h3>
        <p>
          All payment receipts are stored and can be downloaded at any time from the Subscriptions section. 
          Each receipt is available in PDF format for your records.
        </p>
      </div>
    </section>

    <section>
      <h2>Subscription Status</h2>
      <div class="troubleshoot">
        <h3>Understanding Your Status</h3>
        <ul>
          <li><strong>Active:</strong> Your subscription is currently valid and you have full access to all features</li>
          <li><strong>Expiring Soon:</strong> Your subscription has less than 7 days remaining</li>
          <li><strong>Expired:</strong> Your subscription has ended and you need to renew for continued access</li>
        </ul>

        <h3>Subscription Time Calculation</h3>
        <ul>
          <li>Subscription time is calculated in full days</li>
          <li>When you renew, the new time is added to your remaining time</li>
          <li>Unused time carries over when you renew before expiration</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Tips</h2>
      <ul>
        <li><strong>Check Regularly:</strong> Monitor your remaining subscription time to avoid service interruption</li>
        <li><strong>Renew Early:</strong> Consider renewing before expiration to ensure uninterrupted access</li>
        <li><strong>Save Receipts:</strong> Download and save your receipts for tax or record-keeping purposes</li>
        <li><strong>Bulk Purchase:</strong> You can purchase multiple months at once for better value</li>
        <li><strong>Refund Eligibility:</strong> Check your refund eligibility before making account changes</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Subscriptions feature
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