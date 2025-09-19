<template>
    <router-view></router-view>
    <Message v-if="isMobile && isAllowedRoute"/>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Message from '@/components/message.vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/store/store';

const apiKey: string = import.meta.env.VITE_EREUNA_KEY;
const userStore = useUserStore();
const error = ref<string>('');

const themes: string[] = ['default', 'ihatemyeyes', 'colorblind', 'catpuccin'];

const user = computed(() => userStore.getUser);
const currentTheme = computed(() => userStore.currentTheme);

async function setTheme(newTheme: string) {
  const root = document.documentElement;
  root.classList.remove(...themes);
  root.classList.add(newTheme);
  userStore.setTheme(newTheme);
  try {
    const response = await fetch('/api/theme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
  body: JSON.stringify({ theme: newTheme, username: (user.value && 'username' in user.value) ? user.value.username : '' }),
    });
    const data = await response.json();
    if (data.message !== 'Theme updated') {
      error.value = data.message || '';
    }
  } catch (err: any) {
    error.value = err.message;
  }
}


async function loadTheme() {
  const localTheme = localStorage.getItem('user-theme');
  try {
    const response = await fetch('/api/load-theme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ username: (user.value && 'username' in user.value) ? user.value.username : '' }),
    });
    const data = await response.json();
    if (data.theme) {
      setTheme(data.theme);
    } else if (!localTheme) {
      setTheme('default');
    }
    // If localTheme exists, do nothing (let main.ts/localStorage logic win)
  } catch (err) {
    if (!localTheme) {
      setTheme('default');
    }
    // If localTheme exists, do nothing
  }
}

onMounted(() => {
  userStore.loadUserFromToken();
  loadTheme();
});

defineExpose({
  loadTheme,
});


const route = useRoute();
const isMobile = ref(false);
const allowedRoutes: string[] = ['/charts', '/screener', '/dashboard', '/account', '/portfolio', '/account'];

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
