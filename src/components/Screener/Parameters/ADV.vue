<template>
  <div :class="[showADVModel ? 'param-card-expanded' : 'param-card']">
    <div class="header">
      <div class="title-section">
        <span class="title">Average Daily Volatility (ADV)</span>
        <svg class="info-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
          @mouseover="handleMouseOver($event, 'adv')" @mouseout="handleMouseOut($event)" aria-label="Show info for ADV parameter">
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
        <input type="checkbox" id="price-check" v-model="showADVModel" aria-label="Toggle ADV filter">
        <span class="slider"></span>
      </label>
    </div>
    
    <div class="content" v-if="showADVModel">
      <div class="adv-sections">
        <div class="adv-section">
          <h4 class="section-title">ADV (1W)</h4>
          <div class="input-group">
            <div class="input-wrapper">
              <label class="input-label">Min (%)</label>
              <input class="input-field" type="number" step="0.01" placeholder="0.00" id="ADV1Winput1" aria-label="ADV 1W minimum">
            </div>
            <div class="input-wrapper">
              <label class="input-label">Max (%)</label>
              <input class="input-field" type="number" step="0.01" placeholder="0.00" id="ADV1Winput2" aria-label="ADV 1W maximum">
            </div>
          </div>
        </div>
        
        <div class="adv-section">
          <h4 class="section-title">ADV (1M)</h4>
          <div class="input-group">
            <div class="input-wrapper">
              <label class="input-label">Min (%)</label>
              <input class="input-field" type="number" step="0.01" placeholder="0.00" id="ADV1Minput1" aria-label="ADV 1M minimum">
            </div>
            <div class="input-wrapper">
              <label class="input-label">Max (%)</label>
              <input class="input-field" type="number" step="0.01" placeholder="0.00" id="ADV1Minput2" aria-label="ADV 1M maximum">
            </div>
          </div>
        </div>
        
        <div class="adv-section">
          <h4 class="section-title">ADV (4M)</h4>
          <div class="input-group">
            <div class="input-wrapper">
              <label class="input-label">Min (%)</label>
              <input class="input-field" type="number" step="0.01" placeholder="0.00" id="ADV4Minput1" aria-label="ADV 4M minimum">
            </div>
            <div class="input-wrapper">
              <label class="input-label">Max (%)</label>
              <input class="input-field" type="number" step="0.01" placeholder="0.00" id="ADV4Minput2" aria-label="ADV 4M maximum">
            </div>
          </div>
        </div>
        
        <div class="adv-section">
          <h4 class="section-title">ADV (1Y)</h4>
          <div class="input-group">
            <div class="input-wrapper">
              <label class="input-label">Min (%)</label>
              <input class="input-field" type="number" step="0.01" placeholder="0.00" id="ADV1Yinput1" aria-label="ADV 1Y minimum">
            </div>
            <div class="input-wrapper">
              <label class="input-label">Max (%)</label>
              <input class="input-field" type="number" step="0.01" placeholder="0.00" id="ADV1Yinput2" aria-label="ADV 1Y maximum">
            </div>
          </div>
        </div>
      </div>
      
      <div class="actions">
        <button class="btn btn-secondary" @click="emit('reset'); emit('update:showADV', false)" aria-label="Reset ADV filter">
          Reset
        </button>
        <button class="btn btn-primary" @click="SetADV()" aria-label="Set ADV filter">
          Apply
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed } from 'vue';

const emit = defineEmits(['fetchScreeners', 'handleMouseOver', 'handleMouseOut', 'reset', 'notify', 'update:showADV']);

function handleMouseOver(event: MouseEvent, type: string) {
  emit('handleMouseOver', event, type);
}

function handleMouseOut(event: MouseEvent) {
  emit('handleMouseOut', event);
}

const props = defineProps<{
  user: string;
  apiKey: string;
  selectedScreener: string;
  isScreenerError: boolean;
  showADV: boolean;
}>();

const isLoading = ref(false);
const error = ref('');

function showNotification(msg: string) {
  emit('notify', msg);
}

// updates screener value with ADV parameters 
async function SetADV() {
  error.value = '';
  if (!props.selectedScreener) {
    emit('reset');
    error.value = 'Please select a screener';
    showNotification(error.value);
    return;
  }
  function getInputValue(id: string): string {
    const el = document.getElementById(id) as HTMLInputElement | null;
    return el ? parseFloat(el.value).toFixed(2) : '0.00';
  }
  const value1 = getInputValue('ADV1Winput1');
  const value2 = getInputValue('ADV1Winput2');
  const value3 = getInputValue('ADV1Minput1');
  const value4 = getInputValue('ADV1Minput2');
  const value5 = getInputValue('ADV4Minput1');
  const value6 = getInputValue('ADV4Minput2');
  const value7 = getInputValue('ADV1Yinput1');
  const value8 = getInputValue('ADV1Yinput2');
  isLoading.value = true;
  try {
    const response = await fetch('/api/screener/adv', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify({
        value1: value1,
        value2: value2,
        value3: value3,
        value4: value4,
        value5: value5,
        value6: value6,
        value7: value7,
        value8: value8,
        screenerName: props.selectedScreener,
        user: props.user
      })
    });
    if (response.status !== 200) {
      const data = await response.json();
      throw new Error(data.message || `Error: ${response.status} ${response.statusText}`);
    }
    emit('fetchScreeners', props.selectedScreener);
  } catch (err) {
    error.value = typeof err === 'object' && err !== null && 'message' in err ? (err as any).message : 'Unknown error';
    showNotification(error.value);
    emit('fetchScreeners', props.selectedScreener);
  } finally {
    isLoading.value = false;
  }
}

// Computed getter/setter for v-model
const showADVModel = computed({
  get: () => props.showADV,
  set: (val: boolean) => emit('update:showADV', val)
});

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

/* ADV Sections */
.adv-sections {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.adv-section {
  border: 1px solid var(--base4);
  border-radius: 4px;
  padding: 8px;
  background-color: var(--base3);
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text1);
  margin: 0 0 6px 0;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* Input Group */
.input-group {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
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
  background-color: var(--base4);
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
  background-color: var(--base2);
}

.input-field:hover:not(:focus) {
  border-color: var(--text2);
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
