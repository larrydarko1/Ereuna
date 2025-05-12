<template>
    <router-view></router-view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const apiKey = import.meta.env.VITE_EREUNA_KEY;

const number = ref(0); // Replace this with your actual number variable

const numberClass = computed(() => {
  return number.value > 0 ? 'positive' : 'negative';
});

const themes = ['default', 'fuckmyeyes', 'colorblind'];
const currentTheme = ref('default');
function setTheme(newTheme) {
  const root = document.documentElement;
  root.classList.remove(...themes);
  root.classList.add(newTheme);
  localStorage.setItem('user-theme', newTheme);
  currentTheme.value = newTheme;
}

function loadTheme() {
  const savedTheme = localStorage.getItem('user-theme');
  if (themes.includes(savedTheme)) {
    setTheme(savedTheme);
  } else {
    setTheme('default');
  }
}

loadTheme()
</script>

<style lang="scss">
@use './style.scss' as *;

* {
  font-family: Helvetica, Arial;
  font-size: 10px;
}

body {
  background-color: var(--base1);
  padding: 0%;
  margin: 0%;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.positive {
  color: var(--positive);
}

.negative {
  color: var(--negative);
}

.mobile-message {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 16px;
  color: var(--text2);
  padding: 20px;
  text-align: center;
  background-color: var(--base1);
  font-weight: bold;
}
</style>
