<template>
  <div class="modal-backdrop" @click.self="close" role="dialog" aria-modal="true" aria-labelledby="withdraw-cash-title">
    <div class="modal-content">
      <button class="close-x" @click="close" aria-label="Close Withdrawal Cash Modal">&times;</button>
      <h2 id="withdraw-cash-title">Withdraw Cash</h2>
      <form @submit.prevent="submitWithdrawal" aria-label="Withdraw Cash Form">
        <div class="input-row">
          <label for="date">Date</label>
          <input
            id="date"
            type="date"
            v-model="withdrawalDate"
            :max="today"
            required
            aria-required="true"
            aria-label="Withdrawal Date"
          />
        </div>
        <br>
        <div class="input-row">
          <label for="amount">Amount</label>
          <input
            id="amount"
            type="number"
            v-model.number="amount"
            min="0.01"
            step="0.01"
            :max="availableCash"
            required
            placeholder="e.g. 500"
            aria-required="true"
            aria-label="Withdrawal Amount"
          />
          <small class="hint">Available cash: ${{ availableCash?.toFixed(2) ?? '0.00' }}</small>
        </div>
        <div v-if="insufficientCash" style="color: var(--negative); margin-top: 8px;">
          Insufficient cash: You're trying to withdraw ${{ amount?.toFixed(2) ?? '0.00' }}, but you only have ${{ availableCash?.toFixed(2) ?? '0.00' }}.
        </div>
        <br>
        <div class="modal-actions">
          <button type="submit" class="trade-btn" :disabled="isLoading || insufficientCash" aria-label="Withdraw Cash">
            <span class="btn-content-row">
              <span v-if="isLoading" class="loader4">
                <svg class="spinner" viewBox="0 0 50 50">
                  <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5" />
                </svg>
              </span>
              <span v-if="!isLoading">Withdraw</span>
              <span v-else style="margin-left: 8px;">Processing...</span>
            </span>
          </button>
          <button type="button" class="cancel-btn" @click="close" aria-label="Cancel Withdrawal">Cancel</button>
        </div>
        <div v-if="error" style="color: var(--negative); margin-top: 12px;" role="alert" aria-live="polite">{{ error }}</div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
const emit = defineEmits(['close', 'refresh', 'notify'])
const props = defineProps({
  user: String,
  apiKey: String,
  availableCash: Number,
  portfolio: {
    type: Number,
    required: true
  }
})

const today = new Date().toISOString().slice(0, 10)
const withdrawalDate = ref(today)
const amount = ref(0)
const error = ref('')
const isLoading = ref(false)

const insufficientCash = computed(() => {
  return props.availableCash !== undefined && amount.value > props.availableCash
})

const showNotification = (msg: string) => {
  emit('notify', msg)
}

async function submitWithdrawal() {
  error.value = ''
  if (!amount.value || amount.value <= 0) {
    error.value = 'Please enter a valid amount.'
    showNotification(error.value)
    return
  }
  if (insufficientCash.value) {
    error.value = 'Insufficient cash balance.'
    showNotification(error.value)
    return
  }
  isLoading.value = true
  try {
    const response = await fetch('/api/portfolio/withdraw-cash', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': props.apiKey ?? ''
      } as Record<string, string>,
      body: JSON.stringify({
        username: props.user,
        portfolio: props.portfolio, 
        amount: amount.value,
        date: withdrawalDate.value
      })
    })
    if (!response.ok) throw new Error('Failed to withdraw cash')
    emit('refresh')
    showNotification('Cash withdrawn successfully!')
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
.input-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
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
@keyframes popup-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
