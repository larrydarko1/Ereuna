<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.adv1M') }}</div>
               <div class="response">
                {{ (assetInfo.ADV1M != null && !isNaN(assetInfo.ADV1M)) ?
                  (parseFloat(assetInfo.ADV1M)).toFixed(2) + '%' : '-' }}
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