<template>
  <div class="doc-content">
    <h1>Withdrawing Cash from Portfolio</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        Withdrawing cash from your portfolio allows you to remove funds, simulating distributions 
        or transfers to external accounts. This feature helps you accurately track money flowing 
        in and out of your investment portfolio, whether for living expenses, rebalancing across 
        accounts, or other financial needs.
      </p>
    </section>

    <section>
      <h2>How to Withdraw Cash</h2>
      <ol>
        <li>Navigate to the <strong>Portfolio</strong> section</li>
        <li>Select the portfolio from which you want to withdraw cash</li>
        <li>Scroll down to the <strong>Positions</strong> section</li>
        <li>Locate the <strong>Cash position</strong> - it's always displayed in the positions list</li>
        <li>In the cash position row, where you typically see "Close Position", you'll find a <strong>Withdraw</strong> button</li>
        <li>Click the <strong>Withdraw</strong> button to open the withdrawal form</li>
        <li>A popup will appear with fields to enter withdrawal details</li>
        <li>Select the <strong>date</strong> of the withdrawal</li>
        <li>Enter the <strong>amount of cash</strong> to withdraw from the portfolio</li>
        <li>Review your entries to ensure accuracy</li>
        <li>Click <strong>Submit</strong> to process the withdrawal</li>
        <li>The cash balance will decrease immediately</li>
      </ol>
    </section>

    <section>
      <h2>Withdrawal Details</h2>
      <div class="note-box">
        <h3>Required Fields</h3>
        <ul>
          <li><strong>Withdrawal Date:</strong> The date when the cash withdrawal occurred or will occur. You can backdate withdrawals to match actual distribution dates</li>
          <li><strong>Cash Amount:</strong> The total amount of cash to remove from the portfolio. Must be a positive number and cannot exceed your available cash balance</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Understanding Cash Withdrawals</h2>
      <div class="note-box">
        <h3>Cash Balance Impact</h3>
        <p>
          When you withdraw cash, the specified amount is immediately deducted from your portfolio's 
          cash balance. This reduces your available funds for new investments but doesn't affect 
          your existing positions.
        </p>
      </div>
      <div class="note-box">
        <h3>Cannot Overdraw</h3>
        <p>
          You cannot withdraw more cash than is currently available in your portfolio. The system 
          validates that your withdrawal amount doesn't exceed your current cash balance to prevent 
          negative balances.
        </p>
      </div> 
    </section>

    <section>
      <h2>When to Withdraw Cash</h2>
      <p>Common scenarios for withdrawing cash from your portfolio:</p>
      <ul>
        <li><strong>Living Expenses:</strong> Simulate taking distributions for retirement income or regular expenses</li>
        <li><strong>Rebalancing Between Accounts:</strong> Model moving funds from one portfolio to another</li>
        <li><strong>Tax Payments:</strong> Account for withdrawals to cover capital gains taxes</li>
        <li><strong>Emergency Funds:</strong> Track withdrawals for unexpected expenses</li>
        <li><strong>Portfolio Downsizing:</strong> Reduce portfolio size to match changing investment goals</li>
        <li><strong>Historical Accuracy:</strong> Backdate withdrawals when recreating your actual investment history</li>
        <li><strong>Strategy Testing:</strong> Test how regular withdrawals affect portfolio longevity</li>
      </ul>
    </section>

    <section>
      <h2>Important Notes</h2>

      <div class="note-box">
        <h3>Base Value Unaffected</h3>
        <p>
          Withdrawing cash does not change your portfolio's base value. The base value remains 
          as your original capital benchmark, and withdrawals are tracked separately in performance 
          calculations.
        </p>
      </div>

      <div class="note-box">
        <h3>No Minimum Balance</h3>
        <p>
          You can withdraw your cash down to zero if desired. There's no minimum balance requirement, 
          allowing you to test scenarios where you fully liquidate your portfolio.
        </p>
      </div>

      <div class="note-box">
        <h3>Multiple Portfolios</h3>
        <p>
          Cash withdrawals only affect the specific portfolio you're working with. Withdrawing 
          from Portfolio 1 has no impact on your other portfolios. Each portfolio maintains its 
          own independent cash balance.
        </p>
      </div>
    </section>

    <section>
      <h2>Troubleshooting</h2>
      <div class="troubleshoot">
        <h3>Withdraw button not visible?</h3>
        <ul>
          <li>Scroll down to the Positions section - the button is attached to the Cash position</li>
          <li>Ensure the Cash position is displayed in the positions list</li>
          <li>Refresh the page if the positions aren't loading properly</li>
          <li>Check that you're viewing the correct portfolio</li>
        </ul>

        <h3>Insufficient cash error?</h3>
        <ul>
          <li>Check your current cash balance in the portfolio overview</li>
          <li>Reduce the withdrawal amount to match or be less than available cash</li>
        </ul>

        <h3>Withdrawal not processing?</h3>
        <ul>
          <li>Ensure all required fields are filled in correctly</li>
          <li>Verify the withdrawal amount is a positive number</li>
          <li>Check your internet connection is stable</li>
          <li>Make sure the amount doesn't exceed your available cash</li>
        </ul>

        <h3>Cash balance not updating?</h3>
        <ul>
          <li>Refresh the page to reload portfolio data</li>
          <li>Check the transaction history to confirm the withdrawal was recorded</li>
          <li>Verify you submitted the withdrawal and received a confirmation</li>
          <li>Look for any error messages that might have appeared</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Tips</h2>
      <ul>
        <li><strong>Track Real Withdrawals:</strong> Use the same dates and amounts as your actual withdrawals for accurate portfolio mirroring</li>
        <li><strong>Test Sustainability:</strong> Use regular withdrawals to test if your portfolio can sustain long-term income needs</li>
        <li><strong>Coordinate with Deposits:</strong> Balance withdrawals with periodic deposits to test various cash flow scenarios</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Withdrawing Cash feature
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
