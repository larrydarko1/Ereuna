<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.pegRatio') }}</div>
              <div class="response">
                {{ (assetInfo.PEGRatio != null && !isNaN(assetInfo.PEGRatio) && assetInfo.PEGRatio >= 0) ?
                  parseInt(assetInfo.PEGRatio) : '-' }}
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