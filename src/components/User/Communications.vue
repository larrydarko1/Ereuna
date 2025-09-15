<template>
  <div v-if="communications.length === 0" style="margin-top: 30px;">
          <p>No communications found.</p>
        </div>
        <div v-else>
          <div v-for="(comm, idx) in communications" :key="idx" class="notification-popup"
            style="background: var(--base2); border: 1px solid var(--accent1); border-radius: 8px; margin: 20px auto; max-width: 500px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.12); text-align: left; position: relative;">
            <h2 style="color: var(--accent3); margin-bottom: 10px;">{{ comm.header }}</h2>
            <span style="position: absolute; top: 20px; right: 20px; color: var(--text2); font-size: 12px;">
              {{ formatDate(comm.publishedDate) }}
            </span>
            <p style="color: var(--text1); white-space: pre-line;">{{ comm.message }}</p>
          </div>
        </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

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

interface Communication {
  header: string;
  publishedDate: string;
  message: string;
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
    communications.value = communicationsList; // store in ref

  } catch (err) {
    if (typeof err === 'object' && err !== null && 'name' in err && (err as any).name === 'AbortError') {
      return;
    }
    console.error('Error fetching communications:', err);
    communications.value = [];
  }
}

onMounted(() => {
  fetchCommunications();
});

</script>

<style scoped>

</style>