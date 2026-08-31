<template>
  <div class="doc-content">
    <h1>Themes</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        Ereuna offers 50 custom themes to personalize your trading experience. Each theme features 
        carefully crafted color schemes designed for optimal readability and aesthetic appeal. Whether you 
        prefer dark mode, light mode, or something more colorful, there's a theme for you.
      </p>
      <p>
        More themes are planned for future updates, expanding your customization options even further.
      </p>
    </section>

    <section>
      <h2>How to Change Your Theme</h2>
      <ol>
        <li>Log in to your account and navigate to <a href="https://ereuna.io/account" target="_blank">https://ereuna.io/account</a></li>
        <li>Click on the <strong>Themes</strong> tab in the Account section</li>
        <li>Browse the available themes displayed in the theme gallery</li>
        <li>Click on any theme to preview and apply it</li>
      </ol>
      
      <p>The app will immediately apply your selected theme across all sections.</p>
    </section>

    <section>
      <h2>Theme Features</h2>
      <div class="note-box">
        <h3>Instant Preview</h3>
        <p>
          When you click on a theme, it's applied immediately so you can see exactly how your interface 
          will look. There's no need to save or confirm—just click and preview.
        </p>
      </div>

      <div class="note-box">
        <h3>Automatic Saving</h3>
        <p>
          Your theme preference is automatically saved to your account. The system will remember your 
          choice across sessions and devices when you're logged in.
        </p>
      </div>

      <div class="note-box">
        <h3>Chart Integration</h3>
        <p>
          Themes affect not only the interface but also your trading charts. Chart backgrounds, grids, 
          and indicators are adjusted to match your selected theme for a cohesive experience.
        </p>
      </div>

      <div class="note-box">
        <h3>50 Themes</h3>
        <p>
          With 50 themes available, you have plenty of options to find the perfect visual style. 
          From professional dark themes to vibrant color schemes, explore different themes to find your favorite.
        </p>
      </div>
    </section>

    <section>
      <h2>Troubleshooting</h2>
      <div class="troubleshoot">
        <h3>Theme not applying?</h3>
        <ul>
          <li>Ensure you're logged in to your account</li>
          <li>Try refreshing the page if the theme doesn't apply immediately</li>
          <li>Clear your browser cache if issues persist</li>
          <li>Check that you clicked directly on the theme preview</li>
        </ul>

        <h3>Theme resets on login?</h3>
        <ul>
          <li>This may indicate the preference wasn't saved to the server</li>
          <li>Check your internet connection when changing themes</li>
          <li>Verify you're logged in before selecting a theme</li>
          <li>The theme should persist once successfully saved</li>
        </ul>

        <h3>Colors look off or incorrect?</h3>
        <ul>
          <li>Some monitors may display colors differently</li>
          <li>Check your display settings and color calibration</li>
          <li>Try a different theme if the current one doesn't suit your display</li>
          <li>Adjust your monitor brightness for better visibility</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Tips</h2>
      <ul>
        <li><strong>Try Multiple Themes:</strong> Click through several themes to compare and find your favorite</li>
        <li><strong>Match Your Environment:</strong> Choose darker themes for low-light environments and lighter themes for bright spaces</li>
        <li><strong>Consider Charts:</strong> Some themes work better for chart analysis with better contrast</li>
        <li><strong>Regular Changes:</strong> Feel free to change themes anytime to keep your experience fresh</li>
        <li><strong>Mobile Compatibility:</strong> Themes sync across desktop and mobile devices</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Themes feature
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