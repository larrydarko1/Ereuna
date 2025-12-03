<template>
  <div class="themes-grid">
    <div
      v-for="(theme, index) in themes"
      :key="index"
      class="theme-card"
      :class="{ active: currentTheme === theme }"
      @click="setTheme(theme)"
      :disabled="loading"
    >
      <div class="theme-name">{{ themeDisplayNames[theme] }}</div>
      <div class="color-previews">
        <div
          v-for="(color, idx) in Object.values(themeColors[theme]).slice(0, 17)"
          :key="idx"
          class="color-sphere"
          :style="{ backgroundColor: color }"
        ></div>
      </div>
    </div>
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

const themeColors: Record<string, Record<string, string>> = {
  default: {
    accent1: '#8c8dfe',
    accent2: '#a9a5ff',
    accent3: '#cfcbff',
    text1: '#c0caf5',
    text2: '#a9b1d6',
    text3: '#222222',
    base1: '#1a1b26',
    base2: '#24283b',
    base3: '#414868',
    base4: '#16161e',
    positive: '#4caf50',
    negative: '#90bff9',
    volume: '#4d4d4d',
    ma4: '#4caf50',
    ma3: '#ffeb3b',
    ma2: '#2862ff',
    ma1: '#00bcd4'
  },
  ihatemyeyes: {
    accent1: '#7aa2f7',
    accent2: '#bb9af7',
    accent3: '#7dcfff',
    accent4: '#7aa2f753',
    text1: '#1a1b26',
    text2: '#24283b',
    text3: '#414868',
    base1: '#ffffff',
    base2: '#f0f2f5',
    base3: '#e9eaec',
    base4: '#d1d5db',
    positive: '#7ca254',
    negative: '#f7768e',
    volume: '#ff9e64',
    ma4: '#9ece6a',
    ma3: '#e0af68',
    ma2: '#7aa2f7',
    ma1: '#bb9af7'
  },
  colorblind: {
    accent1: '#0072B5',
    accent2: '#E69F00',
    accent3: '#009E73',
    accent4: '#56B4E950',
    text1: '#F7F7F7',
    text2: '#BDBDBD',
    text3: '#222222',
    base1: '#181926',
    base2: '#23243a',
    base3: '#313244',
    base4: '#1e2030',
    positive: '#009E73',
    negative: '#E69F00',
    volume: '#56B4E9',
    ma4: '#009E73',
    ma3: '#E69F00',
    ma2: '#0072B5',
    ma1: '#CC79A7'
  },
  catpuccin: {
    accent1: '#729e6e',
    accent2: '#ba93af',
    accent3: '#7b9c97',
    accent4: '#f5c2e753',
    text1: '#cdd6f4',
    text2: '#bac2de',
    text3: '#222222',
    base1: '#1e1e2e',
    base2: '#181825',
    base3: '#313244',
    base4: '#45475a',
    positive: '#a6e3a1',
    negative: '#f38ba8',
    volume: '#f9e2af',
    ma4: '#a6e3a1',
    ma3: '#f9e2af',
    ma2: '#89b4fa',
    ma1: '#f5c2e7'
  },
  black: {
    accent1: '#8c8dfe',
    accent2: '#a9a5ff',
    accent3: '#cfcbff',
    accent4: '#a9a5ff53',
    text1: '#ffffff',
    text2: '#cad3f5',
    text3: '#222222',
    base1: '#000000',
    base2: '#010B13',
    base3: '#8a8a90',
    base4: '#000000',
    positive: '#4caf50',
    negative: '#90bff9',
    volume: '#4d4d4d',
    ma4: '#4caf50',
    ma3: '#ffeb3b',
    ma2: '#2862ff',
    ma1: '#00bcd4'
  },
  nord: {
    accent1: '#88c0d0',
    accent2: '#81a1c1',
    accent3: '#5e81ac',
    accent4: '#88c0d053',
    text1: '#eceff4',
    text2: '#e5e9f0',
    text3: '#222222',
    base1: '#2e3440',
    base2: '#3b4252',
    base3: '#434c5e',
    base4: '#4c566a',
    positive: '#a3be8c',
    negative: '#bf616a',
    volume: '#d08770',
    ma4: '#a3be8c',
    ma3: '#ebcb8b',
    ma2: '#81a1c1',
    ma1: '#b48ead'
  },
  dracula: {
    accent1: '#bd93f9',
    accent2: '#ff79c6',
    accent3: '#8be9fd',
    accent4: '#bd93f950',
    text1: '#f8f8f2',
    text2: '#f1fa8c',
    text3: '#222222',
    base1: '#282a36',
    base2: '#44475a',
    base3: '#6272a4',
    base4: '#21222c',
    positive: '#50fa7b',
    negative: '#ff5555',
    volume: '#ffb86c',
    ma4: '#50fa7b',
    ma3: '#f1fa8c',
    ma2: '#8be9fd',
    ma1: '#ff79c6'
  },
  gruvbox: {
    accent1: '#fe8019',
    accent2: '#fabd2f',
    accent3: '#b8bb26',
    accent4: '#fe801950',
    text1: '#ebdbb2',
    text2: '#d5c4a1',
    text3: '#222222',
    base1: '#282828',
    base2: '#3c3836',
    base3: '#504945',
    base4: '#1d2021',
    positive: '#b8bb26',
    negative: '#fb4934',
    volume: '#d3869b',
    ma4: '#b8bb26',
    ma3: '#fabd2f',
    ma2: '#83a598',
    ma1: '#d3869b'
  },
  'tokyo-night': {
    accent1: '#7aa2f7',
    accent2: '#bb9af7',
    accent3: '#7dcfff',
    text1: '#c0caf5',
    text2: '#a9b1d6',
    text3: '#222222',
    base1: '#1a1b26',
    base2: '#24283b',
    base3: '#414868',
    base4: '#16161e',
    positive: '#9ece6a',
    negative: '#f7768e',
    volume: '#ff9e64',
    ma4: '#9ece6a',
    ma3: '#e0af68',
    ma2: '#7aa2f7',
    ma1: '#bb9af7'
  },
  solarized: {
    accent1: '#268bd2',
    accent2: '#6c71c4',
    accent3: '#2aa198',
    accent4: '#268bd253',
    text1: '#839496',
    text2: '#93a1a1',
    text3: '#222222',
    base1: '#002b36',
    base2: '#073642',
    base3: '#586e75',
    base4: '#00212b',
    positive: '#859900',
    negative: '#dc322f',
    volume: '#b58900',
    ma4: '#859900',
    ma3: '#b58900',
    ma2: '#268bd2',
    ma1: '#d33682'
  },
  synthwave: {
    accent1: '#f92aad',
    accent2: '#da1b60',
    accent3: '#ff8a00',
    accent4: '#f92aad53',
    text1: '#fff',
    text2: '#f2f2f2',
    text3: '#72f1b8',
    base1: '#2b213a',
    base2: '#241b2f',
    base3: '#34294f',
    base4: '#1a1325',
    positive: '#72f1b8',
    negative: '#fe4450',
    volume: '#03edf9',
    ma4: '#72f1b8',
    ma3: '#ff8a00',
    ma2: '#03edf9',
    ma1: '#f92aad'
  },
  'github-dark': {
    accent1: '#58a6ff',
    accent2: '#79c0ff',
    accent3: '#a5d6ff',
    accent4: '#58a6ff53',
    text1: '#c9d1d9',
    text2: '#8b949e',
    text3: '#222222',
    base1: '#0d1117',
    base2: '#161b22',
    base3: '#30363d',
    base4: '#21262d',
    positive: '#56d364',
    negative: '#f85149',
    volume: '#d29922',
    ma4: '#56d364',
    ma3: '#d29922',
    ma2: '#58a6ff',
    ma1: '#bc8cff'
  },
  everforest: {
    accent1: '#83c092',
    accent2: '#dbbc7f',
    accent3: '#a7c080',
    accent4: '#83c09253',
    text1: '#d3c6aa',
    text2: '#a7c080',
    text3: '#222222',
    base1: '#2d353b',
    base2: '#343f44',
    base3: '#475258',
    base4: '#232a2e',
    positive: '#a7c080',
    negative: '#e67e80',
    volume: '#d699b6',
    ma4: '#a7c080',
    ma3: '#dbbc7f',
    ma2: '#7fbbb3',
    ma1: '#d699b6'
  },
  'ayu-dark': {
    accent1: '#ffb454',
    accent2: '#ff8f40',
    accent3: '#e6b450',
    accent4: '#ffb45453',
    text1: '#b3b1ad',
    text2: '#e6b450',
    text3: '#20262d',
    base1: '#0a0e14',
    base2: '#1f2430',
    base3: '#33415e',
    base4: '#11151c',
    positive: '#a6cc70',
    negative: '#f07178',
    volume: '#95e6cb',
    ma4: '#a6cc70',
    ma3: '#e6b450',
    ma2: '#39bae6',
    ma1: '#ffee99'
  },
  'rose-pine': {
    accent1: '#ebbcba',
    accent2: '#eb6f92',
    accent3: '#f6c177',
    accent4: '#ebbcba53',
    text1: '#e0def4',
    text2: '#9ccfd8',
    text3: '#222222',
    base1: '#191724',
    base2: '#1f1d2e',
    base3: '#26233a',
    base4: '#16141f',
    positive: '#31748f',
    negative: '#eb6f92',
    volume: '#c4a7e7',
    ma4: '#31748f',
    ma3: '#f6c177',
    ma2: '#9ccfd8',
    ma1: '#c4a7e7'
  },
  material: {
    accent1: '#82aaff',
    accent2: '#89ddff',
    accent3: '#c792ea',
    accent4: '#82aaff53',
    text1: '#eeffff',
    text2: '#b2ccd6',
    text3: '#222222',
    base1: '#212121',
    base2: '#2b2b2b',
    base3: '#353535',
    base4: '#181818',
    positive: '#c3e88d',
    negative: '#f07178',
    volume: '#ffcb6b',
    ma4: '#c3e88d',
    ma3: '#ffcb6b',
    ma2: '#82aaff',
    ma1: '#c792ea'
  },
  'one-dark': {
    accent1: '#61afef',
    accent2: '#56b6c2',
    accent3: '#c678dd',
    accent4: '#61afef53',
    text1: '#abb2bf',
    text2: '#5c6370',
    text3: '#222222',
    base1: '#282c34',
    base2: '#353b45',
    base3: '#3e4451',
    base4: '#21252b',
    positive: '#98c379',
    negative: '#e06c75',
    volume: '#e5c07b',
    ma4: '#98c379',
    ma3: '#e5c07b',
    ma2: '#56b6c2',
    ma1: '#c678dd'
  },
  'night-owl': {
    accent1: '#82aaff',
    accent2: '#7fdbca',
    accent3: '#c792ea',
    accent4: '#82aaff53',
    text1: '#d6deeb',
    text2: '#c792ea',
    text3: '#222222',
    base1: '#011627',
    base2: '#0e293f',
    base3: '#1d3b53',
    base4: '#010d18',
    positive: '#addb67',
    negative: '#ef5350',
    volume: '#ffeb95',
    ma4: '#addb67',
    ma3: '#ffeb95',
    ma2: '#7fdbca',
    ma1: '#c792ea'
  },
  panda: {
    accent1: '#ff75b5',
    accent2: '#6fc1ff',
    accent3: '#ffe27a',
    accent4: '#ff75b553',
    text1: '#e6e6e6',
    text2: '#bfbfbf',
    text3: '#222222',
    base1: '#292a2b',
    base2: '#1f2023',
    base3: '#34353a',
    base4: '#0f0f0f',
    positive: '#19f9d8',
    negative: '#ff2c6d',
    volume: '#ffe27a',
    ma4: '#19f9d8',
    ma3: '#ffe27a',
    ma2: '#6fc1ff',
    ma1: '#ff75b5'
  },
  'monokai-pro': {
    accent1: '#ffd866',
    accent2: '#fc9867',
    accent3: '#ab9df2',
    accent4: '#ffd86653',
    text1: '#fcfcfa',
    text2: '#939293',
    text3: '#222222',
    base1: '#2d2a2e',
    base2: '#403e41',
    base3: '#5b595c',
    base4: '#221f22',
    positive: '#a9dc76',
    negative: '#ff6188',
    volume: '#fc9867',
    ma4: '#a9dc76',
    ma3: '#ffd866',
    ma2: '#78dce8',
    ma1: '#ab9df2'
  },
  'tomorrow-night': {
    accent1: '#c66',
    accent2: '#de935f',
    accent3: '#f0c674',
    accent4: '#c6666680',
    text1: '#c5c8c6',
    text2: '#b4b7b4',
    text3: '#222222',
    base1: '#1d1f21',
    base2: '#282a2e',
    base3: '#373b41',
    base4: '#121416',
    positive: '#b5bd68',
    negative: '#cc6666',
    volume: '#8abeb7',
    ma4: '#b5bd68',
    ma3: '#f0c674',
    ma2: '#81a2be',
    ma1: '#b294bb'
  },
  'oceanic-next': {
    accent1: '#6699cc',
    accent2: '#5fb3b3',
    accent3: '#99c794',
    accent4: '#6699cc80',
    text1: '#d8dee9',
    text2: '#c0c5ce',
    text3: '#222222',
    base1: '#1b2b34',
    base2: '#343d46',
    base3: '#4f5b66',
    base4: '#0f1419',
    positive: '#99c794',
    negative: '#ec5f67',
    volume: '#f99157',
    ma4: '#99c794',
    ma3: '#fac863',
    ma2: '#6699cc',
    ma1: '#c594c5'
  },
  palenight: {
    accent1: '#82aaff',
    accent2: '#c792ea',
    accent3: '#89ddff',
    accent4: '#82aaff80',
    text1: '#a6accd',
    text2: '#8796b0',
    text3: '#222222',
    base1: '#292d3e',
    base2: '#333747',
    base3: '#444267',
    base4: '#1c1f2b',
    positive: '#c3e88d',
    negative: '#ff5370',
    volume: '#f78c6c',
    ma4: '#c3e88d',
    ma3: '#ffcb6b',
    ma2: '#82aaff',
    ma1: '#c792ea'
  },
  cobalt: {
    accent1: '#3a9bfd',
    accent2: '#99d9ff',
    accent3: '#8ffdfd',
    accent4: '#3a9bfd80',
    text1: '#f8f8f2',
    text2: '#e6e6e6',
    text3: '#222222',
    base1: '#002240',
    base2: '#0c3764',
    base3: '#184a7b',
    base4: '#001629',
    positive: '#3ad900',
    negative: '#ff2600',
    volume: '#ffee99',
    ma4: '#3ad900',
    ma3: '#ffee99',
    ma2: '#99d9ff',
    ma1: '#ff80e1'
  },
  poimandres: {
    accent1: '#7390aa',
    accent2: '#a6accd',
    accent3: '#91b4d5',
    accent4: '#7390aa80',
    text1: '#e4f0fb',
    text2: '#a6accd',
    text3: '#222222',
    base1: '#1b1e28',
    base2: '#272a34',
    base3: '#303540',
    base4: '#11131a',
    positive: '#5de4c7',
    negative: '#d0679d',
    volume: '#8eb4f5',
    ma4: '#5de4c7',
    ma3: '#8eb4f5',
    ma2: '#a6accd',
    ma1: '#d0679d'
  },
  'github-light': {
    accent1: '#0550ae',
    accent2: '#0969da',
    accent3: '#218bff',
    accent4: '#0550ae80',
    text1: '#1f2328',
    text2: '#656d76',
    text3: '#cdcdcd',
    base1: '#ffffff',
    base2: '#f6f8fa',
    base3: '#eaeef2',
    base4: '#f8fafc',
    positive: '#1a7f37',
    negative: '#cf222e',
    volume: '#9a6700',
    ma4: '#1a7f37',
    ma3: '#9a6700',
    ma2: '#0969da',
    ma1: '#8250df'
  },
  neon: {
    accent1: '#00ffff',
    accent2: '#ff00ff',
    accent3: '#00ff00',
    accent4: '#00ffff80',
    text1: '#ffffff',
    text2: '#dddddd',
    text3: '#222222',
    base1: '#000000',
    base2: '#0a0a0a',
    base3: '#1f1f1f',
    base4: '#000000',
    positive: '#00ff00',
    negative: '#ff0055',
    volume: '#ffd700',
    ma4: '#00ff00',
    ma3: '#ffd700',
    ma2: '#00ffff',
    ma1: '#ff00ff'
  },
  moonlight: {
    accent1: '#82aaff',
    accent2: '#c099ff',
    accent3: '#86e1fc',
    accent4: '#82aaff80',
    text1: '#c8d3f5',
    text2: '#a9b8e8',
    text3: '#222222',
    base1: '#1e2030',
    base2: '#222436',
    base3: '#2f334d',
    base4: '#191a2a',
    positive: '#c3e88d',
    negative: '#ff757f',
    volume: '#ffc777',
    ma4: '#c3e88d',
    ma3: '#ffc777',
    ma2: '#82aaff',
    ma1: '#c099ff'
  },
  nightfox: {
    accent1: '#719cd6',
    accent2: '#9d79d6',
    accent3: '#81b29a',
    accent4: '#719cd680',
    text1: '#cdcecf',
    text2: '#aeafb0',
    text3: '#222222',
    base1: '#192330',
    base2: '#212e3f',
    base3: '#29394f',
    base4: '#131a24',
    positive: '#81b29a',
    negative: '#c94f6d',
    volume: '#dbc074',
    ma4: '#81b29a',
    ma3: '#dbc074',
    ma2: '#719cd6',
    ma1: '#9d79d6'
  },
  spacemacs: {
    accent1: '#4f97d7',
    accent2: '#a45bad',
    accent3: '#67b11d',
    accent4: '#4f97d780',
    text1: '#b2b2b2',
    text2: '#a3a3a3',
    text3: '#222222',
    base1: '#292b2e',
    base2: '#212026',
    base3: '#5d4d7a',
    base4: '#1f2022',
    positive: '#67b11d',
    negative: '#f2241f',
    volume: '#b1951d',
    ma4: '#67b11d',
    ma3: '#b1951d',
    ma2: '#4f97d7',
    ma1: '#a45bad'
  },
  borland: {
    accent1: '#ffff54',
    accent2: '#00ffff',
    accent3: '#ffa0a0',
    accent4: '#ffff5480',
    text1: '#ffffff',
    text2: '#ffff54',
    text3: '#222222',
    base1: '#0000aa',
    base2: '#000088',
    base3: '#0055aa',
    base4: '#000066',
    positive: '#00ff00',
    negative: '#ff0000',
    volume: '#ffff54',
    ma4: '#00ff00',
    ma3: '#ffff54',
    ma2: '#00ffff',
    ma1: '#ffa0a0'
  },
  amber: {
    accent1: '#ffb000',
    accent2: '#ffd000',
    accent3: '#ff8800',
    accent4: '#ffb00080',
    text1: '#ffb000',
    text2: '#ffc000',
    text3: '#222222',
    base1: '#2c1700',
    base2: '#402200',
    base3: '#543000',
    base4: '#1e1000',
    positive: '#96ff00',
    negative: '#ff3300',
    volume: '#ffb000',
    ma4: '#96ff00',
    ma3: '#ffb000',
    ma2: '#ffd000',
    ma1: '#ff8800'
  },
  cyberpunk: {
    accent1: '#f3e600',
    accent2: '#ff0055',
    accent3: '#0abdc6',
    accent4: '#f3e60080',
    text1: '#ffffff',
    text2: '#f3e600',
    text3: '#222222',
    base1: '#1a1a2e',
    base2: '#16213e',
    base3: '#0f3460',
    base4: '#0f0f1f',
    positive: '#00ff9f',
    negative: '#ff0055',
    volume: '#0abdc6',
    ma4: '#00ff9f',
    ma3: '#f3e600',
    ma2: '#0abdc6',
    ma1: '#ff0055'
  },
  matrix: {
    accent1: '#00ff41',
    accent2: '#008f11',
    accent3: '#003b00',
    accent4: '#00ff4180',
    text1: '#00ff41',
    text2: '#00dd00',
    text3: '#1b1b1b',
    base1: '#000000',
    base2: '#001100',
    base3: '#002200',
    base4: '#000800',
    positive: '#00ff41',
    negative: '#ff0000',
    volume: '#ffff00',
    ma4: '#00ff41',
    ma3: '#ffff00',
    ma2: '#00dd00',
    ma1: '#00bb00'
  },
  sunset: {
    accent1: '#ff9e64',
    accent2: '#ff7b72',
    accent3: '#ffa8a8',
    accent4: '#ff9e6480',
    text1: '#e4e4e4',
    text2: '#c0c0c0',
    text3: '#222222',
    base1: '#1c1c1c',
    base2: '#2c2c2c',
    base3: '#3c3c3c',
    base4: '#0c0c0c',
    positive: '#7eca9c',
    negative: '#ff7b72',
    volume: '#ff9e64',
    ma4: '#7eca9c',
    ma3: '#ff9e64',
    ma2: '#79c0ff',
    ma1: '#ffa8a8'
  },
  'deep-ocean': {
    accent1: '#84ffff',
    accent2: '#80cbc4',
    accent3: '#80deea',
    accent4: '#84ffff80',
    text1: '#eeffff',
    text2: '#c3e1ea',
    text3: '#1b1b1b',
    base1: '#0f111a',
    base2: '#1f2233',
    base3: '#2c3043',
    base4: '#090b10',
    positive: '#c3e88d',
    negative: '#f07178',
    volume: '#ffcb6b',
    ma4: '#c3e88d',
    ma3: '#ffcb6b',
    ma2: '#82aaff',
    ma1: '#c792ea'
  },
  gotham: {
    accent1: '#599cab',
    accent2: '#98d1ce',
    accent3: '#d3ebe9',
    accent4: '#599cab80',
    text1: '#d3ebe9',
    text2: '#98d1ce',
    text3: '#222222',
    base1: '#0c1014',
    base2: '#11151c',
    base3: '#091f2e',
    base4: '#0a0f14',
    positive: '#33859e',
    negative: '#c23127',
    volume: '#edb443',
    ma4: '#33859e',
    ma3: '#edb443',
    ma2: '#599cab',
    ma1: '#d26937'
  },
  retro: {
    accent1: '#ff8080',
    accent2: '#97d7d9',
    accent3: '#ffd700',
    accent4: '#ff808080',
    text1: '#f0e3ca',
    text2: '#d9c8a9',
    text3: '#222222',
    base1: '#2c2b2a',
    base2: '#3c3b3a',
    base3: '#4c4b4a',
    base4: '#1c1b1a',
    positive: '#a7d84b',
    negative: '#ff6961',
    volume: '#ffd700',
    ma4: '#a7d84b',
    ma3: '#ffd700',
    ma2: '#97d7d9',
    ma1: '#ff8080'
  },
  spotify: {
    accent1: '#1db954',
    accent2: '#1ed760',
    accent3: '#1fdf64',
    accent4: '#1db95480',
    text1: '#ffffff',
    text2: '#b3b3b3',
    text3: '#222222',
    base1: '#121212',
    base2: '#181818',
    base3: '#282828',
    base4: '#070707',
    positive: '#1db954',
    negative: '#ff6961',
    volume: '#ffca81',
    ma4: '#1db954',
    ma3: '#ffca81',
    ma2: '#3ec6ff',
    ma1: '#d14fff'
  },
  autumn: {
    accent1: '#d08770',
    accent2: '#ebcb8b',
    accent3: '#a3be8c',
    accent4: '#d0877080',
    text1: '#d8dee9',
    text2: '#e5e9f0',
    text3: '#222222',
    base1: '#2e2a24',
    base2: '#3e3a34',
    base3: '#4e4a44',
    base4: '#1e1a14',
    positive: '#a3be8c',
    negative: '#bf616a',
    volume: '#ebcb8b',
    ma4: '#a3be8c',
    ma3: '#ebcb8b',
    ma2: '#8fbcbb',
    ma1: '#b48ead'
  },
  noctis: {
    accent1: '#7dcfff',
    accent2: '#5bd9b5',
    accent3: '#ff9d76',
    accent4: '#7dcfff80',
    text1: '#d3e8f8',
    text2: '#a1b7d6',
    text3: '#222222',
    base1: '#1c2431',
    base2: '#263041',
    base3: '#323c4d',
    base4: '#121a24',
    positive: '#5bd9b5',
    negative: '#ff5458',
    volume: '#ff9d76',
    ma4: '#5bd9b5',
    ma3: '#ff9d76',
    ma2: '#7dcfff',
    ma1: '#c79dff'
  },
  iceberg: {
    accent1: '#84a0c6',
    accent2: '#89b8c2',
    accent3: '#adcbbc',
    accent4: '#84a0c680',
    text1: '#c6c8d1',
    text2: '#a5b0c5',
    text3: '#222222',
    base1: '#161821',
    base2: '#1e2132',
    base3: '#262a3f',
    base4: '#0f1017',
    positive: '#b4be82',
    negative: '#e27878',
    volume: '#e2a478',
    ma4: '#b4be82',
    ma3: '#e2a478',
    ma2: '#84a0c6',
    ma1: '#a093c7'
  },
  tango: {
    accent1: '#729fcf',
    accent2: '#ad7fa8',
    accent3: '#8ae234',
    accent4: '#729fcf80',
    text1: '#d3d7cf',
    text2: '#babdb6',
    text3: '#222222',
    base1: '#2e3436',
    base2: '#3f4446',
    base3: '#555753',
    base4: '#1f2426',
    positive: '#8ae234',
    negative: '#ef2929',
    volume: '#fce94f',
    ma4: '#8ae234',
    ma3: '#fce94f',
    ma2: '#729fcf',
    ma1: '#ad7fa8'
  },
  horizon: {
    accent1: '#da103f',
    accent2: '#f6661e',
    accent3: '#fbe0dc',
    accent4: '#da103f80',
    text1: '#fdf0ed',
    text2: '#fadad1',
    text3: '#222222',
    base1: '#1c1e26',
    base2: '#232530',
    base3: '#2e303e',
    base4: '#16161c',
    positive: '#09f7a0',
    negative: '#e95678',
    volume: '#fab795',
    ma4: '#09f7a0',
    ma3: '#fab795',
    ma2: '#21bfc2',
    ma1: '#b877db'
  },
  railscasts: {
    accent1: '#6d9cbe',
    accent2: '#da4939',
    accent3: '#a5c261',
    accent4: '#6d9cbe80',
    text1: '#e6e1dc',
    text2: '#d0d0ff',
    text3: '#222222',
    base1: '#2b2b2b',
    base2: '#333333',
    base3: '#535353',
    base4: '#1c1c1c',
    positive: '#a5c261',
    negative: '#da4939',
    volume: '#ffc66d',
    ma4: '#a5c261',
    ma3: '#ffc66d',
    ma2: '#6d9cbe',
    ma1: '#b6b3eb'
  },
  'vscode-dark': {
    accent1: '#0078d4',
    accent2: '#3794ff',
    accent3: '#5bb3fd',
    accent4: '#0078d480',
    text1: '#d4d4d4',
    text2: '#9cdcfe',
    text3: '#222222',
    base1: '#1e1e1e',
    base2: '#252526',
    base3: '#333333',
    base4: '#141414',
    positive: '#6a9955',
    negative: '#f85149',
    volume: '#dcdcaa',
    ma4: '#6a9955',
    ma3: '#dcdcaa',
    ma2: '#4fc1ff',
    ma1: '#c586c0'
  },
  'slack-dark': {
    accent1: '#2eb67d',
    accent2: '#e01e5a',
    accent3: '#ecb22e',
    accent4: '#2eb67d80',
    text1: '#e6e6e6',
    text2: '#d1d2d3',
    text3: '#222222',
    base1: '#1a1d21',
    base2: '#222529',
    base3: '#363a3f',
    base4: '#0b0c0d',
    positive: '#2eb67d',
    negative: '#e01e5a',
    volume: '#ecb22e',
    ma4: '#2eb67d',
    ma3: '#ecb22e',
    ma2: '#36c5f0',
    ma1: '#e01e5a'
  },
  mintty: {
    accent1: '#3e999f',
    accent2: '#d33682',
    accent3: '#2aa198',
    accent4: '#3e999f80',
    text1: '#c0c0c0',
    text2: '#a0a0a0',
    text3: '#222222',
    base1: '#000000',
    base2: '#1c1c1c',
    base3: '#383838',
    base4: '#000000',
    positive: '#26a269',
    negative: '#e01b24',
    volume: '#e9ad0c',
    ma4: '#26a269',
    ma3: '#e9ad0c',
    ma2: '#2a7bde',
    ma1: '#c061cb'
  },
  'atom-one': {
    accent1: '#4d78cc',
    accent2: '#61afef',
    accent3: '#56b6c2',
    accent4: '#4d78cc80',
    text1: '#abb2bf',
    text2: '#9da5b4',
    text3: '#222222',
    base1: '#282c34',
    base2: '#2c313a',
    base3: '#3b4048',
    base4: '#21252b',
    positive: '#98c379',
    negative: '#e06c75',
    volume: '#e5c07b',
    ma4: '#98c379',
    ma3: '#e5c07b',
    ma2: '#56b6c2',
    ma1: '#c678dd'
  },
  jellybeans: {
    accent1: '#8197bf',
    accent2: '#fad07a',
    accent3: '#8fbfdc',
    accent4: '#8197bf80',
    text1: '#e8e8d3',
    text2: '#b0b08a',
    text3: '#222222',
    base1: '#151515',
    base2: '#1c1c1c',
    base3: '#3b3b3b',
    base4: '#101010',
    positive: '#99ad6a',
    negative: '#cf6a4c',
    volume: '#fad07a',
    ma4: '#99ad6a',
    ma3: '#fad07a',
    ma2: '#8fbfdc',
    ma1: '#c6b6ee'
  },
  falcon: {
    accent1: '#ff875f',
    accent2: '#d7875f',
    accent3: '#87afff',
    accent4: '#ff875f80',
    text1: '#d8d8d8',
    text2: '#b2b2b2',
    text3: '#222222',
    base1: '#020221',
    base2: '#0a0a2a',
    base3: '#161636',
    base4: '#000018',
    positive: '#87d75f',
    negative: '#ff5f5f',
    volume: '#ffd75f',
    ma4: '#87d75f',
    ma3: '#ffd75f',
    ma2: '#87afff',
    ma1: '#d787ff'
  },
  'forest-night': {
    accent1: '#89b482',
    accent2: '#7fbbb3',
    accent3: '#a7c080',
    accent4: '#89b48280',
    text1: '#d3c6aa',
    text2: '#b2a68d',
    text3: '#222222',
    base1: '#272e33',
    base2: '#323c41',
    base3: '#3d4a41',
    base4: '#1e2326',
    positive: '#a7c080',
    negative: '#e67e80',
    volume: '#dbbc7f',
    ma4: '#a7c080',
    ma3: '#dbbc7f',
    ma2: '#7fbbb3',
    ma1: '#d699b6'
  },
  'light-owl': {
    accent1: '#7e57c2',
    accent2: '#2aa298',
    accent3: '#1778aa',
    accent4: '#7e57c280',
    text1: '#403f53',
    text2: '#674494',
    text3: '#ffffff',
    base1: '#fbfbfb',
    base2: '#f0f0f0',
    base3: '#d9d9d9',
    base4: '#ffffff',
    positive: '#007e33',
    negative: '#d1242f',
    volume: '#e09142',
    ma4: '#007e33',
    ma3: '#e09142',
    ma2: '#1778aa',
    ma1: '#7e57c2'
  }
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
.themes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 20px;
  background-color: var(--base1);
  border-radius: 12px;
}

.theme-card {
  background-color: var(--base2);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 2px solid transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.theme-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
  background-color: var(--base3);
}

.theme-card.active {
  border-color: var(--accent1);
  box-shadow: 0 0 20px rgba(var(--accent1), 0.3);
}

.theme-name {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text1);
  margin-bottom: 8px;
  text-transform: capitalize;
}

.color-previews {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 100%;
}

.color-sphere {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid var(--base3);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.color-sphere:hover {
  transform: scale(1.2);
}

</style>