<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.percOffWeekLow') }}</div>
               <div class="response">
                {{ (assetInfo.percoff52WeekLow != null && !isNaN(assetInfo.percoff52WeekLow)) ?
                  (parseFloat(assetInfo.percoff52WeekLow) * 100).toFixed(2) + '%' : '-' }}
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