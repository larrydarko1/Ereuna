<template>
  <div class="doc-content">
    <h1>Multi-Screener Feature</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        With the Multi-Screener feature, you can select multiple screeners and run them simultaneously with a 
        single click. This generates a compact list of all results, with duplicate symbols highlighted and 
        hidden stocks removed, making it more efficient than running each screener individually.
      </p>
    </section>

    <section>
      <h2>Setting Up Multi-Screener</h2>
      <p>
        To use it, go to the selection menu on the left panel. When you hover over it, all your screeners 
        will be displayed. On the left of each screener, there is a checkbox. To include a screener in the 
        Multi-Screener function, ensure its checkbox is toggled on (by default, it is on). Unchecked screeners 
        will not be included.
      </p>
      <img src="/docs/multi-screener1.png" alt="Multi-screener checkbox selection" class="img">
    </section>

    <section>
      <h2>Running Multi-Screener</h2>
      <p>
        When you're ready, go to the middle menu and click on <strong>'Multi-Screener'</strong>.
      </p>
      <img src="/docs/multi-screener2.gif" alt="Running multi-screener demo" class="img">
    </section>

    <section>
      <h2>Understanding Results</h2>
      <p>
        The Multi-Screener will automatically generate the combined results list. Duplicate symbols will have 
        an asterisk (*) attached to the ticker symbol. Hovering over the asterisk will show how many times the 
        symbol appeared and in which screeners. The results are also automatically sorted from most duplicated 
        value, showing the most relevant results first.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Multi-Screener Feature
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