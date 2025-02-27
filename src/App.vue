<template>
  <router-view></router-view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const number = ref(0); // Replace this with your actual number variable

const numberClass = computed(() => {
  return number.value > 0 ? 'positive' : 'negative';
});
</script>

<style lang="scss">
@use './style.scss' as *;

* {
  font-family: Helvetica, Arial;
  font-size: 10px;
}

body {
  background-color: $base1;
  padding: 0%;
  margin: 0%;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.positive {
  color: #4caf50;
}

.negative {
  color: #90bff9;
}

</style>
