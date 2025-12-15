<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.allTimeLow') }}</div>
              <div class="response">
                {{ (assetInfo.AlltimeLow != null && !isNaN(assetInfo.AlltimeLow)) ?
                  (parseFloat(assetInfo.AlltimeLow)).toFixed(2) : '-' }}
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