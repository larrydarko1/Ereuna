<template>
  <div class="benchmark-selector-modal-overlay" @click.self="$emit('close')">
    <div class="benchmark-selector-modal">
      <div class="modal-header">
        <h3>Select Benchmarks</h3>
        <button class="close-btn" @click="$emit('close')" aria-label="Close">×</button>
      </div>

      <div class="modal-body">
        <p class="info-text">Select up to 5 benchmark symbols to compare against your portfolio performance.</p>
        
        <div class="search-section">
          <div class="input-row">
            <input
              v-model="symbolInput"
              type="text"
              placeholder="Enter benchmark symbol (e.g., SPY, QQQ, DIA)..."
              class="search-input"
              @keydown.enter="addSymbolFromInput"
              @input="symbolInput = symbolInput.toUpperCase()"
              maxlength="10"
            />
            <button 
              class="add-symbol-btn" 
              @click="addSymbolFromInput"
              :disabled="!symbolInput.trim() || selectedBenchmarks.length >= 5"
            >
              Add
            </button>
          </div>
          <p class="hint-text">Press Enter or click Add to add the symbol</p>
        </div>

        <div class="selected-benchmarks">
          <h4>Selected Benchmarks ({{ selectedBenchmarks.length }}/5)</h4>
          <div v-if="selectedBenchmarks.length === 0" class="empty-state">
            No benchmarks selected yet
          </div>
          <div v-else class="benchmark-chips">
            <div
              v-for="(benchmark, index) in selectedBenchmarks"
              :key="index"
              class="benchmark-chip"
            >
              <span>{{ benchmark }}</span>
              <button
                class="remove-btn"
                @click="removeBenchmark(index)"
                aria-label="Remove benchmark"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
      </div>

      <div class="modal-footer">
        <button class="cancel-btn" @click="$emit('close')">Cancel</button>
        <button class="save-btn" @click="saveBenchmarks" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save Benchmarks' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const props = defineProps<{
  user: string;
  apiKey: string;
  portfolio: number;
  currentBenchmarks?: string[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved', benchmarks: string[]): void;
  (e: 'notify', message: { text: string; type: 'success' | 'error' }): void;
}>();

const symbolInput = ref('');
const selectedBenchmarks = ref<string[]>([]);
const saving = ref(false);
const errorMessage = ref('');

onMounted(() => {
  if (props.currentBenchmarks && props.currentBenchmarks.length > 0) {
    selectedBenchmarks.value = [...props.currentBenchmarks];
  }
});

function addSymbolFromInput() {
  const symbol = symbolInput.value.trim().toUpperCase();
  
  if (!symbol) {
    errorMessage.value = 'Please enter a symbol';
    return;
  }

  if (selectedBenchmarks.value.length >= 5) {
    errorMessage.value = 'Maximum 5 benchmarks allowed';
    return;
  }

  if (selectedBenchmarks.value.includes(symbol)) {
    errorMessage.value = 'Benchmark already selected';
    return;
  }

  // Basic validation - alphanumeric only
  if (!/^[A-Z0-9]+$/.test(symbol)) {
    errorMessage.value = 'Symbol can only contain letters and numbers';
    return;
  }

  selectedBenchmarks.value.push(symbol);
  symbolInput.value = '';
  errorMessage.value = '';
}

function removeBenchmark(index: number) {
  selectedBenchmarks.value.splice(index, 1);
  errorMessage.value = '';
}

async function saveBenchmarks() {
  saving.value = true;
  errorMessage.value = '';

  try {
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': props.apiKey
    };

    const response = await fetch('/api/portfolio/benchmarks', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        username: props.user,
        portfolio: props.portfolio,
        benchmarks: selectedBenchmarks.value
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save benchmarks');
    }

    emit('notify', { text: 'Benchmarks saved successfully', type: 'success' });
    emit('saved', selectedBenchmarks.value);
    emit('close');
  } catch (error: any) {
    errorMessage.value = error.message || 'Failed to save benchmarks';
    emit('notify', { text: errorMessage.value, type: 'error' });
  } finally {
    saving.value = false;
  }
}
</script>

<style lang="scss" scoped>
.benchmark-selector-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(24, 25, 38, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}

.benchmark-selector-modal {
  position: relative;
  background: var(--base2);
  color: var(--text1);
  border-radius: 18px;
  padding: 36px 32px 28px 32px;
  min-width: 340px;
  max-width: 600px;
  max-height: 80vh;
  box-shadow: 0 8px 32px 0 rgba(0,0,0,0.18), 0 1.5px 8px 0 var(--accent4);
  display: flex;
  flex-direction: column;
  gap: 18px;
  animation: popup-in 0.18s cubic-bezier(.4,1.4,.6,1) backwards;
  overflow-y: auto;
}

@keyframes popup-in {
  from { transform: translateY(30px) scale(0.98); opacity: 0; }
  to   { transform: none; opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  h3 {
    margin: 0;
    color: var(--accent1);
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: 0.01em;
  }

  .close-btn {
    position: absolute;
    top: 18px;
    right: 18px;
    background: none;
    border: none;
    color: var(--text2);
    font-size: 1.7rem;
    cursor: pointer;
    transition: color 0.15s;
    line-height: 1;
    padding: 0;
  }

  .close-btn:hover {
    color: var(--accent1);
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;

  .info-text {
    color: var(--text2);
    margin-bottom: 16px;
    font-size: 0.9rem;
  }
}

.search-section {
  margin-bottom: 20px;

  .input-row {
    display: flex;
    gap: 8px;
  }

  .search-input {
    flex: 1;
    padding: 10px 12px;
    border-radius: 7px;
    border: 1.5px solid var(--base3);
    background: var(--base1);
    color: var(--text1);
    font-size: 1.08rem;
    outline: none;
    transition: border-color 0.18s;

    &:focus {
      border-color: var(--accent1);
      background: var(--base4);
    }

    &::placeholder {
      color: var(--text2);
    }
  }

  .add-symbol-btn {
    padding: 10px 24px;
    background: var(--accent1);
    color: var(--text3);
    border: none;
    border-radius: 7px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.18s;
    white-space: nowrap;

    &:hover:not(:disabled) {
      background: var(--accent2);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .hint-text {
    color: var(--text2);
    font-size: 0.85rem;
    margin-top: 6px;
    margin-bottom: 0;
  }
}

.selected-benchmarks {
  margin-bottom: 20px;

  h4 {
    color: var(--text2);
    margin-bottom: 10px;
    font-size: 1rem;
    font-weight: 500;
    letter-spacing: 0.01em;
  }

  .empty-state {
    color: var(--text2);
    font-style: italic;
    padding: 12px;
    text-align: center;
  }

  .benchmark-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .benchmark-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--accent1);
    color: var(--text3);
    padding: 6px 12px;
    border-radius: 20px;
    font-weight: 500;
    line-height: 1;

    .remove-btn {
      background: none;
      border: none;
      color: var(--text3);
      font-size: 1.2rem;
      cursor: pointer;
      padding: 0;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      margin-left: 4px;
      line-height: 1;

      &:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    }
  }
}

.loading-indicator {
  color: var(--text2);
  text-align: center;
  padding: 12px;
  font-style: italic;
}

.error-message {
  background: rgba(255, 68, 68, 0.1);
  border: 1px solid var(--negative);
  color: var(--negative);
  padding: 12px;
  border-radius: 7px;
  margin-top: 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 8px;

  button {
    padding: 10px 24px;
    border: none;
    border-radius: 7px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.18s;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .cancel-btn {
    background: transparent;
    color: var(--text2);
    border: 1.5px solid var(--base3);

    &:hover:not(:disabled) {
      border-color: var(--accent1);
      color: var(--accent1);
    }
  }

  .save-btn {
    background: var(--accent1);
    color: var(--text3);

    &:hover:not(:disabled) {
      background: var(--accent2);
    }
  }
}
</style>
