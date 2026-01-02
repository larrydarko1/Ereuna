<template>
  <div class="doc-content">
    <h1>Change Language</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        Ereuna supports multiple languages to make the platform accessible to users worldwide. 
        You can change your preferred language from the Account Settings page, and your preference 
        will be saved to your account.
      </p>
    </section>

    <section>
      <h2>How to Change Your Language</h2>
      <ol>
        <li>Navigate to <strong>Account Settings</strong> from the main menu</li>
        <li>Locate the <strong>Language Preference</strong> section at the top of the page</li>
        <li>Click on the language selector dropdown to view all available languages</li>
        <li>Select your preferred language from the list</li>
        <li>The interface will immediately update to display in your chosen language</li>
        <li>Your preference is automatically saved to your account</li>
      </ol>
    </section>

    <section>
      <h2>Available Languages</h2>
      <p>Ereuna currently supports the following languages:</p>
      <ul class="language-list">
        <li><strong>English</strong> (en)</li>
        <li><strong>中文</strong> - Chinese (zh)</li>
        <li><strong>Español</strong> - Spanish (es)</li>
        <li><strong>العربية</strong> - Arabic (ar)</li>
        <li><strong>हिन्दी</strong> - Hindi (hi)</li>
        <li><strong>Français</strong> - French (fr)</li>
        <li><strong>Português</strong> - Portuguese (pt)</li>
        <li><strong>Русский</strong> - Russian (ru)</li>
        <li><strong>Deutsch</strong> - German (de)</li>
        <li><strong>日本語</strong> - Japanese (jp)</li>
        <li><strong>한국어</strong> - Korean (ko)</li>
        <li><strong>Italiano</strong> - Italian (it)</li>
        <li><strong>Türkçe</strong> - Turkish (tr)</li>
        <li><strong>Ελληνικά</strong> - Greek (gr)</li>
        <li><strong>עברית</strong> - Hebrew (he)</li>
        <li><strong>Malti</strong> - Maltese (mt)</li>
        <li><strong>Esperanto</strong> - Esperanto (ep)</li>
        <li><strong>Latina</strong> - Latin (la)</li>
      </ul>
    </section>

    <section>
      <h2>Important Notes</h2>
      <div class="note-box">
        <h3>AI-Generated Translations</h3>
        <p>
          Please note that translations are AI-generated and may not be 100% accurate. 
          While we strive for quality, some nuances and technical terms might be translated 
          imperfectly. A disclaimer appears below the language selector to remind users of this.
        </p>
      </div>

      <div class="note-box">
        <h3>Automatic Saving</h3>
        <p>
          Your language preference is saved automatically when you make a selection. 
          The system will remember your choice across sessions and devices (when logged in).
        </p>
      </div>

      <div class="note-box">
        <h3>Interface Coverage</h3>
        <p>
          The language setting affects most of the user interface, including menus, buttons, 
          labels, and messages. However, some user-generated content (like notes or custom 
          portfolio names) will remain in the language they were created in.
        </p>
      </div>
    </section>

    <section>
      <h2>Troubleshooting</h2>
      <div class="troubleshoot">
        <h3>Language not changing?</h3>
        <ul>
          <li>Ensure you're logged in to your account</li>
          <li>Try refreshing the page after selecting a new language</li>
          <li>Clear your browser cache if issues persist</li>
        </ul>

        <h3>Translation seems incorrect?</h3>
        <ul>
          <li>Remember that translations are AI-generated and may have inaccuracies</li>
          <li>You can switch back to English (the source language) for the most accurate experience</li>
          <li>Consider reporting significant translation issues through our feedback channels</li>
        </ul>

        <h3>Language resets on login?</h3>
        <ul>
          <li>This may indicate the preference wasn't saved to the server</li>
          <li>Check your internet connection when changing languages</li>
          <li>You should see a confirmation message when the language is successfully changed</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Tips</h2>
      <ul>
        <li><strong>Local Storage Backup:</strong> Even if the server update fails, your language preference is saved locally in your browser</li>
        <li><strong>Quick Access:</strong> The language selector is always at the top of Account Settings for easy access</li>
        <li><strong>Visual Feedback:</strong> The selected language is highlighted in the dropdown menu</li>
        <li><strong>Multiple Devices:</strong> When logged in, your language preference syncs across all your devices</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Change Language feature
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

.language-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-top: 1rem;
}

.language-list li {
  background: rgba(122, 162, 247, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--brand-glass-border);
  transition: all 0.2s ease;
}

.language-list li:hover {
  background: rgba(122, 162, 247, 0.15);
  border-color: var(--brand-gradient-start);
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

code {
  background: var(--brand-bg-secondary);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: var(--brand-gradient-start);
}
</style>
