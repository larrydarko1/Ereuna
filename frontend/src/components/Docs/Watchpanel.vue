<template>
  <div class="doc-content">
    <h1>Watch Panel</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        The Watch Panel is a horizontal watchlist in the <strong>Charts</strong> section where you can add 
        symbols you want to monitor constantly. It displays each symbol with its current percentage return, 
        giving you a quick at-a-glance view of your most important assets.
      </p>
      <img class="img" src="/docs/edit-watchpanel.png" alt="Watch Panel displaying symbols with percentage returns">
    </section>

    <section>
      <h2>How to Manage Your Watch Panel</h2>
      <ol>
        <li>Locate the Watch Panel in the <strong>Charts</strong> section</li>
        <li>Click the <strong>Edit</strong> button on the right side of the panel</li>
        <li>A popup will open where you can manage your symbols</li>
        <li>Add symbols by typing their ticker in the search field</li>
        <li>Remove symbols by clicking the remove button next to each one</li>
      </ol>
      <img class="img" src="/docs/watchpanel-popup.png" alt="Watch Panel edit popup">
    </section>

    <section>
      <h2>Important Notes</h2>
      <div class="note-box">
        <h3>Symbol Limit</h3>
        <p>
          You can add up to <strong>20 symbols</strong> to the Watch Panel. This limit ensures 
          the panel remains readable and focused on your most important assets.
        </p>
      </div>

      <div class="note-box">
        <h3>Display Information</h3>
        <p>
          The Watch Panel shows the symbol ticker and its percentage return. This minimal display 
          keeps the information clear and easy to scan quickly.
        </p>
      </div>
    </section>

    <section>
      <h2>Tips</h2>
      <ul>
        <li><strong>Focus on Key Assets:</strong> Add only the symbols you monitor most frequently</li>
        <li><strong>Quick Overview:</strong> Use it as your dashboard for immediate market insight</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Watch Panel feature
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

ol {
  counter-reset: item;
}

ol > li {
  counter-increment: item;
  position: relative;
  padding-left: 2rem;
}

ol > li::before {
  content: counter(item) ".";
  position: absolute;
  left: 0;
  color: var(--brand-gradient-start);
  font-weight: 600;
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