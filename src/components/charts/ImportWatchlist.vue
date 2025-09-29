
<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <button class="close-x" @click="close" aria-label="Close">&times;</button>
      <h2>Import Watchlist</h2>
      <form>
        <div class="input-row">
          <input
            id="inputfile"
            type="file"
            accept=".txt"
            @change="handleFileChange"
            required
            aria-label="Select watchlist file (.txt)"
          />
          <div v-if="fileName" class="char-count">{{ fileName }}</div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="trade-btn" @click="importWatchlist" :disabled="isLoading" aria-label="Import watchlist">
            <span class="btn-content-row">
              <span v-if="isLoading" class="loader4">
                <svg class="spinner" viewBox="0 0 50 50">
                  <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5" />
                </svg>
              </span>
              <span v-if="!isLoading">Import</span>
              <span v-else style="margin-left: 8px;">Processing...</span>
            </span>
          </button>
          <button type="button" class="cancel-btn" @click="close" :disabled="isLoading" aria-label="Cancel import">Cancel</button>
        </div>
      </form>
      <NotificationPopup ref="notification" role="alert" aria-live="polite" />
    </div>
  </div>
</template>


<script setup lang="ts">
import { ref } from 'vue';
import NotificationPopup from '@/components/NotificationPopup.vue';

const emit = defineEmits(['close', 'refresh']);

const props = defineProps({
  user: String,
  apiKey: String,
  notification: Object,
  selectedWatchlist: String
});

const selectedFile = ref<File | null>(null);
const fileName = ref<string>('');
const fileContent = ref<string>('');
const isLoading = ref(false);
const notification = ref<InstanceType<typeof NotificationPopup> | null>(null);

function showNotification(msg: string) {
  if (notification.value) notification.value.show(msg);
}

function close() {
  emit('close');
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files ? input.files[0] : null;
  if (file && file.type === 'text/plain') {
    selectedFile.value = file;
    fileName.value = file.name;
    const reader = new FileReader();
    reader.onload = function(e: ProgressEvent<FileReader>) {
      const result = e.target && e.target.result;
      fileContent.value = typeof result === 'string' ? result : '';
    };
    reader.readAsText(file);
  } else {
    selectedFile.value = null;
    fileName.value = '';
    fileContent.value = '';
    showNotification('Please select a valid .txt file');
  }
}

async function importWatchlist(e?: Event) {
  if (e) e.preventDefault();
  if (isLoading.value) return;
  isLoading.value = true;
  if (!selectedFile.value || !fileContent.value) {
    showNotification('No file selected or file is empty');
    isLoading.value = false;
    return;
  }
  // Extract symbols from fileContent
  const lines = fileContent.value.split(/\r?\n/);
  // Symbol validation: only allow A-Z, 0-9, max 20 chars, no spaces or special chars
  const validSymbolRegex = /^[A-Z0-9]{1,20}$/i;
  let symbolObjs = lines
    .map(line => {
      const parts = line.split(':');
      if (parts.length === 2) {
        let exchange = parts[0].trim().toUpperCase().replace(/[^A-Z]/gi, '');
        let ticker = parts[1].trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
        if (exchange && ticker && validSymbolRegex.test(ticker)) {
          return { ticker, exchange };
        }
      }
      return null;
    })
    .filter((obj, i, arr) => obj && arr.findIndex(o => o && o.ticker === obj.ticker && o.exchange === obj.exchange) === i);
  // Limit to 100 symbols per import
  if (symbolObjs.length > 100) {
    showNotification('Too many symbols (max 100 allowed)');
    isLoading.value = false;
    return;
  }
  if (symbolObjs.length === 0) {
    showNotification('No valid symbols found in file');
    isLoading.value = false;
    return;
  }
  const payload = {
    watchlistName: props.selectedWatchlist,
    symbols: symbolObjs
  };
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (props.apiKey) {
      headers['X-API-KEY'] = props.apiKey;
    }
    const response = await fetch(`/api/${props.user}/import/watchlist`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      showNotification('Watchlist imported successfully');
      emit('refresh');
    } else {
      showNotification('Failed to import watchlist');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotification(message);
  }
  isLoading.value = false;
  emit('close');
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
.trade-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.trade-btn:hover:not(:disabled) {
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
