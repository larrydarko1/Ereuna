<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.rsi') }}</div>
              <div class="response">
                {{ (assetInfo.RSI != null && !isNaN(assetInfo.RSI) && assetInfo.RSI >= 0) ?
                  parseInt(assetInfo.RSI) : '-' }}
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