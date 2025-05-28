<template>
<div class="center-container">
  <p>
   <b>Notes</b> you create for specific symbols are displayed in a table in the left panel of the <b>Charts</b> section.
  </p>
  <img class="img" src="@/assets/images/docs/image24.png" alt="">
  <p>
    To create a note, refer to 'Create a Note'.
  </p>
  <p>To delete a note, click the X button in the top right corner of the respective note.</p>
  <img class="img" src="@/assets/images/docs/image25.gif" alt="">
</div>
</template>

<script setup>
</script>

<style scoped lang="scss">
@use '@/style.scss' as *;

.center-container {
    display: flex;
    flex-direction: column;
    text-align: left;
}

.center-container h2 {
    font-size: 1.7rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container p,
.center-container b {
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.img {
    width: 100%;
}
</style>