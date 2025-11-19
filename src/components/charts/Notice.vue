<template>
  <div id="chartdiv2" aria-label="Financial data notice" role="region">
    <div class="logo-container">
      <img draggable="false" src="@/assets/images/logos/tiingo.png" alt="Tiingo logo"
        class="provider-logo"
        aria-label="Tiingo logo">
    </div>
    <p class="disclaimer-text" aria-label="Financial data source and update info">
      Real-time market data provided by IEX Cloud through Tiingo.com as of {{ currentDate }}. Real-time data is currently available only for major U.S. exchanges (NASDAQ and NYSE). 
      End-of-day (EOD) data consolidation occurs daily, Monday through Friday, between 6:00 PM and 6:30 PM ET, subject to Tiingo's data availability. 
      <strong>Important:</strong> Stock splits and corporate actions may display incorrect values (e.g., large percentage drops) during market hours until EOD consolidation completes. 
      Historical data and split adjustments are applied during the nightly EOD update. Intraday volume data is not currently available through this feed — only aggregated and EOD volume values are provided. 
      Any metrics or calculations not directly provided by Tiingo/IEX are derived internally using their core data. Fundamental or non-price data may be aggregated from multiple third-party providers; IEX and Tiingo currently provide price feeds only.
      Data provided "as-is" for informational purposes only and should not be solely relied upon for investment decisions.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

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
.logo-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 7px;
}

.provider-logo {
  height: 15px;
  object-fit: contain;
}

.disclaimer-text {
  margin: 0;
  font-size: 10px;
  line-height: 1.4;
}
</style>