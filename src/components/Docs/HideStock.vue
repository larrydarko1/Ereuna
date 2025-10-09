<template>
 <div class="center-container">
    <h1>Hiding Assets</h1>
    <p>You can customize your own database of assets by hiding assets that don't fit your style or workflow. Hidden assets will not appear in your screening results, even if they meet the filter criteria.</p>
    <p>In the screener section, for each asset in the results list, there is a dropdown menu. Hover over it to display the available options. To hide an asset, click on <b>'Hide Asset'</b> in the dropdown menu. The asset will be hidden from your profile and will no longer appear in screening results.</p>
     <img class="import-img" src="@/assets/images/docs/hide-asset.gif" alt="">
    <p>To view all hidden assets, click the <b>'Hidden Assets'</b> button in the middle menu. This will show all assets you have hidden.</p>
    <p>Inside the Hidden List, you can reintroduce assets to your database. Hover over the dropdown menu for an asset and select <b>'Show Asset'</b>. The asset will be restored and will appear in screening results again.</p>
    <img class="import-img" src="@/assets/images/docs/show-asset.gif" alt="">
    <p><strong>Note:</strong> Hidden assets are still searchable in the charts section. When viewing a hidden asset in charts, a badge will appear to remind you that the asset is hidden from your profile.</p>
    <img class="import-img" src="@/assets/images/docs/hidden-badge.png" alt="">
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