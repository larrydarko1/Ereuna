<template>
  <div class="doc-content">
    <h1>Delete Account</h1>
    
    <section>
      <div class="note-box security-notice">
        <h3>Critical Warning</h3>
        <p>
          Deleting your account is a <strong>permanent action</strong> and <strong>cannot be undone</strong>. 
          All data associated with your account—including your profile, settings, portfolios, watchlists, notes, 
          charts, and any other information—will be <strong>permanently deleted</strong>. This process is 
          <strong>irreversible</strong>.
        </p>
      </div>
    </section>

    <section>
      <h2>Overview</h2>
      <p>
        Account deletion permanently removes all your data from Ereuna's systems. This includes your trading 
        analysis, saved configurations, and account credentials. Before proceeding, ensure you have exported 
        any data you wish to keep.
      </p>
      <p>
        If you have any questions or need assistance before deleting your account, contact support at 
        <a href="mailto:contact@ereuna.io">contact@ereuna.io</a>.
      </p>
    </section>

    <section>
      <h2>How to Delete Your Account</h2>
      <ol>
        <li>Log in to your account and navigate to <a href="https://ereuna.io/account" target="_blank">https://ereuna.io/account</a></li>
        <li>The Account subsection should be displayed by default</li>
        <li>Scroll down to locate the <strong>Delete Account</strong> section</li>
        <li>Enter your <strong>current password</strong> to confirm your identity</li>
        <li>Click the <strong>Delete Account</strong> button</li>
        <li>Confirm the deletion in the final warning dialog</li>
      </ol>
      
      <p>Your account and all associated data will be permanently deleted immediately.</p>
    </section>

    <section>
      <h2>What Gets Deleted</h2>
      <div class="note-box">
        <h3>All Data Removed</h3>
        <p>
          When you delete your account, the following data is permanently removed:
        </p>
        <ul>
          <li>Account credentials (username and password)</li>
          <li>All portfolios and trading positions</li>
          <li>Watchlists and saved tickers</li>
          <li>Chart configurations and indicators</li>
          <li>Personal notes and annotations</li>
          <li>Subscription and payment history</li>
          <li>User preferences and settings</li>
          <li>Recovery Key (if generated)</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Before You Delete</h2>
      <div class="troubleshoot">
        <h3>Consider These Alternatives</h3>
        <ul>
          <li><strong>Taking a break?</strong> You can simply stop using the service without deleting your account</li>
          <li><strong>Privacy concerns?</strong> Remember that Ereuna doesn't store personal information like email or phone numbers</li>
          <li><strong>Subscription issues?</strong> Subscriptions don't auto-renew, so there's no recurring charge to worry about</li>
          <li><strong>Data export:</strong> If you want to keep your trading data, export your portfolios before deletion</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Important Notes</h2>
      <div class="note-box">
        <h3>No Recovery Possible</h3>
        <p>
          Once your account is deleted, it cannot be recovered. You will need to create a new account 
          if you wish to use Ereuna again in the future. Your username may become available for others to use.
        </p>
      </div>

      <div class="note-box">
        <h3>Immediate Effect</h3>
        <p>
          Account deletion takes effect immediately. You will be logged out and unable to access any 
          of your data from that moment forward.
        </p>
      </div>

      <div class="note-box">
        <h3>Activity Logs Retention</h3>
        <p>
          While your account and personal data are deleted immediately, activity logs may be retained 
          for a longer period in compliance with legal and regulatory requirements. These logs are 
          eventually removed according to our data retention policies.
        </p>
      </div>

      <div class="note-box">
        <h3>Refunds</h3>
        <p>
          If you have an active subscription, you may be eligible for a prorated automatic refund. 
          Check the Subscriptions section to see your refund eligibility before deleting your account.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Delete Account feature
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

.note-box.security-notice {
  background: linear-gradient(135deg, rgba(247, 122, 122, 0.08) 0%, rgba(255, 137, 137, 0.08) 100%);
  border-color: rgba(247, 122, 122, 0.3);
}

.note-box h3 {
  margin-top: 0;
  color: var(--brand-gradient-start);
  font-size: 1.1rem;
}

.note-box.security-notice h3 {
  color: #f77a7a;
}

.note-box p {
  margin-bottom: 0;
}

.note-box ul {
  margin-bottom: 0;
  margin-top: 0.5rem;
}

.troubleshoot {
  background: var(--brand-bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid var(--brand-glass-border);
}

.troubleshoot h3 {
  color: var(--brand-gradient-start);
  margin-top: 0;
  font-size: 1.1rem;
}

.troubleshoot ul {
  margin-left: 1.5rem;
  margin-bottom: 0;
}

strong {
  color: var(--brand-text-primary);
  font-weight: 600;
}
</style>