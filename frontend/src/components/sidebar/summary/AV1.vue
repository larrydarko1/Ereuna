<template>
<div class="summary-row">
              <div class="category">{{ t('summary.avgVolume1W') }}</div>
              <div class="response">{{ parseInt(assetInfo.AvgVolume1W).toLocaleString() }}</div>
            </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>