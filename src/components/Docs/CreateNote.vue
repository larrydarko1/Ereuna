<template>
 <div class="center-container">
    <p><strong>Note:</strong> Each symbol can have up to <b>10 notes</b>. If you reach this limit, you will need to delete an existing note before creating a new one.</p>
    <h3>STEP 1: Log in to your account and go to <a href="https://ereuna.io/charts" target="_blank">https://ereuna.io/charts</a>.</h3>
    <h3>STEP 2: Select the symbol you want to add a note to.</h3>
    <h3>STEP 3: On the right panel, locate the dropdown menu. Hover over it to make the menu appear.</h3>
    <img class="img" src="@/assets/images/docs/image32.png" alt="">
    <h3>STEP 4: Select the option <b>'Create Note'</b> from the dropdown menu.</h3>
    <h3>STEP 5: A popup will appear. Write your note and click the submit button.</h3>
    <p>If the note is valid, it will be created successfully. You will see your new notes in the left panel (if you have activated the notes container in your panel profile; it is set to on by default).</p>
    <img class="img" src="@/assets/images/docs/image46.gif" alt="">
    <h3>STEP 6: Done! You have successfully created a new note.</h3>
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

.center-container h3{
    font-size: 1.7rem;
    color: $text2;
    margin-bottom: 1rem;
}

.center-container b{
    font-size: inherit;
    color: $text2;
}

.center-container strong{
    font-size: inherit;
    color: $text2;
}

.center-container p{
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container a{
    font-size: 1.7rem;
    color: $accent2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.img {
    width: 100%;
}
</style>