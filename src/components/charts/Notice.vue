<template>
  <div id="chartdiv2">
    <img src="@/assets/images/logos/tiingo.png" alt="Image"
      style="height: 15px; margin-right: 10px; margin-bottom: 7px;">
    <p style="margin: 0; font-size: 10px;">
      Core financial data provided by Tiingo.com as of {{ currentDate }} -
      Any metrics or calculations not directly provided by Tiingo are derived internally using their core data.
      End-of-day (EOD) data updates occur daily, Monday through Friday, between 6:00 PM and 6:30 PM ET, subject
      to Tiingo's data availability.
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  apiKey: {
    type: String,
    required: true
  }
});

const currentDate = ref('');

async function getLastUpdate() {
  try {
    const response = await fetch('/api/getlastupdate', {
      headers: {
        'X-API-KEY': props.apiKey,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    currentDate.value = data.date;
  } catch (error) {
    console.error('Error fetching last update:', error);
  }
}

onMounted(() => {
  getLastUpdate();
});
</script>