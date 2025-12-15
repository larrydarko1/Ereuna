<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.companyName') }}</div>
              <div class="response">
                {{ assetInfo.Name }}
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