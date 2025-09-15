<template>
<div class="center-container">
  <p>
    In the <b>Charts</b> section, you can now customize the left panel to control what data you see and in what order.
  </p>
  <img class="img" src="@/assets/images/docs/image12.png" alt="">
<h3> STEP 1:  click on the <b>Edit Panel</b> button at the top of the panel. This will open a popup menu where you can manage the panel's components. </h3>
    <img class="img" src="@/assets/images/docs/image13.gif" alt="">
  <h3>STEP 2: In the popup menu, each section represents a component of the panel. You can hide a component by clicking the <b>Remove</b> button, which will make it invisible.</h3>

  <h3>STEP 3: To change the order of the components, simply drag and drop them into your preferred arrangement.</h3>

  <h3>STEP 4: Once you're done, click the <b>Submit</b> button to apply your changes.</h3>

  <h3>STEP 5: To reset the panel to its original layout, click the <b>Reset</b> button.</h3>
  <img class="img" src="@/assets/images/docs/image14.gif" alt="">
<h3>STEP 6: You can also edit the <b>Summary Panel</b> by clicking the 'Edit Summary' button in the Summary component. This will open another popup; the same rules for editing apply: you can add, remove, and sort elements inside the summary panel.</h3>
<img class="img" src="@/assets/images/docs/image15.gif" alt="">
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

.center-container h3 {
    font-size: 1.7rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container p strong,
.center-container b {
    font-size: inherit;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container p {
    color: $text2;
    overflow-wrap: anywhere;
    font-size: 1.4rem;
}

.center-container a {
    color: $accent2;
    overflow-wrap: anywhere;
    font-size: inherit;
}

.img {
    width: 100%;
}
</style>