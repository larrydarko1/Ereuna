<template>
<div class="center-container">
  <h1>Notes</h1>
  <p>
   Notes created for specific symbols are displayed in a table within the left panel of the <b>Charts</b> section.
  </p>
    <img class="img" src="/docs/note.gif" alt="">
  <p>
    To create a note, navigate to the dropdown menu in the top right corner of the Charts section and select the 'Create Note' option. A popup will appear where you can enter your note. After submitting, the new note will be visible in the left panel.
  </p>
  <p>To delete a note, click the X button in the top right corner of the note you wish to remove.</p>
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