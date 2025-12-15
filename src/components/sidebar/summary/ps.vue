<template>
<div class="summary-row">
              <div class="category">{{ t('summary.psRatio') }}</div>
              <div class="response">
                {{ (assetInfo.PriceToSalesRatio != null && !isNaN(assetInfo.PriceToSalesRatio) && assetInfo.PriceToSalesRatio >= 0) ?
                  parseInt(assetInfo.PriceToSalesRatio) : '-' }}
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