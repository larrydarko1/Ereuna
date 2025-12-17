<template>
  <div class="center-container">
    <h1>Archie AI (In Development)</h1>
    <p>Archie is an AI agent currently in active development and alpha testing. It is being trained on a database containing millions of financial documents to assist users with faster insights and research support. It will be able to recognize patterns in financial data, attempt price forecasting, assess price targets / intrinsic values, suggest potential trades, and adapt to individual users based on information from their simulated portfolios. This feature is optional and can be toggled on or off in the Account settings.</p>
      <p>As a highly experimental tool, Archie is not yet available on the platform, and there is no estimated time of arrival for its release.</p>
    
    <div class="disclaimer-box">
      <h4>Disclaimer</h4>
      <p>Archie is an experimental AI agent. All suggestions are for informational purposes only and do not constitute legal financial advice. Use of Archie is optional and available to all subscription tiers; Ereuna assumes no responsibility for trading outcomes.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">

.center-container {
    display: flex;
    flex-direction: column;
    text-align: left;
    width: 100%;
    padding: 2rem 0;
}

.center-container h1 {
    font-size: 2.5rem;
    color: var(--brand-text-primary);
    margin-bottom: 1.5rem;
    text-align: center;
}

.center-container p,
.center-container strong,
.center-container b {
    font-size: 1.4rem;
    color: var(--brand-text-secondary);
    margin-bottom: 1rem;
    line-height: 1.6;
    overflow-wrap: anywhere;
}

.center-container a {
    color: var(--brand-gradient-end);
    text-decoration: underline;
    font-size: 1.4rem;
    overflow-wrap: anywhere;
}

.archie-info {
    background: var(--brand-glass-border);
    border-radius: 8px;
    padding: 1.5rem;
    margin: 1rem 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.disclaimer-box {
    background: var(--brand-bg-secondary);
    border-radius: 5px;
    padding: 1.5rem;
    margin: 0 0 2rem 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.disclaimer-box h4 {
    font-size: 1.6rem;
    color: var(--brand-gradient-start);
    margin-bottom: 1rem;
    margin-top: 0;
    font-weight: bold;
    overflow-wrap: anywhere;
}

.disclaimer-box p {
    font-size: 1.4rem;
    color: var(--brand-text-secondary);
    margin: 0;
    line-height: 1.6;
    overflow-wrap: anywhere;
}
</style>
