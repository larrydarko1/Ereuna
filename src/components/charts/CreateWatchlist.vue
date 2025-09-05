<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <button class="close-x" @click="close" aria-label="Close">&times;</button>
      <h2>Create Watchlist</h2>
      <form @submit.prevent="CreateWatchlist">
        <div class="input-row">
          <label for="inputcreate">Watchlist Name</label>
          <input
            id="inputcreate"
            placeholder="Enter Watchlist Name"
            type="text"
            v-model="watchlistName"
            :class="{ 'input-error': watchlistName.length > 20 }"
            maxlength="20"
            required
          />
          <div class="char-count" :class="{ error: watchlistName.length > 20 }">
            {{ watchlistName.length }}/20
          </div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="trade-btn">Submit</button>
          <button type="button" class="cancel-btn" @click="close">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const emit = defineEmits(['close'])

const props = defineProps({
  user: String,
  apiKey: String,
  watchlist: Object,
  notification: Object,
  getWatchlists: Function,
  filterWatchlist: Function
})

const watchlistName = ref('')

function close() {
  emit('close')
}

async function CreateWatchlist() {
  const existingWatchlists = props.watchlist.tickers.map(watch => watch.Name)

  if (existingWatchlists.includes(watchlistName.value)) {
    props.notification.value.show('Watchlist already exists')
    return
  }
  if (watchlistName.value.length > 20) {
    props.notification.value.show('Watchlist name cannot exceed 20 characters.')
    return
  }
  try {
    const response = await fetch(`/api/${props.user}/create/watchlists/${watchlistName.value}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      }
    })
    if (response.ok) {
      // success
    } else if (response.status === 400) {
      const errorData = await response.json()
      if (errorData.message === 'Maximum number of watchlists (20) has been reached') {
        props.notification.value.show('Maximum number of watchlists (20) has been reached')
      } else {
        props.notification.value.show('Failed to create watchlist')
      }
    } else {
      props.notification.value.show('Failed to create watchlist')
    }
  } catch (error) {
    props.notification.value.show(error.message)
  }
  emit('close')
  if (props.getWatchlists) await props.getWatchlists()
  const newWatchlist = props.watchlist.tickers.find(watch => watch.Name === watchlistName.value)
  if (newWatchlist && props.filterWatchlist) {
    await props.filterWatchlist(newWatchlist)
  }
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
input.input-error,
.char-count.error {
  border-color: #e74c3c;
  color: #e74c3c;
}

.char-count {
  font-size: 0.85rem;
  color: var(--text2);
  align-self: flex-end;
  margin-top: 2px;
}

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