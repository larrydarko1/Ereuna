<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.relativeVolume1Y') }}</div>
               <div class="response">
                {{ (assetInfo.RelVolume1Y != null && !isNaN(assetInfo.RelVolume1Y)) ?
                  (parseFloat(assetInfo.RelVolume1Y)).toFixed(2) : '-' }}
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