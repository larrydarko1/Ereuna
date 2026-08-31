<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.dividendDate') }}</div>
              <div class="response">
                {{
                  (assetInfo.DividendDate !== 'Invalid Date' && assetInfo.DividendDate != null &&
                    !isNaN(Date.parse(assetInfo.DividendDate)))
                    ? formatDate(assetInfo.DividendDate)
                    : '-'
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