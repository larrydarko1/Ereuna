<template>
  <div :class="[showVolumeModel ? 'param-card-expanded' : 'param-card']">
    <div class="header">
      <div class="title-section">
        <span class="title">Volume</span>
        <svg class="info-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
          @mouseover="handleMouseOver($event, 'volume')" @mouseout="handleMouseOut($event)" aria-label="Show info for Volume parameter">
          <path
            d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="M12 18.01L12.01 17.9989" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round"></path>
        </svg>
      </div>
      <label class="switch">
        <input type="checkbox" id="price-check" v-model="showVolumeModel" aria-label="Toggle Volume filter">
        <span class="slider"></span>
      </label>
    </div>
    
    <div class="content" v-if="showVolumeModel">
      <div class="volume-section">
        <div class="section-title">Relative Volume</div>
        <div class="input-group">
          <div class="input-wrapper">
            <label class="input-label">Minimum</label>
            <input class="input-field" id="left-relvol" type="number" step="0.01" placeholder="0.00" aria-label="Relative Volume minimum">
          </div>
          <div class="input-wrapper">
            <label class="input-label">Maximum</label>
            <input class="input-field" id="right-relvol" type="number" step="0.01" placeholder="0.00" aria-label="Relative Volume maximum">
          </div>
          <div class="input-wrapper">
            <label class="input-label">Period</label>
            <div class="dropdown-container">
              <div class="dropdown-btn" @click="toggleRelVolDropdown" aria-label="Select Relative Volume period">
                <span class="selected-value">{{ relVolSelect }}</span>
                <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="dropdown-menu" v-show="relVolDropdownOpen">
                <div v-for="(option, index) in relVolOptions" :key="index" @click="selectRelVolOption(option)" class="dropdown-item">
                  {{ option }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="volume-section">
        <div class="section-title">Average Volume (1000s)</div>
        <div class="input-group">
          <div class="input-wrapper">
            <label class="input-label">Minimum</label>
            <input class="input-field" id="left-avgvol" type="number" step="0.01" placeholder="0.00" aria-label="Average Volume minimum">
          </div>
          <div class="input-wrapper">
            <label class="input-label">Maximum</label>
            <input class="input-field" id="right-avgvol" type="number" step="0.01" placeholder="0.00" aria-label="Average Volume maximum">
          </div>
          <div class="input-wrapper">
            <label class="input-label">Period</label>
            <div class="dropdown-container">
              <div class="dropdown-btn" @click="toggleAvgVolDropdown" aria-label="Select Average Volume period">
                <span class="selected-value">{{ avgVolSelect }}</span>
                <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="dropdown-menu" v-show="avgVolDropdownOpen">
                <div v-for="(option, index) in avgVolOptions" :key="index" @click="selectAvgVolOption(option)" class="dropdown-item">
                  {{ option }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="actions">
        <button class="btn btn-secondary" @click="emit('reset'); emit('update:showVolume', false)" aria-label="Reset Volume filter">
          Reset
        </button>
        <button class="btn btn-primary" @click="SetVolume()" aria-label="Set Volume filter">
          Apply
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const emit = defineEmits(['fetchScreeners', 'handleMouseOver', 'handleMouseOut', 'reset', 'notify', 'update:showVolume']);

function handleMouseOver(event: MouseEvent, type: string) {
  emit('handleMouseOver', event, type);
}

function handleMouseOut(event: MouseEvent) {
  emit('handleMouseOut', event);
}

const props = defineProps({
  user: { type: String, required: true },
  apiKey: { type: String, required: true },
  notification: { type: Object, required: true },
  selectedScreener: { type: String, required: true },
  isScreenerError: { type: Boolean, required: true },
  showVolume: { type: Boolean, required: true }
});

// Computed getter/setter for v-model
const showVolumeModel = computed({
  get: () => props.showVolume,
  set: (val: boolean) => emit('update:showVolume', val)
});

const relVolOptions = ref<string[]>([
  '-',
  '1W',
  '1M',
  '6M',
  '1Y'
]);

const avgVolOptions = ref<string[]>([
  '-',
  '1W',
  '1M',
  '6M',
  '1Y'
]);

const relVolSelect = ref<string>('-');
const avgVolSelect = ref<string>('-');

const relVolDropdownOpen = ref<boolean>(false);
const avgVolDropdownOpen = ref<boolean>(false);

function selectRelVolOption(option: string) {
  relVolSelect.value = option;
  relVolDropdownOpen.value = false;
}

function selectAvgVolOption(option: string) {
  avgVolSelect.value = option;
  avgVolDropdownOpen.value = false;
}

function toggleRelVolDropdown() {
  relVolDropdownOpen.value = !relVolDropdownOpen.value;
  avgVolDropdownOpen.value = false; // Close other dropdown
}

function toggleAvgVolDropdown() {
  avgVolDropdownOpen.value = !avgVolDropdownOpen.value;
  relVolDropdownOpen.value = false; // Close other dropdown
}

// Defensive getter for input values
function getInputValue(id: string): number {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el) return NaN;
  return parseFloat(el.value);
}

// updates screener value with volume parameters
async function SetVolume() {
  try {
    if (!props.selectedScreener) {
      emit('notify', 'Please select a screener');
      throw new Error('Please select a screener');
    }

    const value1 = getInputValue('left-relvol');
    const value2 = getInputValue('right-relvol');
    const value3 = getInputValue('left-avgvol') * 1000;
    const value4 = getInputValue('right-avgvol') * 1000;
    const relVolOption = relVolSelect.value;
    const avgVolOption = avgVolSelect.value;

    const response = await fetch('/api/screener/volume', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify({
        value1,
        value2,
        value3,
        value4,
        relVolOption,
        avgVolOption,
        screenerName: props.selectedScreener,
        user: props.user
      })
    });
    if (response.status !== 200) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data && data.message && data.message.toLowerCase().includes('updated')) {
      emit('fetchScreeners', props.selectedScreener);
    } else {
      throw new Error('Error updating price range');
    }
  } catch (error: unknown) {
    let message = 'Unknown error';
    if (typeof error === 'object' && error !== null && 'message' in error) {
      message = (error as { message: string }).message;
    } else if (typeof error === 'string') {
      message = error;
    }
    emit('notify', message);
    emit('fetchScreeners', props.selectedScreener);
  }
}

</script>

<style scoped>
/* Card Container */
.param-card {
  background-color: var(--base2);
  border-radius: 6px;
  padding: 8px 10px;
  margin: 4px 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.param-card:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  border-color: var(--base3);
}

.param-card-expanded {
  background-color: var(--base2);
  border-radius: 6px;
  padding: 8px 10px;
  margin: 4px 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  border: 1px solid var(--base3);
}

/* Header Section */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 6px;
}

.title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text1);
  letter-spacing: 0.01em;
  background-color: transparent;
}

.info-icon {
  width: 14px;
  height: 14px;
  color: var(--text2);
  cursor: pointer;
  transition: color 0.2s ease;
}

.info-icon:hover {
  color: var(--text1);
}

/* Toggle Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 34px;
  height: 18px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--base3);
  transition: 0.2s;
  border-radius: 18px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 12px;
  width: 12px;
  left: 3px;
  bottom: 3px;
  background-color: var(--text2);
  transition: 0.2s;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

input:checked + .slider {
  background-color: var(--accent1);
}

input:checked + .slider:before {
  transform: translateX(16px);
  background-color: var(--text3);
}

/* Content Section */
.content {
  margin-top: 10px;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Volume Sections */
.volume-section {
  margin-bottom: 12px;
}

.volume-section:last-child {
  margin-bottom: 8px;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text2);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 6px;
}

/* Input Group */
.input-group {
  display: flex;
  gap: 6px;
  align-items: end;
}

.input-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.input-label {
  font-size: 10px;
  font-weight: 500;
  color: var(--text2);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.input-field {
  width: 100%;
  padding: 6px 8px;
  font-size: 12px;
  color: var(--text1);
  background-color: var(--base3);
  border: 1px solid var(--base4);
  border-radius: 4px;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.input-field::placeholder {
  color: var(--text2);
  opacity: 0.6;
}

.input-field:focus {
  background-color: var(--base4);
}

.input-field:hover:not(:focus) {
  border-color: var(--text2);
}

/* Dropdown */
.dropdown-container {
  position: relative;
}

.dropdown-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  font-size: 12px;
  color: var(--text1);
  background-color: var(--base3);
  border: 1px solid var(--base4);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 60px;
}

.dropdown-btn:hover {
  background-color: var(--base4);
  border-color: var(--text2);
}

.dropdown-arrow {
  width: 12px;
  height: 12px;
  color: var(--text2);
  transition: transform 0.2s ease;
}

.dropdown-container:hover .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--base2);
  border: 1px solid var(--base4);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  margin-top: 2px;
}

.dropdown-item {
  padding: 6px 8px;
  font-size: 12px;
  color: var(--text1);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.dropdown-item:hover {
  background-color: var(--base3);
}

/* Actions */
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.btn {
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 500;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.01em;
}

.btn-secondary {
  background-color: var(--base3);
  color: var(--text2);
  font-weight: 600;
}

.btn-secondary:hover {
  background-color: var(--base4);
  color: var(--text1);
}

.btn-secondary:active {
  transform: scale(0.98);
}

.btn-primary {
  background-color: var(--accent1);
  color: var(--text3);
  font-weight: 600;
}

.btn-primary:hover {
  opacity: 0.9;
  box-shadow: 0 1px 4px rgba(var(--accent1-rgb, 59, 130, 246), 0.3);
}

.btn-primary:active {
  transform: scale(0.98);
}
</style>
