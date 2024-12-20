<template>
    <header class="header">
      <a title="Home" class="icon2" id="home-icon" alt="account"></a>
      <router-link to="/screener" title="screener" :class="['icon', { 'active': route.path === '/screener' }]" id="screener-icon" alt="screener"></router-link>
      <router-link to="/charts" title="chart" :class="['icon', { 'active': route.path === '/charts' }]" id="chart-icon" alt="chart"></router-link>
      <router-link to="/user" title="user" :class="['icon', { 'active': route.path === '/user' }]" id="user-icon" alt="user"></router-link>
    </header>
  </template>
  
  <script setup>
  import { useRoute } from 'vue-router';
  
  const route = useRoute();
  </script>
  
  <style>
  .header {
    background-color: #0f0f1b;
    border: solid 1px #171728;
    padding: 0px;
    min-width: 1000px;
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
    background-image: url('@/assets/icons/user.png');
  }
  
  #user-icon:hover,
  #user-icon.active {
    background-image: url('@/assets/icons/user-hover.png');
  }
  
  #home-icon {
    background-image: url('@/assets/icons/owl.png');
  }
  </style>