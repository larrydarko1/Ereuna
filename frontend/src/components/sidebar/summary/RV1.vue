<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.relativeVolume1W') }}</div>
               <div class="response">
                {{ (assetInfo.RelVolume1W != null && !isNaN(assetInfo.RelVolume1W)) ?
                  (parseFloat(assetInfo.RelVolume1W)).toFixed(2) : '-' }}
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