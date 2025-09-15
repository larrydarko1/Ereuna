<template>
 <div class="center-container">
    <p>
      <strong>Note:</strong> You can customize your own database of stocks by hiding stocks that don't fit your style or workflow. Hidden stocks will not appear in your screening results, even if they meet the filter criteria.
    </p>
    <h3>STEP 1: In the screener section, for each stock in the results list, there is a dropdown menu. Hover over it to display the available options.</h3>
    <h3>STEP 2: To hide a stock, click on <b>'Hide Stock'</b> in the dropdown menu. The stock will be hidden from your profile and will no longer appear in screening results.</h3>
   <img class="img" src="@/assets/images/docs/image66.gif" alt="">
    <h3>STEP 3: To view all hidden stocks, click the <b>'Hidden Stocks'</b> button in the middle menu. This will show all stocks you have hidden.</h3>
    <h3>STEP 4: Inside the Hidden List, you can reintroduce stocks to your database. Hover over the dropdown menu for a stock and select <b>'Show Stock'</b>. The stock will be restored and will appear in screening results again.</h3>
   <img class="img" src="@/assets/images/docs/image67.gif" alt="">
    <p>
      <strong>Note:</strong> Hidden stocks are still searchable in the charts section. When viewing a hidden stock in charts, a badge will appear to remind you that the stock is hidden from your profile.
    </p>
    <img class="img" src="@/assets/images/docs/image68.png" alt="">
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
}

.center-container h3{
    font-size: 1.7rem;
    color: $text2;
    margin-bottom: 1rem;
}

.center-container b{
    font-size: inherit;
    color: $text2;
}

.center-container strong{
    font-size: inherit;
    color: $text2;
}

.center-container p{
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container a{
    font-size: 1.7rem;
    color: $accent2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.img {
    width: 100%;
}
</style>