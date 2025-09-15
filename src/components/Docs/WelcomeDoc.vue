<template>
   <div class="center-container">
    <img src="@/assets/images/cat.gif" alt="" class="welcome-gif" />
    <h1>Welcome to the Ereuna Screener Documentation!</h1>
    <p>Use this documentation to learn how to navigate the application.</p>
</div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">
@use '@/style.scss' as *;

.center-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    width: 100%;
    min-width: 650px;
}

.center-container h1 {
    font-size: 2rem;
    color: $accent1;
    margin-bottom: 1rem;
}

.center-container p {
    font-size: 1.2rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.welcome-gif {
    width: 100%;
    max-width: 200px;
    height: auto;
    margin-bottom: 1.5rem;
}

//mobile version
@media (max-width: 768px) {
   .center-container {
    margin-left: 0;
    min-width: 10px;
}
}

</style>