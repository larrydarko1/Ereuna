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
          />
          <div v-if="fileName" class="char-count">{{ fileName }}</div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="trade-btn" @click="importWatchlist">Import</button>
          <button type="button" class="cancel-btn" @click="close">Cancel</button>
        </div>
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
  notification: Object,
  selectedWatchlist: String 
})

const selectedFile = ref<File | null>(null)
const fileName = ref<string>('')
const fileContent = ref<string>('')

function close() {
  emit('close')
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files ? input.files[0] : null
  if (file && file.type === 'text/plain') {
    selectedFile.value = file
    fileName.value = file.name
    const reader = new FileReader()
    reader.onload = function(e: ProgressEvent<FileReader>) {
      const result = e.target && e.target.result
      fileContent.value = typeof result === 'string' ? result : ''
    }
    reader.readAsText(file)
  } else {
    selectedFile.value = null
    fileName.value = ''
    fileContent.value = ''
    if (props.notification && props.notification.value) {
      props.notification.value.show('Please select a valid .txt file')
    }
  }
}

async function importWatchlist() {
  if (!selectedFile.value || !fileContent.value) {
    if (props.notification && props.notification.value) {
      props.notification.value.show('No file selected or file is empty')
    }
    return
  }
  // Extract symbols from fileContent
  const lines = fileContent.value.split(/\r?\n/)
  // Symbol validation: only allow A-Z, 0-9, max 20 chars, no spaces or special chars
  const validSymbolRegex = /^[A-Z0-9]{1,20}$/i
  let symbols = lines
    .map(line => {
      const parts = line.split(':')
      if (parts.length === 2) {
        let symbol = parts[1].trim().toUpperCase()
        // Remove dangerous chars
        symbol = symbol.replace(/[^A-Z0-9]/gi, '')
        return validSymbolRegex.test(symbol) ? symbol : null
      }
      return null
    })
    .filter((s, i, arr) => s && arr.indexOf(s) === i) // Remove nulls and duplicates
  // Limit to 100 symbols per import
  if (symbols.length > 100) {
    if (props.notification && props.notification.value) {
      props.notification.value.show('Too many symbols (max 100 allowed)')
    }
    return
  }
  if (symbols.length === 0) {
    if (props.notification && props.notification.value) {
      props.notification.value.show('No valid symbols found in file')
    }
    return
  }
  const payload = {
    watchlistName: props.selectedWatchlist,
    symbols: symbols
  }
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (props.apiKey) {
      headers['X-API-KEY'] = props.apiKey
    }
    const response = await fetch(`/api/${props.user}/import/watchlist`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })
    if (response.ok) {
      if (props.notification && props.notification.value) {
        props.notification.value.show('Watchlist imported successfully')
      }
      emit('refresh') 
    } else {
      if (props.notification && props.notification.value) {
        props.notification.value.show('Failed to import watchlist')
      }
    }
  } catch (error) {
    if (props.notification && props.notification.value) {
      const message = error instanceof Error ? error.message : String(error)
      props.notification.value.show(message)
    }
  }
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
