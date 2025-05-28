<template>
   <div class="center-container">
    <img src="@/assets/images/cat.gif" alt="" class="welcome-gif" />
    <h1>Welcome to the Ereuna Screener Documentation!</h1>
    <p>Use this documentation to learn how to navigate the application.</p>
</div>
</template>

<script setup>
</script>

<style scoped lang="scss">
@use '@/style.scss' as *;

.center-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    text-align: center;
    position: absolute;
    top: 40%;
    left: 70%;
    transform: translate(-50%, -50%);
}

.center-container h1{
    font-size: 2rem;
    color: $accent1;
    margin-bottom: 1rem;
}

.center-container p{
    font-size: 1.2rem;
    color: $text2;
    margin-bottom: 1rem;
}
.welcome-gif {
    width: 200px;
    height: auto;
}
</style>