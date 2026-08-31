<template>
 <div class="summary-row2">
              <div :class="['description', { 'expanded': showAllDescription }]"
                :style="{ height: showAllDescription ? 'auto' : minHeight }">
                {{ props.assetInfo?.Description ?? '' }}
              </div>
            </div>
            <button @click="showAllDescription = !showAllDescription" class="toggle-btn">
      {{ showAllDescription ? t('summary.showLess') : t('summary.showAll') }}
    </button>
</template>

<script setup lang="ts">

import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface AssetInfo {
  Description?: string;
}

const props = defineProps<{ assetInfo?: AssetInfo; formatDate?: (date: string) => string }>();

const showAllDescription = ref(false);
const minHeight = '48px';
</script>

<style lang="scss">

.toggle-btn {
  background: none;
  border: none;
  color: var(--text1);
  font-weight: bold;
  background-color: var(--base2);
  cursor: pointer;
  padding: 5px;
  font-size: 0.9em;
  border-radius: 0 0 6px 6px;
}

</style>