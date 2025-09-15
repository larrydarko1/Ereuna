<template>
<div class="center-container">
  <p>
    In the <b>Charts</b> section, the left side panel includes three dedicated tables that display key growth metrics for each company: <b>EPS (Earnings Per Share)</b>, <b>Revenue</b>, and <b>Net Income</b>.
  </p>
  <img class="img" src="@/assets/images/docs/image17.png" alt="EPS, Sales, Earnings Tables Example">
  <p>
    Each table tracks the selected metric for every quarter since the company's public listing. For each quarter, you can view both <b>Quarter-over-Quarter (QoQ)</b> and <b>Year-over-Year (YoY)</b> growth rates.
  </p>
  <img src="@/assets/images/docs/image18.gif" alt="">
  <p>
    Next to each QoQ and YoY value, there are two icons that visually indicate the growth trend. The icon color changes based on the percentage change:
  </p>
 <ul>
  <li>
    <b>
      <svg width="14" height="14" style="vertical-align: middle; margin-right: 4px;">
        <circle cx="7" cy="7" r="6" fill="#4caf50" />
      </svg>
      Positive:
    </b>
    If the growth rate is higher than 20%, the icon turns positive to highlight strong growth acceleration.
  </li>
  <li>
    <b>
      <svg width="14" height="14" style="vertical-align: middle; margin-right: 4px;">
        <circle cx="7" cy="7" r="6" fill="#90bff9" />
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
@use '@/style.scss' as *;

.center-container {
    display: flex;
    flex-direction: column;
    text-align: left;
}

.center-container h3 {
    font-size: 1.7rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container p strong,
.center-container b {
    font-size: inherit;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container p {
    color: $text2;
    overflow-wrap: anywhere;
    font-size: 1.4rem;
}

.center-container ul {
    margin-bottom: 1rem;
    font-size: 1.3rem;
    color: $text2;
    padding-left: 1.5rem;
}

.center-container li {
    margin-bottom: 0.5rem;
    font-size: inherit;
}

.center-container a {
    color: $accent2;
    overflow-wrap: anywhere;
    font-size: inherit;
}

.img {
    width: 100%;
}
</style>