<template>
  <div class="doc-content">
    <h1>Switching Portfolios</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        Ereuna allows you to manage up to 10 separate portfolios simultaneously, each with its own 
        positions, transactions, and performance tracking. The portfolio switcher makes it easy to 
        navigate between different portfolios and organize your investments efficiently.
      </p>
    </section>

    <section>
      <h2>How to Switch Portfolios</h2>
      <img src="/docs/portfolio-switch.png" alt="Portfolio Header" class="portfolio-img" />
      <ol>
        <li>Navigate to the <strong>Portfolio</strong> section from the main menu</li>
        <li>Locate the header section at the top of the portfolio view</li>
        <li>You'll see buttons numbered <strong>1 to 10</strong>, each representing a separate portfolio</li>
        <li>Click on the button corresponding to the portfolio you want to view</li>
        <li>The interface will instantly switch to display the selected portfolio's data</li>
        <li>The active portfolio button will be highlighted to show which one you're viewing</li>
      </ol>
    </section>

    <section>
      <h2>Portfolio Button Features</h2>
      <div class="note-box">
        <h3>Visual Indicators</h3>
        <p>
          The portfolio buttons provide visual feedback to help you identify which portfolio you're 
          currently viewing. The active portfolio is highlighted with a distinct color, making it 
          easy to know which one you're working with at a glance.
        </p>
      </div>

      <div class="note-box">
        <h3>Independent Portfolios</h3>
        <p>
          Each portfolio is completely independent, with its own cash balance, positions, transaction 
          history, and performance metrics. This allows you to organize your investments by strategy, 
          asset class, or any other criteria that suits your needs.
        </p>
      </div>
    </section>

    <section>
      <h2>Use Cases</h2>
      <p>Here are some common ways to organize multiple portfolios:</p>
      <ul>
        <li><strong>By Strategy:</strong> Separate portfolios for long-term investments, day trading, dividend stocks, etc.</li>
        <li><strong>By Asset Class:</strong> Different portfolios for stocks, ETFs, crypto, or international holdings</li>
        <li><strong>By Account Type:</strong> Mirror your real-world accounts (retirement, taxable, education savings)</li>
        <li><strong>By Risk Level:</strong> Conservative, moderate, and aggressive investment portfolios</li>
        <li><strong>By Time Horizon:</strong> Short-term, medium-term, and long-term investment strategies</li>
        <li><strong>Testing Strategies:</strong> Use different portfolios to test and compare investment strategies</li>
      </ul>
    </section>

    <section>
      <h2>Important Notes</h2>
      <div class="note-box">
        <h3>Data Isolation</h3>
        <p>
          Switching between portfolios does not affect the data in other portfolios. Each portfolio 
          maintains its own complete set of positions, transactions, and performance history. Changes 
          made in one portfolio have no impact on the others.
        </p>
      </div>
    </section>

    <section>
      <h2>Troubleshooting</h2>
      <div class="troubleshoot">
        <h3>Portfolio button not responding?</h3>
        <ul>
          <li>Ensure the page has fully loaded before clicking portfolio buttons</li>
          <li>Check if you're already viewing the portfolio you're trying to switch to</li>
          <li>Try refreshing the page if buttons remain unresponsive</li>
        </ul>

        <h3>Data not updating after switching?</h3>
        <ul>
          <li>Wait a moment for the data to load, especially on slower connections</li>
          <li>Check your internet connection status</li>
          <li>Refresh the page to reload all portfolio data</li>
        </ul>

        <h3>Can't remember which portfolio is which?</h3>
        <ul>
          <li>Click through each portfolio to review its contents</li>
          <li>Look at the positions and transaction history to identify the portfolio</li>
          <li>Consider organizing your portfolios in a consistent order (e.g., 1 for main portfolio, 2 for experimental, etc.)</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Tips</h2>
      <ul>
        <li><strong>Consistent Organization:</strong> Use the same portfolio numbers for the same types of investments across your usage</li>
        <li><strong>Start Simple:</strong> Begin with just 2-3 portfolios before expanding to more complex setups</li>
        <li><strong>Regular Reviews:</strong> Switch between portfolios regularly to stay updated on all your investments</li>
        <li><strong>Keyboard Navigation:</strong> You can quickly switch portfolios using keyboard shortcuts for faster navigation</li>
        <li><strong>Comparison Tool:</strong> Use multiple portfolios to run parallel investment experiments and compare results</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Portfolio Switching feature
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

.portfolio-img {
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