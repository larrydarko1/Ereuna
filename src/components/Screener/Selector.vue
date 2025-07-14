<template>
  <div
    id="screener-select"
    class="screener-select-container"
    :class="{ 'screener-error-border': isScreenerError }"
    @mouseenter="openDropdown"
    @mouseleave="closeDropdown"
  >
    <svg class="screener-dropdown-icon" viewBox="0 0 24 24" v-if="!showDropdown">
      <path fill-rule="evenodd" clip-rule="evenodd"
        d="M12.7071 14.7071C12.3166 15.0976 11.6834 15.0976 11.2929 14.7071L6.29289 9.70711C5.90237 9.31658 5.90237 8.68342 6.29289 8.29289C6.68342 7.90237 7.31658 7.90237 7.70711 8.29289L12 12.5858L16.2929 8.29289C16.6834 7.90237 17.3166 7.90237 17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711L12.7071 14.7071Z"
        fill="var(--text1)" />
    </svg>
    <svg class="screener-dropdown-icon" viewBox="0 0 24 24" v-else style="transform: rotate(180deg);">
      <path fill-rule="evenodd" clip-rule="evenodd"
        d="M12.7071 14.7071C12.3166 15.0976 11.6834 15.0976 11.2929 14.7071L6.29289 9.70711C5.90237 9.31658 5.90237 8.68342 6.29289 8.29289C6.68342 7.90237 7.31658 7.90237 7.70711 8.29289L12 12.5858L16.2929 8.29289C16.6834 7.90237 17.3166 7.90237 17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711L12.7071 14.7071Z"
        fill="var(--text1)" />
    </svg>
    <p
      class="screener-selected-value"
      @click.stop="toggleDropdown"
    >
      {{ selectedScreener ? selectedScreener : (ScreenersName.length > 0 ? 'Choose a Screener...' : 'No screeners available.') }}
    </p>
    <div
      class="screener-dropdown-container"
      v-if="ScreenersName.length > 0 && showDropdown"
      @mousedown.stop
      @click.stop
    >
      <div class="screener-wrapper">
        <div v-for="(screener, index) in ScreenersName" :key="index"
          :class="{ 'screener-selected': selectedScreener === screener.Name }" @click="$emit('selectScreener', screener.Name)">
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

<script setup>
import { ref } from 'vue';
const props = defineProps({
  ScreenersName: Array,
  selectedScreener: String,
  isScreenerError: Boolean,
  showDropdown: Boolean,
  getScreenerImage: Function
});
const emit = defineEmits([
  'selectScreener',
  'excludeScreener',
  'deleteScreener',
  'update:showDropdown'
]);

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
  min-width: 280px;
  height: 32px;
  background: var(--base2);
  border: 1.5px solid var(--base2);
  z-index: 1000;
  transition: box-shadow 0.25s, background 0.25s, border 0.25s;
  backdrop-filter: blur(8px) saturate(1.2);
  -webkit-backdrop-filter: blur(8px) saturate(1.2);
  overflow: visible;
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
  width: 100%;
  background: var(--glassbg);
  border-radius: 0 0 18px 18px;
  border: none;
  border-top: none;
  margin-top: 2px;
  padding: 1rem 0 1.1rem 0;
  animation: screener-dropdown-fade 0.22s cubic-bezier(0.4,0,0.2,1);
  backdrop-filter: blur(12px) saturate(1.2);
  -webkit-backdrop-filter: blur(12px) saturate(1.2);
  z-index: 1000;
}
@keyframes screener-dropdown-fade {
  from { opacity: 0; transform: translateY(-12px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.screener-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 14px;
}
.screener-wrapper > div {
  border-radius: 10px;
  padding: 0.6rem 1.4rem 0.6rem 0.9rem;
  font-size: 1.08rem;
  font-weight: 500;
  color: var(--text1);
  display: flex;
  align-items: center;
  transition: background 0.22s, color 0.22s, box-shadow 0.22s, border 0.22s;
  cursor: pointer;
  position: relative;
  padding: 0;
  border: 1.5px solid transparent;
}
.screener-wrapper > div.screener-selected, .screener-wrapper > div:hover {
 background: var(--gradient1);
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
  background: rgba(0,230,216,0.18);
  opacity: 1;
  box-shadow: 0 2px 12px 0 rgba(0,230,216,0.13);
}
.screener-img3 {
  width: 14px;
  height: 14px;
  border: none;
  cursor: pointer;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.13));
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
</style>
