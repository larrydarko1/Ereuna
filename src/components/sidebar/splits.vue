<template>
  <div>
    <div v-if="displayedSplitsItems.length > 0" id="SplitsTable">
      <div class="splits-header">
        <div class="splits-cell" style="flex: 0 0 50%;">Reported</div>
        <div class="splits-cell" style="flex: 0 0 50%;">Split</div>
      </div>
      <div class="splits-body">
        <div
          v-for="(split, index) in displayedSplitsItems"
          :key="index"
          class="splits-row"
        >
          <div class="splits-cell" style="flex: 0 0 50%;">
            {{ formatDate(split.effective_date) }}
          </div>
          <div class="splits-cell" style="flex: 0 0 50%;">
            {{ parseInt(split.split_factor) }}
          </div>
        </div>
      </div>
    </div>
    <div v-if="displayedSplitsItems.length === 0" class="no-data">
      No splits data available
    </div>
    <button
      v-if="showSplitsButton"
      @click="handleToggleSplits"
      class="toggle-btn"
      :disabled="loading"
    >
      {{ showAllSplits ? 'Show Less' : 'Show All' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';

const props = defineProps({
  symbol: {
    type: String,
    required: true
  },
  apiKey: {
    type: String,
    required: true
  },
  defaultSymbol: {
    type: String,
    default: ''
  },
  formatDate: {
    type: Function,
    required: true
  }
});

const SplitsDate = ref([]);
const showAllSplits = ref(false);
const loading = ref(false);

async function fetchSplitsDate(all = false) {
  try {
    loading.value = true;
    let ticker = props.symbol || props.defaultSymbol;
    let url = `/api/${ticker}/splitsdate`;
    if (all) {
      url += '?all=true';
    }
    const response = await fetch(url, {
      headers: {
        'X-API-KEY': props.apiKey,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const newSplitsDate = await response.json();
    SplitsDate.value = newSplitsDate;
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    error.value = error.message;
  } finally {
    loading.value = false;
  }
}

const displayedSplitsItems = computed(() => {
  if (!SplitsDate.value) return [];
  if (!showAllSplits.value) {
    return SplitsDate.value.slice(0, 4);
  }
  return SplitsDate.value;
});

const showSplitsButton = computed(() => {
  return SplitsDate.value && SplitsDate.value.length > 4;
});

function handleToggleSplits() {
  showAllSplits.value = !showAllSplits.value;
  fetchSplitsDate(showAllSplits.value);
}

onMounted(() => fetchSplitsDate(false));
watch(() => props.symbol, () => fetchSplitsDate(showAllSplits.value));
</script>

<style scoped>
/* Add your styles here */
</style>