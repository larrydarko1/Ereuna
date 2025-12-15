<template>
  <div :class="[showRSscoreModel ? 'param-card-expanded' : 'param-card']">
    <div class="header">
      <div class="title-section">
        <span class="title">{{ t('params.technicalScore') }}</span>
        <svg class="info-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
          @mouseover="handleMouseOver($event, 'rs')" @mouseout="handleMouseOut($event)" aria-label="Show info about Technical Score">
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
        <input type="checkbox" id="price-check" v-model="showRSscoreModel" aria-label="Toggle Technical Score inputs">
        <span class="slider"></span>
      </label>
    </div>
    
    <div class="content" v-if="showRSscoreModel">
      <div class="score-sections">
        <div class="score-section">
          <h4 class="section-title">{{ t('params.technicalScore1W') }}</h4>
          <div class="input-group">
            <div class="input-wrapper">
              <label class="input-label">{{ t('params.min') }}</label>
              <input class="input-field" type="number" placeholder="1" id="RSscore1Winput1" min="1" max="100" aria-label="Technical Score 1W min">
            </div>
            <div class="input-wrapper">
              <label class="input-label">{{ t('params.max') }}</label>
              <input class="input-field" type="number" placeholder="100" id="RSscore1Winput2" min="1" max="100" aria-label="Technical Score 1W max">
            </div>
          </div>
        </div>
        
        <div class="score-section">
          <h4 class="section-title">{{ t('params.technicalScore1M') }}</h4>
          <div class="input-group">
            <div class="input-wrapper">
              <label class="input-label">{{ t('params.min') }}</label>
              <input class="input-field" type="number" placeholder="1" id="RSscore1Minput1" min="1" max="100" aria-label="Technical Score 1M min">
            </div>
            <div class="input-wrapper">
              <label class="input-label">{{ t('params.max') }}</label>
              <input class="input-field" type="number" placeholder="100" id="RSscore1Minput2" min="1" max="100" aria-label="Technical Score 1M max">
            </div>
          </div>
        </div>
        
        <div class="score-section">
          <h4 class="section-title">{{ t('params.technicalScore4M') }}</h4>
          <div class="input-group">
            <div class="input-wrapper">
              <label class="input-label">{{ t('params.min') }}</label>
              <input class="input-field" type="number" placeholder="1" id="RSscore4Minput1" min="1" max="100" aria-label="Technical Score 4M min">
            </div>
            <div class="input-wrapper">
              <label class="input-label">{{ t('params.max') }}</label>
              <input class="input-field" type="number" placeholder="100" id="RSscore4Minput2" min="1" max="100" aria-label="Technical Score 4M max">
            </div>
          </div>
        </div>
      </div>
      
      <div class="actions">
        <button class="btn btn-secondary" @click="emit('reset'); emit('update:showRSscore', false)" aria-label="Reset Technical Score">
          {{ t('params.reset') }}
        </button>
        <button class="btn btn-primary" @click="SetRSscore()" aria-label="Set Technical Score">
          {{ t('params.apply') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const emit = defineEmits(['fetchScreeners', 'handleMouseOver', 'handleMouseOut', 'reset', 'notify', 'update:showRSscore']);

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
  showRSscore: { type: Boolean, required: true }
});

// Computed getter/setter for v-model
const showRSscoreModel = computed({
  get: () => props.showRSscore,
  set: (val: boolean) => emit('update:showRSscore', val)
});

// updates screener value with RS Score parameters
async function SetRSscore() {
  try {
    if (!props.selectedScreener) {
      emit('notify', t('params.errorSelectScreener'));
      throw new Error(t('params.errorSelectScreener'));
    }

    function getInputValue(id: string): number {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (!el) return NaN;
      return parseFloat(el.value);
    }

    const value1 = getInputValue('RSscore1Minput1');
    const value2 = getInputValue('RSscore1Minput2');
    const value3 = getInputValue('RSscore4Minput1');
    const value4 = getInputValue('RSscore4Minput2');
    const value5 = getInputValue('RSscore1Winput1');
    const value6 = getInputValue('RSscore1Winput2');

    const response = await fetch('/api/screener/rs-score', {
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
        value5,
        value6,
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
      throw new Error('Error updating range');
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

/* Score Sections */
.score-sections {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.score-section {
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
