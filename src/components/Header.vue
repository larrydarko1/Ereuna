<template>
  <header class="header">
    <a class="icon2" id="home-icon" alt="account"></a>
    <div class="nav-links">
      <router-link to="/dashboard" title="Dashboard" :class="['nav-link', { 'active': route.path === '/dashboard' }]">
  <svg viewBox="0 0 24.00 24.00" version="1.1" xmlns="http://www.w3.org/2000/svg" :class="{ 'active-svg': route.path === '/dashboard' }" width="24" height="24" fill="currentColor" stroke="transparent" stroke-width="0.9359999999999999">
    <g id="SVGRepo_iconCarrier">
      <rect x="2" y="2" width="9" height="11" rx="2" :fill="route.path === '/dashboard' ? 'var(--accent1)' : 'var(--text1)'"></rect>
      <rect x="13" y="2" width="9" height="7" rx="2" :fill="route.path === '/dashboard' ? 'var(--accent1)' : 'var(--text1)'"></rect>
      <rect x="2" y="15" width="9" height="7" rx="2" :fill="route.path === '/dashboard' ? 'var(--accent1)' : 'var(--text1)'"></rect>
      <rect x="13" y="11" width="9" height="11" rx="2" :fill="route.path === '/dashboard' ? 'var(--accent1)' : 'var(--text1)'"></rect>
    </g>
  </svg>
  <span :class="{ 'active-text': route.path === '/dashboard' }">Dashboard</span>
</router-link>
<router-link to="/charts" title="Chart" :class="['nav-link', { 'active': route.path === '/charts' }]">
  <svg viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg" :class="{ 'active-svg': route.path === '/charts' }" width="24" height="24" fill="currentColor">
    <g id="SVGRepo_iconCarrier">
      <path d="M29.5 7c-1.381 0-2.5 1.12-2.5 2.5 0 0.284 0.058 0.551 0.144 0.805l-6.094 5.247c-0.427-0.341-0.961-0.553-1.55-0.553-0.68 0-1.294 0.273-1.744 0.713l-4.774-2.39c-0.093-1.296-1.162-2.323-2.482-2.323-1.38 0-2.5 1.12-2.5 2.5 0 0.378 0.090 0.732 0.24 1.053l-4.867 5.612c-0.273-0.102-0.564-0.166-0.873-0.166-1.381 0-2.5 1.119-2.5 2.5s1.119 2.5 2.5 2.5c1.381 0 2.5-1.119 2.5-2.5 0-0.332-0.068-0.649-0.186-0.939l4.946-5.685c0.236 0.073 0.48 0.124 0.74 0.124 0.727 0 1.377-0.316 1.834-0.813l4.669 2.341c0.017 1.367 1.127 2.471 2.497 2.471 1.381 0 2.5-1.119 2.5-2.5 0-0.044-0.011-0.086-0.013-0.13l6.503-5.587c0.309 0.137 0.649 0.216 1.010 0.216 1.381 0 2.5-1.119 2.5-2.5s-1.119-2.5-2.5-2.5z" :fill="route.path === '/charts' ? 'var(--accent1)' : 'var(--text1)'"></path>
    </g>
  </svg>
  <span :class="{ 'active-text': route.path === '/charts' }">Charts</span>
</router-link>
<router-link to="/screener" title="Screener" :class="['nav-link', { 'active': route.path === '/screener' }]">
  <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" :class="{ 'active-svg': route.path === '/screener' }" width="24" height="24" fill="currentColor">
    <g id="SVGRepo_iconCarrier">
      <path d="M256,256c-13.47,0-26.94-2.39-37.44-7.17l-148-67.49C63.79,178.26,48,169.25,48,152.24s15.79-26,22.58-29.12L219.86,55.05c20.57-9.4,51.61-9.4,72.19,0l149.37,68.07c6.79,3.09,22.58,12.1,22.58,29.12s-15.79,26-22.58,29.11l-148,67.48C282.94,253.61,269.47,256,256,256ZM432.76,155.14h0Z" :fill="route.path === '/screener' ? 'var(--accent1)' : 'var(--text1)'"></path>
      <path d="M441.36,226.81,426.27,220,387.5,237.74l-94,43c-10.5,4.8-24,7.19-37.44,7.19s-26.93-2.39-37.42-7.19l-94.07-43L85.79,220l-15.22,6.84C63.79,229.93,48,239,48,256s15.79,26.08,22.56,29.17l148,67.63C229,357.6,242.49,360,256,360s26.94-2.4,37.44-7.19L441.31,285.2C448.12,282.11,464,273.09,464,256S448.23,229.93,441.36,226.81Z" :fill="route.path === '/screener' ? 'var(--accent1)' : 'var(--text1)'"></path>
      <path d="M441.36,330.8,426.27,324,387.5,341.73l-94,42.95c-10.5,4.78-24,7.18-37.44,7.18s-26.93-2.39-37.42-7.18l-94.07-43L85.79,324l-15.22,6.84C63.79,333.93,48,343,48,360s15.79,26.07,22.56,29.15l148,67.59C229,461.52,242.54,464,256,464s26.88-2.48,37.38-7.27l147.92-67.57C448.12,386.08,464,377.06,464,360S448.23,333.93,441.36,330.8Z" :fill="route.path === '/screener' ? 'var(--accent1)' : 'var(--text1)'"></path>
    </g>
  </svg>
  <span :class="{ activeText: route.path === '/screener' }">Screener</span>
</router-link>
<a title="Logout" @click="LogOut()" class="nav-link" id="logout-icon">
  <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor">
    <g id="SVGRepo_iconCarrier">
      <path  d="M106.667 512c0-200.295 162.371-362.667 362.667-362.667 57.937 0 112.644 13.57 161.173 37.687 10.551 5.243 23.356.941 28.599-9.61 5.239-10.551.939-23.355-9.613-28.599-54.293-26.982-115.486-42.144-180.16-42.144C245.473 106.667 64 288.141 64 512s181.474 405.333 405.333 405.333c64.674 0 125.867-15.164 180.16-42.146 10.551-5.244 14.852-18.044 9.613-28.595-5.244-10.551-18.048-14.857-28.599-9.613-48.529 24.115-103.236 37.687-161.173 37.687-200.295 0-362.667-162.372-362.667-362.667z" :fill="route.path === '/logout' ? 'var(--accent1)' : 'var(--text1)'"></path>
      <path d="M783.087 326.249c-8.333-8.332-21.841-8.332-30.174 0-8.329 8.331-8.329 21.839 0 30.17l134.251 134.249h-353.83c-11.78 0-21.333 9.553-21.333 21.333s9.553 21.333 21.333 21.333h353.83L752.913 667.58c-8.329 8.333-8.329 21.841 0 30.174 8.333 8.329 21.841 8.329 30.174 0l170.667-170.667a21.29 21.29 0 004.655-6.985A21.31 21.31 0 00960 512a21.252 21.252 0 00-5.79-14.613l-.512-.525-170.611-170.613z" :fill="route.path === '/logout' ? 'var(--accent1)' : 'var(--text1)'"></path>
    </g>
  </svg>
  <span>Logout</span>
</a>
    </div>
  </header>
</template>

<script setup>
import { useRoute } from 'vue-router';

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

<style lang="scss" scoped>
@use '../style.scss' as *;

.header {
  background-color: var(--base1);
  border: solid 1px var(--base1);
  padding: 0px 10px;
  //min-width: 1350px;
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
  color:var(--text1);
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
  background-color: var(--base2);
}

.nav-link.active span,
.activeText {
  color:  var(--accent1);
}

/* Mobile version */
@media (max-width: 1150px) {
  .nav-link span {
  display: none;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0px;
  margin: 1px;
  padding: 5px 8px;
  cursor: pointer;
  text-decoration: none;
  color: var(--text1);
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.nav-link img {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
}

.icon2 {
  width: 30px;
  height: 30px;
  margin: 5px;
  padding: 5px;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  opacity: 0.30;
  background-image: url('@/assets/icons/owl.png');
  flex-shrink: 0;
}
  }
</style>