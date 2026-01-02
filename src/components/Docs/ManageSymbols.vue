<template>
  <div class="doc-content">
    <h1>Managing Symbols in Watchlists</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        There are two primary methods to add and remove symbols from watchlists in the Charts section.
      </p>
    </section>

    <section>
      <h2>Method 1: Using the Search Input</h2>
      <img class="img" src="/docs/searchinput.gif" alt="Adding symbols using search input">
      <p>
        Enter a symbol in the search input field and click 'Add Symbol'. If a watchlist is currently selected, 
        the symbol will be added to it.
      </p>
      <p>
        To remove a symbol, hover over the symbol within the watchlist and click the X button that appears.
      </p>
    </section>

    <section>
      <h2>Method 2: Using the Dropdown Menu</h2>
      <img class="img" src="/docs/dropdown.gif" alt="Managing symbols with dropdown menu">
      <p>
        Each symbol in the watchlist features a dropdown menu. Hover over the symbol to reveal a menu listing 
        all existing watchlists. Toggle the checkboxes for the watchlists to which you wish to add the symbol. 
        If a symbol is already present in a watchlist, untoggle the checkbox to remove it.
      </p>
    </section>

    <section>
      <h2>Reordering Symbols</h2>
      <img class="img" src="/docs/drag-drop.gif" alt="Reordering symbols by drag and drop">
      <p>
        Symbols within a watchlist can be reordered by dragging and dropping them.
      </p>
    </section>

    <section>
      <h2>Sorting Symbols</h2>
      <img class="img" src="/docs/sort.gif" alt="Sorting symbols in watchlist">
      <p>
        The watchlist header enables temporary sorting of symbols in ascending or descending order by the 
        following criteria:
      </p>
      <ul>
        <li><strong>Ticker:</strong> Alphabetical order</li>
        <li><strong>Last:</strong> Highest price</li>
        <li><strong>Chg:</strong> Most numerical gain</li>
        <li><strong>Chg%:</strong> Highest percentage gain</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Managing Symbols in Watchlists
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