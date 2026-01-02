<template>
  <div class="doc-content">
    <h1>Managing Screeners</h1>
    
    <section>
      <div class="note-box">
        <h3>Screener Limit</h3>
        <p>
          Each user can create up to <strong>20 screeners</strong>. If you reach this limit, you will 
          need to delete an existing screener before creating a new one.
        </p>
      </div>
    </section>

    <section>
      <h2>Creating a Screener</h2>
      <img class="img" src="/docs/create-screener.gif" alt="Creating a screener demo">
      <p>
        To create a screener, click on the 'Create' button on the header menu. A popup will appear. Enter 
        a name for the screener and click the Submit button. If the name is valid, your new screener will 
        be created successfully.
      </p>
    </section>

    <section>
      <h2>Selecting a Screener</h2>
      <p>
        To select a screener, open the dropdown menu and click on the screener you want to select.
      </p>
    </section>

    <section>
      <h2>Updating Screener Parameters</h2>
      <img class="img" src="/docs/screener-param.gif" alt="Updating screener parameters demo">
      <p>
        To update a screener with parameters, select the screener you want to modify. On the left panel, 
        you have access to the parameters. Toggle the parameters you want to use, input the required data, 
        and click on the save icon to update the screener. To reset an individual parameter, click on the 
        reset icon next to it.
      </p>
    </section>

    <section>
      <h2>Renaming a Screener</h2>
      <img class="img" src="/docs/rename-screener.gif" alt="Renaming a screener demo">
      <p>
        To rename a screener, select the screener you want to rename, then click on the Rename button. A 
        popup will appear where you can enter the new name and confirm it.
      </p>
    </section>

    <section>
      <h2>Resetting a Screener</h2>
      <img class="img" src="/docs/reset-screener.gif" alt="Resetting a screener demo">
      <p>
        To reset an entire screener, select the screener you want to reset and click on the Reset button. 
        A confirmation dialog will appear asking if you're sure you want to reset the screener. Confirm to 
        reset the screener to blank.
      </p>
    </section>

    <section>
      <h2>Deleting a Screener</h2>
      <img class="img" src="/docs/delete-screener.gif" alt="Deleting a screener demo">
      <p>
        To delete a screener, simply click on the X button on the right of each screener in the dropdown menu.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Managing Screeners
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
