<template>
  <div :class="[showFundYoYQoQModel ? 'param-card-expanded' : 'param-card']">
    <div class="header">
      <div class="title-section">
        <span class="title">{{ t('params.revenueEarningsEpsGrowth') }}</span>
        <svg class="info-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
          @mouseover="handleMouseOver($event, 'growth')" @mouseout="handleMouseOut($event)" aria-label="Show info about Revenue / Earnings / EPS Growth">
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
        <input type="checkbox" id="growth-check" v-model="showFundYoYQoQModel" aria-label="Toggle Revenue / Earnings / EPS Growth inputs">
        <span class="slider"></span>
      </label>
    </div>
    
    <div class="content" v-if="showFundYoYQoQModel">
      <div class="growth-sections">
        <div class="growth-section">
          <h4 class="section-title">{{ t('params.revenueGrowth') }}</h4>
          <div class="input-group">
            <div class="input-wrapper">
              <label class="input-label">{{ t('params.yoyMin') }}</label>
              <input class="input-field" id="left-RevYoY" type="number" step="0.01" placeholder="0.00" aria-label="Revenue Growth YoY min">
            </div>
            <div class="input-wrapper">
              <label class="input-label">{{ t('params.yoyMax') }}</label>
              <input class="input-field" id="right-RevYoY" type="number" step="0.01" placeholder="0.00" aria-label="Revenue Growth YoY max">
            </div>
          </div>
          <div class="input-group">
            <div class="input-wrapper">
              <label class="input-label">{{ t('params.qoqMin') }}</label>
              <input class="input-field" id="left-RevQoQ" type="number" step="0.01" placeholder="0.00" aria-label="Revenue Growth QoQ min">
            </div>
            <div class="input-wrapper">
              <label class="input-label">{{ t('params.qoqMax') }}</label>
              <input class="input-field" id="right-RevQoQ" type="number" step="0.01" placeholder="0.00" aria-label="Revenue Growth QoQ max">
            </div>
          </div>
        </div>
        
        <div class="growth-section">
          <h4 class="section-title">{{ t('params.earningsGrowth') }}</h4>
          <div class="input-group">
            <div class="input-wrapper">
              <label class="input-label">{{ t('params.yoyMin') }}</label>
              <input class="input-field" id="left-EarningsYoY" type="number" step="0.01" placeholder="0.00" aria-label="Earnings Growth YoY min">
            </div>
            <div class="input-wrapper">
              <label class="input-label">{{ t('params.yoyMax') }}</label>
              <input class="input-field" id="right-EarningsYoY" type="number" step="0.01" placeholder="0.00" aria-label="Earnings Growth YoY max">
            </div>
          </div>
          <div class="input-group">
            <div class="input-wrapper">
              <label class="input-label">{{ t('params.qoqMin') }}</label>
              <input class="input-field" id="left-EarningsQoQ" type="number" step="0.01" placeholder="0.00" aria-label="Earnings Growth QoQ min">
            </div>
            <div class="input-wrapper">
              <label class="input-label">{{ t('params.qoqMax') }}</label>
              <input class="input-field" id="right-EarningsQoQ" type="number" step="0.01" placeholder="0.00" aria-label="Earnings Growth QoQ max">
            </div>
          </div>
        </div>
        
        <div class="growth-section">
          <h4 class="section-title">{{ t('params.epsGrowth') }}</h4>
          <div class="input-group">
            <div class="input-wrapper">
              <label class="input-label">{{ t('params.yoyMin') }}</label>
              <input class="input-field" id="left-EPSYoY" type="number" step="0.01" placeholder="0.00" aria-label="EPS Growth YoY min">
            </div>
            <div class="input-wrapper">
              <label class="input-label">{{ t('params.yoyMax') }}</label>
              <input class="input-field" id="right-EPSYoY" type="number" step="0.01" placeholder="0.00" aria-label="EPS Growth YoY max">
            </div>
          </div>
          <div class="input-group">
            <div class="input-wrapper">
              <label class="input-label">{{ t('params.qoqMin') }}</label>
              <input class="input-field" id="left-EPSQoQ" type="number" step="0.01" placeholder="0.00" aria-label="EPS Growth QoQ min">
            </div>
            <div class="input-wrapper">
              <label class="input-label">{{ t('params.qoqMax') }}</label>
              <input class="input-field" id="right-EPSQoQ" type="number" step="0.01" placeholder="0.00" aria-label="EPS Growth QoQ max">
            </div>
          </div>
        </div>
      </div>
      
      <div class="actions">
        <button class="btn btn-secondary" @click="emit('reset'); emit('update:showFundYoYQoQ', false)" aria-label="Reset Revenue / Earnings / EPS Growth">
          {{ t('params.reset') }}
        </button>
        <button class="btn btn-primary" @click="SetFundamentalGrowth()" aria-label="Set Revenue / Earnings / EPS Growth">
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
const emit = defineEmits(['fetchScreeners', 'handleMouseOver', 'handleMouseOut', 'reset', 'notify', 'update:showFundYoYQoQ']);

function handleMouseOver(event: MouseEvent, type: string) {
  emit('handleMouseOver', event, type);
}

function handleMouseOut(event: MouseEvent) {
  emit('handleMouseOut', event);
}

const props = defineProps<{
  user: string;
  apiKey: string;
  notification: object;
  selectedScreener: string;
  isScreenerError: boolean;
  showFundYoYQoQ: boolean;
}>();

function showNotification(msg: string) {
  emit('notify', msg);
}

// Validate a min/max pair: allow at least one, check order only if both present and valid
function validatePair(min: string, max: string, label: string): string | null {
  const minVal = min.trim() === '' ? null : parseFloat(min);
  const maxVal = max.trim() === '' ? null : parseFloat(max);
  if ((minVal === null && maxVal === null) ||
      (minVal !== null && isNaN(minVal) && maxVal !== null && isNaN(maxVal))) {
    return `${t('params.errorEnterNumber')} (${label})`;
  }
  if (minVal !== null && !isNaN(minVal) && maxVal !== null && !isNaN(maxVal)) {
    if (minVal >= maxVal) {
      return `${t('params.errorMinMax')} (${label})`;
    }
  }
  return null;
}

// adds and modifies YoY and/or QoQ value for screener
async function SetFundamentalGrowth() {
  try {
    if (!props.selectedScreener) {
      showNotification(t('params.errorSelectScreener'));
      return;
    }

    function getInput(id: string) {
      const el = document.getElementById(id) as HTMLInputElement | null;
      return el ? el.value : '';
    }

    // Validate each pair
    const pairs = [
      { min: getInput('left-RevYoY'), max: getInput('right-RevYoY'), label: 'Revenue Growth (YoY)', minKey: 'minRevYoY', maxKey: 'maxRevYoY' },
      { min: getInput('left-RevQoQ'), max: getInput('right-RevQoQ'), label: 'Revenue Growth (QoQ)', minKey: 'minRevQoQ', maxKey: 'maxRevQoQ' },
      { min: getInput('left-EarningsYoY'), max: getInput('right-EarningsYoY'), label: 'Earnings Growth (YoY)', minKey: 'minEarningsYoY', maxKey: 'maxEarningsYoY' },
      { min: getInput('left-EarningsQoQ'), max: getInput('right-EarningsQoQ'), label: 'Earnings Growth (QoQ)', minKey: 'minEarningsQoQ', maxKey: 'maxEarningsQoQ' },
      { min: getInput('left-EPSYoY'), max: getInput('right-EPSYoY'), label: 'EPS Growth (YoY)', minKey: 'minEPSYoY', maxKey: 'maxEPSYoY' },
      { min: getInput('left-EPSQoQ'), max: getInput('right-EPSQoQ'), label: 'EPS Growth (QoQ)', minKey: 'minEPSQoQ', maxKey: 'maxEPSQoQ' },
    ];

    let hasAnyValue = false;
    for (const pair of pairs) {
      const minVal = pair.min.trim() === '' ? null : parseFloat(pair.min);
      const maxVal = pair.max.trim() === '' ? null : parseFloat(pair.max);
      // If both missing, skip this pair
      if (minVal === null && maxVal === null) {
        continue;
      }
      // If both present and valid, check order
      if (minVal !== null && !isNaN(minVal) && maxVal !== null && !isNaN(maxVal)) {
        if (minVal >= maxVal) {
          showNotification(`${t('params.errorMinMax')} (${pair.label})`);
          return;
        }
      }
      // If at least one value is valid, mark as having a value
      if ((minVal !== null && !isNaN(minVal)) || (maxVal !== null && !isNaN(maxVal))) {
        hasAnyValue = true;
      } else {
        // If both are present but both invalid, error for this pair
        showNotification(`${t('params.errorEnterNumber')} (${pair.label})`);
        return;
      }
    }
    // If no value in any pair, error
    if (!hasAnyValue) {
      showNotification(t('params.errorEnterNumber'));
      return;
    }

    // Prepare payload
    const payload: Record<string, number | string | null> = {};
    for (const pair of pairs) {
      const minVal = pair.min.trim() === '' ? null : parseFloat(pair.min);
      const maxVal = pair.max.trim() === '' ? null : parseFloat(pair.max);
      payload[pair.minKey] = minVal;
      payload[pair.maxKey] = maxVal;
    }
    payload.screenerName = props.selectedScreener;
    payload.user = props.user;

    const response = await fetch('/api/screener/fundamental-growth', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify(payload)
    });
    if (response.status !== 200) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data && data.message && data.message.toLowerCase().includes('updated')) {
      emit('fetchScreeners', props.selectedScreener);
    } else {
      throw new Error('Error updating');
    }
  } catch (error: unknown) {
    let message = 'Unknown error';
    if (typeof error === 'object' && error !== null) {
      if ('response' in error && typeof (error as any).response === 'object' && (error as any).response !== null) {
        const response = (error as any).response;
        if ('status' in response && response.status === 400 && 'data' in response && typeof response.data === 'object' && response.data !== null && 'message' in response.data) {
          message = response.data.message;
        }
      } else if ('message' in error) {
        message = (error as { message: string }).message;
      }
    } else if (typeof error === 'string') {
      message = error;
    }
    showNotification(message);
    emit('fetchScreeners', props.selectedScreener);
  }
}

// Computed getter/setter for v-model
const showFundYoYQoQModel = computed({
  get: () => props.showFundYoYQoQ,
  set: (val: boolean) => emit('update:showFundYoYQoQ', val)
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

/* Growth Sections */
.growth-sections {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.growth-section {
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
