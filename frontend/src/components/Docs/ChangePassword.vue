<template>
  <div class="doc-content">
    <h1>Change Password</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        Keeping your account secure starts with a strong password. Ereuna makes it easy to update your 
        password whenever needed. The process is straightforward and immediate.
      </p>
    </section>

    <section>
      <h2>How to Change Your Password</h2>
      <ol>
        <li>Log in to your account and navigate to <a href="https://ereuna.io/account" target="_blank">https://ereuna.io/account</a></li>
        <li>The Account subsection should be displayed by default</li>
        <li>Locate the <strong>Change Password</strong> section</li>
        <li>Enter your <strong>current password</strong> in the first input field</li>
        <li>Enter your <strong>new password</strong> in the second input field</li>
        <li>Re-enter your <strong>new password</strong> in the third input field to confirm</li>
        <li>Click the <strong>Change Password</strong> button</li>
      </ol>
      
      <p>Your password has been successfully changed and is effective immediately.</p>
    </section>

    <section>
      <h2>Important Security Notes</h2>
      <div class="note-box">
        <h3>Password Requirements</h3>
        <p>
          Your password must be between 5 and 40 characters long. While any characters are allowed, 
          we strongly recommend using a combination of uppercase and lowercase letters, numbers, 
          and special characters for maximum security.
        </p>
      </div>

      <div class="note-box">
        <h3>Immediate Effect</h3>
        <p>
          Password changes take effect immediately and cannot be undone. You'll need to use your new password 
          for all future logins.
        </p>
      </div>

      <div class="note-box">
        <h3>Account Recovery</h3>
        <p>
          If you forget your password, the easiest way to recover your account is by using your 
          <strong>Recovery Key</strong>, which you can generate and download from the Account Settings. 
          Keep this key in a safe place!
        </p>
      </div>
    </section>

    <section>
      <h2>Troubleshooting</h2>
      <div class="troubleshoot">
        <h3>Old password not accepted?</h3>
        <ul>
          <li>Double-check for typing errors or caps lock</li>
          <li>Ensure you're using your current password, not an old one</li>
          <li>If you've forgotten your password, use the password recovery feature</li>
        </ul>

        <h3>New passwords don't match?</h3>
        <ul>
          <li>Verify both new password fields are identical</li>
          <li>Check for extra spaces or hidden characters</li>
          <li>Try typing the password in a text editor first, then copy-paste to both fields</li>
        </ul>

        <h3>Forgot your password?</h3>
        <ul>
          <li>Use your Recovery Key if you have one saved</li>
          <li>Contact support at <a href="mailto:contact@ereuna.io">contact@ereuna.io</a> for assistance</li>
          <li>Generate a new Recovery Key after regaining access</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Best Practices</h2>
      <ul>
        <li><strong>Use Strong Passwords:</strong> Combine letters, numbers, and special characters</li>
        <li><strong>Avoid Common Patterns:</strong> Don't use easily guessable information like birthdays</li>
        <li><strong>Unique Passwords:</strong> Use a different password for each online account</li>
        <li><strong>Regular Updates:</strong> Consider changing your password periodically</li>
        <li><strong>Password Manager:</strong> Consider using a password manager to generate and store complex passwords</li>
        <li><strong>Generate Recovery Key:</strong> Always maintain an up-to-date Recovery Key</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Change Password feature
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