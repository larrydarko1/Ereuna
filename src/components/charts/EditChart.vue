<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <button class="close-x" @click="close" aria-label="Close">&times;</button>
      <h2>Edit Chart Settings</h2>
      <form @submit.prevent="saveSettings">
        <div
          v-for="(indicator, idx) in indicators"
          :key="idx"
          class="indicator-row-compact indicator-module"
          :class="{ 'indicator-hidden': !indicator.visible }"
        >
          <div class="indicator-piece">
            <div
              class="custom-checkbox indicator-visibility"
              :class="{ checked: indicator.visible }"
              @click.stop="toggleIndicatorVisibility(idx)"
              tabindex="0"
              @keydown.enter.space="toggleIndicatorVisibility(idx)"
              role="checkbox"
              :aria-checked="indicator.visible"
              :aria-label="'Toggle visibility for indicator ' + (idx + 1)"
              title="Toggle indicator visibility"
            >
              <span class="checkmark"></span>
            </div>
          </div>
          <div class="indicator-label">Indicator {{ idx + 1 }}</div>
          <div class="indicator-piece">
            <div class="custom-dropdown" @click="toggleDropdown(idx)" :aria-label="'Select indicator type for indicator ' + (idx + 1)">
              <div class="selected-value">
                {{ indicator.type }}
                <span class="dropdown-arrow" :class="{ open: dropdownOpen === idx }">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                    <g id="SVGRepo_iconCarrier">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M12.7071 14.7071C12.3166 15.0976 11.6834 15.0976 11.2929 14.7071L6.29289 9.70711C5.90237 9.31658 5.90237 8.68342 6.29289 8.29289C6.68342 7.90237 7.31658 7.90237 7.70711 8.29289L12 12.5858L16.2929 8.29289C16.6834 7.90237 17.3166 7.90237 17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711L12.7071 14.7071Z" fill="var(--text1)"></path>
                    </g>
                  </svg>
                </span>
              </div>
              <div v-if="dropdownOpen === idx" class="dropdown-list">
                <div class="dropdown-item" @click.stop="selectType(idx, 'SMA')">SMA</div>
                <div class="dropdown-item" @click.stop="selectType(idx, 'EMA')">EMA</div>
              </div>
            </div>
          </div>
          <div class="indicator-piece">
            <input
              type="number"
              v-model.number="indicator.timeframe"
              min="1"
              placeholder="Timeframe"
              required
              class="indicator-input"
              :aria-label="'Timeframe for indicator ' + (idx + 1)"
            />
          </div>
        </div>
        <div class="indicator-row-compact indicator-module intrinsic-module" :class="{ 'indicator-hidden': !showIntrinsicValue }">
          <div class="indicator-piece">
            <div
              class="custom-checkbox indicator-visibility"
              :class="{ checked: showIntrinsicValue }"
              @click="showIntrinsicValue = !showIntrinsicValue"
              tabindex="0"
              @keydown.enter.space="showIntrinsicValue = !showIntrinsicValue"
              role="checkbox"
              :aria-checked="showIntrinsicValue"
              aria-label="Toggle intrinsic value visibility"
              title="Toggle intrinsic value visibility"
            >
              <span class="checkmark"></span>
            </div>
          </div>
          <div class="indicator-label">Intrinsic Value</div>
        </div>
        <div class="modal-actions">
          <button type="button" class="cancel-btn" @click="close" aria-label="Cancel chart settings">Cancel</button>
          <button type="submit" class="trade-btn" aria-label="Save chart settings">Save</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Indicator {
  type: string;
  timeframe: number;
  visible: boolean;
}

const emit = defineEmits(['close', 'save', 'settings-saved'])

const props = defineProps<{
  apiKey: string;
  user: string;
  indicatorList: Indicator[];
}>()

const indicators = ref<Indicator[]>(
  props.indicatorList.map(ind => ({ ...ind }))
)

watch(() => props.indicatorList, (newList: Indicator[]) => {
  indicators.value = newList.map(ind => ({ ...ind }))
}, { immediate: true })

function toggleIndicatorVisibility(idx: number) {
  indicators.value[idx].visible = !indicators.value[idx].visible
}

const showIntrinsicValue = ref<boolean>(true)
const dropdownOpen = ref<number | null>(null)

function toggleDropdown(idx: number) {
  dropdownOpen.value = dropdownOpen.value === idx ? null : idx
}

function selectType(idx: number, type: string) {
  indicators.value[idx].type = type
  dropdownOpen.value = null
}

async function postChartSettings() {
  const payload = {
    indicators: indicators.value.map(ind => ({
      type: ind.type,
      timeframe: ind.timeframe,
      visible: ind.visible
    })),
    intrinsicValue: {
      visible: showIntrinsicValue.value
    }
  }
  try {
    await fetch(`/api/chart-settings?user=${encodeURIComponent(props.user)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': props.apiKey
        },
        body: JSON.stringify(payload)
      }
    )
  } catch (e) {
    console.error('Failed to save chart settings', e)
  }
}

async function saveSettings() {
  await postChartSettings()
  emit('save', { indicators: indicators.value, showIntrinsicValue: showIntrinsicValue.value })
  emit('settings-saved')
  close()
}

function close() {
  emit('close')
  dropdownOpen.value = null
}
</script>

<style scoped>

.indicator-row-compact {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  background: var(--base1);
  border-radius: 7px;
  border: 1px solid var(--base3);
  transition: box-shadow 0.18s, border-color 0.18s, filter 0.2s, opacity 0.2s;
  position: relative;
}
.indicator-row-compact:hover {
  border-color: var(--accent1);
}

.indicator-module {
  transition: filter 0.2s, opacity 0.2s;
}
.indicator-module.indicator-hidden {
  opacity: 0.5;
  filter: grayscale(0.7);
}
.indicator-label {
  min-width: 110px;
  font-size: 1.08rem;
  color: var(--text2);
  font-weight: 600;
  padding: 0 18px 0 0;
  letter-spacing: 0.01em;
  transition: color 0.2s, text-decoration 0.2s;
}
.indicator-module.indicator-hidden .indicator-label {
  color: var(--text2);
  text-decoration: line-through;
}
.indicator-piece {
  display: flex;
  align-items: center;
  padding: 0 8px;
}
.indicator-piece:not(:last-child) {
  margin-right: 0;
}
.indicator-visibility {
  min-width: 32px;
  padding: 5px 8px;
  margin-left: 0;
  justify-content: center;
}
.indicator-visibility .checkmark {
  margin-right: 0;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(24, 25, 38, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}

.modal-content {
  position: relative;
  background: var(--base2);
  color: var(--text1);
  border-radius: 18px;
  padding: 36px 32px 28px 32px;
  min-width: 340px;
  box-shadow: 0 8px 32px 0 rgba(0,0,0,0.18), 0 1.5px 8px 0 var(--accent4);
  display: flex;
  flex-direction: column;
  gap: 18px;
  animation: popup-in 0.18s cubic-bezier(.4,1.4,.6,1) backwards;
}

@keyframes popup-in {
  from { transform: translateY(30px) scale(0.98); opacity: 0; }
  to   { transform: none; opacity: 1; }
}

.close-x {
  position: absolute;
  top: 18px;
  right: 18px;
  background: none;
  border: none;
  color: var(--text2);
  font-size: 1.7rem;
  cursor: pointer;
  transition: color 0.15s;
  line-height: 1;
  padding: 0;
}
.close-x:hover {
  color: var(--accent1);
}

h2 {
  margin: 0 0 12px 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--accent1);
  letter-spacing: 0.01em;
}

form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.input-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}



.indicator-row .indicator-controls {
  display: flex;
  gap: 14px;
  align-items: center;
}

.indicator-input {
  padding: 10px 12px;
  border-radius: 7px;
  border: 1.5px solid var(--base3);
  background: var(--base1);
  color: var(--text1);
  font-size: 1.08rem;
  outline: none;
  transition: border-color 0.18s;
  width: 90px;
  box-sizing: border-box;
  appearance: textfield;
}
/* Remove number input arrows for Chrome, Safari, Edge */
.indicator-input::-webkit-outer-spin-button,
.indicator-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
/* Remove number input arrows for Firefox */
.indicator-input[type=number] {
  -moz-appearance: textfield;
    appearance: textfield;
}

.indicator-visibility {
  margin-left: 6px;
  min-width: 70px;
  padding: 5px 10px;
}

label {
  font-size: 1rem;
  color: var(--text2);
  font-weight: 500;
  letter-spacing: 0.01em;
}

input[type="number"] {
  padding: 10px 12px;
  border-radius: 7px;
  border: 1.5px solid var(--base3);
  background: var(--base1);
  color: var(--text1);
  font-size: 1.08rem;
  outline: none;
  transition: border-color 0.18s;
  width: 90px;
}
input[type="number"]:focus {
  border-color: var(--accent1);
  background: var(--base4);
}

.custom-dropdown {
  position: relative;
  min-width: 110px;
  background: var(--base1);
  border: 1.5px solid var(--base3);
  border-radius: 7px;
  cursor: pointer;
  user-select: none;
  transition: border-color 0.18s;
}
.custom-dropdown:focus-within, .custom-dropdown:hover {
  border-color: var(--accent1);
}
.selected-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  color: var(--text1);
  font-size: 0.98rem;
  line-height: 1.2;
}
.dropdown-arrow {
  display: flex;
  align-items: center;
  margin-left: 8px;
  transition: transform 0.18s;
}
.dropdown-arrow.open {
  transform: rotate(180deg);
}
.dropdown-list {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  background: var(--base2);
  border: 1.5px solid var(--accent1);
  border-radius: 0 0 7px 7px;
  z-index: 10;
  box-shadow: 0 4px 16px 0 rgba(0,0,0,0.10);
  margin-top: 2px;
  padding: 0;
}
.dropdown-item {
  padding: 4px 8px;
  color: var(--text1);
  cursor: pointer;
  font-size: 0.98rem;
  transition: background 0.15s;
  line-height: 1.2;
}
.custom-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 5px;
  opacity: 0.7;
  transition: opacity 0.3s;
  font-size: 1rem;
  color: var(--text2);
  font-weight: 500;
  letter-spacing: 0.01em;
  user-select: none;
}
.checkmark {
  width: 16px;
  height: 16px;
  background-color: var(--text1);
  border-radius: 50%;
  margin-right: 8px;
  display: inline-block;
  transition: background-color 0.3s, border-color 0.3s;
  border: 2px solid var(--accent1);
  box-sizing: border-box;
}
.custom-checkbox.checked .checkmark {
  background-color: var(--accent1);
  border-color: var(--accent1);
}

.custom-checkbox:focus {
  outline: none;
  box-shadow: none;
}

.modal-actions {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  justify-content: flex-end;
}

.trade-btn {
  background: var(--accent1);
  color: var(--text3);
  border: none;
  border-radius: 7px;
  padding: 10px 24px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.18s;
}
.trade-btn:hover {
  background: var(--accent2);
}

.cancel-btn {
  background: transparent;
  color: var(--text2);
  border: 1.5px solid var(--base3);
  border-radius: 7px;
  padding: 10px 24px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: border-color 0.18s, color 0.18s;
}
.cancel-btn:hover {
  border-color: var(--accent1);
  color: var(--accent1);
}

</style>
