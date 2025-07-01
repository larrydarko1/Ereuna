<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <button class="close-x" @click="close" aria-label="Close">&times;</button>
      <h2>Sell {{ symbol }}</h2>
      <form @submit.prevent="submitSell">
        <div class="input-row">
          <label for="date">Date</label>
          <input
            id="date"
            type="date"
            v-model="sellDate"
            :max="today"
            required
          />
        </div>
        <div class="input-row">
          <label for="symbol">Symbol</label>
          <input id="symbol" :value="symbol" readonly />
        </div>
        <div class="input-row">
          <label for="shares">Shares</label>
          <input
            id="shares"
            type="number"
            v-model.number="sellShares"
            :max="maxShares"
            min="1"
            required
            :placeholder="`Max: ${maxShares}`"
          />
          <small class="hint">You own {{ maxShares }} shares</small>
        </div>
        <div class="input-row input-row-flex">
          <div class="input-flex-vertical">
            <label for="price">Price</label>
            <input
              id="price"
              type="number"
              v-model.number="sellPrice"
              min="0.01"
              step="0.01"
              required
              :placeholder="currentPrice ? `$${Number(currentPrice).toFixed(2)}` : 'e.g. 185.00'"
            />
          </div>
          <div class="input-flex-vertical" style="margin-left: 12px;">
            <label for="commission">Commission <span style="font-weight:400; color:var(--text2); font-size:0.97em;">(optional)</span></label>
            <input id="commission" type="number" v-model.number="sellCommission" min="0" step="0.01" placeholder="e.g. 1.50" />
          </div>
        </div>
        <div class="input-row" style="margin-top: 8px;">
          <div>
            <strong>Total:</strong> ${{ sellTotal.toFixed(2) }}
            <span v-if="sellCommission"> (incl. ${{ sellCommission.toFixed(2) }} commission)</span>
          </div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="trade-btn">Sell</button>
          <button type="button" class="cancel-btn" @click="close">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, watch, computed } from 'vue'
const props = defineProps({
  symbol: String,
  maxShares: Number,
  price: Number,
  currentPrice: Number,
  user: String,
  apiKey: String
})
const emit = defineEmits(['close', 'sell'])

const today = new Date().toISOString().slice(0, 10)
const sellDate = ref(today)
const sellShares = ref(1)
const sellPrice = ref(props.currentPrice || props.price || 0)
const sellCommission = ref(0)
const sellTotal = computed(() => Number((sellShares.value * sellPrice.value + (sellCommission.value || 0)).toFixed(2)))

// Clamp sellShares to maxShares
watch(sellShares, (val) => {
  if (val > props.maxShares) sellShares.value = props.maxShares
  if (val < 1) sellShares.value = 1
})

// Always update sellPrice if currentPrice changes
watch(() => props.currentPrice, (val) => { if (val) sellPrice.value = val })

function close() {
  emit('close')
}

async function submitSell() {
  if (sellShares.value > props.maxShares) return
  const trade = {
    Symbol: props.symbol,
    Shares: sellShares.value,
    Action: "Sell",
    Price: sellPrice.value,
    Date: sellDate.value, // Use selected date
    Total: sellTotal.value,
    Commission: sellCommission.value || 0
  }
  try {
    const response = await fetch(`/api/trades/sell`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': props.apiKey
      },
      body: JSON.stringify({ username: props.user, trade })
    })
    if (!response.ok) {
      throw new Error('Failed to add trade')
    }
    emit('sell', trade)
  } catch (error) {
    // Optionally handle error
  }
  close()
}
</script>

<style scoped>
/* Use the same styles as your trade popup for consistency */
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
.close-x:hover { color: var(--accent1); }
h2 { margin: 0 0 12px 0; font-size: 1.35rem; font-weight: 700; color: var(--accent1); }
form { display: flex; flex-direction: column; gap: 18px; }
.input-row { display: flex; flex-direction: column; gap: 6px; }
label { font-size: 1rem; color: var(--text2); font-weight: 500; }
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
input:focus { border-color: var(--accent1); background: var(--base4); }
.hint { color: var(--text2); font-size: 0.92em; margin-top: 2px; }
.modal-actions {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  justify-content: flex-end;
}
.trade-btn {
  background: var(--accent1);
  color: var(--text1);
  border: none;
  border-radius: 7px;
  padding: 10px 24px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.18s;
}
.trade-btn:hover { background: var(--accent2); }
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
.cancel-btn:hover { border-color: var(--accent1); color: var(--accent1); }
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
</style>