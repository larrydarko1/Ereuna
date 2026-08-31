<template>
  <div class="doc-content">
    <h1>Closing a Position</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        Closing positions allows you to exit both long and short positions, realizing gains or losses 
        and freeing up capital for new investments. For long positions, closing means selling your shares. 
        For short positions, closing means buying to cover. Ereuna makes it easy to close full or partial 
        positions directly from your portfolio with customizable dates, prices, and commission fees to 
        accurately reflect your real-world trades.
      </p>
    </section>

    <section>
      <h2>How to Close a Position</h2>
      <img src="/docs/sell-position.png" alt="Close Position Process" class="sell-position-gif" />
      <ol>
        <li>Navigate to the <strong>Portfolio</strong> section</li>
        <li>Select the portfolio containing the position you want to close</li>
        <li>Scroll down to the <strong>Positions</strong> section to view all active holdings</li>
        <li>Locate the position you want to close - each position has a <strong>Close</strong> button</li>
        <li>Click the <strong>Close</strong> button for that specific position</li>
        <li>A popup form will appear where you can enter closing transaction details</li>
        <li>Fill in all the required information (see below for details)</li>
        <li>Review your entries carefully to ensure accuracy</li>
        <li>Click the <strong>Submit</strong> button in the popup to execute the transaction</li>
        <li>The position will be updated or removed if fully closed</li>
      </ol>
    </section>

    <section>
      <h2>Transaction Details</h2>
      <p>When closing a position, you'll need to provide:</p>
      
      <div class="note-box">
        <h3>Required Fields</h3>
        <ul>
          <li><strong>Transaction Date:</strong> The date when the position was closed. You can backdate transactions to match your actual trade dates</li>
          <li><strong>Number of Shares:</strong> How many shares to close. You can close your entire position or just a portion of it</li>
          <li><strong>Closing Price per Share:</strong> The price at which you closed each share. This determines your realized gain or loss</li>
        </ul>
      </div>

      <div class="note-box">
        <h3>Optional Fields</h3>
        <ul>
          <li><strong>Commission Fee:</strong> Any brokerage fees or commissions paid for the transaction. This affects your net proceeds or cost</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Partial vs Full Closing</h2>
      <div class="note-box">
        <h3>Partial Close</h3>
        <p>
          If you close fewer shares than you own (for long positions) or fewer shares than you're short 
          (for short positions), you're making a partial close. The position remains active with the reduced 
          share count. Your cost basis per share stays the same, and only the closed portion realizes a gain or loss.
        </p>
        <p><strong>Example:</strong> If you have a long position of 100 shares and close 30, you'll still have 70 shares remaining. 
        If you have a short position of 100 shares and cover 30, you'll still be short 70 shares.</p>
      </div>

      <div class="note-box">
        <h3>Full Close (Close Entire Position)</h3>
        <p>
          If you close all your shares, you're closing the position entirely. The position will be 
          removed from your active holdings and moved to your transaction history. All gains or 
          losses are realized at this point.
        </p>
        <p><strong>Example:</strong> If you own 100 shares and close all 100, the position is completely closed. 
        If you're short 100 shares and cover all 100, the short position is completely closed.</p>
      </div>
    </section>


    <section>
      <h2>Important Notes</h2>
      <div class="note-box">
        <h3>Long and Short Positions Supported</h3>
        <p>
          You can close both <strong>long positions</strong> (assets you own) and <strong>short positions</strong> 
          (assets you've short sold). The system automatically handles the different mechanics - selling for 
          long positions and buying to cover for short positions. You can set custom prices and dates for each 
          transaction to simulate various scenarios and match your real-world trading activity.
        </p>
      </div>
    </section>

    <section>
      <h2>Troubleshooting</h2>
      <div class="troubleshoot">
        <h3>Close button not appearing?</h3>
        <ul>
          <li>Ensure you have active positions in the selected portfolio</li>
          <li>Scroll down to the Positions section - the buttons are attached to each position row</li>
          <li>Refresh the page if positions aren't loading properly</li>
          <li>Check that you're viewing the correct portfolio</li>
        </ul>

        <h3>Can't close all shares?</h3>
        <ul>
          <li>Verify the exact number of shares in your position - check the position details</li>
          <li>Make sure you're entering the share count, not a dollar amount</li>
          <li>Check for any pending transactions that might affect share count</li>
          <li>Try entering a slightly lower number if there's a rounding issue</li>
        </ul>

        <h3>Transaction not processing?</h3>
        <ul>
          <li>Ensure all required fields are filled in correctly</li>
          <li>Check that the share quantity is a positive number</li>
          <li>Verify your internet connection is stable</li>
          <li>Make sure the closing price is a valid positive number</li>
        </ul>

        <h3>Incorrect gain/loss calculation?</h3>
        <ul>
          <li>Verify the closing price and share quantity are entered correctly</li>
          <li>Check if commission fees were included - they affect your net result</li>
          <li>Remember that long positions profit when price rises, short positions profit when price falls</li>
          <li>For partial closes, the gain only applies to the shares closed, not your total position</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Tips</h2>
      <ul>
        <li><strong>Match Real Trades:</strong> Use actual dates and prices from your brokerage statements for accurate tracking</li>
        <li><strong>Include Commissions:</strong> Always include commission fees for precise gain/loss calculations</li>
        <li><strong>Partial Close Strategy:</strong> Consider closing in tranches to take profits while maintaining exposure</li>
        <li><strong>Review Before Closing:</strong> Double-check share quantity and price to avoid entry errors</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Closing Positions feature
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

.sell-position-gif {
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

.formula {
  background: var(--brand-bg-secondary);
  padding: 1rem;
  border-radius: 8px;
  border-left: 3px solid var(--brand-gradient-start);
  margin: 1rem 0;
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