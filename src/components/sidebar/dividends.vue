<template>
  <div class="dividends-container">
    <div v-if="displayedDividendsItems.length > 0" id="DividendsTable">
      <div class="dividends-header">
        <div class="dividends-cell" style="flex: 0 0 50%;">Reported</div>
        <div class="dividends-cell" style="flex: 0 0 50%;">Dividends</div>
      </div>
      <div class="dividends-body">
        <div
          v-for="(dividend, index) in displayedDividendsItems"
          :key="index"
          class="dividends-row"
        >
          <div class="dividends-cell" style="flex: 0 0 50%;">
            {{ formatDate(dividend.payment_date) }}
          </div>
          <div class="dividends-cell" style="flex: 0 0 50%;">
            {{ parseFloat(String(dividend.amount)).toLocaleString() }}
          </div>
        </div>
      </div>
    </div>
    <div v-if="displayedDividendsItems.length === 0" class="no-data">
      No dividend data available
    </div>
    <button
      v-if="showDividendsButton"
      @click="handleToggleDividends"
      class="toggle-btn"
      :disabled="loading"
    >
      {{ showAllDividends ? 'Show Less' : 'Show All' }}
    </button>
    <div v-if="loading" class="loading-indicator">Loading...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';

interface Dividend {
  payment_date: string;
  amount: string | number;
}

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

const DividendsDate = ref<Dividend[]>([]); // Dividends Data
const showAllDividends = ref(false);
const loading = ref(false);

async function fetchDividendsDate(all = false) {
  try {
    loading.value = true;
    let ticker = props.symbol || props.defaultSymbol;
    let url = `/api/${ticker}/dividendsdate`;
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
    const newDividendsDate: Dividend[] = await response.json();
    DividendsDate.value = newDividendsDate;
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'name' in err && (err as any).name === 'AbortError') {
      return;
    }
    const errorMsg = typeof err === 'object' && err !== null && 'message' in err ? (err as any).message : String(err);
    // Optionally, you can emit or handle errorMsg here
  } finally {
    loading.value = false;
  }
}

const displayedDividendsItems = computed(() => {
  const dividends = DividendsDate.value || [];
  if (dividends.length === 0) return [];
  return dividends;
});

const showDividendsButton = computed(() => {
  // Show button if we have exactly 4 items and haven't shown all yet
  // (backend limits to 4, so if we have 4 there might be more)
  if (!showAllDividends.value && DividendsDate.value && DividendsDate.value.length === 4) {
    return true;
  }
  // Hide button if we've shown all and still have 4 or less
  if (showAllDividends.value && DividendsDate.value && DividendsDate.value.length <= 4) {
    return false;
  }
  // Show button if we have more than 4 (when showing all)
  return DividendsDate.value && DividendsDate.value.length > 4;
});

function handleToggleDividends() {
  showAllDividends.value = !showAllDividends.value;
  fetchDividendsDate(showAllDividends.value);
}

onMounted(() => fetchDividendsDate(false));
watch(() => props.symbol, () => fetchDividendsDate(showAllDividends.value));
</script>

<style scoped>
.dividends-container {
  display: flex;
  flex-direction: column;
  color: var(--text2);
  border: none;
  border-radius: 6px;
  margin: 5px;
  padding: 5px;
  background-color: var(--base2);
}

.loading-indicator {
  text-align: center;
  padding: 10px;
}
</style>