<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.adv4M') }}</div>
               <div class="response">
                {{ (assetInfo.ADV4M != null && !isNaN(assetInfo.ADV4M)) ?
                  (parseFloat(assetInfo.ADV4M)).toFixed(2) + '%' : '-' }}
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