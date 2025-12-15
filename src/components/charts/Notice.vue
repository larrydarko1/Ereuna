<template>
  <div id="chartdiv2" :aria-label="t('notice.ariaLabel')" role="region">
    <p class="disclaimer-text" :aria-label="t('notice.ariaDescription')" v-html="t('notice.disclaimer', { date: currentDate })">
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  apiKey: {
    type: String,
    required: true
  }
});

const currentDate = ref('');

function getMarketDataDate(): string {
  // Get current time in US Eastern Time
  const nowET = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = nowET.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = nowET.getHours();
  const minutes = nowET.getMinutes();
  const time = hours * 60 + minutes; // Convert to minutes since midnight
  
  // Market hours: 9:30 AM - 4:00 PM EST/EDT
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM
  
  let dataDate = new Date(nowET);
  
  // If it's weekend, go back to Friday
  if (day === 0) { // Sunday
    dataDate.setDate(nowET.getDate() - 2);
  } else if (day === 6) { // Saturday
    dataDate.setDate(nowET.getDate() - 1);
  } else if (time < marketOpen) {
    // Before market open on a weekday - use previous day's data
    dataDate.setDate(nowET.getDate() - 1);
    // If that was a weekend, go back further
    if (dataDate.getDay() === 0) { // Sunday
      dataDate.setDate(dataDate.getDate() - 2);
    } else if (dataDate.getDay() === 6) { // Saturday
      dataDate.setDate(dataDate.getDate() - 1);
    }
  }
  // If market is open or after close on a weekday, use today's date
  
  // Format as DD/MM/YYYY
  const dd = String(dataDate.getDate()).padStart(2, '0');
  const mm = String(dataDate.getMonth() + 1).padStart(2, '0');
  const yyyy = dataDate.getFullYear();
  
  return `${dd}/${mm}/${yyyy}`;
}

function updateDate() {
  currentDate.value = getMarketDataDate();
}

let dateInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  updateDate();
  // Update every 30 seconds to catch market open transitions
  dateInterval = setInterval(updateDate, 30000);
});

onUnmounted(() => {
  if (dateInterval) {
    clearInterval(dateInterval);
    dateInterval = null;
  }
});
</script>

<style scoped>

.disclaimer-text {
  margin: 0;
  font-size: 10px;
  line-height: 1.4;
}

#chartdiv2 {
  padding: 10px;
  background: var(--base2);
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(10, 20, 30, 0.08);
  border: 1px solid rgba(0,0,0,0.04);
  transition: transform 0.14s ease, box-shadow 0.14s ease;
  margin-top: 5px;
}
</style>