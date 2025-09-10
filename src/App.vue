<template>
    <router-view></router-view>
    <Message v-if="isMobile && isAllowedRoute"/>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Message from '@/components/message.vue';
import { useRoute } from 'vue-router';

const apiKey = import.meta.env.VITE_EREUNA_KEY;

const number = ref(0); // Replace this with your actual number variable

const numberClass = computed(() => {
  return number.value > 0 ? 'positive' : 'negative';
});

const themes = ['default', 'ihatemyeyes', 'colorblind', 'catpuccin'];
const currentTheme = ref('default');

async function setTheme(newTheme) {
  const root = document.documentElement;
  root.classList.remove(...themes);
  root.classList.add(newTheme);
  localStorage.setItem('user-theme', newTheme);
  try {
    const response = await fetch('/api/theme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ theme: newTheme, username: user }),
    });
    const data = await response.json();
    if (data.message === 'Theme updated') {
      currentTheme.value = newTheme;
    } else {
      error.value = data.message;
    }
  } catch (error) {
    error.value = error.message;
  }
}

async function loadTheme() {
    try {
      const response = await fetch('/api/load-theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify({ username: user }),
      });
      const data = await response.json();
      if (data.theme) {
        setTheme(data.theme);
      } else {
        setTheme('default');
      }
    } catch (error) {
      setTheme('default');
    }
  }

loadTheme();

defineExpose({
  loadTheme,
});


const route = useRoute();
const isMobile = ref(false);
const allowedRoutes = ['/charts', '/screener', '/dashboard', '/account', '/portfolio', '/account'];

const isAllowedRoute = computed(() => {
  return allowedRoutes.includes(route.path);
});

onMounted(() => {
  const screenWidth = window.innerWidth;
  if (screenWidth <= 1150) {
    isMobile.value = true;
  }
  window.addEventListener('resize', () => {
    const screenWidth = window.innerWidth;
    if (screenWidth <= 1150) {
      isMobile.value = true;
    } else {
      isMobile.value = false;
    }
  });
});

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
