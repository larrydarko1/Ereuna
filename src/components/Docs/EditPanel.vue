<template>
  <div class="doc-content">
    <h1>Editing the Charts Panel</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        The Charts section offers extensive customization options for the left panel layout. You have 
        complete control over which components are visible, their order, and even the individual elements 
        within components like the Summary Panel. This flexibility allows you to create a workspace tailored 
        to your specific analysis needs and workflow preferences.
      </p>
    </section>

    <section>
      <h2>How to Edit the Main Panel</h2>
      <ol>
        <li>Navigate to the <strong>Charts</strong> section</li>
        <li>Locate the <strong>Edit Panel</strong> button at the top of the left panel</li>
        <li>Click the Edit Panel button to open the customization popup</li>
        <li>In the popup, you'll see all available panel components listed</li>
        <li>Use the <strong>Remove</strong> button to hide components you don't need</li>
        <li>Reorder components using the arrow buttons or drag and drop functionality</li>
        <li>Click <strong>Submit</strong> to apply your changes</li>
        <li>To restore defaults, click <strong>Reset</strong> and then <strong>Submit</strong></li>
      </ol>
    </section>

    <section>
      <h2>How to Edit the Summary Panel</h2>
      <p>
        The Summary Panel itself can be customized to show only the data points you find most relevant.
      </p>
      <ol>
        <li>Find the Summary component in the left panel</li>
        <li>Click the <strong>Edit Summary</strong> button within the Summary component</li>
        <li>A popup will appear showing all available summary elements</li>
        <li>Add or remove individual data fields using the toggle or remove buttons</li>
        <li>Reorder elements by dragging them or using arrow buttons</li>
        <li>Click <strong>Submit</strong> to save your custom Summary Panel layout</li>
        <li>Use <strong>Reset</strong> to return to the default Summary Panel configuration</li>
      </ol>
    </section>

    <section>
      <h2>Available Customization Options</h2>
      <ul>
        <li><strong>Component Visibility:</strong> Show or hide entire panel sections based on your needs</li>
        <li><strong>Component Ordering:</strong> Arrange components in the sequence that makes most sense for your workflow</li>
        <li><strong>Drag and Drop:</strong> Intuitive interface for quick reordering of components</li>
        <li><strong>Arrow Controls:</strong> Precise positioning using up/down arrow buttons</li>
        <li><strong>Summary Customization:</strong> Fine-tune which data fields appear in the Summary Panel</li>
        <li><strong>Reset Functionality:</strong> Quickly return to default layouts at any time</li>
        <li><strong>Persistent Settings:</strong> Your customizations are saved to your account</li>
      </ul>
    </section>

    <section>
      <h2>Important Notes</h2>

      <div class="note-box">
        <h3>Reset to Defaults</h3>
        <p>
          The Reset button restores the original default layout. This is useful if you want to start 
          fresh or if you've experimented with different configurations and want to return to the 
          standard setup. Remember to click Submit after resetting to apply the default layout.
        </p>
      </div>

      <div class="note-box">
        <h3>Independent Customizations</h3>
        <p>
          The main panel layout and Summary Panel customizations are independent. You can customize 
          one without affecting the other, allowing for granular control over your workspace.
        </p>
      </div>
    </section>

    <section>
      <h2>Troubleshooting</h2>
      <div class="troubleshoot">
        <h3>Changes not applying?</h3>
        <ul>
          <li>Make sure you clicked the Submit button after making changes</li>
          <li>Check your internet connection - changes are saved to the server</li>
          <li>Try refreshing the page to see if changes were saved</li>
        </ul>

        <h3>Can't find a component?</h3>
        <ul>
          <li>Check if the component was removed in a previous edit session</li>
          <li>Open the Edit Panel popup to see all available components</li>
          <li>Use the Reset function to restore all default components</li>
        </ul>

        <h3>Drag and drop not working?</h3>
        <ul>
          <li>Try using the arrow buttons as an alternative method</li>
          <li>Ensure your browser supports drag and drop functionality</li>
          <li>Refresh the page and try again</li>
          <li>Check if you're clicking and holding on the draggable area</li>
        </ul>

        <h3>Reset button not working?</h3>
        <ul>
          <li>Make sure to click Submit after clicking Reset</li>
          <li>The Reset button stages the changes but doesn't apply them immediately</li>
          <li>Refresh the page after submitting to see the reset layout</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Tips</h2>
      <ul>
        <li><strong>Workflow Optimization:</strong> Place most-used components at the top for quick access</li>
        <li><strong>Reduce Clutter:</strong> Hide components you rarely use to create a cleaner workspace</li>
        <li><strong>Experiment Freely:</strong> Try different layouts - you can always reset to defaults</li>
        <li><strong>Custom Summary:</strong> Tailor the Summary Panel to show only the metrics relevant to your analysis style</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Edit Panel feature
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

.troubleshoot {
  background: var(--brand-bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid var(--brand-glass-border);
}

.troubleshoot h3 {
  color: var(--brand-gradient-start);
  margin-top: 1rem;
  font-size: 1.1rem;
}

.troubleshoot h3:first-child {
  margin-top: 0;
}

.troubleshoot ul {
  margin-left: 1.5rem;
  margin-bottom: 1.5rem;
}

.troubleshoot ul:last-child {
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