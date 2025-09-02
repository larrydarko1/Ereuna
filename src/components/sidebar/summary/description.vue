<template>
 <div class="summary-row2">
              <div :class="['description', { 'expanded': showAllDescription }]"
                :style="{ height: showAllDescription ? 'auto' : minHeight }">
                {{ assetInfo.Description }}
              </div>
            </div>
            <button @click="showAllDescription = !showAllDescription" class="toggle-btn">
      {{ showAllDescription ? 'Show Less' : 'Show All' }}
    </button>
</template>

<script setup>
import { ref } from 'vue';

defineProps(['assetInfo', 'formatDate', 'showAllDescription']);

const showAllDescription = ref(false);
</script>

<style lang="scss">

</style>