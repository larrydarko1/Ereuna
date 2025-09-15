<template>
  <div class="watch-panel-editor-backdrop" @click.self="close">
    <div class="watch-panel-editor-modal">
      <h2>Edit Watch Panel</h2>
      <div class="symbol-input-row">
        <input
          v-model="newSymbol"
          @keyup.enter="addSymbol"
          placeholder="Enter symbol (e.g. AAPL)"
        />
        <button @click="addSymbol" :disabled="!newSymbol.trim()">Add</button>
      </div>
      <div class="symbols-list">
        <div v-for="(symbol, idx) in symbols" :key="symbol.Symbol" class="symbol-item">
          <span>{{ symbol.Symbol }}</span>
          <button @click="removeSymbol(idx)">Remove</button>
        </div>
      </div>
      <slot></slot>
      <button @click="close">Close</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const emit = defineEmits(['close', 'update', 'notify'])
const props = defineProps({
  apiKey: String,
  user: String,
  watchPanel: {
    type: Array as () => WatchPanelTicker[],
    default: () => []
  },
  fetchWatchPanel: Function,
  notify: Function
})

interface WatchPanelTicker {
  Symbol: string;
}

const symbols = ref<WatchPanelTicker[]>([...props.watchPanel])
const newSymbol = ref('')

// Keep symbols in sync if parent changes watchPanel
watch(() => props.watchPanel, (val: WatchPanelTicker[]) => {
  symbols.value = [...val]
})

const MAX_SYMBOLS = 20

async function patchSymbols() {
  if (symbols.value.length > MAX_SYMBOLS) {
    if (props.notify) props.notify('Cannot add more than 20 symbols');
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

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

    // After patch, fetch the updated panel and emit
    if (typeof props.fetchWatchPanel === 'function') {
      await props.fetchWatchPanel()
    }
  } catch (error) {
    console.error('Failed to update symbols:', error)
  }
}

async function addSymbol() {
  const symbol = newSymbol.value.trim().toUpperCase()
  if (
    !symbol ||
    symbols.value.some((obj: WatchPanelTicker) => obj.Symbol === symbol) ||
    symbols.value.length >= MAX_SYMBOLS
  ) return
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
.watch-panel-editor-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: color-mix(in srgb, var(--base1) 70%, transparent);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.watch-panel-editor-modal {
  background: color-mix(in srgb, var(--base2) 85%, transparent);
  color: var(--text1);
  padding: 2.5rem 2rem 2rem 2rem;
  border-radius: 18px;
  min-width: 340px;
  box-shadow: 0 8px 32px color-mix(in srgb, var(--base1) 35%, transparent);
  border: 1.5px solid var(--base4);
  backdrop-filter: blur(8px);
  transition: box-shadow 0.2s;
}

.watch-panel-editor-modal h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  letter-spacing: 0.02em;
  color: var(--accent1);
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
  background: linear-gradient(90deg, var(--accent1) 0%, var(--accent2) 100%);
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
  transform: translateY(-2px) scale(1.04);
  background: linear-gradient(90deg, var(--accent2) 0%, var(--accent1) 100%);

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
  color: var(--accent3);
}

.symbol-item button {
  margin-left: auto;
  padding: 0.3rem 0.9rem;
  border-radius: 6px;
  border: none;
  background: linear-gradient(90deg, var(--negative) 0%, var(--accent1) 100%);
  color: var(--text3);
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}
.symbol-item button:hover {
  background: linear-gradient(90deg, var(--accent1) 0%, var(--negative) 100%);
  transform: scale(1.05);
}

.watch-panel-editor-modal > button:last-of-type {
  margin-top: 1.5rem;
  width: 100%;
  padding: 0.7rem 0;
  border-radius: 8px;
  border: none;
  background: linear-gradient(90deg, var(--accent1) 0%, var(--accent2) 100%);
  color: var(--text3);
  font-weight: 600;
  font-size: 1.05rem;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}
.watch-panel-editor-modal > button:last-of-type:hover {
  background: linear-gradient(90deg, var(--accent1) 0%, var(--accent2) 100%);
  color: var(--text3);
  transform: scale(1.03);
}
</style>