<template>
  <div class="doc-content">
    <h1>Adding Cash to Portfolio</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        Adding cash to your portfolio is typically the first step when starting a new investment 
        strategy. Cash deposits provide the liquidity needed to purchase positions and maintain 
        buying power. Ereuna allows you to add cash at any time with customizable dates to accurately 
        track deposits and simulate real-world account funding.
      </p>
    </section>

    <section>
      <h2>How to Add Cash</h2>
      <ol>
        <li>Navigate to the <strong>Portfolio</strong> section</li>
        <li>Select the portfolio where you want to add cash (portfolios 1-10)</li>
        <li>In the header section, locate the <strong>Add Cash</strong> button</li>
        <li>Click the <strong>Add Cash</strong> button to open the deposit form</li>
        <li>A popup will appear with fields to enter deposit details</li>
        <li>Select the <strong>date</strong> of the cash addition</li>
        <li>Enter the <strong>amount of cash</strong> to add to the portfolio</li>
        <li>Review your entries to ensure accuracy</li>
        <li>Click <strong>Submit</strong> to add the cash to your portfolio</li>
        <li>The cash balance will update immediately</li>
      </ol>
    </section>

    <section>
      <h2>Deposit Details</h2>
      <div class="note-box">
        <h3>Required Fields</h3>
        <ul>
          <li><strong>Deposit Date:</strong> The date when the cash was or will be added. You can backdate deposits to match real account funding dates</li>
          <li><strong>Cash Amount:</strong> The total amount of cash to add to the portfolio. Must be a positive number</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Base Value and Cash Balance</h2>
      <div class="note-box">
        <h3>Automatic Base Value Setting</h3>
        <p>
          If no base value has been set for the portfolio yet, adding cash will automatically set 
          the <strong>base value</strong> to match the cash amount. The base value represents your 
          initial capital and is used as a benchmark for calculating portfolio returns.
        </p>
      </div>

      <div class="note-box">
        <h3>Understanding Cash Balance</h3>
        <p>
          Your cash balance represents the liquid funds available for trading. This includes:
        </p>
        <ul>
          <li>Initial cash deposits</li>
          <li>Additional cash added over time</li>
          <li>Proceeds from selling positions</li>
          <li>Dividends received</li>
        </ul>
        <p>
          Your available cash decreases when you buy positions and increases when you sell them.
        </p>
      </div>

      <div class="note-box">
        <h3>Manual Base Value Adjustment</h3>
        <p>
          The base value can also be manually adjusted separately from cash deposits. This is 
          useful if you want to set a different benchmark for performance calculations than your 
          actual starting cash.
        </p>
      </div>
    </section>

    <section>
      <h2>When to Add Cash</h2>
      <p>Common scenarios for adding cash to your portfolio:</p>
      <ul>
        <li><strong>Starting a New Portfolio:</strong> Fund your portfolio with initial capital before making your first trades</li>
        <li><strong>Regular Contributions:</strong> Add cash periodically to simulate consistent investing (e.g., monthly contributions)</li>
        <li><strong>Rebalancing:</strong> Add funds to maintain proper asset allocation or take advantage of opportunities</li>
        <li><strong>Depleted Cash:</strong> Replenish cash if you've invested most of your available funds</li>
        <li><strong>Dollar-Cost Averaging:</strong> Add regular amounts on a set schedule to implement a DCA strategy</li>
        <li><strong>Historical Import:</strong> Backdate deposits when recreating your actual investment history</li>
      </ul>
    </section>

    <section>
      <h2>Important Notes</h2>
      <div class="note-box">
        <h3>No Limit on Deposits</h3>
        <p>
          You can add cash to your portfolio as many times as needed. Each deposit is recorded 
          in your transaction history with its date and amount, creating a complete record of 
          your funding activity.
        </p>
      </div>

      <div class="note-box">
        <h3>Multiple Portfolios</h3>
        <p>
          Cash is specific to each portfolio. Adding cash to Portfolio 1 doesn't affect the cash 
          balance in Portfolio 2. Each portfolio maintains its own independent cash balance and 
          transaction history.
        </p>
      </div>
    </section>

    <section>
      <h2>Troubleshooting</h2>
      <div class="troubleshoot">
        <h3>Add Cash button not visible?</h3>
        <ul>
          <li>Ensure you're in the Portfolio section, not another area of the app</li>
          <li>Look for the button in the header section at the top of the portfolio view</li>
          <li>Try refreshing the page if the interface hasn't loaded completely</li>
          <li>Check that you have selected a valid portfolio (1-10)</li>
        </ul>

        <h3>Popup not appearing?</h3>
        <ul>
          <li>Check if your browser is blocking popups from the application</li>
          <li>Disable browser extensions that might interfere with modal dialogs</li>
          <li>Try using a different browser if the issue persists</li>
          <li>Ensure JavaScript is enabled in your browser</li>
        </ul>

        <h3>Cash not added after submission?</h3>
        <ul>
          <li>Refresh the page to see if the deposit was actually processed</li>
          <li>Check your internet connection - deposits require server communication</li>
          <li>Verify you clicked the Submit button and received a confirmation</li>
          <li>Check the transaction history to see if the deposit was recorded</li>
        </ul>

        <h3>Invalid amount error?</h3>
        <ul>
          <li>Ensure the amount is a positive number (no negative values)</li>
          <li>Check that you're using numbers only, without currency symbols ($ or €)</li>
          <li>Avoid using commas in large numbers - use 10000 not 10,000</li>
          <li>Make sure the amount isn't zero or blank</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Tips</h2>
      <ul>
        <li><strong>Start with Realistic Amounts:</strong> Use cash amounts that match your actual investment capital or goals</li>
        <li><strong>Track Real Deposits:</strong> Use the same dates and amounts as your real-world deposits for accurate portfolio mirroring</li>
        <li><strong>Separate Testing Portfolios:</strong> Use different portfolios for testing strategies with varying cash amounts</li>
      </ul>
    </section>

  </div>
</template>

<script setup lang="ts">
// Documentation component for Adding Cash feature
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

.add-cash-gif {
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

.note-box ul {
  margin-bottom: 0;
}

.note-box p:not(:last-child) {
  margin-bottom: 0.75rem;
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