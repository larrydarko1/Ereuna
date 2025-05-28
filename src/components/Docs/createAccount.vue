<template>
   <div class="center-container">
    <h1>Available Soon</h1>
    <p>The platform is currently invite-only. We'll start accepting all users soon!</p>
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
    color: $text2;
    margin-bottom: 1rem;
}

.center-container p{
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 1rem;
}
</style>