<template>
  <div
    id="screener-select"
    class="screener-select-container"
    :class="{ 'screener-error-border': isScreenerError }"
    @mouseenter="openDropdown"
    @mouseleave="closeDropdown"
    role="combobox"
    :aria-expanded="showDropdown && ScreenersName && ScreenersName.length > 0 ? 'true' : 'false'"
    aria-haspopup="listbox"
    aria-label="Screener selector"
    tabindex="0"
  >
    <svg class="screener-dropdown-icon" viewBox="0 0 24 24" v-if="ScreenersName && ScreenersName.length > 0 && !showDropdown" aria-hidden="true">
      <path fill-rule="evenodd" clip-rule="evenodd"
        d="M12.7071 14.7071C12.3166 15.0976 11.6834 15.0976 11.2929 14.7071L6.29289 9.70711C5.90237 9.31658 5.90237 8.68342 6.29289 8.29289C6.68342 7.90237 7.31658 7.90237 7.70711 8.29289L12 12.5858L16.2929 8.29289C16.6834 7.90237 17.3166 7.90237 17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711L12.7071 14.7071Z"
        fill="var(--text1)" />
    </svg>
  <svg class="screener-dropdown-icon" viewBox="0 0 24 24" v-else-if="ScreenersName && ScreenersName.length > 0" style="transform: rotate(180deg);" aria-hidden="true">
      <path fill-rule="evenodd" clip-rule="evenodd"
        d="M12.7071 14.7071C12.3166 15.0976 11.6834 15.0976 11.2929 14.7071L6.29289 9.70711C5.90237 9.31658 5.90237 8.68342 6.29289 8.29289C6.68342 7.90237 7.31658 7.90237 7.70711 8.29289L12 12.5858L16.2929 8.29289C16.6834 7.90237 17.3166 7.90237 17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711L12.7071 14.7071Z"
        fill="var(--text1)" />
    </svg>
    <p
      class="screener-selected-value"
      :class="{ 'screener-no-screeners': !(ScreenersName && ScreenersName.length > 0) }"
      @click.stop="toggleDropdown"
      role="button"
      aria-label="Selected screener: {{ selectedScreener ? selectedScreener : (ScreenersName && ScreenersName.length > 0 ? 'Choose a Screener...' : 'No screeners available.') }}"
      tabindex="0"
    >
      {{ selectedScreener ? selectedScreener : (ScreenersName && ScreenersName.length > 0 ? 'Choose a Screener...' : 'No screeners available.') }}
    </p>
    <div
      class="screener-dropdown-container"
      v-if="ScreenersName && ScreenersName.length > 0 && showDropdown"
      @mousedown.stop
      @click.stop
      role="listbox"
      aria-label="Screener options"
    >
      <div class="screener-wrapper">
        <div v-for="(screener, index) in ScreenersName" :key="index"
          :class="{ 'screener-selected': selectedScreener === screener.Name }"
          @click="$emit('selectScreener', screener.Name)"
          role="option"
          :aria-selected="selectedScreener === screener.Name ? 'true' : 'false'"
          :aria-label="'Screener: ' + screener.Name"
        >
          <button class="screener-icondlt2">
            <span class="screener-img3" v-html="getScreenerImage(screener)" @click.stop="$emit('excludeScreener', screener.Name)"
              v-b-tooltip.hover title="Toggle This Screener's Inclusion" alt="toggle screener"></span>
          </button>
          {{ screener.Name }}
          <button class="screener-icondlt" @click.stop="$emit('deleteScreener', screener.Name)" v-b-tooltip.hover
            title="Delete This Screener">
            <svg class="screener-img2" viewBox="0 0 16 16" fill="var(--text1)">
              <rect transform="rotate(45)" y="-1" x="4.3137083" height="2" width="14" style="fill:var(--text1);" />
              <rect transform="rotate(-45)" y="10.313708" x="-7" height="2" width="14" style="fill:var(--text1);" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Screener {
  Name: string;
  Include: boolean;
}

const props = defineProps<{
  ScreenersName?: Screener[];
  selectedScreener?: string;
  isScreenerError?: boolean;
  showDropdown?: boolean;
}>();

const emit = defineEmits([
  'selectScreener',
  'excludeScreener',
  'deleteScreener',
  'update:showDropdown'
]);


function getScreenerImage(screener: Screener): string {
  const includeSvg = `
    <svg height=30 width=30 fill="var(--text1)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
      <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
      <g id="SVGRepo_iconCarrier">
        <path d="M9 9h6v6H9z"></path>
        <path d="M19 17V7c0-1.103-.897-2-2-2H7c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h10c1.103 0 2-.897 2-2zM7 7h10l.002 10H7V7z"></path>
      </g>
    </svg>
  `;
  const excludeSvg = `
    <svg height=30 width=30 fill="var(--text1)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
      <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
      <g id="SVGRepo_iconCarrier">
        <path d="M7 5c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h10c1.103 0 2-.897 2-2V7c0-1.103-.897-2-2-2H7zm0 12V7h10l.002 10H7z"></path>
      </g>
    </svg>
  `;
  return screener.Include ? includeSvg : excludeSvg;
}


const showDropdown = ref(false);

function openDropdown() {
  showDropdown.value = true;
}
function closeDropdown() {
  showDropdown.value = false;
}
function toggleDropdown() {
  showDropdown.value = !showDropdown.value;
}
</script>

<style scoped>

.screener-select-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 295px;
  height: 32px;
  background: var(--base2);
  border: 1.5px solid var(--base2);
  z-index: 1000;
  transition: box-shadow 0.25s, background 0.25s, border 0.25s;
  backdrop-filter: blur(8px) saturate(1.2);
  -webkit-backdrop-filter: blur(8px) saturate(1.2);
  overflow: visible;
  border-radius: 6px;
}

.screener-dropdown-icon {
  width: 28px;
  height: 28px;
  margin-left: 18px;
  margin-right: 10px;
  flex-shrink: 0;
  opacity: 0.8;
  cursor: pointer;
  transition: opacity 0.22s, filter 0.22s;
}
.screener-dropdown-icon:hover {
  opacity: 1;
}

.screener-selected-value {
  flex: 1;
  text-align: center;
  font-size: 1.18rem;
  margin-right: 40px;
  font-weight: 700;
  color: var(--text1);
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: color 0.22s, background 0.22s, box-shadow 0.22s;
  outline: none;
}

.screener-no-screeners {
  margin-right: 0 !important;
  margin-left: 10px;
  text-align: center;
  justify-content: center;
  display: flex;
}

.screener-icondlt {
  background: none;
  border: none;
  margin-left: auto;
  padding: 0;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.75;
  transition: background 0.18s, opacity 0.18s, box-shadow 0.18s;
  cursor: pointer;
}
.screener-icondlt:hover {
  opacity: 1;
}
.screener-img2 {
  width: 19px;
  height: 19px;
  vertical-align: middle;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.13));
}


  .screener-dropdown-container {
    position: absolute;
    top: 100%;
    left: 0;
    width: 180px;
    min-width: 100%;
    max-height: 230px;
    overflow-y: auto;
    background: var(--base4);
    border-radius: 0 0 8px 8px;
    border: none;
    margin-top: 2px;
    padding: 4px 0 6px 0;
    box-shadow: 0 2px 12px 0 rgba(0,0,0,0.10);
    z-index: 1000;
    display: block;
    animation: screener-dropdown-fade 0.18s cubic-bezier(0.4,0,0.2,1);
  }
@keyframes screener-dropdown-fade {
  from { opacity: 0; transform: translateY(-8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}


.screener-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 6px;
}
.screener-wrapper > div {
  border-radius: 5px;
  padding: 7px 12px 7px 6px;
  font-size: 1.05rem;
  font-weight: 500;
  color: var(--text1);
  display: flex;
  align-items: center;
  transition: background 0.18s, color 0.18s;
  cursor: pointer;
  position: relative;
  border: none;
  background: var(--base4);
}
.screener-wrapper > div.screener-selected {
  background: var(--accent4);
  color: var(--text1);
}
.screener-wrapper > div:hover {
  background: var(--base2);
  color: var(--accent3);
}

.screener-icondlt2 {
  background: none;
  border: none;
  margin-right: 8px;
  padding: 0;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.75;
  transition: background 0.18s, opacity 0.18s, box-shadow 0.18s;
  cursor: pointer;
  box-shadow: 0 1.5px 8px 0 rgba(0,230,216,0.04);
}
.screener-icondlt2:hover {
  background: var(--base2);
  opacity: 1;
}
.screener-img3 {
  width: 16px;
  height: 16px;
  border: none;
  cursor: pointer;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.13));
  display: flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
}

.screener-error-border {
  border: 1.5px solid #ff4d4f !important;
  box-shadow: 0 0 16px 4px rgba(255, 77, 79, 0.32);
  animation: screener-pulse 1.5s infinite;
}
@keyframes screener-pulse {
  0% { box-shadow: 0 0 16px 4px rgba(255, 77, 79, 0.32); }
  50% { box-shadow: 0 0 24px 8px rgba(255, 77, 79, 0.45); }
  100% { box-shadow: 0 0 16px 4px rgba(255, 77, 79, 0.32); }
}

@media (max-width: 1150px) {
  .screener-select-container {
    width: 100%;
  }
}

</style>
