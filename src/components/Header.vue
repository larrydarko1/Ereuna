<template>
  <header class="header">
    <a class="icon2" id="home-icon" alt="account"></a>
    <router-link to="/screener" title="Screener" :class="['nav-link', { 'active': route.path === '/screener' }]">
      <img src="@/assets/icons/layers.png" alt="screener" />
      <span>Screener</span>
    </router-link>
    <router-link to="/charts" title="Chart" :class="['nav-link', { 'active': route.path === '/charts' }]">
      <img src="@/assets/icons/chart-histogram.png" alt="chart" />
      <span>Chart</span>
    </router-link>
    <router-link to="/dashboard" title="Dashboard" :class="['nav-link', { 'active': route.path === '/dashboard' }]">
      <img src="@/assets/icons/dashboard.png" alt="user" />
      <span>Dashboard</span>
    </router-link>
    <a title="Logout" @click="LogOut()" class="nav-link" id="logout-icon">
      <img src="@/assets/icons/logout.png" alt="logout" />
      <span>Logout</span>
    </a>
  </header>
</template>

<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();

async function LogOut() {
  try {
    localStorage.clear();
    setTimeout(function() {
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
  min-width: 1400px;
  display: flex;
  align-items: center;
  gap: 10px;
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
}

.nav-link:hover,
.nav-link.active {
  background-color: lighten($base1, 10%);
}

#screener-icon img {
  content: url('@/assets/icons/layers.png');
}

#screener-icon:hover img,
#screener-icon.active img {
  content: url('@/assets/icons/layers-hover.png');
}

#chart-icon img {
  content: url('@/assets/icons/chart-histogram.png');
}

#chart-icon:hover img,
#chart-icon.active img {
  content: url('@/assets/icons/chart-histogram-hover.png');
}

#user-icon img {
  width: 13px;
  height: 13px;
  content: url('@/assets/icons/dashboard.png');
}

#user-icon:hover img,
#user-icon.active img {
  content: url('@/assets/icons/dashboard-hover.png');
}

#logout-icon img {
  content: url('@/assets/icons/logout.png');
}

#logout-icon:hover img {
  content: url('@/assets/icons/logout-hover.png');
}
</style>
