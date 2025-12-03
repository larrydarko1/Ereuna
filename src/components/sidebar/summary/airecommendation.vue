<template>
  <div class="summary-row">
    <div class="category">AI Recommendation</div>
    <div class="response" :class="recommendationClass">
      {{ aiRecommendation }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps(['assetInfo', 'formatDate', 'showAllDescription']);

const aiRecommendation = computed(() => {
  if (props.assetInfo?.AI && Array.isArray(props.assetInfo.AI) && props.assetInfo.AI.length > 0) {
    return props.assetInfo.AI[0].Recommendation || '-';
  }
  return '-';
});

const recommendationClass = computed(() => {
  const rec = aiRecommendation.value.toLowerCase();
  if (rec.includes('strong buy') || rec.includes('buy')) return 'recommendation-buy';
  if (rec.includes('strong sell') || rec.includes('sell')) return 'recommendation-sell';
  if (rec.includes('hold')) return 'recommendation-hold';
  return '';
});
</script>

<style lang="scss" scoped>

</style>
