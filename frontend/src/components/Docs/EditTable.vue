<template>
  <div class="doc-content">
    <h1>Customizing Table Columns</h1>
    
    <section>
      <img class="img" src="/docs/edit-columns.gif" alt="Customizing table columns demo">
    </section>

    <section>
      <h2>Overview</h2>
      <p>
        You can customize the columns for the table, including their values and order. There's an 
        <strong>'Edit Table'</strong> button in the menu. Clicking it opens a menu where you can make changes.
      </p>
    </section>

    <section>
      <h2>Using the Column Editor</h2>
      <p>
        On the left side of the menu, you can select attributes for the columns. On the right side, you can 
        reorder the columns and remove them as needed.
      </p>
    </section>

    <section>
      <h2>Saving and Resetting Changes</h2>
      <p>
        To reset the entire table to its default settings, press the reset button near the save button. To 
        confirm your changes, press the save button, and it will update the table accordingly.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Customizing Table Columns
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
