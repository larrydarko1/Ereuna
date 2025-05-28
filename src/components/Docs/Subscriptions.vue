<template>
   <div class="center-container">
    <h1>Subscriptions Unavailable</h1>
    <p>Subscription management is not available yet. During our beta, all features are free for invite-only users. Subscription options will be available soon when we open access to everyone.</p>
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