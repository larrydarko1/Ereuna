<template>
  <header class="header">
    <a class="icon2" id="home-icon" alt="account"></a>
    <div class="nav-links">
       <router-link to="/dashboard" title="Dashboard" :class="['nav-link', { 'active': route.path === '/dashboard' }]">
        <img :src="route.path === '/dashboard' ? dashboardHover : dashboard" alt="user" />
        <span :class="{ activeText: route.path === '/dashboard' }">Dashboard</span>
      </router-link>
      <router-link to="/charts" title="Chart" :class="['nav-link', { 'active': route.path === '/charts' }]">
        <img :src="route.path === '/charts' ? chartHistogramHover : chartHistogram" alt="chart" />
        <span :class="{ activeText: route.path === '/charts' }">Charts</span>
      </router-link>
      <router-link to="/screener" title="Screener" :class="['nav-link', { 'active': route.path === '/screener' }]">
        <img :src="route.path === '/screener' ? layersHover : layers" alt="screener" />
        <span :class="{ activeText: route.path === '/screener' }">Screener</span>
      </router-link>
      <a title="Logout" @click="LogOut()" class="nav-link" id="logout-icon">
        <img src="@/assets/icons/logout.png" alt="logout" />
        <span>Logout</span>
      </a>
    </div>
  </header>
</template>

<script setup>
import { useRoute } from 'vue-router';
import layers from '@/assets/icons/layers.png';
import layersHover from '@/assets/icons/layers-hover.png';
import chartHistogram from '@/assets/icons/chart-histogram.png';
import chartHistogramHover from '@/assets/icons/chart-histogram-hover.png';
import dashboard from '@/assets/icons/dashboard.png';
import dashboardHover from '@/assets/icons/dashboard-hover.png';

const route = useRoute();

async function LogOut() {
  try {
    localStorage.clear();
    setTimeout(() => {
      location.reload();
    }, 100);
  } catch (error) {
    console.error('Error logging out:', error);
  }
}
</script>

<style lang="scss">
@use '../style.scss' as *;

.header {
  background-color: $base1;
  border: solid 1px $base1;
  padding: 0px 10px;
  min-width: 1350px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.icon2 {
  width: 15px;
  height: 15px;
  margin: 5px;
  padding: 5px;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  opacity: 0.30;
  background-image: url('@/assets/icons/owl.png');
  flex-shrink: 0;
}

.nav-links {
  display: flex;
  align-items: center;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 5px;
  padding: 5px 8px;
  cursor: pointer;
  text-decoration: none;
  color: $text1;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.nav-link img {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.nav-link span {
  font-size: 14px;
  user-select: none;
  transition: color 0.3s ease;
}

.nav-link:hover,
.nav-link.active {
  background-color: lighten($base1, 10%);
}

.nav-link.active span,
.activeText {
  color: $accent1;
}
</style>