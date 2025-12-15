<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.dividendYield') }}</div>
              <div class="response">
                {{ (assetInfo.DividendYield != null && !isNaN(assetInfo.DividendYield)) ?
                  (parseFloat(assetInfo.DividendYield) * 100).toFixed(2) + '%' : '-' }}
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