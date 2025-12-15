<template>
 <div class="summary-row">
              <div class="category">{{ t('summary.industry') }}</div>
              <div class="response">
                {{ assetInfo.Industry.charAt(0).toUpperCase() + assetInfo.Industry.slice(1).toLowerCase() }}
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