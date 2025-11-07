<template>
<div class="center-container">
  <h1>Editing the Charts Panel</h1>
  <p>
    In the <b>Charts</b> section, the left panel includes a button that allows you to edit the entire left panel. This customization lets you control which elements you see and in what order.
  </p>
  <p>
    Click on the <b>Edit Panel</b> button at the top of the panel. This will open a popup menu where you can manage the panel's components.
  </p>
  <img class="img" src="/docs/edit-panel.gif" alt="">
  <p>
    In the popup menu, each section represents a component of the panel. You can hide a component by clicking the <b>Remove</b> button, which will make it invisible.
  </p>
  <p>
    To change the order of the components, you can either use the arrow buttons or drag and drop them into your preferred position.
  </p>
  <p>
    Once you're done, click the <b>Submit</b> button to apply your changes.
  </p>
  <p>
    If you'd like to return to the default layout, press the <b>Reset</b> button and then click <b>Submit</b>.
  </p>
  <p>
    You can also edit the <b>Summary Panel</b> by clicking the 'Edit Summary' button in the Summary component. This will open another popup; the same rules for editing apply: you can add, remove, and sort elements inside the summary panel.
  </p>
  <img class="img" src="/docs/edit-summary.gif" alt="">
  <p>You now have full control over which elements are visible in the left side panel of the Charts section.</p>
</div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">
@use '@/style.scss' as *;

.center-container {
    display: flex;
    flex-direction: column;
    text-align: left;
}

.center-container h1 {
    text-align: center;
    font-size: 2rem;
    color: $text1;
    margin-bottom: 2rem;
}

.center-container p {
    color: $text2;
    font-size: 1.4rem;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container p strong,
.center-container b {
    font-size: inherit;
    color: $text2;
}

.center-container a {
    color: $accent2;
    font-size: inherit;
}

.img {
    width: 100%;
    margin-bottom: 1rem;
}
</style>