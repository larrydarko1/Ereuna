<template>
  <div v-if="communications.length === 0" style="margin-top: 30px;">
          <p>No communications found.</p>
        </div>
        <div v-else class="communications-list" role="region" aria-label="Communications list">
          <div v-for="(comm, idx) in communications" :key="idx" class="communication-message">
            <h2 class="comm-header">{{ comm.header }}</h2>
            <span class="comm-date">
              {{ formatDate(comm.publishedDate) }}
            </span>
            <p class="comm-message">{{ comm.message }}</p>
          </div>
        </div>
</template>

<script setup lang="ts">
import { onMounted, ref, defineEmits } from 'vue';

const props = defineProps({
  apiKey: {
    type: String,
    required: true
  },
  formatDate: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(['notify']);

interface Communication {
  header: string;
  message: string;
  publishedDate: string | number | Date;
}

const communications = ref<Communication[]>([]); // list of communications as a ref

async function fetchCommunications() {
  try {
    const headers = {
      'x-api-key': props.apiKey
    };

    const response = await fetch(`/api/communications`, {
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const communicationsList = await response.json();
    const commArray = Array.isArray(communicationsList)
      ? communicationsList
      : Array.isArray(communicationsList.communications)
        ? communicationsList.communications
        : [];
    const mappedList = commArray.map((comm: any) => ({
      ...comm,
      publishedDate:
        comm.publishedDate && typeof comm.publishedDate === 'object' && '$date' in comm.publishedDate
          ? comm.publishedDate.$date
          : comm.publishedDate
    }));
    communications.value = mappedList; // store in ref

  } catch (err) {
    if (typeof err === 'object' && err !== null && 'name' in err && (err as any).name === 'AbortError') {
      return;
    }
    emit('notify', 'Failed to load communications. Please try again later.');
    communications.value = [];
  }
}

onMounted(() => {
  fetchCommunications();
});

</script>

<style scoped>


.communications-list {
  display: flex;
  flex-direction: column;
}

.communication-message {
  width: 100%;
  min-height: 100px;
  background: var(--base2);
  padding: 20px;
  text-align: left;
  position: relative;
  box-sizing: border-box;
  margin-bottom: 5px;
  margin-left: 5px;
}

.comm-header {
  color: var(--accent3);
  margin-bottom: 10px;
  font-size: 2rem;
}

.comm-date {
  position: absolute;
  top: 20px;
  right: 20px;
  color: var(--text2);
  font-size: 1.5rem;
}

.comm-message {
  color: var(--text1);
  white-space: pre-line;
  margin-top: 10px;
  font-size: 1.5rem;
}
</style>