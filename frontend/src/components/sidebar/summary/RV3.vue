<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.relativeVolume6M') }}</div>
               <div class="response">
                {{ (assetInfo.RelVolume6M != null && !isNaN(assetInfo.RelVolume6M)) ?
                  (parseFloat(assetInfo.RelVolume6M)).toFixed(2) : '-' }}
              </div>
            </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>