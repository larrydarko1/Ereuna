<template>
    <div class="not-found">
<img class="inner-logo" src="@/assets/icons/owl.png" alt="">
<h1>404 | Page Not Found</h1>
<router-link to="/charts">Charts</router-link>
<router-link to="/screener">Screener</router-link>
    </div>
  </template>
  
  <script setup>
  import { useRoute } from 'vue-router';
  
  const route = useRoute();
  </script>
  
  <style scoped>
  .not-found {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    align-items: center;
    justify-content: center;
    border: none;
  }
  
  h1 {
    color: whitesmoke;
    border: none;
    font-size: 30px;
  }
  
  a {
    text-decoration: none;
    color: #d8d8d8;
    font-size: 15px;
    border: none;
    margin-left: 10px;
    margin-right: 10px;
  }
  
  a:hover {
    color: #733adc;
  }

  .inner-logo{
    width: 100px;
    height: 100px;
    border: none;
  }
  
  </style>