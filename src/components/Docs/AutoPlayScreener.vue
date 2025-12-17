<template>
 <div class="center-container">
    <h1>Autoplay Screener Results</h1>
    <p>You can autoplay any results list. In the middle menu, click on the <b>'Autoplay'</b> button. While autoplay is active, each result in the list will be automatically selected every 5 seconds. To disable autoplay, simply click the <b>'Autoplay'</b> button again.</p>
    <img class="import-img" src="/docs/autoplay2.gif" alt="">
 </div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">

.center-container {
    display: flex;
    flex-direction: column;
    text-align: left;
    width: 100%;
    padding: 2rem 0;
}

.center-container h1 {
    font-size: 2.5rem;
    color: var(--brand-text-primary);
    margin-bottom: 1.5rem;
    text-align: center;
}

.center-container p,
.center-container strong,
.center-container b {
    font-size: 1.4rem;
    color: var(--brand-text-secondary);
    margin-bottom: 1rem;
    line-height: 1.6;
    overflow-wrap: anywhere;
}

.center-container a {
    color: var(--brand-gradient-end);
    text-decoration: underline;
    font-size: 1.4rem;
    overflow-wrap: anywhere;
}

.import-img {
    width: 100%;
    margin-bottom: 1rem;
}
</style>