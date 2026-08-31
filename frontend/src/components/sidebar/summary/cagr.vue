<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.cagr') }}</div>
              <div class="response">
                {{ (assetInfo.CAGR != null && !isNaN(assetInfo.CAGR)) ? (parseFloat(assetInfo.CAGR) * 100).toFixed(2) + '%' : '-'
                }}
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