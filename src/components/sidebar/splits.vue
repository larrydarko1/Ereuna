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
            {{ formatDate((split as Split).effective_date) }}
          </div>
          <div class="splits-cell" style="flex: 0 0 50%;">
            {{ parseInt((split as Split).split_factor) }}
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

<script setup lang="ts">
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

interface Split {
  effective_date: string;
  split_factor: string;
}

const SplitsDate = ref<Split[]>([]);
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
  } catch (err) {
    let errorMsg = 'Unknown error';
    if (typeof err === 'object' && err !== null && 'name' in err && (err as any).name === 'AbortError') {
      return;
    }
    if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string') {
      errorMsg = (err as any).message;
    } else if (typeof err === 'string') {
      errorMsg = err;
    }
    // Optionally, you could expose an error ref for the UI
    // error.value = errorMsg;
    console.error(errorMsg);
  } finally {
    loading.value = false;
  }
}

const displayedSplitsItems = computed(() => {
  if (!SplitsDate.value) return [];
  return SplitsDate.value;
});

const showSplitsButton = computed(() => {
  // Show button if we have exactly 4 items and haven't shown all yet
  // (backend limits to 4, so if we have 4 there might be more)
  if (!showAllSplits.value && SplitsDate.value && SplitsDate.value.length === 4) {
    return true;
  }
  // Hide button if we've shown all and still have 4 or less
  if (showAllSplits.value && SplitsDate.value && SplitsDate.value.length <= 4) {
    return false;
  }
  // Show button if we have more than 4 (when showing all)
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