<template>
  <div class="doc-content">
    <h1>News</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        In the left panel of the <strong>Charts</strong> section, you can view the 5 most recent news articles 
        related to the selected symbol.
      </p>
      <img class="img" src="/docs/news.png" alt="News articles displayed in the Charts section">
    </section>

    <section>
      <h2>How to Use</h2>
      <p>
        Clicking on "Read More" for any article will redirect you to the full blog post containing the complete content.
      </p>
    </section>

    <section>
      <h2>Important Notes</h2>
      <div class="note-box">
        <h3>Disclaimer</h3>
        <p>
          Ereuna and its creators take no responsibility for the safety or content of external news websites. 
          Additionally, some articles may become unavailable over time.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for News feature
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
