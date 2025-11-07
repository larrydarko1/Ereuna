<template>
 <div class="center-container">
    <h1>Multi-Screener Feature</h1>
    <p>With the Multi-Screener feature, you can select multiple screeners and run them simultaneously with a single click. This generates a compact list of all results, with duplicate symbols highlighted and hidden stocks removed, making it more efficient than running each screener individually.</p>
    <p>To use it, go to the selection menu on the left panel. When you hover over it, all your screeners will be displayed. On the left of each screener, there is a checkbox. To include a screener in the Multi-Screener function, ensure its checkbox is toggled on (by default, it is on). Unchecked screeners will not be included.</p>
    <img src="/docs/multi-screener1.png" alt="" class="import-img">
    <p>When you're ready, go to the middle menu and click on <b>'Multi-Screener'</b>.</p>
    <img src="/docs/multi-screener2.gif" alt="" class="import-img">
    <p>The Multi-Screener will automatically generate the combined results list. Duplicate symbols will have an asterisk (*) attached to the ticker symbol. Hovering over the asterisk will show how many times the symbol appeared and in which screeners. The results are also automatically sorted from most duplicated value, showing the most relevant results first.</p>
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

.import-img {
    width: 100%;
    margin-bottom: 1rem;
}
</style>