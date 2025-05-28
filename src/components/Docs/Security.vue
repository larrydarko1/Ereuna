<template>
   <div class="center-container">
    <h1>Security & 2FA</h1>
    <p>Multi-factor authentication (2FA) is not available during the beta test. We are working to perfect this feature and it will be available soon to help keep your account secure.</p>
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