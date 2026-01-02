<template>
  <div class="doc-content">
    <h1>Monthly Performance Analysis</h1>
    
    <section>
      <h2>Overview</h2>
            <img src="/docs/monthly-analysis.png" alt="Monthly Performance Analysis Overview" class="image" />
      <p>
        The Monthly Performance Analysis section provides a detailed breakdown of your portfolio's 
        performance on a month-by-month basis since portfolio inception (the date of your first cash deposit).
      </p>
    </section>

    <section>
      <h2>Layout</h2>
      <div class="note-box">
        <h3>Left Side - Monthly Cards</h3>
        <p>
          The left side displays cards tracking each month since portfolio inception. Each card represents 
          a single month and shows the performance data for that period.
        </p>
      </div>

      <div class="note-box">
        <h3>Right Side - Charts</h3>
        <p>
          The right side contains two charts:
        </p>
        <ul>
          <li><strong>Total P/L (%):</strong> Tracks month-by-month profit/loss percentages, showing snapshots of returns for each specific month</li>
          <li><strong>Monthly Returns (%):</strong> Displays the returns each month had in a clear visual format</li>
        </ul>
      </div>

      <div class="note-box">
        <h3>Top Right - Performance Metrics</h3>
        <p>
          The top right corner shows three key metrics:
        </p>
        <ul>
          <li><strong>Winning Months:</strong> Number of profitable months</li>
          <li><strong>Losing Months:</strong> Number of unprofitable months</li>
          <li><strong>Neutral Months:</strong> Number of months with no trades</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Monthly Performance Analysis feature
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

ul {
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
  margin-bottom: 0.5rem;
}

.note-box p:last-child {
  margin-bottom: 0;
}

.note-box ul {
  margin-bottom: 0;
  margin-top: 0.5rem;
}

strong {
  color: var(--brand-text-primary);
  font-weight: 600;
}

.image {
  display: block;
  margin: 1.5rem auto;
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  border: 1px solid var(--brand-glass-border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
