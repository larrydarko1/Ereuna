<template>
  <div class="doc-content">
    <h1>Request Refund</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        Ereuna offers automatic refunds for unused subscription time within the first 14 days of purchase. 
        If you need to cancel your subscription early during this period, you can request a prorated refund 
        for the remaining days. The refund process is straightforward and fully automated.
      </p>
      <p>
        <strong>Important:</strong> Automatic refunds are only available within 14 days of the purchase date. 
        After this period, the refund button will be disabled.
      </p>
    </section>

    <section>
      <h2>How to Request a Refund</h2>
      <ol>
        <li>Log in to your account and navigate to <a href="https://ereuna.io/account" target="_blank">https://ereuna.io/account</a></li>
        <li>Click on the <strong>Subscriptions</strong> tab</li>
        <li>Click the <strong>Ask for Refund</strong> button</li>
        <li>A popup will appear showing a summary of the amount eligible for automatic refund</li>
        <li>Review the refund details and click the button to confirm your refund request</li>
      </ol>
      
      <p>The refund will be processed within 5 business days to your original payment method.</p>
    </section>

    <section>
      <h2>Important Information</h2>
      <div class="note-box">
        <h3>VAT Non-Refundable</h3>
        <p>
          Please note that VAT (Value Added Tax) is not refundable. Only the base subscription amount 
          for unused days will be refunded. Tax amounts are remitted to tax authorities and cannot be returned.
        </p>
      </div>

      <div class="note-box">
        <h3>Processing Time</h3>
        <p>
          Automatic refunds are processed to your original payment method within 5 business days. 
          Depending on your bank or payment provider, it may take an additional 3-5 business days 
          for the funds to appear in your account.
        </p>
      </div>

      <div class="note-box">
        <h3>Prorated Calculation</h3>
        <p>
          Refunds are calculated based on the number of unused full days remaining on your subscription. 
          The system automatically calculates the eligible refund amount when you click the refund button.
        </p>
      </div>

      <div class="note-box">
        <h3>14-Day Refund Window</h3>
        <p>
          Automatic refunds are only available within 14 days of your purchase date. After this window, 
          the refund button will be disabled. If you need a refund after 14 days, you must contact support.
        </p>
      </div>

      <div class="note-box">
        <h3>Account Access After Refund</h3>
        <p>
          Once a refund is issued, your subscription will be immediately terminated and you will lose 
          access to the platform. You will need to renew your subscription to regain access.
        </p>
      </div>
    </section>

    <section>
      <h2>Troubleshooting</h2>
      <div class="troubleshoot">
        <h3>Refund not received after 5 days?</h3>
        <ul>
          <li>Check with your bank or payment provider for processing delays</li>
          <li>Verify the refund was sent to the correct payment method</li>
          <li>Contact support at <a href="mailto:contact@ereuna.io">contact@ereuna.io</a> with your account name and receipt ID</li>
          <li>Allow up to 10 business days total (5 days processing + 5 days bank transfer time)</li>
        </ul>

        <h3>Refund amount seems incorrect?</h3>
        <ul>
          <li>Remember that VAT is not included in refunds</li>
          <li>Verify the calculation is based on full unused days</li>
          <li>Check your subscription details to see the daily rate</li>
          <li>Contact support if you believe there's a calculation error</li>
        </ul>

        <h3>Can't request a refund?</h3>
        <ul>
          <li>Check if you're still within the 14-day automatic refund window</li>
          <li>Ensure you have an active paid subscription</li>
          <li>The button will be disabled if more than 14 days have passed since purchase</li>
          <li>You cannot request multiple refunds simultaneously</li>
          <li>Contact support at <a href="mailto:contact@ereuna.io">contact@ereuna.io</a> if you need a refund after 14 days</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Tips</h2>
      <ul>
        <li><strong>Check Eligibility First:</strong> Review the refund amount displayed before confirming</li>
        <li><strong>Save Receipt ID:</strong> Keep your receipt ID for reference in case of issues</li>
        <li><strong>Export Data:</strong> Download any important data before requesting a refund</li>
        <li><strong>Contact Details:</strong> Have your account name and receipt ID ready if you need to contact support</li>
        <li><strong>Alternative Option:</strong> Consider letting your subscription expire naturally if you might return</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Request Refund feature
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

.doc-img {
  width: 100%;
  max-width: 800px;
  border-radius: 12px;
  margin: 1.5rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--brand-glass-border);
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