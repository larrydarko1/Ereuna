<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.peRatio') }}</div>
              <div class="response">
                {{ (assetInfo.PERatio != null && !isNaN(assetInfo.PERatio) && assetInfo.PERatio >= 0) ?
                  parseInt(assetInfo.PERatio) : '-' }}
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