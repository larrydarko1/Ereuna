<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <button class="close-x" @click="close" aria-label="Close">&times;</button>
      <h2>Delete Trade</h2>
      
      <div class="warning-box">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div>
          <strong>Warning:</strong> Deleting this trade will recalculate your entire portfolio from scratch. 
          This action cannot be undone...well, unless you re-add the trade manually. duh
        </div>
      </div>

      <div class="trade-details">
        <h3>Trade Details</h3>
        <div class="detail-row">
          <span class="label">Date:</span>
          <span class="value">{{ formatDate(trade.Date) }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Symbol:</span>
          <span class="value">{{ trade.Symbol }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Action:</span>
          <span :class="['value', 'action-badge', trade.Action?.toLowerCase()]">
            {{ trade.Action }}
            <span v-if="trade.IsShort" class="short-indicator">(Short)</span>
          </span>
        </div>
        <div class="detail-row">
          <span class="label">Shares:</span>
          <span class="value">{{ trade.Action === 'Cash Deposit' || trade.Action === 'Cash Withdrawal' ? '-' : trade.Shares }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Price:</span>
          <span class="value">{{ trade.Action === 'Cash Deposit' || trade.Action === 'Cash Withdrawal' ? '-' : '$' + Number(trade.Price).toFixed(2) }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Total:</span>
          <span class="value">${{ Number(trade.Total).toFixed(2) }}</span>
        </div>
        <div v-if="trade.Leverage && trade.Leverage > 1" class="detail-row">
          <span class="label">Leverage:</span>
          <span class="value">{{ trade.Leverage }}x</span>
        </div>
      </div>

      <div class="impact-info">
        <h3>Impact</h3>
        <p>
          <template v-if="trade.Action === 'Buy' && !trade.IsShort">
            This will <strong>remove or reduce</strong> the corresponding position and <strong>return cash</strong> used for purchase.
          </template>
          <template v-else-if="trade.Action === 'Sell' && !trade.IsShort">
            This will <strong>restore</strong> the position that was sold and <strong>remove cash</strong> received from sale.
          </template>
          <template v-else-if="trade.Action === 'Sell' && trade.IsShort">
            This will <strong>remove or reduce</strong> the short position and <strong>return margin</strong>.
          </template>
          <template v-else-if="trade.Action === 'Buy' && trade.IsShort">
            This will <strong>restore</strong> the short position and <strong>remove cash</strong> used to close it.
          </template>
          <template v-else>
            This will recalculate your portfolio state.
          </template>
        </p>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="loader"></div>
        <span>Deleting trade and recalculating portfolio...</span>
      </div>

      <div v-if="errorMsg" class="error-msg">
        {{ errorMsg }}
      </div>

      <div class="modal-actions">
        <button 
          type="button" 
          class="delete-btn" 
          @click="confirmDelete"
          :disabled="loading"
        >
          <span v-if="!loading">Delete Trade</span>
          <span v-else>Processing...</span>
        </button>
        <button type="button" class="cancel-btn" @click="close" :disabled="loading">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps({
  trade: {
    type: Object,
    required: true
  },
  user: String,
  apiKey: String,
  portfolio: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['close', 'deleted', 'notify'])

const loading = ref(false)
const errorMsg = ref('')

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

async function confirmDelete() {
  if (!props.trade._id) {
    errorMsg.value = 'Trade ID is missing. Cannot delete.'
    emit('notify', errorMsg.value)
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    const response = await fetch(`/api/trades/${props.trade._id}?username=${props.user}&portfolio=${props.portfolio}`, {
      method: 'DELETE',
      headers: {
        'x-api-key': props.apiKey ?? ''
      } as Record<string, string>
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Failed to delete trade')
    }

    emit('notify', 'Trade deleted successfully! Portfolio recalculated.')
    emit('deleted')
    close()
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : 'Failed to delete trade'
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

h3 {
  margin: 0 0 10px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text1);
}

.warning-box {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  background: color-mix(in srgb, var(--negative) 8%, transparent);
  border: 1.5px solid color-mix(in srgb, var(--negative) 25%, transparent);
  border-radius: 10px;
  color: var(--negative);
  font-size: 0.95rem;
  line-height: 1.5;
}

.warning-box svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.trade-details {
  background: var(--base1);
  border-radius: 10px;
  padding: 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--base3);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  font-weight: 500;
  color: var(--text2);
}

.detail-row .value {
  font-weight: 600;
  color: var(--text1);
}

.action-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
}

.action-badge.buy {
  background: color-mix(in srgb, var(--positive) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--positive) 30%, transparent);
  color: var(--positive);
}

.action-badge.sell {
  background: color-mix(in srgb, var(--negative) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--negative) 30%, transparent);
  color: var(--negative);
}

.short-indicator {
  font-size: 0.85em;
  opacity: 0.8;
}

.impact-info {
  background: var(--base1);
  border-radius: 10px;
  padding: 16px;
}

.impact-info p {
  margin: 0;
  color: var(--text2);
  line-height: 1.6;
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

.delete-btn {
  background: var(--negative);
  color: var(--text3);
  border: none;
  border-radius: 7px;
  padding: 10px 24px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.18s;
}

.delete-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.delete-btn:disabled {
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
