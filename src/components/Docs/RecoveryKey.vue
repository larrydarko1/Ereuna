<template>
  <div class="doc-content">
    <h1>Generate Recovery Key</h1>
    
    <section>
      <div class="note-box security-notice">
        <h3>Important Security Notice</h3>
        <p>
          Your <strong>Recovery Key</strong> is crucial for account recovery. It allows you to reset your password 
          if you ever forget it. Store your Recovery Key securely—if you lose it, you may not be able to recover 
          your account. Never share your Recovery Key with anyone.
        </p>
      </div>
    </section>

    <section>
      <h2>Overview</h2>
      <p>
        The Recovery Key is your backup access method for your Ereuna account. This unique key allows you 
        to reset your password without needing to remember it, providing a secure way to regain access to 
        your account if you forget your credentials.
      </p>
      <p>
        <strong>Note:</strong> Ereuna does not store personal information like email addresses or phone numbers 
        in our database to protect your privacy. This means email-based or mobile-based password recovery is not 
        available—your Recovery Key is the only way to recover your account if you forget your password.
      </p>
    </section>

    <section>
      <h2>How to Generate a Recovery Key</h2>
      <ol>
        <li>Log in to your account and navigate to <a href="https://ereuna.io/account" target="_blank">https://ereuna.io/account</a></li>
        <li>The Account subsection should be displayed by default</li>
        <li>Scroll down to locate the <strong>Recovery Key</strong> section</li>
        <li>Enter your current password in the input field</li>
        <li>Click the <strong>Generate New Key</strong> button</li>
        <li>A text file containing your Recovery Key will automatically download</li>
      </ol>
      
      <p>You have successfully generated a new Recovery Key for your account.</p>
    </section>

    <section>
      <h2>Important Information</h2>
      <div class="note-box">
        <h3>Store Securely</h3>
        <p>
          Save the downloaded Recovery Key file in a secure location. Consider storing it in multiple safe places, 
          such as an encrypted password manager, secure cloud storage, or a physical safe.
        </p>
      </div>

      <div class="note-box">
        <h3>One-Time Download</h3>
        <p>
          The Recovery Key is only shown once during generation. Make sure to save the file immediately and 
          verify you can access it later.
        </p>
      </div>

      <div class="note-box">
        <h3>Replaces Previous Keys</h3>
        <p>
          Generating a new Recovery Key invalidates any previously generated keys. Only the most recent key 
          will work for account recovery.
        </p>
      </div>

      <div class="note-box">
        <h3>Never Share</h3>
        <p>
          Your Recovery Key is as powerful as your password. Never share it with anyone, including Ereuna support. 
          We will never ask for your Recovery Key.
        </p>
      </div>
    </section>

    <section>
      <h2>When to Use Your Recovery Key</h2>
      <ul>
        <li>You've forgotten your password and can't log in</li>
        <li>You need to reset your password</li>
        <li>You're locked out of your account</li>
      </ul>
    </section>

    <section>
      <h2>Lost Your Recovery Key?</h2>
      <div class="troubleshoot">
        <p>
          If you've lost your Recovery Key and still have access to your account, generate a new one immediately 
          following the steps above. 
        </p>
        <p>
          If you've lost both your password and Recovery Key, you can try contacting support at 
          <a href="mailto:contact@ereuna.io">contact@ereuna.io</a> for assistance. However, be aware that 
          account recovery without these credentials is extremely difficult and highly unlikely to succeed. 
          Ereuna does not store personal information that could be used for identity verification or alternative 
          recovery methods, making account recovery essentially impossible in most cases.
        </p>
        <p>
          This is why it's critical to store your Recovery Key securely and maintain backup copies.
        </p>
      </div>
    </section>

    <section>
      <h2>Best Practices</h2>
      <ul>
        <li><strong>Generate Immediately:</strong> Create a Recovery Key as soon as you create your account</li>
        <li><strong>Multiple Backups:</strong> Store copies in different secure locations</li>
        <li><strong>Regular Updates:</strong> Generate a new key periodically for added security</li>
        <li><strong>Test Recovery:</strong> Ensure you can locate and read your saved Recovery Key</li>
        <li><strong>Encrypted Storage:</strong> Use encrypted storage solutions for digital copies</li>
        <li><strong>Physical Copy:</strong> Consider keeping a printed copy in a secure physical location</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Recovery Key generation
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

.note-box.security-notice {
  background: linear-gradient(135deg, rgba(242, 54, 69, 0.08) 0%, rgba(255, 107, 107, 0.08) 100%);
  border-color: rgba(242, 54, 69, 0.3);
}

.note-box.security-notice h3 {
  color: #f23645;
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

.troubleshoot p {
  margin-bottom: 0;
}

strong {
  color: var(--brand-text-primary);
  font-weight: 600;
}
</style>