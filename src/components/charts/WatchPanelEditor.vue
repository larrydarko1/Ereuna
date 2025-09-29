<template>
  <div class="modal-backdrop" @click.self="close" role="dialog" aria-modal="true" aria-labelledby="watchpanel-title">
    <div class="modal-content">
      <h2 id="watchpanel-title">Edit Watch Panel</h2>
      <div class="symbol-input-row">
        <input
          v-model="newSymbol"
          @keyup.enter="addSymbol"
          placeholder="Enter symbol (e.g. AAPL)"
          aria-label="Enter symbol to add to watch panel"
        />
        <button @click="addSymbol" :disabled="!newSymbol.trim()" aria-label="Add symbol to watch panel">Add</button>
      </div>
      <div class="symbols-list" aria-label="Current watch panel symbols">
        <div v-for="(symbol, idx) in symbols" :key="symbol.Symbol" class="symbol-item">
          <span>{{ symbol.Symbol }}</span>
          <button @click="removeSymbol(idx)" aria-label="Remove symbol {{ symbol.Symbol }} from watch panel">Remove</button>
        </div>
      </div>
      <slot></slot>
      <button @click="close" aria-label="Close watch panel editor">Close</button>
      <NotificationPopup ref="notification" role="alert" aria-live="polite" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import NotificationPopup from '@/components/NotificationPopup.vue';

const emit = defineEmits(['close', 'update'])
const props = defineProps({
  apiKey: String,
  user: String,
  watchPanel: {
    type: Array as () => WatchPanelTicker[],
    default: () => []
  },
  fetchWatchPanel: Function
})

interface WatchPanelTicker {
  Symbol: string;
}

const symbols = ref<WatchPanelTicker[]>([...props.watchPanel])
const newSymbol = ref('')

const notification = ref<InstanceType<typeof NotificationPopup> | null>(null);
const showNotification = (msg: string) => {
  if (notification.value) notification.value.show(msg);
};

// Keep symbols in sync if parent changes watchPanel
watch(() => props.watchPanel, (val: WatchPanelTicker[]) => {
  symbols.value = [...val]
})

const MAX_SYMBOLS = 20

async function patchSymbols() {
  if (symbols.value.length > MAX_SYMBOLS) {
    showNotification('Cannot add more than 20 symbols');
    return;
  }
  try {
    const response = await fetch(`/api/watchpanel/${props.user}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': props.apiKey ?? ''
      } as Record<string, string>,
      body: JSON.stringify({ symbols: symbols.value.map((obj: WatchPanelTicker) => obj.Symbol) })
    })

    if (!response.ok) {
      showNotification('Failed to update symbols.');
      return;
    }

    // After patch, fetch the updated panel and emit
    if (typeof props.fetchWatchPanel === 'function') {
      await props.fetchWatchPanel()
    }
  } catch (error) {
    showNotification('Failed to update symbols.');
  }
}

async function addSymbol() {
  const symbol = newSymbol.value.trim().toUpperCase()
  if (
    !symbol ||
    symbols.value.some((obj: WatchPanelTicker) => obj.Symbol === symbol) ||
    symbols.value.length >= MAX_SYMBOLS
  ) {
    if (!symbol) return;
    if (symbols.value.some((obj: WatchPanelTicker) => obj.Symbol === symbol)) {
      showNotification('Symbol already in watch panel.');
    } else if (symbols.value.length >= MAX_SYMBOLS) {
      showNotification('Cannot add more than 20 symbols.');
    }
    return;
  }
  symbols.value.push({ Symbol: symbol })
  newSymbol.value = ''
  await patchSymbols()
}

async function removeSymbol(idx: number) {
  symbols.value.splice(idx, 1)
  await patchSymbols()
}

function close() {
  emit('close')
}

</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(24, 25, 38, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}

.modal-content {
  position: relative;
  background: var(--base2);
  color: var(--text1);
  border-radius: 18px;
  padding: 36px 32px 28px 32px;
  min-width: 340px;
  box-shadow: 0 8px 32px 0 rgba(0,0,0,0.18), 0 1.5px 8px 0 var(--accent4);
  display: flex;
  flex-direction: column;
  gap: 18px;
  animation: popup-in 0.18s cubic-bezier(.4,1.4,.6,1) backwards;
}

@keyframes popup-in {
  from { transform: translateY(30px) scale(0.98); opacity: 0; }
  to   { transform: none; opacity: 1; }
}

.modal-content h2 {
  margin: 0 0 12px 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--accent1);
  letter-spacing: 0.01em;
}

.symbol-input-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.symbol-input-row input {
  flex: 1;
  padding: 0.6rem 1rem;
  border-radius: 5px;
  border: none;
  background: var(--base4);
  color: var(--text1);
  font-size: 1rem;
  outline: none;
  transition: background 0.2s;
}
.symbol-input-row input:focus {
  background: var(--base1);
  color: var(--text1);
}

.symbol-input-row button {
  padding: 0.6rem 1.2rem;
  border-radius: 5px;
  border: none;
  background: var(--accent1);
  color: var(--text3);
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}
.symbol-input-row button:disabled {
  background: var(--base3);
  cursor: not-allowed;
  opacity: 0.7;
  color: var(--text1);
}
.symbol-input-row button:not(:disabled):hover {
  background: var(--accent2);
}

.symbols-list {
  margin-bottom: 1.5rem;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 2px;
}

.symbol-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.4rem;
  background: var(--base4);
  border-radius: 6px;
  padding: 0.5rem 0.8rem;
  transition: background 0.2s;
}

.symbol-item span {
  font-size: 1.05rem;
  font-weight: 500;
  letter-spacing: 0.03em;
  color: var(--text1);
}

.symbol-item button {
  margin-left: auto;
  padding: 0.3rem 0.9rem;
  border-radius: 6px;
  border: none;
  background: var(--accent1);
  color: var(--text3);
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}
.symbol-item button:hover {
  background: var(--accent2);
  transform: scale(1.05);
}

.modal-content > button:last-of-type {
  margin-top: 1.5rem;
  width: 100%;
  padding: 0.7rem 0;
  border-radius: 8px;
  border: none;
  background: var(--accent1);
  color: var(--text3);
  font-weight: 600;
  font-size: 1.05rem;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}
.modal-content > button:last-of-type:hover {
  background: var(--accent2);
  color: var(--text3);
  transform: scale(1.03);
}
</style>