<template>
  <div class="doc-content">
    <h1>Security & 2FA</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        Ereuna supports two-factor authentication (2FA) to add an extra layer of security to your account. 
        2FA requires both your password and a time-based code from an authenticator app when logging in, 
        significantly reducing the risk of unauthorized access.
      </p>
      <p>
        We support authenticator apps like 2FAS, Google Authenticator, Authy, and other TOTP-compatible apps. 
        SMS or email-based 2FA is not available at this time.
      </p>
    </section>

    <section>
      <h2>How to Enable 2FA</h2>
      <ol>
        <li>Log in to your account and navigate to <a href="https://ereuna.io/account" target="_blank">https://ereuna.io/account</a></li>
        <li>Click on the <strong>Security</strong> tab</li>
        <li>Toggle the <strong>2FA switch</strong> to enable it</li>
        <li>A QR code will be generated on screen</li>
        <li>Open your authenticator app and scan the QR code</li>
        <li>Enter the 6-digit code from your authenticator app into the input field</li>
        <li>Click the <strong>Confirm</strong> button</li>
      </ol>
      
      <p>If successful, 2FA will be activated and required for all future logins.</p>
    </section>

    <section>
      <h2>How to Disable 2FA</h2>
      <ol>
        <li>Navigate to the <strong>Security</strong> tab in Account Settings</li>
        <li>Toggle the <strong>2FA switch</strong> off</li>
        <li>2FA will be disabled immediately</li>
      </ol>
    </section>

    <section>
      <h2>Logging In With 2FA</h2>
      <p>Once 2FA is enabled, your login process will include an additional step:</p>
      <ol>
        <li>Enter your username and password as usual</li>
        <li>A popup will appear requesting a 6-digit code</li>
        <li>Open your authenticator app to get the current code</li>
        <li>Enter the 6-digit code in the popup</li>
        <li>Click <strong>Verify</strong> to complete login</li>
      </ol>
    </section>

    <section>
      <h2>Important Information</h2>
      <div class="note-box">
        <h3>Backup Your Secret Key</h3>
        <p>
          When you enable 2FA, make sure to save the secret key or QR code in a secure location. 
          If you lose access to your authenticator app, you'll need this to set up 2FA on a new device.
        </p>
      </div>

      <div class="note-box">
        <h3>Recovery Key Importance</h3>
        <p>
          Since 2FA protects your account, make absolutely sure you have your Recovery Key saved before 
          enabling 2FA. If you lose both your password and authenticator access, the Recovery Key is 
          your only way to regain access.
        </p>
      </div>

      <div class="note-box">
        <h3>Compatible Apps</h3>
        <p>
          Ereuna uses standard TOTP (Time-based One-Time Password) authentication, which works with 
          most authenticator apps including 2FAS, Google Authenticator, Authy, Microsoft Authenticator, 
          and others.
        </p>
      </div>

      <div class="note-box">
        <h3>No SMS or Email 2FA</h3>
        <p>
          SMS and email-based 2FA are not available. This is intentional—authenticator apps provide 
          better security and align with our privacy policy of not storing personal contact information.
        </p>
      </div>
    </section>

    <section>
      <h2>Troubleshooting</h2>
      <div class="troubleshoot">
        <h3>Code not working?</h3>
        <ul>
          <li>Ensure your device's time is synchronized correctly (TOTP codes are time-based)</li>
          <li>Wait for the next code if the current one is about to expire</li>
          <li>Verify you're entering the code from the correct account in your authenticator app</li>
          <li>Try re-scanning the QR code if the codes consistently fail</li>
        </ul>

        <h3>Lost access to authenticator app?</h3>
        <ul>
          <li>Use your Recovery Key to regain access to your account</li>
          <li>Once logged in, disable 2FA and set it up again with a new authenticator</li>
          <li>Always backup your secret key when enabling 2FA</li>
          <li>Consider using multiple authenticator apps for redundancy</li>
        </ul>

        <h3>QR code not scanning?</h3>
        <ul>
          <li>Ensure you have good lighting and the QR code is clearly visible</li>
          <li>Move your camera closer or further from the screen</li>
          <li>Most authenticator apps also allow manual entry of the secret key</li>
          <li>Take a screenshot of the QR code and scan it from your photo library</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Best Practices</h2>
      <ul>
        <li><strong>Enable Immediately:</strong> Turn on 2FA as soon as you create your account for maximum security</li>
        <li><strong>Backup Secret Key:</strong> Save the secret key or QR code in a secure password manager</li>
        <li><strong>Multiple Devices:</strong> Add your Ereuna account to authenticators on multiple devices</li>
        <li><strong>Generate Recovery Key:</strong> Always have an up-to-date Recovery Key before enabling 2FA</li>
        <li><strong>Test It:</strong> After enabling, log out and log back in to test that 2FA is working properly</li>
        <li><strong>Regular Checks:</strong> Periodically verify your authenticator app is working correctly</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Security & 2FA feature
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