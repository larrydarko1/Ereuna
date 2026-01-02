<template>
  <div class="doc-content">
    <h1>Setting Base Value</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        The base value represents the initial capital of your portfolio and serves as the foundation 
        for all performance calculations. This value is crucial for accurately tracking your portfolio's 
        growth, returns, and overall performance metrics over time.
      </p>
    </section>

    <section>
      <h2>How to Set Your Base Value</h2>
      <ol>
        <li>Navigate to the <strong>Portfolio</strong> view from the main menu</li>
        <li>Locate the <strong>Set Base Value</strong> button in the header section of the portfolio</li>
        <li>Click the "Set Base Value" button to open the configuration popup</li>
        <li>Enter the desired base value amount for your portfolio</li>
        <li>Click <strong>Set</strong> to save your base value</li>
        <li>The base value will be immediately applied to your portfolio calculations</li>
      </ol>
    </section>

    <section>
      <h2>Understanding Base Value</h2>
      <div class="note-box">
        <h3>What is Base Value?</h3>
        <p>
          The base value represents your starting capital or initial investment. It's the reference 
          point from which all gains, losses, and performance percentages are calculated. Think of it 
          as your "day zero" portfolio value.
        </p>
      </div>

      <div class="note-box">
        <h3>How It Affects Calculations</h3>
        <p>
          Your base value is used to calculate important metrics such as:
        </p>
        <ul>
          <li>Total Return Percentage: (Current Value - Base Value) / Base Value × 100</li>
          <li>Absolute Gains/Losses: Current Value - Base Value</li>
          <li>Performance benchmarking against your initial investment</li>
          <li>Time-weighted return calculations</li>
        </ul>
      </div>

      <div class="note-box">
        <h3>Updating Your Base Value</h3>
        <p>
          You can adjust your base value at any time to reflect changes in your portfolio's starting 
          point. This is useful when you add new capital to your portfolio or want to reset your 
          performance tracking baseline after a major portfolio restructuring.
        </p>
      </div>
    </section>

    <section>
      <h2>Best Practices</h2>
      <ul>
        <li><strong>Initial Setup:</strong> Set your base value to match your actual starting capital when creating a new portfolio</li>
        <li><strong>Capital Additions:</strong> Consider updating the base value when making significant capital contributions</li>
        <li><strong>Documentation:</strong> Keep a record of base value changes and the reasons for adjustments</li>
        <li><strong>Zero Start:</strong> If tracking performance from scratch, start with a base value equal to your first investment</li>
      </ul>
    </section>

    <section>
      <h2>Troubleshooting</h2>
      <div class="troubleshoot">
        <h3>Base value not saving?</h3>
        <ul>
          <li>Verify your internet connection is stable</li>
          <li>Try refreshing the page and setting the value again</li>
        </ul>

        <h3>Performance calculations seem incorrect?</h3>
        <ul>
          <li>Verify that your base value accurately reflects your starting capital</li>
          <li>Check that all transactions have been properly recorded</li>
          <li>Consider whether recent capital additions or withdrawals should adjust your base value</li>
          <li>Ensure your base value is not set to zero (which would cause division errors)</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Tips</h2>
      <ul>
        <li><strong>Track History:</strong> Keep a note of your base value changes along with dates for future reference</li>
        <li><strong>Multiple Portfolios:</strong> Each portfolio has its own base value, allowing for independent tracking</li>
        <li><strong>Realistic Values:</strong> Set base values that reflect actual capital, not aspirational amounts</li>
        <li><strong>Regular Review:</strong> Periodically review whether your base value still makes sense for your tracking goals</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Setting Base Value feature
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

.demo-image {
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

.use-case {
  background: var(--brand-bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid var(--brand-glass-border);
}

.use-case h3 {
  color: var(--brand-gradient-start);
  margin-top: 1rem;
  font-size: 1.1rem;
}

.use-case h3:first-child {
  margin-top: 0;
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