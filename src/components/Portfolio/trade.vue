<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <button class="close-x" @click="close" aria-label="Close">&times;</button>
      <h2>New Trade</h2>
      <form @submit.prevent="submitTrade">
        <div class="input-row">
          <label for="date">Date</label>
          <input
            id="date"
            type="date"
            v-model="tradeDate"
            :max="today"
            required
          />
        </div>
        <div class="input-row">
          <label for="symbol">Symbol</label>
          <input id="symbol" v-model="symbol" required autocomplete="off" placeholder="e.g. AAPL" />
        </div>
        <div class="input-row">
          <label for="shares">Shares</label>
          <input
            id="shares"
            type="number"
            v-model.number="shares"
            min="0.01"
            step="0.01"
            required
            placeholder="e.g. 10.25"
          />
        </div>
        <div class="input-row input-row-flex">
          <div class="input-flex-vertical">
            <label for="price">Price</label>
            <input id="price" type="number" v-model.number="price" min="0.01" step="0.01" required placeholder="e.g. 185.00" />
          </div>
          <div class="input-flex-vertical" style="margin-left: 12px;">
            <label for="commission">Commission <span style="font-weight:400; color:var(--text2); font-size:0.97em;">(optional)</span></label>
            <input id="commission" type="number" v-model.number="commission" min="0" step="0.01" placeholder="e.g. 1.50" />
          </div>
        </div>
        <div class="input-row" style="margin-top: 8px;">
          <div>
            <strong>Total:</strong> ${{ total.toFixed(2) }}
            <span v-if="commission"> (incl. ${{ commission.toFixed(2) }} commission)</span>
          </div>
          <div>
            <strong>Your Cash:</strong> ${{ props.cash?.toFixed(2) }}
          </div>
        </div>
        <div v-if="insufficientCash" style="color: var(--negative); margin-top: 8px;">
          Insufficient cash: You need ${{ total.toFixed(2) }}, but you only have ${{ props.cash?.toFixed(2) ?? '0.00' }}.
          <br>
          <span style="font-size: 0.98em;">The trade will not be executed.</span>
        </div>
        <div class="modal-actions">
          <button type="submit" class="trade-btn" :disabled="insufficientCash || isLoading" aria-label="Submit Trade">
  <span class="btn-content-row">
    <span v-if="isLoading" class="loader4">
      <svg class="spinner" viewBox="0 0 50 50">
        <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5" />
      </svg>
    </span>
    <span v-if="!isLoading">Submit</span>
    <span v-else style="margin-left: 8px;">Processing...</span>
  </span>
</button>
          <button type="button" class="cancel-btn" @click="close">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
const emit = defineEmits(['close', 'trade', 'refresh-history', 'notify'])

const props = defineProps({
  user: String,
  apiKey: String,
  cash: Number,
  portfolio: {
    type: Number,
    required: true
  }
})

const symbol = ref('')
const shares = ref(1)
const price = ref(0)
const commission = ref(0)
const today = new Date().toISOString().slice(0, 10)
const tradeDate = ref(today)
const error = ref('')
const isLoading = ref(false)

const total = computed(() => Number((shares.value * price.value + (commission.value || 0)).toFixed(2)))
const insufficientCash = computed(() => props.cash !== undefined && total.value > props.cash)

const showNotification = (msg: string) => {
  emit('notify', msg)
}

async function submitTrade() {
  error.value = ''
  if (insufficientCash.value) {
    error.value = 'Insufficient cash: You need $' + total.value.toFixed(2) + ', but you only have $' + (props.cash?.toFixed(2) ?? '0.00') + '.'
    showNotification(error.value)
    return
  }
  if (!symbol.value || !shares.value || !price.value) {
    error.value = 'Please fill in all required fields.'
    showNotification(error.value)
    return
  }
  isLoading.value = true
  const trade = {
    Symbol: symbol.value,
    Shares: shares.value,
    Action: "Buy",
    Price: price.value,
    Date: tradeDate.value,
    Total: total.value,
    Commission: commission.value || 0
  }

  try {
    const response = await fetch(`/api/trades/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': props.apiKey ?? ''
      } as Record<string, string>,
      body: JSON.stringify({
        username: props.user,
        portfolio: props.portfolio, 
        trade
      })
    })

    if (!response.ok) {
      throw new Error('Failed to add trade')
    }

    emit('refresh-history')
    showNotification('Trade added successfully!')
    close()
  } catch (err) {
    error.value = typeof err === 'object' && err !== null && 'message' in err ? (err as any).message : 'Unknown error'
    showNotification(error.value)
  } finally {
    isLoading.value = false
  }
}

function close() {
  emit('close')
}
</script>

<style scoped>
.btn-content-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
}
.loader4 {
  display: flex;
  align-items: center;
  height: 20px;
  margin-right: 10px;
}
.spinner {
  animation: rotate 2s linear infinite;
  width: 25px;
  height: 25px;
}
.path {
  stroke: #000000;
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
}
@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}
@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}
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
  margin: 0 0 12px 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--accent1);
  letter-spacing: 0.01em;
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
  transition: border-color 0.18s;
}
input:focus {
  border-color: var(--accent1);
  background: var(--base4);
}

.modal-actions {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  justify-content: flex-end;
}

.trade-btn {
  background: var(--accent1);
  color: var(--text3);
  border: none;
  border-radius: 7px;
  padding: 10px 24px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.18s;
}
.trade-btn:hover {
  background: var(--accent2);
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
.cancel-btn:hover {
  border-color: var(--accent1);
  color: var(--accent1);
}
</style>