<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.technicalScore1M') }}</div>
              <div class="response">{{ assetInfo.RSScore1M }}</div>
            </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>