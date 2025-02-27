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
  
  <style lang="scss" scoped>
@use '../style.scss' as *;

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
    color: $text2;
    border: none;
    font-size: 30px;
  }
  
  a {
    text-decoration: none;
    color: $text2;
    font-size: 15px;
    border: none;
    margin-left: 10px;
    margin-right: 10px;
  }
  
  a:hover {
    color: $accent1;
  }

  .inner-logo{
    width: 100px;
    height: 100px;
    border: none;
  }
  
  </style>