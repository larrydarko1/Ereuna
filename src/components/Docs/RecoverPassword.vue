<template>
  <div class="doc-content">
    <h1>Recover Password</h1>
    
    <section>
      <div class="note-box security-notice">
        <h3>Recovery Key Required</h3>
        <p>
          You <strong>need</strong> a Recovery Key to restore your account. If you don't have or have lost 
          your Recovery Key, you can try contacting support at <a href="mailto:contact@ereuna.io">contact@ereuna.io</a> 
          for assistance. However, be aware that account recovery without a Recovery Key is extremely difficult 
          and highly unlikely to succeed due to our privacy-focused design.
        </p>
      </div>
    </section>

    <section>
      <h2>Overview</h2>
      <p>
        Password recovery on Ereuna requires your Recovery Key. Since we don't store personal information like 
        email addresses or phone numbers, the Recovery Key is the only way to reset your password if you forget it. 
        This design ensures maximum privacy but requires you to keep your Recovery Key secure and accessible.
      </p>
    </section>

    <section>
      <h2>How to Recover Your Password</h2>
      <ol>
        <li>Navigate to the recovery page at <a href="https://ereuna.io/recovery" target="_blank">https://ereuna.io/recovery</a></li>
        <li>Locate your saved Recovery Key file (downloaded from Account Settings)</li>
        <li>Open the file and copy your Recovery Key</li>
        <li>Paste your Recovery Key into the input field on the recovery page</li>
        <li>Click the <strong>Recover Account</strong> button</li>
        <li>If the key is valid, you'll be prompted to enter a new password</li>
        <li>Enter and confirm your new password</li>
        <li>Click <strong>Reset Password</strong> to complete the process</li>
      </ol>
      
      <p>After successfully setting your new password, you'll regain access to your account immediately.</p>
    </section>

    <section>
      <h2>Recovery Key Format</h2>
      <div class="note-box">
        <h3>What It Looks Like</h3>
        <p>
          Your Recovery Key is a long hexadecimal string (128 characters) that looks like this:
        </p>
        <code>5031ed70814d33f43a9b9aabc3ecf473b087a4cc357d40e6699eae7d8b7cb1a12605b017333fcf8410da50ff0783b49b7245b7a6d556be7f99589783729255ff</code>
      </div>
    </section>

    <section>
      <h2>Important Information</h2>
      <div class="note-box">
        <h3>Generate New Key After Recovery</h3>
        <p>
          After successfully recovering your account, immediately generate and download a new Recovery Key 
          from your Account Settings. This ensures you have a backup for future use.
        </p>
      </div>

      <div class="note-box">
        <h3>No Email Recovery</h3>
        <p>
          Unlike most platforms, Ereuna cannot send password reset emails because we don't store email addresses. 
          This is by design to protect your privacy. Your Recovery Key is your only recovery option.
        </p>
      </div>

      <div class="note-box">
        <h3>Keep Multiple Copies</h3>
        <p>
          Store your Recovery Key in multiple secure locations: encrypted password manager, secure cloud storage, 
          physical safe, etc. Never share your Recovery Key with anyone.
        </p>
      </div>
    </section>

    <section>
      <h2>Troubleshooting</h2>
      <div class="troubleshoot">
        <h3>Recovery Key not working?</h3>
        <ul>
          <li>Ensure you're copying the entire key without extra spaces or line breaks</li>
          <li>Verify you're using the most recent Recovery Key (old keys are invalidated when new ones are generated)</li>
          <li>Check that the key file hasn't been corrupted</li>
          <li>Try copying and pasting from the original downloaded file</li>
        </ul>

        <h3>Lost your Recovery Key?</h3>
        <ul>
          <li>Check all possible storage locations (password managers, cloud storage, email drafts, etc.)</li>
          <li>Look for backup copies on other devices</li>
          <li>Contact support, though recovery without the key is extremely unlikely</li>
          <li>If you still have access to your account, generate a new Recovery Key immediately</li>
        </ul>

        <h3>New password requirements?</h3>
        <ul>
          <li>Password must be between 5 and 40 characters</li>
          <li>Use a strong, unique password</li>
          <li>Consider using a password manager to generate and store complex passwords</li>
          <li>Avoid reusing passwords from other accounts</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Best Practices</h2>
      <ul>
        <li><strong>Generate Immediately:</strong> Create a Recovery Key as soon as you create your account</li>
        <li><strong>Multiple Backups:</strong> Store copies in at least 2-3 different secure locations</li>
        <li><strong>Update After Use:</strong> Generate a new Recovery Key after using it to recover your account</li>
        <li><strong>Secure Storage:</strong> Use encrypted storage solutions for your Recovery Key</li>
        <li><strong>Test Access:</strong> Periodically verify you can locate and read your saved Recovery Key</li>
        <li><strong>Never Share:</strong> Your Recovery Key is as powerful as your password—never share it</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Password Recovery
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

code {
  background: var(--brand-bg-secondary);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: var(--brand-gradient-start);
  display: block;
  margin-top: 0.5rem;
  overflow-wrap: break-word;
}
</style>