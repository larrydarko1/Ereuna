<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.adv1Y') }}</div>
               <div class="response">
                {{ (assetInfo.ADV1Y != null && !isNaN(assetInfo.ADV1Y)) ?
                  (parseFloat(assetInfo.ADV1Y)).toFixed(2) + '%' : '-' }}
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