<template>
  <div class="doc-content">
    <h1>Resetting a Portfolio</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        The portfolio reset feature allows you to completely clear a portfolio and start fresh. 
        This removes all positions, transaction history, and resets the cash balance to its base value. 
        This is useful when you want to start a new investment strategy or clear out old data.
      </p>
    </section>

    <section>
      <h2>How to Reset a Portfolio</h2>
      <ol>
        <li>Navigate to the <strong>Portfolio</strong> section</li>
        <li>Switch to the portfolio you want to reset using the numbered buttons</li>
        <li>In the header section of the Portfolio view, locate the <strong>Reset</strong> button</li>
        <li>Click the <strong>Reset</strong> button</li>
        <li>A confirmation popup will appear warning you about the permanent nature of this action</li>
        <li>Review the warning carefully - this action cannot be undone</li>
        <li>Click <strong>Confirm</strong> in the popup to proceed with the reset</li>
        <li>The portfolio will be immediately cleared and reset to its default state</li>
      </ol>
    </section>

    <section>
      <h2>What Gets Reset</h2>
      <p>When you reset a portfolio, the following data is permanently deleted:</p>
      <ul>
        <li><strong>All Positions:</strong> Every stock, ETF, or asset position is removed</li>
        <li><strong>Transaction History:</strong> All buy, sell, and trade records are deleted</li>
        <li><strong>Performance Data:</strong> Historical returns, gains/losses, and performance metrics are cleared</li>
        <li><strong>Cash Balance:</strong> Reset to the default starting balance</li>
      </ul>
      <div class="note-box warning">
        <h3>⚠️ Permanent Action</h3>
        <p>
          Resetting a portfolio is <strong>permanent and cannot be undone</strong>. There is no way 
          to recover the deleted positions or transaction history. Make sure you truly want to clear 
          this portfolio before confirming the reset.
        </p>
      </div>
    </section>

    <section>
      <h2>When to Reset a Portfolio</h2>
      <p>Consider resetting a portfolio in these situations:</p>
      <ul>
        <li><strong>Fresh Start:</strong> You want to begin with a clean slate and a new investment strategy</li>
        <li><strong>Strategy Change:</strong> Moving from one investment approach to a completely different one</li>
        <li><strong>Testing Complete:</strong> You've finished testing a strategy and want to start a new experiment</li>
        <li><strong>Data Cleanup:</strong> Remove old or test data that's no longer relevant</li>
        <li><strong>Mistakes Made:</strong> You've made several errors and want to start over correctly</li>
        <li><strong>Simulation Reset:</strong> Starting a new simulation period with fresh capital</li>
      </ul>
    </section>

    <section>
      <h2>Important Notes</h2>
      <div class="note-box">
        <h3>Confirmation Required</h3>
        <p>
          To prevent accidental data loss, the reset action requires explicit confirmation. 
          The confirmation dialog clearly explains what will happen and gives you a chance 
          to cancel before any data is deleted.
        </p>
      </div>

      <div class="note-box">
        <h3>Other Portfolios Unaffected</h3>
        <p>
          Resetting one portfolio has no impact on your other portfolios. Each portfolio 
          is completely independent, so you can safely reset one without worrying about 
          affecting your other investments.
        </p>
      </div>

      <div class="note-box">
        <h3>Default Settings</h3>
        <p>
          After a reset, the portfolio returns to its default starting state with the base 
          cash balance. You can immediately begin adding new positions and building a fresh 
          investment strategy.
        </p>
      </div>
    </section>

    <section>
      <h2>Alternatives to Resetting</h2>
      <div class="troubleshoot">
        <h3>Before you reset, consider these alternatives:</h3>
        <ul>
          <li><strong>Use a Different Portfolio:</strong> Instead of resetting, switch to an unused portfolio (numbered 1-10)</li>
          <li><strong>Manual Cleanup:</strong> Individually close positions you no longer want rather than clearing everything</li>
          <li><strong>Archive Strategy:</strong> Keep the portfolio as-is for reference and use a new one for your next strategy</li>
          <li><strong>Export Data:</strong> Export your portfolio data before resetting for future reference</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Troubleshooting</h2>
      <div class="troubleshoot">
        <h3>Confirmation popup not showing?</h3>
        <ul>
          <li>Check if your browser is blocking popups from the application</li>
          <li>Disable any browser extensions that might interfere with modals</li>
          <li>Try using a different browser if the issue persists</li>
        </ul>

        <h3>Reset didn't work?</h3>
        <ul>
          <li>Refresh the page to see if the reset was actually applied</li>
          <li>Check your internet connection - the reset requires server communication</li>
          <li>Make sure you clicked the confirm button in the popup</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Tips</h2>
      <ul>
        <li><strong>Double Check:</strong> Always verify you've selected the correct portfolio before resetting</li>
        <li><strong>Plan Ahead:</strong> Think about your new strategy before resetting so you can start fresh immediately</li>
        <li><strong>Start Simple:</strong> After resetting, begin with a few core positions rather than trying to rebuild everything at once</li>
        <li><strong>Use Multiple Portfolios:</strong> Reserve one portfolio as a "testing" portfolio that you reset frequently</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Portfolio Reset feature
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
}

li {
  font-size: 1rem;
  color: var(--brand-text-secondary);
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.reset-gif {
  display: block;
  margin: 1.5rem auto;
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  border: 1px solid var(--brand-glass-border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.note-box {
  background: linear-gradient(135deg, rgba(122, 162, 247, 0.08) 0%, rgba(137, 221, 255, 0.08) 100%);
  border: 1px solid var(--brand-glass-border);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.note-box.warning {
  background: linear-gradient(135deg, rgba(255, 158, 100, 0.08) 0%, rgba(255, 117, 117, 0.08) 100%);
  border-color: rgba(255, 158, 100, 0.3);
}

.note-box h3 {
  margin-top: 0;
  color: var(--brand-gradient-start);
  font-size: 1.1rem;
}

.note-box.warning h3 {
  color: #ff9e64;
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