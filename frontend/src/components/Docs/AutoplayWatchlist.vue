<template>
  <div class="doc-content">
    <h1>Autoplay Watchlist</h1>
    
    <section>
      <h2>Overview</h2>
      <div class="note-box">
        <h3>Requirements</h3>
        <p>
          You must have at least one watchlist with symbols in order to use the autoplay feature.
        </p>
      </div>
    </section>

    <section>
      <h2>How to Use Autoplay</h2>
      <ol>
        <li>On the right panel, locate the dropdown menu and hover over it to display the options</li>
        <li>Select the <strong>'Autoplay'</strong> option from the dropdown menu to activate it</li>
      </ol>
      <img class="img" src="/docs/autoplay.gif" alt="Autoplay Watchlist Demo">
    </section>

    <section>
      <h2>How It Works</h2>
      <p>
        Once activated, the autoplay feature will automatically select each symbol in the watchlist, in order, 
        every 5 seconds.
      </p>
      <p>
        While autoplay is active, you can watch the symbols cycle automatically. To regain manual control, 
        just stop the autoplay.
      </p>
    </section>

    <section>
      <h2>Stopping Autoplay</h2>
      <p>
        To stop autoplay, simply click the 'Autoplay' option again in the dropdown menu.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Autoplay Watchlist
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
  margin-bottom: 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>