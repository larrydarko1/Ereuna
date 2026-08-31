<template>
  <div class="doc-content">
    <h1>Hiding Assets</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        You can customize your own database of assets by hiding assets that don't fit your style or workflow. 
        Hidden assets will not appear in your screening results, even if they meet the filter criteria.
      </p>
    </section>

    <section>
      <h2>How to Hide an Asset</h2>
      <p>
        In the screener section, for each asset in the results list, there is a dropdown menu. Hover over it 
        to display the available options. To hide an asset, click on <strong>'Hide Asset'</strong> in the 
        dropdown menu. The asset will be hidden from your profile and will no longer appear in screening results.
      </p>
      <img class="img" src="/docs/hide-asset.gif" alt="Hiding an asset demo">
    </section>

    <section>
      <h2>Viewing Hidden Assets</h2>
      <p>
        To view all hidden assets, click the <strong>'Hidden Assets'</strong> button in the middle menu. This 
        will show all assets you have hidden.
      </p>
    </section>

    <section>
      <h2>Restoring Hidden Assets</h2>
      <p>
        Inside the Hidden List, you can reintroduce assets to your database. Hover over the dropdown menu for 
        an asset and select <strong>'Show Asset'</strong>. The asset will be restored and will appear in 
        screening results again.
      </p>
      <img class="img" src="/docs/show-asset.gif" alt="Showing a hidden asset demo">
    </section>

    <section>
      <h2>Important Notes</h2>
      <div class="note-box">
        <h3>Hidden Assets in Charts</h3>
        <p>
          Hidden assets are still searchable in the charts section. When viewing a hidden asset in charts, 
          a badge will appear to remind you that the asset is hidden from your profile.
        </p>
        <img class="img" src="/docs/hidden-badge.png" alt="Hidden asset badge in charts">
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Hiding Assets
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
  margin-bottom: 0.5rem;
}

.note-box img {
  margin-top: 1rem;
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