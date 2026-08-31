<template>
  <div class="doc-content">
    <h1>Edit / Delete Transactions</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        In the transaction history section, each row represents a transaction. You can edit and delete 
        transactions using the action buttons found on the right side of each transaction in the Actions column.
      </p>
    </section>

    <section>
      <h2>Transaction Types</h2>
      <div class="note-box">
        <h3>Trades</h3>
        <p>
          Trades can be both edited and deleted. When editing a trade, you can modify almost everything 
          except the symbol (changing the symbol would create an entirely new position).
        </p>
      </div>

      <div class="note-box">
        <h3>Cash Transactions</h3>
        <p>
          Cash transactions can only be deleted. They cannot be edited.
        </p>
      </div>

      <div class="note-box">
        <h3>Dividends</h3>
        <p>
          Dividends cannot be deleted directly. They can only be removed by deleting the trade that 
          had the stock which generated the dividend.
        </p>
      </div>
    </section>
    <section>
      <h2>Portfolio Recalculation</h2>
      <div class="note-box">
        <h3>Automatic Updates</h3>
        <p>
          All changes are snowballing on the entire portfolio. When you edit or delete a transaction, 
          the portfolio recalculates from scratch to maintain stability and ensure all values remain accurate.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Edit / Delete Transactions feature
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
</style>
