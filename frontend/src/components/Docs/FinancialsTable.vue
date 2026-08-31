<template>
  <div class="doc-content">
    <h1>Financial Statements</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        In the <strong>Charts</strong> section, the left side panel includes a button to display the full financial 
        statements for each company, giving you access to comprehensive financial data since the company's inception.
      </p>
    </section>

    <section>
      <h2>How to Access</h2>
      <p>
        To view the full financial statements, click on the <strong>'View Financial Statements'</strong> button. 
        This will open a popup containing the entire set of financial statements for the selected company.
      </p>
      <img class="img" src="/docs/financial-table.png" alt="Financial statements popup with quarterly and annual data">
       <img class="img" src="/docs/financial-table2.png" alt="Financial statements popup with quarterly and annual data">
    </section>

    <section>
      <h2>Features</h2>
      <ul>
        <li><strong>Percentage Changes:</strong> Each value in the table displays a percentage return in the corner, calculated by comparing the value to the previous quarter or year, depending on the selected view</li>
        <li><strong>Quarterly/Annual Toggle:</strong> In the top right corner of the popup, you can switch between quarterly and annual financial statement views using the toggle button</li>
        <li><strong>Helpful Tooltips:</strong> If you're unsure about a specific attribute or value, a question mark icon is displayed next to it. Hovering over the icon will show a description of the attribute, helping you better understand the data</li>
      </ul>
    </section>

    <section>
      <h2>Important Notes</h2>
      <div class="note-box">
        <h3>Comprehensive Data</h3>
        <p>
          The financial statements include all available data since the company's public listing, providing a 
          complete historical view of the company's financial performance.
        </p>
      </div>

      <div class="note-box">
        <h3>Data Comparison</h3>
        <p>
          The percentage changes shown help you quickly identify trends and significant changes in financial 
          metrics period-over-period.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Financial Statements feature
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