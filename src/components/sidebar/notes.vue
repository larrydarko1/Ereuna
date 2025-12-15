<template>
  <div class="notes-container">
    <div v-if="BeautifulNotes.length > 0">
      <div class="note" v-for="note in BeautifulNotes" :key="note._id">
        <div class="inline-note">
          <svg class="svg-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.1 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
          </svg>
        </div>
        <button class="notebtn" @click="removeNote(note._id)">
          <svg class="svg-icon-close" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
        <p class="note-msg-date">
          {{ t('sidebar.created') }} {{ formatDate(note.Date) }}
        </p>
        <p class="note-msg">{{ note.Message }}</p>
      </div>
    </div>
    <div v-else>
     <p class="no-data">{{ t('sidebar.noNotesAvailable') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  symbol: {
    type: String,
    required: true
  },
  apiKey: {
    type: String,
    required: true
  },
  defaultSymbol: {
    type: String,
    default: ''
  },
  formatDate: {
    type: Function,
    required: true
  },
  refreshKey: {
    type: Number,
    default: 0 
  },
  user: {
    type: String,
    required: true
  }
});
interface Note {
  _id: string;
  Date: string;
  Message: string;
}

const loading = ref(false);
const error = ref<string | null>(null);
const BeautifulNotes = ref<Note[]>([]);

async function searchNotes() {
  try {
    const Username = props.user;
    const symbol = props.symbol || props.defaultSymbol;
    const response = await fetch(`/api/${Username}/${symbol}/notes`, {
      headers: {
        'X-API-KEY': props.apiKey,
      },
    });
    const data = await response.json();
    BeautifulNotes.value = data;
  } catch (err) {
    let errorMsg = 'Unknown error';
    if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string') {
      errorMsg = (err as any).message;
    } else if (typeof err === 'string') {
      errorMsg = err;
    }
    error.value = errorMsg;
  } finally {
    loading.value = false;
  }
}

async function removeNote(_id: string) {
  const Username = props.user;
  const symbol = props.symbol || props.defaultSymbol;
  const noteId = _id;

  try {
    const response = await fetch(`/api/${symbol}/notes/${noteId}?user=${Username}`, {
      method: 'DELETE',
      headers: {
        'X-API-KEY': props.apiKey,
      },
    });
    if (response.ok) {
      BeautifulNotes.value = BeautifulNotes.value.filter((n: Note) => n._id !== noteId);
    } else {
    }
  } catch (err) {
    let errorMsg = 'Unknown error';
    if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string') {
      errorMsg = (err as any).message;
    } else if (typeof err === 'string') {
      errorMsg = err;
    }
    error.value = errorMsg;
  }
  await searchNotes();
}

onMounted(searchNotes);
watch(() => props.symbol, searchNotes);

</script>

<style lang="scss" scoped>
.note {
  background-color: var(--accent4);
  color: var(--text2);
  padding: 10px;
  border-bottom: 1px solid var(--base3);
  box-sizing: border-box;
  width: 100%;
  position: relative;
}

.notebtn {
  background-color: transparent;
  border: none;
  color: var(--text2);
  cursor: pointer;
  position: absolute;
  top: 5px;
  right: 5px;
  padding: 5px;
  z-index: 1;
}

.svg-icon {
  width: 15px;
  height: 15px;
  float: left;
  border: none;
  opacity: 0.7;
}

.svg-icon-close {
  width: 10px;
  height: 10px;
  border: none;
}

.inline-note {
  border: none;
}

.note-msg {
  color: var(--text1);
  border: none;
  margin-top: 0;
  padding-top: 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
  width: 100%;
  display: block;
}

.note-msg-date {
  color: var(--text1);
  border: none;
  display: inline-block;
  margin-left: 5px;
  margin-top: 2px;
  vertical-align: top;
  font-size: 0.9em;
}

.notes-container{
    display: flex;
    flex-direction: column;
    color: var(--text2);
    border: none;
    border-radius: 6px;
    margin: 5px;
    padding: 5px;
    background-color: var(--base2);
}

.no-data {
  margin: 0;
}
</style>