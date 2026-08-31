<template>
  <div class="doc-content">
    <h1>Dividend and Split Tables</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        In the <strong>Charts</strong> section, the left side panel includes tables dedicated to 
        <strong>Dividends</strong> and <strong>Splits</strong> for each company or asset.
      </p>
      <img class="img" src="/docs/divsplit-table.png" alt="Dividend and Split tables displaying historical data">
    </section>

    <section>
      <h2>Dividend Table</h2>
      <p>
        The <strong>Dividend Table</strong> lists all dividend payment dates along with the corresponding dividend amounts, 
        allowing you to quickly see how much the asset has paid out over time.
      </p>
    </section>

    <section>
      <h2>Split Table</h2>
      <p>
        The <strong>Split Table</strong> displays all split and reverse split events, showing the date and the split 
        factor for each event. This helps you track how many times an asset has split or reverse split and the 
        magnitude of each change.
      </p>
    </section>

    <section>
      <h2>Important Notes</h2>
      <div class="note-box">
        <h3>Historical Record</h3>
        <p>
          These tables provide a clear historical record of dividend payments and stock splits, making it easy 
          to analyze the asset's corporate actions over time.
        </p>
      </div>

      <div class="note-box">
        <h3>Data Availability</h3>
        <p>
          Only assets with dividend or split history will display these tables. If an asset has never paid 
          dividends or had splits, the respective tables will not be shown.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Dividend and Split Tables feature
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
