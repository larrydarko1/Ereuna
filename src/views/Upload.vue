<template>
  <div class="container">
    <img src="@/assets/images/owl-loading2.gif" alt="Uploading Financial Data" class="gif">
    <h1>Uploading Financial Data</h1>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMaintenanceStore } from '../store/maintenance';

const router = useRouter();
const maintenanceStore = useMaintenanceStore();
let pollInterval;

onMounted(() => {
  // Check maintenance status every 30 seconds
  pollInterval = setInterval(async () => {
  try {
    await maintenanceStore.checkMaintenanceStatus();
    if (!maintenanceStore.isUnderMaintenance) {
      router.push({ name: 'Login' });
    }
  } catch (error) {
    console.error('Error checking maintenance status:', error);
  }
}, 30000);
});

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
});
</script>
  
<style lang="scss" scoped>
@use '../style.scss' as *;

  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh; /* adjust to your desired height */
  }
  
  .gif {
    width: 250px; /* adjust to your desired width */
    height: 250px;
    margin-bottom: 20px; /* add some space between the gif and the text */
  }

  h1{
    color: whitesmoke;
    font-size: 30px;
  }
  </style>