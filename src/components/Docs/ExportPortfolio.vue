<template>
  <div class="doc-content">
    <h1>Exporting a Portfolio</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        Ereuna allows you to export your portfolio data in multiple formats for different purposes. 
        Whether you need a professional PDF report for presentations or a detailed CSV file for 
        data analysis and backup, the export feature provides flexible options to meet your needs.
      </p>
    </section>

    <section>
      <h2>How to Export Your Portfolio</h2>
      <ol>
        <li>Navigate to the <strong>Portfolio</strong> view from the main menu</li>
        <li>Select the portfolio you want to export</li>
        <li>Locate the <strong>Export</strong> button in the header section of the portfolio</li>
        <li>Click the "Export" button to open the export options popup</li>
        <li>Choose your preferred export format (PDF or CSV)</li>
        <li>Click the download button for your selected format</li>
        <li>The file will be downloaded to your default downloads folder</li>
      </ol>
    </section>

    <section>
      <h2>Important Notes</h2>
      <div class="note-box">
        <h3>CSV Format Preservation</h3>
        <p>
          If you plan to import your portfolio back into Ereuna later, it's crucial to preserve 
          the exact CSV format. Do not modify the structure, column headers, or data types when 
          editing the file in external applications. Any changes to the format may prevent 
          successful re-import.
        </p>
      </div>
    </section>

    <section>
      <h2>Troubleshooting</h2>
      <div class="troubleshoot">
        <h3>Export button not working?</h3>
        <ul>
          <li>Ensure you've selected a portfolio before attempting to export</li>
          <li>Ensure the portfolio has data on it, Export feature is disabled for empty / blank portfolios</li>
          <li>Try refreshing the page and attempting the export again</li>
          <li>Clear your browser cache if the issue persists</li>
        </ul>

        <h3>Downloaded file is empty or corrupt?</h3>
        <ul>
          <li>Check your internet connection stability during export</li>
          <li>Try a different browser if the problem continues</li>
          <li>Contact support if exports consistently fail</li>
        </ul>

        <h3>Can't open the CSV file?</h3>
        <ul>
          <li>CSV files can be opened with Excel, Google Sheets, Numbers, or any text editor</li>
          <li>If the file won't open, check that it has a .csv extension</li>
          <li>Try opening with a text editor first to verify the file contains data</li>
          <li>Ensure your spreadsheet application supports UTF-8 encoding</li>
        </ul>

        <h3>PDF formatting looks wrong?</h3>
        <ul>
          <li>Try opening the PDF in a different PDF reader</li>
          <li>Ensure you're using an up-to-date PDF viewer</li>
          <li>Check that the PDF downloaded completely (file size should be reasonable)</li>
          <li>Re-export the PDF if it appears corrupted</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Exporting Portfolio feature
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
  margin-bottom: 0.5rem;
}

.note-box p:last-child {
  margin-bottom: 0;
}

.note-box ul {
  margin-bottom: 0.5rem;
  margin-top: 0.5rem;
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