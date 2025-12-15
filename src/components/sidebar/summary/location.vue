<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.location') }}</div>
              <div class="response">{{ assetInfo.Address }}</div>
            </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>