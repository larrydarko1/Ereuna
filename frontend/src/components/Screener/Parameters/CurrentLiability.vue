<template>
  <div :class="[showCurrentLiabilitiesModel ? 'param-card-expanded' : 'param-card']">
    <div class="header">
      <div class="title-section">
        <span class="title">{{ t('params.currentLiabilities') }}</span>
        <svg class="info-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
          @mouseover="handleMouseOver($event, 'current-liabilities')" @mouseout="handleMouseOut" aria-label="Show info for Current Liabilities parameter">
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
        <input type="checkbox" id="current-liabilities-check" v-model="showCurrentLiabilitiesModel" aria-label="Toggle Current Liabilities filter">
        <span class="slider"></span>
      </label>
    </div>
    
    <div class="content" v-if="showCurrentLiabilitiesModel">
      <div class="input-group">
        <div class="input-wrapper">
          <label class="input-label">Minimum</label>
          <input class="input-field" id="left-cl" type="number" step="0.01" placeholder="0.00" aria-label="Current Liabilities minimum">
        </div>
        <div class="input-wrapper">
          <label class="input-label">Maximum</label>
          <input class="input-field" id="right-cl" type="number" step="0.01" placeholder="0.00" aria-label="Current Liabilities maximum">
        </div>
      </div>
      
      <div class="actions">
        <button class="btn btn-secondary" @click="emit('reset'); emit('update:showCurrentLiabilities', false)" aria-label="Reset Current Liabilities filter">
          Reset
        </button>
        <button class="btn btn-primary" @click="SetCurrentLiabilities()" aria-label="Set Current Liabilities filter">
          Apply
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const emit = defineEmits(['fetchScreeners', 'handleMouseOver', 'handleMouseOut', 'reset', 'notify', 'update:showCurrentLiabilities']);
function handleMouseOver(event: MouseEvent, type: string) {
  emit('handleMouseOver', event, type);
}

function handleMouseOut(event: MouseEvent) {
  emit('handleMouseOut', event);
}

const props = defineProps({
  user: { type: String, required: true },
  apiKey: { type: String, required: true },
  selectedScreener: { type: String, required: true },
  isScreenerError: { type: Boolean, required: true },
  showCurrentLiabilities: { type: Boolean, required: true }
});

const error = ref('');
const isLoading = ref(false);

function showNotification(msg: string) {
  emit('notify', msg);
}

// Computed getter/setter for v-model
const showCurrentLiabilitiesModel = computed({
  get: () => props.showCurrentLiabilities,
  set: (val: boolean) => emit('update:showCurrentLiabilities', val)
});

// add and or modifies current liabilities value and sends it
async function SetCurrentLiabilities() {
  error.value = '';
  if (!props.selectedScreener) {
    emit('reset');
    error.value = t('params.errorSelectScreener');
    showNotification(error.value);
    emit('fetchScreeners', props.selectedScreener);
    return;
  }
  const leftInput = document.getElementById('left-cl') as HTMLInputElement | null;
  const rightInput = document.getElementById('right-cl') as HTMLInputElement | null;
  if (!leftInput || !rightInput) {
    error.value = t('params.errorInputNotFound');
    showNotification(error.value);
    emit('fetchScreeners', props.selectedScreener);
    return;
  }
  const leftValue = leftInput.value.trim();
  const rightValue = rightInput.value.trim();
  const leftLiabilities = leftValue === '' ? null : parseFloat(leftValue);
  const rightLiabilities = rightValue === '' ? null : parseFloat(rightValue);
  // If both missing or both invalid, error
  if ((leftLiabilities === null && rightLiabilities === null) ||
      (leftLiabilities !== null && isNaN(leftLiabilities) && rightLiabilities !== null && isNaN(rightLiabilities))) {
    error.value = t('params.errorEnterNumber');
    showNotification(error.value);
    emit('fetchScreeners', props.selectedScreener);
    return;
  }
  // If only one is present, allow it (backend will fill missing)
  // If both are present, validate order
  if (leftLiabilities !== null && !isNaN(leftLiabilities) && rightLiabilities !== null && !isNaN(rightLiabilities)) {
    if (leftLiabilities >= rightLiabilities) {
      error.value = t('params.errorMinMaxCurrentLiabilities');
      showNotification(error.value);
      emit('fetchScreeners', props.selectedScreener);
      return;
    }
  }
  isLoading.value = true;
  try {
    const response = await fetch('/api/screener/current-liabilities', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify({
        minPrice: leftLiabilities,
        maxPrice: rightLiabilities,
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

/* Input Group */
.input-group {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
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