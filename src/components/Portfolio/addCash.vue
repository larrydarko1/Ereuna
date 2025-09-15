<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <button class="close-x" @click="close" aria-label="Close">&times;</button>
      <h2>Add Cash</h2>
      <form @submit.prevent="submitCash">
        <div class="input-row">
          <label for="date">Date</label>
          <input
            id="date"
            type="date"
            v-model="cashDate"
            :max="today"
            required
          />
        </div>
        <div class="input-row">
          <label for="amount">Amount</label>
          <input
            id="amount"
            type="number"
            v-model.number="amount"
            min="0.01"
            step="0.01"
            required
            placeholder="e.g. 1000"
          />
        </div>
        <div class="modal-actions">
          <button type="submit" class="trade-btn">Add</button>
          <button type="button" class="cancel-btn" @click="close">Cancel</button>
        </div>
        <div v-if="error" style="color: var(--negative); margin-top: 12px;">{{ error }}</div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const emit = defineEmits(['close', 'refresh'])
const props = defineProps({
  user: String,
  apiKey: String,
  portfolio: {
    type: Number,
    required: true
  }
})

const today = new Date().toISOString().slice(0, 10)
const cashDate = ref(today)
const amount = ref(0)
const error = ref('')

async function submitCash() {
  error.value = ''
  if (!amount.value || amount.value <= 0) {
    error.value = 'Please enter a valid amount.'
    return
  }
  try {
    const response = await fetch('/api/portfolio/cash', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': props.apiKey ?? ''
      } as Record<string, string>,
      body: JSON.stringify({
        username: props.user,
        portfolio: props.portfolio, 
        amount: amount.value,
        date: cashDate.value
      })
    })
    if (!response.ok) throw new Error('Failed to add cash')
    emit('refresh')
    close()
  } catch (err) {
    error.value = typeof err === 'object' && err !== null && 'message' in err ? (err as any).message : 'Unknown error'
  }
}

function close() {
  emit('close')
}
</script>

<style scoped>
/* You can reuse the modal styles from trade.vue */
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
</style>