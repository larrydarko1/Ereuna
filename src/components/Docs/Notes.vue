<template>
  <div class="doc-content">
    <h1>Notes</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        Notes created for specific symbols are displayed in a table within the left panel of the <strong>Charts</strong> section.
      </p>
      <img class="img" src="/docs/note.png" alt="Creating and managing notes for symbols">
    </section>

    <section>
      <h2>Creating Notes</h2>
       <img class="img" src="/docs/note2.png" alt="Creating and managing notes for symbols">
      <p>
        To create a note, navigate to the dropdown menu in the top right corner of the Charts section and select 
        the 'Create Note' option. A popup will appear where you can enter your note. After submitting, the new note 
        will be visible in the left panel.
      </p>
    </section>

    <section>
      <h2>Managing Notes</h2>
      <ul>
        <li><strong>Delete:</strong> To delete a note, click the X button in the top right corner of the note you wish to remove</li>
      </ul>
    </section>

    <section>
      <h2>Important Notes</h2>
      <div class="note-box">
        <h3>Symbol-Specific</h3>
        <p>
          Notes are tied to specific symbols and will only appear when viewing that particular symbol in the Charts section.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Notes feature
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