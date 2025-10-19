<template>
<div class="summary-row">
              <div class="category">Fund Category</div>
              <div class="response">
                {{ assetInfo.FundCategory && assetInfo.FundCategory !== '' ? assetInfo.FundCategory : '-' }}
              </div>
            </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>
