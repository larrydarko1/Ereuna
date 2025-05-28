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
    text-align: center;
    width: 100%;
    padding: 2rem 0;
}

.center-container h1 {
    font-size: 2rem;
    color: $text2;
    margin-bottom: 1rem;
}

.center-container p {
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 1rem;
}
</style>