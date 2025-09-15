<template>
  <div class="notes-container">
    <div v-if="BeautifulNotes.length > 0">
      <div class="note" v-for="note in BeautifulNotes" :key="note._id">
        <div class="inline-note">
          <img class="img" src="@/assets/icons/note.png" alt="">
        </div>
        <button class="notebtn" @click="removeNote(note._id)">
          <img class="imgdlt" src="@/assets/icons/close.png" alt="">
        </button>
        <p class="note-msg-date" style="color: whitesmoke; opacity: 0.60;">
          Created: {{ formatDate(note.Date) }}
        </p>
        <p class="note-msg">{{ note.Message }}</p>
      </div>
    </div>
    <div v-else>
     <p class="no-data">No notes available.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

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
  color: var(--base4);
  padding: 10px;
  border: none;
  box-sizing: border-box;
  width: 100%;
  margin-bottom: 1px;
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

.img {
  width: 15px;
  height: 15px;
  float: left;
  border: none;
}

.imgdlt {
  width: 10px;
  height: 10px;
  border: none;
  text-align: center;
}

.inline-note {
  opacity: 0.50;
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
  bottom: 11.5px;
  left: 14px;
  position: relative;
}

.notes-container{
    background-color: var(--base2);
}

.no-data {
  margin: 0;
}
</style>