<template>
 <div class="summary-row2">
              <div :class="['description', { 'expanded': showAllDescription }]"
                :style="{ height: showAllDescription ? 'auto' : minHeight }">
                {{ props.assetInfo?.Description ?? '' }}
              </div>
            </div>
            <button @click="showAllDescription = !showAllDescription" class="toggle-btn">
      {{ showAllDescription ? 'Show Less' : 'Show All' }}
    </button>
</template>

<script setup lang="ts">

import { ref } from 'vue';

interface AssetInfo {
  Description?: string;
}

const props = defineProps<{ assetInfo?: AssetInfo; formatDate?: (date: string) => string }>();

const showAllDescription = ref(false);
const minHeight = '48px';
</script>

<style lang="scss">

</style>