<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <button class="close-x" @click="close" aria-label="Close">&times;</button>
      <h2>Edit Trade</h2>
      
      <div class="info-box">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div>
          Editing this trade will recalculate your entire portfolio from scratch to ensure accuracy.
        </div>
      </div>

      <div class="symbol-display">
        <label>Symbol (cannot be changed)</label>
        <div class="symbol-badge">{{ localTrade.Symbol }}</div>
      </div>

      <form @submit.prevent="submitEdit">
        <div class="input-row">
          <label for="edit-date">Date</label>
          <input
            id="edit-date"
            type="date"
            v-model="localTrade.Date"
            :max="today"
            required
          />
        </div>

        <div class="input-row">
          <label>Action</label>
          <div style="display: flex; gap: 8px;">
            <button
              type="button"
              :class="['action-btn', localTrade.Action === 'Buy' ? 'active buy' : '']"
              @click="localTrade.Action = 'Buy'"
            >
              Buy
            </button>
            <button
              type="button"
              :class="['action-btn', localTrade.Action === 'Sell' ? 'active sell' : '']"
              @click="localTrade.Action = 'Sell'"
            >
              Sell
            </button>
          </div>
        </div>

        <div class="input-row">
          <label>Position Type</label>
          <div style="display: flex; gap: 8px;">
            <button
              type="button"
              :class="['position-type-btn', !localTrade.IsShort ? 'active' : '']"
              @click="localTrade.IsShort = false"
            >
              Long
            </button>
            <button
              type="button"
              :class="['position-type-btn', localTrade.IsShort ? 'active' : '']"
              @click="localTrade.IsShort = true"
            >
              Short
            </button>
          </div>
        </div>

        <div class="input-row">
          <label for="edit-shares">Shares</label>
          <input
            id="edit-shares"
            type="number"
            v-model.number="localTrade.Shares"
            min="0.01"
            step="0.01"
            required
            @input="updateTotal"
          />
          <small class="hint">Fractional shares supported</small>
        </div>

        <div class="input-row input-row-flex">
          <div class="input-flex-vertical">
            <label for="edit-price">Price</label>
            <input
              id="edit-price"
              type="number"
              v-model.number="localTrade.Price"
              min="0.01"
              step="0.01"
              required
              @input="updateTotal"
            />
          </div>
          <div class="input-flex-vertical" style="margin-left: 12px;">
            <label for="edit-commission">Commission</label>
            <input
              id="edit-commission"
              type="number"
              v-model.number="localTrade.Commission"
              min="0"
              step="0.01"
              @input="updateTotal"
            />
          </div>
        </div>

        <div class="input-row">
          <label for="edit-leverage">Leverage</label>
          <input
            id="edit-leverage"
            type="number"
            v-model.number="localTrade.Leverage"
            min="1"
            max="10"
            step="0.5"
          />
          <small class="hint">Leverage multiplier (1x = no leverage, max 10x)</small>
        </div>

        <div class="calculated-info">
          <div class="info-item">
            <span class="info-label">Total:</span>
            <span class="info-value">${{ localTrade.Total?.toFixed(2) }}</span>
          </div>
          <div v-if="localTrade.Leverage && localTrade.Leverage > 1" class="info-item">
            <span class="info-label">Leverage:</span>
            <span class="info-value leverage-highlight">{{ localTrade.Leverage }}x</span>
          </div>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="loader"></div>
          <span>Updating trade and recalculating portfolio...</span>
        </div>

        <div v-if="errorMsg" class="error-msg">
          {{ errorMsg }}
        </div>

        <div class="modal-actions">
          <button 
            type="submit" 
            class="save-btn" 
            :disabled="loading || !hasChanges"
          >
            <span v-if="!loading">Save Changes</span>
            <span v-else>Processing...</span>
          </button>
          <button type="button" class="cancel-btn" @click="close" :disabled="loading">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

type Trade = {
  _id?: string;
  Date?: string;
  Symbol?: string;
  Action?: string;
  Shares?: number;
  Price?: number;
  Commission?: number;
  Total?: number;
  Leverage?: number;
  IsShort?: boolean;
}

const props = defineProps({
  trade: {
    type: Object as () => Trade,
    required: true
  },
  user: String,
  apiKey: String,
  portfolio: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['close', 'updated', 'notify'])

const loading = ref(false)
const errorMsg = ref('')
const today = new Date().toISOString().slice(0, 10)

// Create a local copy of the trade for editing
const localTrade = ref<Trade>({
  ...props.trade,
  Date: props.trade.Date ? new Date(props.trade.Date).toISOString().slice(0, 10) : today,
  Commission: props.trade.Commission || 0,
  Leverage: props.trade.Leverage || 1,
  IsShort: props.trade.IsShort || false
})

// Track if there are changes
const hasChanges = computed(() => {
  return (
    localTrade.value.Date !== new Date(props.trade.Date || '').toISOString().slice(0, 10) ||
    localTrade.value.Action !== props.trade.Action ||
    localTrade.value.Shares !== props.trade.Shares ||
    localTrade.value.Price !== props.trade.Price ||
    localTrade.value.Commission !== props.trade.Commission ||
    localTrade.value.Leverage !== props.trade.Leverage ||
    localTrade.value.IsShort !== props.trade.IsShort
  )
})

function updateTotal() {
  const shares = localTrade.value.Shares || 0
  const price = localTrade.value.Price || 0
  const commission = localTrade.value.Commission || 0
  localTrade.value.Total = Number((shares * price + commission).toFixed(2))
}

// Watch for changes in shares, price, or commission to update total
watch([
  () => localTrade.value.Shares,
  () => localTrade.value.Price,
  () => localTrade.value.Commission
], () => {
  updateTotal()
})

async function submitEdit() {
  if (!props.trade._id) {
    errorMsg.value = 'Trade ID is missing. Cannot edit.'
    emit('notify', errorMsg.value)
    return
  }

  if (!hasChanges.value) {
    emit('notify', 'No changes detected.')
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    // Prepare the updated trade data
    const updatedTrade = {
      Date: new Date(localTrade.value.Date || '').toISOString(),
      Action: localTrade.value.Action,
      Shares: Number(localTrade.value.Shares),
      Price: Number(localTrade.value.Price),
      Commission: Number(localTrade.value.Commission || 0),
      Total: Number(localTrade.value.Total),
      Leverage: Number(localTrade.value.Leverage || 1),
      IsShort: Boolean(localTrade.value.IsShort)
    }

    const response = await fetch(`/api/trades/${props.trade._id}?username=${props.user}&portfolio=${props.portfolio}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': props.apiKey ?? ''
      } as Record<string, string>,
      body: JSON.stringify({ trade: updatedTrade })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Failed to update trade')
    }

    emit('notify', 'Trade updated successfully! Portfolio recalculated.')
    emit('updated')
    close()
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : 'Failed to update trade'
    emit('notify', errorMsg.value)
  } finally {
    loading.value = false
  }
}

function close() {
  if (!loading.value) {
    emit('close')
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--base1) 55%, transparent);
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
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px 0 color-mix(in srgb, var(--base4) 80%, transparent), 0 1.5px 8px 0 var(--accent4);
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: popup-in 0.18s cubic-bezier(.4,1.4,.6,1) backwards;
}

@keyframes popup-in {
  from { transform: translateY(30px) scale(0.98); opacity: 0; }
  to   { transform: none; opacity: 1; }
}

.close-x {
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

.close-x:hover {
  color: var(--accent1);
}

h2 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--accent1);
  letter-spacing: 0.01em;
}

.info-box {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  background: color-mix(in srgb, var(--accent1) 8%, transparent);
  border: 1.5px solid color-mix(in srgb, var(--accent1) 25%, transparent);
  border-radius: 10px;
  color: var(--accent1);
  font-size: 0.95rem;
  line-height: 1.5;
}

.info-box svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.symbol-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.symbol-display label {
  font-size: 1rem;
  color: var(--text2);
  font-weight: 500;
}

.symbol-badge {
  display: inline-flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--base1);
  border: 1.5px solid var(--base3);
  border-radius: 8px;
  color: var(--text1);
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: 0.02em;
}

form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.input-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-row-flex {
  display: flex;
  flex-direction: row;
  gap: 0;
  align-items: flex-start;
}

.input-flex-vertical {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

label {
  font-size: 1rem;
  color: var(--text2);
  font-weight: 500;
  letter-spacing: 0.01em;
}

input {
  padding: 10px 12px;
  border-radius: 7px;
  border: 1.5px solid var(--base3);
  background: var(--base1);
  color: var(--text1);
  font-size: 1.08rem;
  outline: none;
  transition: border-color 0.18s, background 0.18s;
}

input:focus {
  border-color: var(--accent1);
  background: var(--base4);
}

.hint {
  font-size: 0.88em;
  color: var(--text2);
  margin-top: 4px;
}

.action-btn,
.position-type-btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: 7px;
  border: 1.5px solid var(--base3);
  background: var(--base1);
  color: var(--text2);
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.18s;
}

.action-btn:hover,
.position-type-btn:hover {
  border-color: var(--accent1);
  color: var(--accent1);
}

.action-btn.active.buy {
  background: color-mix(in srgb, var(--positive) 15%, transparent);
  border-color: color-mix(in srgb, var(--positive) 35%, transparent);
  color: var(--positive);
}

.action-btn.active.sell {
  background: color-mix(in srgb, var(--negative) 15%, transparent);
  border-color: color-mix(in srgb, var(--negative) 35%, transparent);
  color: var(--negative);
}

.position-type-btn.active {
  background: var(--accent1);
  color: var(--text3);
  border-color: var(--accent1);
}

.calculated-info {
  background: var(--base1);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-weight: 500;
  color: var(--text2);
}

.info-value {
  font-weight: 600;
  color: var(--text1);
  font-size: 1.05rem;
}

.leverage-highlight {
  color: var(--accent2);
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--base1);
  border-radius: 8px;
  color: var(--accent1);
}

.loader {
  width: 20px;
  height: 20px;
  border: 2px solid var(--accent1);
  border-radius: 50%;
  border-top: 2px solid var(--base3);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-msg {
  padding: 12px 16px;
  background: color-mix(in srgb, var(--negative) 8%, transparent);
  border: 1.5px solid color-mix(in srgb, var(--negative) 25%, transparent);
  border-radius: 8px;
  color: var(--negative);
  font-size: 0.95rem;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  justify-content: flex-end;
}

.save-btn {
  background: var(--accent1);
  color: var(--text3);
  border: none;
  border-radius: 7px;
  padding: 10px 24px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.18s;
}

.save-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-btn {
  background: transparent;
  color: var(--text2);
  border: 1.5px solid var(--base3);
  border-radius: 7px;
  padding: 10px 24px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: border-color 0.18s, color 0.18s;
}

.cancel-btn:hover:not(:disabled) {
  border-color: var(--accent1);
  color: var(--accent1);
}

.cancel-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
