<template>
  <div class="watch-panel-container" style="display: flex; align-items: center; justify-content: space-between;">
    <div class="watch-panel" style="display: flex; gap: 8px;">
      <template v-if="props.watchPanel.length > 0">
        <div class="watch-panel-track" :class="{ 'scrolling': props.watchPanel.length > 12 }">
          <template v-for="repeat in props.watchPanel.length > 12 ? 2 : 1">
            <button v-for="(ticker, i) in props.watchPanel" :key="repeat + '-' + i"
              :class="{ active: props.defaultSymbol === ticker.Symbol, 'index-btn': true }"
              @click="selectSymbol(ticker.Symbol)">
              {{ ticker.Symbol }}
              <span :class="parseFloat(ticker.percentageReturn) > 0 ? 'positive' : 'negative'">
                {{ ticker.percentageReturn }}
              </span>
              <span v-if="parseFloat(ticker.percentageReturn) > 0" class="arrow-up"></span>
              <span v-else class="arrow-down"></span>
            </button>
          </template>
        </div>
      </template>
      <template v-else>
        <span class="no-symbols">No Symbols in Watch Panel</span>
      </template>
    </div>
    <button class="edit-watch-panel-btn" @click="$emit('open-editor')">
      Edit Watch Panel
    </button>
    <slot></slot>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';

const props = defineProps({
  user: { type: String, required: true },
  apiKey: { type: String, required: true },
  defaultSymbol: { type: String, required: true },
  watchPanel: {
    type: Array,
    default: () => []
  },
  fetchWatchPanel: Function,
});
const emit = defineEmits(['select-symbol', 'open-editor']);

function selectSymbol(symbol) {
  emit('select-symbol', symbol);
}
// Fetch watch panel data on mount
onMounted(() => {
  if (props.user) {
    props.fetchWatchPanel();
  }
});
</script>

<style scoped>
.no-symbols {
  color: var(--text2);
}

</style>