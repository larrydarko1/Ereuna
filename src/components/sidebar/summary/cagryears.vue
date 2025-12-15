<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.cagrYears') }}</div>
              <div class="response">
                {{ (assetInfo.CAGRYears != null && !isNaN(assetInfo.CAGRYears)) ? parseFloat(assetInfo.CAGRYears).toFixed(2) : '-'
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