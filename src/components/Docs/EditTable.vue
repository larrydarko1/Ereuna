<template>
 <div class="center-container">
    <h1>Customizing Table Columns</h1>
    <img src="@/assets/images/docs/edit-columns.gif" alt="">
    <p>You can customize the columns for the table, including their values and order. There's an 'Edit Table' button in the menu. Clicking it opens a menu where you can make changes.</p>
    <p>On the left side of the menu, you can select attributes for the columns. On the right side, you can reorder the columns and remove them as needed.</p>
    <p>To reset the entire table to its default settings, press the reset button near the save button. To confirm your changes, press the save button, and it will update the table accordingly.</p>
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
    width: 100%;
    padding: 2rem 0;
}

.center-container h1 {
    font-size: 2.5rem;
    color: $text1;
    margin-bottom: 1.5rem;
    text-align: center;
}

.center-container p,
.center-container strong,
.center-container b {
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 1rem;
    line-height: 1.6;
    overflow-wrap: anywhere;
}

.center-container a {
    color: $accent2;
    text-decoration: underline;
    font-size: 1.4rem;
    overflow-wrap: anywhere;
}
</style>
