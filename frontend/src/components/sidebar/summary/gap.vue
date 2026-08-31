<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.gap') }}</div>
               <div class="response">
                {{ (assetInfo.Gap != null && !isNaN(assetInfo.Gap)) ?
                  (parseFloat(assetInfo.Gap)).toFixed(2) + '%' : '-' }}
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