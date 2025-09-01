<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <button class="close-x" @click="close" aria-label="Close">&times;</button>
      <h2>New Note</h2>
      <form @submit.prevent="sendNote">
        <div class="input-row">
          <label for="note-content">Note</label>
          <textarea
            id="notes-container"
            v-model="noteContent"
            :class="{ error: characterCount > 350 }"
            @input="updateCharacterCount"
            placeholder="Write notes here"
            maxlength="350"
            rows="5"
            required
          ></textarea>
          <div class="char-count" :class="{ error: characterCount > 350 }">
            {{ characterCount }}/350
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
const emit = defineEmits(['close', 'refresh-notes'])

const props = defineProps({
  user: String,
  apiKey: String,
  defaultSymbol: String,
  showCreateNote: Boolean,
  notification: Object,
})

const noteContent = ref('')
const characterCount = ref(0)

function updateCharacterCount() {
  characterCount.value = noteContent.value.length
}

function close() {
  emit('close')
}

async function sendNote() {
  const note = noteContent.value
  const symbol = document.getElementById('searchbar')?.value || props.defaultSymbol

  if (characterCount.value > 350) {
    props.notification?.value?.show?.('Note exceeds 350 character limit')
    return
  }

  if (note.trim() !== '') {
    try {
      const response = await fetch(`/api/${symbol}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': props.apiKey,
        },
        body: JSON.stringify({ note, Username: props.user }),
      })
      if (response.ok) {
        noteContent.value = ''
        emit('refresh-notes', symbol)
        close()
        if (props.searchNotes) await props.searchNotes(symbol)
      } else if (response.status === 400) {
        props.notification?.value?.show?.('Maximum note limit (10) reached for this symbol')
      } else {
        props.notification?.value?.show?.('Failed to create note')
      }
    } catch (err) {
      props.notification?.value?.show?.(err.message)
    }
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

textarea {
  padding: 10px 12px;
  border-radius: 7px;
  border: 1.5px solid var(--base3);
  background: var(--base1);
  color: var(--text1);
  font-size: 1.08rem;
  outline: none;
  transition: border-color 0.18s;
}
textarea:focus {
  border-color: var(--accent1);
  background: var(--base4);
}
textarea.error,
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