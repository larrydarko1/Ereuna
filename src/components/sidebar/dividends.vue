<template>
  <div>
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
            {{ parseFloat(dividend.amount).toLocaleString() }}
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

const DividendsDate = ref([]); // Dividends Data
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
    const newDividendsDate = await response.json();
    DividendsDate.value = newDividendsDate;
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    error.value = error.message;
  } finally {
    loading.value = false;
  }
}

const displayedDividendsItems = computed(() => {
  return DividendsDate.value || [];
});

const showDividendsButton = computed(() => {
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
/* Add your styles here */
.loading-indicator {
  text-align: center;
  padding: 10px;
}
</style>