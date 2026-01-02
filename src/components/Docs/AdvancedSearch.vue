<template>
  <div class="doc-content">
    <h1>Advanced Search</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        The Advanced Search feature helps you find stocks when you don't remember the exact ticker symbol or ISIN. 
        This search tool allows you to search by ticker, ISIN, or company name and displays a list of 
        matching results.
      </p>
    </section>

    <section>
      <h2>How to Access Advanced Search</h2>
      <img class="img" src="/docs/advanced_search.png" alt="Advanced Search popup">
      <ol>
        <li>Navigate to the Charts section at <a href="https://ereuna.io/charts" target="_blank">https://ereuna.io/charts</a></li>
        <li>Locate the searchbox section above the watchlist on the right panel</li>
        <li>Click the <strong>Advanced Search</strong> button to open the search popup</li>
      </ol>
    </section>

    <section>
      <h2>Using Advanced Search</h2>
      <img class="img" src="/docs/advanced_search2.png" alt="Advanced Search popup">
      <p>
        Once the Advanced Search popup appears, you can search for stocks using multiple criteria:
      </p>
      <ul>
        <li><strong>Ticker Symbol:</strong> Enter a stock ticker (e.g., AAPL, TSLA)</li>
        <li><strong>ISIN:</strong> Enter an International Securities Identification Number</li>
        <li><strong>Company Name:</strong> Enter the full or partial company name (e.g., "Apple", "Tesla")</li>
      </ul>
      <p>
        Simply type your search query in the input field, and a list of matching results will be generated 
        automatically.
      </p>
    </section>

    <section>
      <h2>Selecting from Results</h2>
      <p>
        Browse through the list of search results and click on the stock you want to add or view. The selected 
        stock will then be available for you to work with in your watchlist.
      </p>
    </section>

    <section>
      <h2>Tips</h2>
      <ul>
        <li><strong>Partial Matches:</strong> You don't need to type the complete name or ticker - partial matches will be displayed</li>
        <li><strong>Quick Access:</strong> The Advanced Search button is always visible in the searchbox section for easy access</li>
        <li><strong>Multiple Criteria:</strong> Try different search terms if you don't find what you're looking for initially</li>
        <li><strong>Efficient Workflow:</strong> Use Advanced Search when you're uncertain about the exact ticker or ISIN code</li>
      </ul>
    </section>

    <section>
      <h2>When to Use Advanced Search</h2>
      <div class="note-box">
        <h3>Best Use Cases</h3>
        <p>
          Advanced Search is particularly useful when:
        </p>
        <ul>
          <li>You know the company name but not the ticker symbol</li>
          <li>You remember part of a ticker but not the complete symbol</li>
          <li>You have an ISIN code and want to find the corresponding stock</li>
          <li>You're exploring stocks and want to find similar names or symbols</li>
          <li>You need to quickly verify if a stock is available in the system</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Advanced Search feature
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
  list-style: none;
  padding-left: 0;
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

.note-box ul {
  margin-top: 0.5rem;
  margin-bottom: 0;
}

strong {
  color: var(--brand-text-primary);
  font-weight: 600;
}

a {
  color: var(--brand-gradient-end);
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover {
  color: var(--brand-gradient-start);
  text-decoration: underline;
}

.img {
  width: 100%;
  margin-bottom: 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
