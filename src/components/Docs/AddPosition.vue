<template>
  <div class="doc-content">
    <h1>Adding a Position</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        The platform supports both long and short positions, fractional shares, commission fees, 
        and even leverage simulation up to 10x. This flexibility allows you to model 
        real-world trading scenarios.
      </p>
    </section>

    <section>
      <h2>How to Add a New Position</h2>
      <ol>
        <li>Navigate to the <strong>Portfolio</strong> section</li>
        <li>Select the portfolio where you want to add the position (portfolios 1-10)</li>
        <li>Locate the <strong>New Trade</strong> button in the header section</li>
        <li>Click the <strong>New Trade</strong> button to open the trade entry form</li>
        <li>Fill in all the required trade details (see below for details)</li>
        <li>Review your entries to ensure accuracy</li>
        <li>Click the <strong>Submit</strong> button to create the position</li>
        <li>The new position will appear in your portfolio immediately</li>
      </ol>
    </section>

    <section>
      <h2>Trade Details</h2>
      <p>When adding a position, you'll need to provide the following information:</p>
      
      <div class="note-box">
        <h3>Required Fields</h3>
        <ul>
          <li><strong>Trade Date:</strong> The date when the trade was executed. You can select past dates to backfill historical trades</li>
          <li><strong>Symbol:</strong> The ticker symbol of the asset (e.g., AAPL, TSLA, SPY). Must be a valid symbol in the system</li>
          <li><strong>Position Type:</strong> Choose between Long (buying) or Short (short selling) position</li>
          <li><strong>Number of Shares:</strong> The quantity of shares to trade. Fractional shares are fully supported (e.g., 1.5 shares)</li>
          <li><strong>Price per Share:</strong> The execution price at which you bought or sold the shares</li>
        </ul>
      </div>

      <div class="note-box">
        <h3>Optional Fields</h3>
        <ul>
          <li><strong>Commission Fee:</strong> Any brokerage fees or commissions paid for the trade. This affects your cost basis</li>
          <li><strong>Leverage:</strong> Simulate leverage from 1x (no leverage) up to 10x. This multiplies your position size and potential gains/losses</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Position Types</h2>
      <div class="note-box">
        <h3>Long Position</h3>
        <p>
          A long position represents buying shares with the expectation that the price will increase. 
          You profit when the stock price rises above your purchase price. This is the most common 
          type of investment.
        </p>
      </div>

      <div class="note-box">
        <h3>Short Position</h3>
        <p>
          A short position represents borrowing and selling shares with the expectation that the 
          price will decrease. You profit when the stock price falls below your short sale price. 
          This is a more advanced strategy with potentially unlimited risk.
        </p>
      </div>
    </section>

    <section>
      <h2>Advanced Features</h2>
      <div class="note-box">
        <h3>Fractional Shares</h3>
        <p>
          Ereuna fully supports fractional share trading, allowing you to enter positions like 
          0.5 shares or 1.75 shares. This mirrors modern brokerage platforms that offer fractional 
          share investing, making it easier to dollar-cost average or invest specific amounts.
        </p>
      </div>

      <div class="note-box">
        <h3>Leverage Simulation</h3>
        <p>
          The leverage feature allows you to simulate margin trading up to 10x. When you apply 
          leverage, your position size is multiplied by the leverage factor, amplifying both 
          potential gains and losses. Use this carefully as it significantly increases risk.
        </p>
        <p class="warning-text">
          ⚠️ <strong>Warning:</strong> Leverage magnifies losses as well as gains. A 10% price 
          movement with 10x leverage becomes a 100% gain or loss.
        </p>
      </div>

      <div class="note-box">
        <h3>Historical Trades</h3>
        <p>
          You can backdate trades by selecting past dates when entering positions. This is useful 
          for importing your existing portfolio or tracking trades you made on other platforms. 
          The system will use historical price data to accurately reflect past performance.
        </p>
      </div>
    </section>

    <section>
      <h2>Important Notes</h2>
      <div class="note-box">
        <h3>Validation</h3>
        <p>
          The system validates all inputs to ensure data accuracy. Symbol names are checked against 
          the database, and numerical fields must be positive values. If validation fails, you'll 
          see an error message explaining what needs to be corrected.
        </p>
      </div>

      <div class="note-box">
        <h3>Cash Balance Impact</h3>
        <p>
          Adding a long position deducts the total cost (shares × price + commission) from your 
          portfolio's cash balance. Short positions credit your account but may require margin. 
          Ensure you have sufficient cash before adding positions.
        </p>
      </div>

      <div class="note-box">
        <h3>Real-time Updates</h3>
        <p>
          Once added, positions are immediately reflected in your portfolio. The system calculates 
          current market value, unrealized gains/losses, and updates all performance metrics in real-time.
        </p>
      </div>
    </section>

    <section>
      <h2>Troubleshooting</h2>
      <div class="troubleshoot">
        <h3>Symbol not found?</h3>
        <ul>
          <li>Verify the ticker symbol is correct (e.g., AAPL, not Apple)</li>
          <li>Ensure the symbol exists in our database - not all OTC or international stocks may be available</li>
          <li>Check for typos or extra spaces in the symbol field</li>
        </ul>

        <h3>Insufficient cash error?</h3>
        <ul>
          <li>Check your portfolio's available cash balance</li>
          <li>Reduce the number of shares or remove commission fees</li>
          <li>Close other positions to free up cash</li>
          <li>Consider using a different portfolio with higher cash balance</li>
        </ul>

        <h3>Form not submitting?</h3>
        <ul>
          <li>Ensure all required fields are filled in</li>
          <li>Check that share quantity and price are positive numbers</li>
          <li>Verify your internet connection is stable</li>
          <li>Try refreshing the page and re-entering the data</li>
        </ul>

        <h3>Position not appearing?</h3>
        <ul>
          <li>Refresh the page to reload portfolio data</li>
          <li>Verify you submitted the trade to the correct portfolio</li>
          <li>Check if there was an error message you might have missed</li>
          <li>Look in the transaction history to confirm the trade was recorded</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Tips</h2>
      <ul>
        <li><strong>Double-Check Symbols:</strong> Always verify the ticker symbol before submitting, especially for similar-sounding companies</li>
        <li><strong>Include Commissions:</strong> For accurate cost basis tracking, always include commission fees if your broker charges them</li>
        <li><strong>Use Realistic Dates:</strong> When backdating trades, use the actual execution date for accurate historical performance</li>
        <li><strong>Review Before Submit:</strong> Take a moment to review all fields before clicking Submit to avoid entry errors</li>
        <li><strong>Keep Records:</strong> Match your Ereuna entries with your actual brokerage statements for consistency</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Adding Positions feature
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

.add-position-gif {
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

.warning-text {
  color: #ff9e64;
  font-weight: 500;
  margin-top: 0.75rem;
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