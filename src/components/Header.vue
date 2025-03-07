<template>
    <header class="header">
      <a class="icon2" id="home-icon" alt="account"></a>
      <a title="Logout" @click="LogOut()" class="icon" id="logout-icon" alt="account"></a>
      <router-link to="/screener" title="Screener" :class="['icon', { 'active': route.path === '/screener' }]" id="screener-icon" alt="screener"></router-link>
      <router-link to="/charts" title="Chart" :class="['icon', { 'active': route.path === '/charts' }]" id="chart-icon" alt="chart"></router-link>
      <router-link to="/user" title="Dashboard" :class="['icon', { 'active': route.path === '/user' }]" id="user-icon" alt="user"></router-link>
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
    padding: 0px;
    min-width: 1370px;
  }
  
  .icon {
    width: 15px;
    height: 15px;
    float: right;
    border: none;
    margin: 5px;
    padding: 5px;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    cursor: pointer;
  }
  
  .icon2 {
    width: 15px;
    height: 15px;
    float: left;
    border: none;
    margin: 5px;
    padding: 5px;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    opacity: 0.30;
  }
  
  #screener-icon {
    background-image: url('@/assets/icons/layers.png');
  }
  
  #screener-icon:hover,
  #screener-icon.active {
    background-image: url('@/assets/icons/layers-hover.png');
  }
  
  #chart-icon {
    background-image: url('@/assets/icons/chart-histogram.png');
  }
  
  #chart-icon:hover,
  #chart-icon.active {
    background-image: url('@/assets/icons/chart-histogram-hover.png');
  }

  #user-icon {
    background-image: url('@/assets/icons/dashboard.png');
    width: 13px;
    height: 13px;
  }
  
  #user-icon:hover,
  #user-icon.active {
    background-image: url('@/assets/icons/dashboard-hover.png');
  }

  #logout-icon {
    background-image: url('@/assets/icons/logout.png');
  }
  
  #logout-icon:hover {
    background-image: url('@/assets/icons/logout-hover.png');
  }
  
  #home-icon {
    background-image: url('@/assets/icons/owl.png');
  }
  </style>