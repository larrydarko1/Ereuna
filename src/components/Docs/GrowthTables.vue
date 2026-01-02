<template>
  <div class="doc-content">
    <h1>Growth Tables</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        In the <strong>Charts</strong> section, the left side panel includes three dedicated tables that display 
        key growth metrics for each company: <strong>EPS (Earnings Per Share)</strong>, <strong>Revenue</strong>, 
        and <strong>Net Income</strong>.
      </p>
      <img class="img" src="/docs/growth-table.png" alt="EPS, Revenue, and Net Income growth tables">
    </section>

    <section>
      <h2>What the Tables Show</h2>
      <p>
        Each table tracks the selected metric for every quarter since the company's public listing. For each quarter, 
        you can view both <strong>Quarter-over-Quarter (QoQ)</strong> and <strong>Year-over-Year (YoY)</strong> growth rates.
      </p>
    </section>

    <section>
      <h2>Visual Indicators</h2>
      <p>
        Next to each QoQ and YoY value, there are icons that visually indicate the growth trend. The icon color 
        changes based on the percentage change:
      </p>
      <ul>
        <li>
          <strong>
            <svg width="14" height="14" style="vertical-align: middle; margin-right: 4px;">
              <circle cx="7" cy="7" r="6" fill="#9ece6a" />
            </svg>
            Positive (Green):
          </strong>
          If the growth rate is higher than 20%, the icon turns green to highlight strong growth acceleration
        </li>
        <li>
          <strong>
            <svg width="14" height="14" style="vertical-align: middle; margin-right: 4px;">
              <circle cx="7" cy="7" r="6" fill="#f7768e" />
            </svg>
            Negative (Red):
          </strong>
          If the growth rate is below 20%, the icon turns red to indicate weaker or negative growth
        </li>
      </ul>
    </section>

    <section>
      <h2>Important Notes</h2>
      <div class="note-box">
        <h3>Historical Data</h3>
        <p>
          The tables display data for every quarter since the company's public listing, giving you a complete 
          historical view of the company's growth trajectory.
        </p>
      </div>

      <div class="note-box">
        <h3>Growth Analysis</h3>
        <p>
          This system allows you to quickly identify periods of significant growth acceleration or deceleration 
          for EPS, Revenue, and Net Income, helping you spot trends and make informed decisions based on the 
          company's historical performance.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Growth Tables feature
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
  list-style: none;
  padding-left: 0;
}

ul > li {
  position: relative;
  padding-left: 1.5rem;
}

ul > li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: var(--brand-gradient-start);
  font-weight: 600;
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

strong {
  color: var(--brand-text-primary);
  font-weight: 600;
}

.img {
  width: 100%;
  margin: 1.5rem 0;
  border-radius: 8px;
  border: 1px solid var(--brand-glass-border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
