<template>
  <div class="doc-content">
    <h1>Change Username</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        Changing your username on Ereuna is a simple process that can be completed directly from your Account Settings. 
        Once changed, you'll need to use your new username for future logins.
      </p>
    </section>

    <section>
      <h2>How to Change Your Username</h2>
      <ol>
        <li>Log in to your account and navigate to <a href="https://ereuna.io/account" target="_blank">https://ereuna.io/account</a></li>
        <li>The Account subsection should be displayed by default</li>
        <li>Locate the <strong>Change Username</strong> section</li>
        <li>Enter your desired new username in the input field</li>
        <li>Click the <strong>Change Username</strong> button to confirm</li>
      </ol>
    </section>

    <section>
      <h2>Important Notes</h2>
      <div class="note-box">
        <h3>Username Requirements</h3>
        <p>
          Usernames must be unique across the platform and can be up to 25 characters long. 
          You can only use letters, numbers, and underscores to create your username.
        </p>
      </div>

      <div class="note-box">
        <h3>Privacy</h3>
        <p>
          Your username is private and is only used for login purposes. It is not visible to other users 
          or displayed anywhere on the platform publicly.
        </p>
      </div>

      <div class="note-box">
        <h3>No Password Required</h3>
        <p>
          Unlike password changes, updating your username does not require entering your current password. 
          This makes the process quick and convenient.
        </p>
      </div>

      <div class="note-box">
        <h3>Automatic Logout</h3>
        <p>
          After successfully changing your username, you will be automatically logged out. 
          You'll need to log back in using your new username along with your existing password.
        </p>
      </div>
    </section>

    <section>
      <h2>Troubleshooting</h2>
      <div class="troubleshoot">
        <h3>Username already taken?</h3>
        <ul>
          <li>Try variations of your desired username</li>
          <li>Add numbers or underscores to make it unique</li>
          <li>Check for typos in your entry</li>
        </ul>

        <h3>Can't log in after change?</h3>
        <ul>
          <li>Ensure you're using the new username, not the old one</li>
          <li>Remember your password hasn't changed</li>
          <li>Clear your browser cache if issues persist</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Tips</h2>
      <ul>
        <li><strong>Choose Carefully:</strong> Select a username you'll remember easily</li>
        <li><strong>Character Flexibility:</strong> Use letters, numbers, underscores, and special characters</li>
        <li><strong>Update Bookmarks:</strong> Remember to update any saved login credentials</li>
        <li><strong>25 Character Limit:</strong> Keep your username under 25 characters</li>
        <li><strong>Unique Names:</strong> If your preferred username is taken, try adding numbers or underscores</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Change Username feature
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