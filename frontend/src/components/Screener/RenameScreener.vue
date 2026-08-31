<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <button class="close-x" @click="close" aria-label="Close">&times;</button>
      <h2>{{ t('screenerComponents.renameScreener') }}</h2>
      <form @submit.prevent="UpdateScreener" :aria-label="t('screenerComponents.renameScreener') + ' Form'">
        <div class="input-row">
          <label for="inputrename">{{ t('screenerComponents.screenerName') }}</label>
          <input
            id="inputrename"
            :placeholder="t('screenerComponents.enterScreenerName')"
            type="text"
            v-model="screenerName"
            :class="{ 'input-error': screenerName.length > 20 }"
            maxlength="20"
            required
            :aria-label="t('screenerComponents.screenerName') + ' Input'"
          />
          <div class="char-count" :class="{ error: screenerName.length > 20 }">
            {{ screenerName.length }}/20
          </div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="trade-btn" :disabled="isLoading" :aria-label="t('screenerComponents.submit') + ' Rename Screener'">
            <span v-if="isLoading" class="loader4">
              <svg class="spinner" viewBox="0 0 50 50">
                <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5" />
              </svg>
            </span>
            <span v-if="!isLoading">{{ t('screenerComponents.submit') }}</span>
            <span v-else style="margin-left: 8px;">{{ t('screenerComponents.processing') }}</span>
          </button>
          <button type="button" class="cancel-btn" @click="close" aria-label="Cancel">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  user: { type: String, required: true },
  apiKey: { type: String, required: true },
  notification: { type: Object, required: true },
  currentName: { type: String, required: true },
  GetScreeners: { type: Function, required: true },
  GetCompoundedResults: { type: Function, required: false },
  error: { type: Object, required: false }
})

const emit = defineEmits(['close', 'notify'])

const screenerName = ref(props.currentName)
const isLoading = ref(false)

function close() {
  emit('close')
}

// renames screener 
async function UpdateScreener() {
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    const newName = screenerName.value.trim()
    const oldName = props.currentName

    if (newName.length > 20) {
      emit('notify', t('screenerComponents.errorNameTooLong'))
      isLoading.value = false;
      return
    }

    if (newName === oldName) {
      emit('notify', t('screenerComponents.errorNameMustDiffer'))
      isLoading.value = false;
      return
    }

    const response = await fetch(`/api/${props.user}/rename/screener`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify({ newname: newName, oldname: oldName })
    })

    let responseData: { message?: string } = {};
    try {
      responseData = await response.json();
    } catch (jsonErr) {
      emit('notify', t('screenerComponents.errorServerInvalidResponse'));
      isLoading.value = false;
      return;
    }

    if (response.ok) {
      emit('close')
    } else {
      emit('notify', responseData?.message || t('screenerComponents.errorRenameFailed'))
    }
  } catch (err) {
    let errorMsg = 'Unknown error';
    if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string') {
      errorMsg = (err as any).message;
    } else if (typeof err === 'string') {
      errorMsg = err;
    }
    if (props.error) props.error.value = errorMsg;
    emit('notify', errorMsg);
  } finally {
    isLoading.value = false;
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
  color: var(--text3);
  border: none;
  border-radius: 7px;
  padding: 10px 24px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.18s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.trade-btn:hover {
  background: var(--accent2);
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