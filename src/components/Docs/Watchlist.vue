<template>
  <div class="doc-content">
    <h1>Managing Watchlists</h1>
    
    <section>
      <div class="note-box">
        <h3>Watchlist Limit</h3>
        <p>
          Each user can create up to <strong>20 watchlists</strong>. If you reach this limit, 
          you will need to delete an existing watchlist before creating a new one.
        </p>
      </div>
    </section>

    <section>
      <img class="img" src="/docs/watchlists.gif" alt="Managing Watchlists Demo">
    </section>

    <section>
      <h2>Creating a Watchlist</h2>
      <ol>
        <li>Log in to your account and navigate to <a href="https://ereuna.io/charts" target="_blank">https://ereuna.io/charts</a></li>
        <li>On the right panel, locate the dropdown menu and hover over it to display the options</li>
        <li>Select the <strong>'New Watchlist'</strong> option from the dropdown menu</li>
        <li>A popup will appear. Enter a new watchlist name and click the submit button</li>
        <li>If the name is valid, your new watchlist will be created successfully</li>
      </ol>
    </section>

    <section>
      <h2>Selecting a Watchlist</h2>
      <p>
        To select a watchlist, open the dropdown menu in the right panel and choose the desired watchlist. 
        Each menu item displays a number indicating how many elements are in the watchlist.
      </p>
    </section>

    <section>
      <h2>Renaming a Watchlist</h2>
      <p>
        While viewing the watchlist you want to rename, click on the dropdown menu and select 'Rename Watchlist'. 
        A popup will appear where you can enter the new name and confirm it.
      </p>
    </section>

    <section>
      <h2>Deleting a Watchlist</h2>
      <p>
        To delete a watchlist, click the X button on the right of the watchlist you want to remove.
      </p>
    </section>

    <section>
      <h2>Exporting a Watchlist</h2>
      <p>
        To export a watchlist, select the watchlist you want to export. Then, go to the dropdown menu on the right 
        and click on 'Export Watchlist'. This will download a TXT file containing the watchlist information.
      </p>
    </section>

    <section>
      <h2>Importing a Watchlist</h2>
      <p>
        To import a watchlist, first create a new watchlist. An 'Import Watchlist' option will be available inside 
        the new watchlist. Click on it to display a popup that allows you to load the TXT file. If successful, 
        the watchlist will be imported correctly.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Managing Watchlists
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