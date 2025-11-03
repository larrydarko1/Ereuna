<template>
 <div class="theme-buttons">
   <button
     v-for="(theme, index) in themes"
     :key="index"
     @click="setTheme(theme)"
     :class="{ active: currentTheme === theme }"
     :aria-pressed="currentTheme === theme ? 'true' : 'false'"
     :disabled="loading"
   >
     {{ themeDisplayNames[theme] }}
   </button>
   <div class="theme-spacer"></div>
 </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { defineEmits } from 'vue';
import { useUserStore } from '@/store/store';

const props = defineProps({
  user: {
    type: String,
    required: true
  },
  apiKey: {
    type: String,
    required: true
  }
});

const themes = [
  'default', 'ihatemyeyes', 'colorblind', 'catpuccin', 'black',
  'nord', 'dracula', 'gruvbox', 'tokyo-night', 'solarized',
  'synthwave', 'github-dark', 'everforest', 'ayu-dark', 'rose-pine',
  'material', 'one-dark', 'night-owl', 'panda', 'monokai-pro',
  'tomorrow-night', 'oceanic-next', 'palenight', 'cobalt', 'poimandres',
  'github-light', 'neon', 'moonlight', 'nightfox', 'spacemacs',
  'borland', 'amber', 'cyberpunk', 'matrix', 'sunset',
  'deep-ocean', 'gotham', 'retro', 'spotify', 'autumn',
  'noctis', 'iceberg', 'tango', 'horizon', 'railscasts',
  'vscode-dark', 'slack-dark', 'mintty', 'atom-one', 'light-owl'
];
const userStore = useUserStore();
const currentTheme = computed(() => userStore.currentTheme);
const loading = ref(false);
const emit = defineEmits(['notify']);

// Ensure the theme class is always applied on mount and whenever the store value changes
onMounted(() => {
  const root = document.documentElement;
  root.classList.remove(...themes);
  root.classList.add(currentTheme.value);
});
watch(currentTheme, (newTheme) => {
  const root = document.documentElement;
  root.classList.remove(...themes);
  root.classList.add(newTheme);
});

const themeDisplayNames: Record<string, string> = {
  default: 'Default Theme (Dark)',
  ihatemyeyes: 'I Hate My Eyes (light-mode)',
  colorblind: "I'm Colorblind",
  catpuccin: 'Catpuccin',
  black: 'Black',
  nord: 'Nord',
  dracula: 'Dracula',
  gruvbox: 'Gruvbox',
  'tokyo-night': 'Tokyo Night',
  solarized: 'Solarized Dark',
  synthwave: 'Synthwave',
  'github-dark': 'GitHub Dark',
  everforest: 'Everforest',
  'ayu-dark': 'Ayu Dark',
  'rose-pine': 'Rose Pine',
  material: 'Material',
  'one-dark': 'One Dark',
  'night-owl': 'Night Owl',
  panda: 'Panda',
  'monokai-pro': 'Monokai Pro',
  'tomorrow-night': 'Tomorrow Night',
  'oceanic-next': 'Oceanic Next',
  'palenight': 'Palenight',
  'cobalt': 'Cobalt',
  'poimandres': 'Poimandres',
  'github-light': 'GitHub Light',
  'neon': 'Neon',
  'moonlight': 'Moonlight',
  'nightfox': 'Nightfox',
  'spacemacs': 'Spacemacs',
  'borland': 'Borland',
  'amber': 'Amber',
  'cyberpunk': 'Cyberpunk',
  'matrix': 'Matrix',
  'sunset': 'Sunset',
  'deep-ocean': 'Deep Ocean',
  'gotham': 'Gotham',
  'retro': 'Retro',
  'spotify': 'Spotify',
  'autumn': 'Autumn',
  'noctis': 'Noctis',
  'iceberg': 'Iceberg',
  'tango': 'Tango',
  'horizon': 'Horizon',
  'railscasts': 'Railscasts',
  'vscode-dark': 'VS Code Dark',
  'slack-dark': 'Slack Dark',
  'mintty': 'Mintty',
  'atom-one': 'Atom One',
  'light-owl': 'Light Owl'
};

async function setTheme(newTheme: string) {
  if (loading.value) return;
  loading.value = true;
  const root = document.documentElement;
  root.classList.remove(...themes);
  root.classList.add(newTheme);
  userStore.setTheme(newTheme);
  try {
    const response = await fetch('/api/theme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify({ theme: newTheme, username: props.user }),
    });
    const data = await response.json();
    if (data.message !== 'Theme updated') {
      emit('notify', 'Failed to save theme. Please try again.');
    }
  } catch (err) {
    emit('notify', 'Failed to save theme. Please try again.');
  } finally {
    loading.value = false;
  }
}

</script>

<style scoped>
.theme-buttons {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 3000px;
}

.theme-spacer {
  height: 100px;
  width: 100%;
}

.theme-buttons button {
  height: 100px;
  font-size: 1.5rem;
  border: none;
  cursor: pointer;
  margin-bottom: 5px;
  margin-left: 5px;
  background-color: var(--base2);
  color: var(--text2);
}

.theme-buttons button.active {
  background-color: var(--accent1);
  color: var(--text3);
}

.theme-buttons button:hover {
  background-color: var(--accent2);
  color: var(--text3);
}

</style>