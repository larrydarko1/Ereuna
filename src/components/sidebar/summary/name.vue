<template>
 <div class="summary-row">
              <div class="category">Company Name</div>
              <div class="response">
                {{ assetInfo.Name }}
              </div>
            </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>