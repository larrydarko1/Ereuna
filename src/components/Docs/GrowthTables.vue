<template>
<div class="center-container">
  <h1>Growth Tables</h1>
  <p>
    In the <b>Charts</b> section, the left side panel includes three dedicated tables that display key growth metrics for each company: <b>EPS (Earnings Per Share)</b>, <b>Revenue</b>, and <b>Net Income</b>.
  </p>
  <img class="img" src="/docs/growth-table.png" alt="EPS, Sales, Earnings Tables Example">
  <p>
    Each table tracks the selected metric for every quarter since the company's public listing. For each quarter, you can view both <b>Quarter-over-Quarter (QoQ)</b> and <b>Year-over-Year (YoY)</b> growth rates.
  </p>
  <img class="img" src="/docs/growth-table.gif" alt="">
  <p>
    Next to each QoQ and YoY value, there are two icons that visually indicate the growth trend. The icon color changes based on the percentage change:
  </p>
 <ul>
  <li>
    <b>
      <svg width="14" height="14" style="vertical-align: middle; margin-right: 4px;">
        <circle cx="7" cy="7" r="6" fill="#9ece6a" />
      </svg>
      Positive:
    </b>
    If the growth rate is higher than 20%, the icon turns positive to highlight strong growth acceleration.
  </li>
  <li>
    <b>
      <svg width="14" height="14" style="vertical-align: middle; margin-right: 4px;">
        <circle cx="7" cy="7" r="6" fill="#f7768e" />
      </svg>
      Negative:
    </b>
    If the growth rate is below 20%, the icon turns negative to indicate weaker or negative growth.
  </li>
</ul>
  <p>
    This system allows you to quickly identify periods of significant growth acceleration or deceleration for EPS, Revenue, and Net Income. The tables are designed to help you spot trends and make informed decisions based on the company’s historical performance.
  </p>
</div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">

.center-container {
    display: flex;
    flex-direction: column;
    text-align: left;
}

.center-container h1 {
    text-align: center;
    font-size: 2rem;
    color: var(--brand-text-primary);
    margin-bottom: 2rem;
}

.center-container p {
    color: var(--brand-text-secondary);
    font-size: 1.4rem;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container p strong,
.center-container b {
    font-size: inherit;
    color: var(--brand-text-secondary);
}

.center-container ul {
    margin-bottom: 1rem;
    font-size: 1.3rem;
    color: var(--brand-text-secondary);
    padding-left: 1.5rem;
}

.center-container li {
    margin-bottom: 0.5rem;
    font-size: inherit;
}

.center-container a {
    color: var(--brand-gradient-end);
    font-size: inherit;
}

.img {
    width: 100%;
    margin-bottom: 1rem;
}
</style>