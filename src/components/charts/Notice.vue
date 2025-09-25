<template>
  <div id="chartdiv2" aria-label="Financial data notice" role="region">
    <img src="@/assets/images/logos/tiingo.png" alt="Tiingo logo"
      style="height: 15px; margin-right: 10px; margin-bottom: 7px;"
      aria-label="Tiingo logo">
    <p style="margin: 0; font-size: 10px;" aria-label="Financial data source and update info">
      Core financial data provided by Tiingo.com as of {{ currentDate }} -
      Any metrics or calculations not directly provided by Tiingo are derived internally using their core data.
      End-of-day (EOD) data updates occur daily, Monday through Friday, between 6:00 PM and 6:30 PM ET, subject
      to Tiingo's data availability.
    </p>
  </div>
</template>

<script setup lang="ts">
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
    // Error fetching last update (silently fail)
  }
}

onMounted(() => {
  getLastUpdate();
});
</script>