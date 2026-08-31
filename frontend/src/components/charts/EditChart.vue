<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <div class="popup-header">
        <h2>{{ t('editChart.title') }}</h2>
        <button class="close-btn" @click="close" :aria-label="t('editChart.close')">×</button>
      </div>
      <form @submit.prevent="saveSettings">
        <div class="popup-body">
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
            :aria-label="t('editChart.toggleVisibility', { number: idx + 1 })"
            :title="t('editChart.toggleVisibilityTitle')"
          >
            <span class="checkmark"></span>
          </div>
          </div>
          <div class="indicator-label">{{ t('editChart.indicator', { number: idx + 1 }) }}</div>
          <div class="indicator-piece">
            <div class="custom-dropdown" @click="toggleDropdown(idx, $event)" :aria-label="t('editChart.selectIndicatorType', { number: idx + 1 })">
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
              <div v-if="dropdownOpen === idx" class="dropdown-list" :style="{ top: dropdownPosition.top + 'px', left: dropdownPosition.left + 'px' }">
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
              :placeholder="t('editChart.timeframe')"
              required
              class="indicator-input"
              :aria-label="t('editChart.timeframeFor', { number: idx + 1 })"
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
            :aria-label="t('editChart.toggleIntrinsicVisibility')"
            :title="t('editChart.toggleIntrinsicVisibility')"
          >
            <span class="checkmark"></span>
          </div>
          </div>
          <div class="indicator-label">{{ t('editChart.intrinsicValue') }}</div>
        </div>
        <div class="indicator-row-compact indicator-module markers-module" :class="{ 'indicator-hidden': !showMarkers.earnings }">
          <div class="indicator-piece">
            <div
              class="custom-checkbox indicator-visibility"
              :class="{ checked: showMarkers.earnings }"
              @click="showMarkers.earnings = !showMarkers.earnings"
              tabindex="0"
              @keydown.enter.space="showMarkers.earnings = !showMarkers.earnings"
              role="checkbox"
              :aria-checked="showMarkers.earnings"
            :aria-label="t('editChart.toggleEarningsVisibility')"
            :title="t('editChart.toggleEarningsVisibility')"
          >
            <span class="checkmark"></span>
          </div>
          </div>
          <div class="indicator-label">{{ t('editChart.earningsMarkers') }}</div>
        </div>
        <div class="indicator-row-compact indicator-module markers-module" :class="{ 'indicator-hidden': !showMarkers.dividends }">
          <div class="indicator-piece">
            <div
              class="custom-checkbox indicator-visibility"
              :class="{ checked: showMarkers.dividends }"
              @click="showMarkers.dividends = !showMarkers.dividends"
              tabindex="0"
              @keydown.enter.space="showMarkers.dividends = !showMarkers.dividends"
              role="checkbox"
              :aria-checked="showMarkers.dividends"
            :aria-label="t('editChart.toggleDividendsVisibility')"
            :title="t('editChart.toggleDividendsVisibility')"
          >
            <span class="checkmark"></span>
          </div>
          </div>
          <div class="indicator-label">{{ t('editChart.dividendsMarkers') }}</div>
        </div>
        <div class="indicator-row-compact indicator-module markers-module" :class="{ 'indicator-hidden': !showMarkers.splits }">
          <div class="indicator-piece">
            <div
              class="custom-checkbox indicator-visibility"
              :class="{ checked: showMarkers.splits }"
              @click="showMarkers.splits = !showMarkers.splits"
              tabindex="0"
              @keydown.enter.space="showMarkers.splits = !showMarkers.splits"
              role="checkbox"
              :aria-checked="showMarkers.splits"
            :aria-label="t('editChart.toggleSplitsVisibility')"
            :title="t('editChart.toggleSplitsVisibility')"
          >
            <span class="checkmark"></span>
          </div>
          </div>
          <div class="indicator-label">{{ t('editChart.splitsMarkers') }}</div>
        </div>
        <div class="indicator-row-compact indicator-module chart-type-row">
          <div class="indicator-label" style="margin-left: 2rem;">{{ t('editChart.chartType') }}</div>
          <div class="indicator-piece">
            <div class="custom-dropdown" @click="toggleChartTypeDropdown($event)" :aria-label="t('editChart.selectChartType')">
              <div class="selected-value">
                {{ chartTypeLabel }}
                <span class="dropdown-arrow" :class="{ open: chartTypeDropdownOpen }">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                    <g id="SVGRepo_iconCarrier">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M12.7071 14.7071C12.3166 15.0976 11.6834 15.0976 11.2929 14.7071L6.29289 9.70711C5.90237 9.31658 5.90237 8.68342 6.29289 8.29289C6.68342 7.90237 7.31658 7.90237 7.70711 8.29289L12 12.5858L16.2929 8.29289C16.6834 7.90237 17.3166 7.90237 17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711L12.7071 14.7071Z" fill="var(--text1)"></path>
                    </g>
                  </svg>
                </span>
              </div>
              <div v-if="chartTypeDropdownOpen" class="dropdown-list" :style="{ top: dropdownPosition.top + 'px', left: dropdownPosition.left + 'px' }">
                <div class="dropdown-item" @click.stop="selectChartType('candlestick')">{{ t('editChart.candlestick') }}</div>
                <div class="dropdown-item" @click.stop="selectChartType('bar')">{{ t('editChart.bar') }}</div>
                <div class="dropdown-item" @click.stop="selectChartType('heikinashi')">{{ t('editChart.heikinAshi') }}</div>
                <div class="dropdown-item" @click.stop="selectChartType('line')">{{ t('editChart.line') }}</div>
                <div class="dropdown-item" @click.stop="selectChartType('area')">{{ t('editChart.area') }}</div>
                <div class="dropdown-item" @click.stop="selectChartType('baseline')">{{ t('editChart.baseline') }}</div>
              </div>
            </div>
          </div>
        </div>
        </div>
        <div class="popup-footer">
          <button type="button" class="btn-secondary" @click="close" :aria-label="t('editChart.cancelSettings')">{{ t('editChart.cancel') }}</button>
          <button type="submit" class="btn-primary" :aria-label="t('editChart.saveSettings')">{{ t('editChart.save') }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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
  intrinsicVisible?: boolean;
  markersVisible?: { earnings: boolean; dividends: boolean; splits: boolean };
  chartType?: string;
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

// Initialize intrinsic visibility from the incoming prop so the checkbox
// visually matches the current chart setting (keeps CSS reactive)
const showIntrinsicValue = ref<boolean>(props.intrinsicVisible ?? true)
// Keep local ref in sync if parent updates the prop
watch(() => props.intrinsicVisible, (v) => {
  showIntrinsicValue.value = v ?? false
}, { immediate: true })

// Initialize markers visibility from the incoming prop
const showMarkers = ref<{ earnings: boolean; dividends: boolean; splits: boolean }>({
  earnings: props.markersVisible?.earnings ?? true,
  dividends: props.markersVisible?.dividends ?? true,
  splits: props.markersVisible?.splits ?? true
})
// Keep local ref in sync if parent updates the prop
watch(() => props.markersVisible, (v) => {
  if (v) {
    showMarkers.value = {
      earnings: v.earnings ?? true,
      dividends: v.dividends ?? true,
      splits: v.splits ?? true
    }
  }
}, { immediate: true, deep: true })

// Initialize chart type from props
const chartType = ref<string>(props.chartType || 'candlestick')
watch(() => props.chartType, (v) => {
  chartType.value = v || 'candlestick'
}, { immediate: true })

// Computed property for displaying chart type label
const chartTypeLabel = computed(() => {
  const labels: Record<string, string> = {
    'candlestick': t('editChart.candlestick'),
    'bar': t('editChart.bar'),
    'heikinashi': t('editChart.heikinAshi'),
    'line': t('editChart.line'),
    'area': t('editChart.area'),
    'baseline': t('editChart.baseline')
  }
  return labels[chartType.value] || t('editChart.candlestick')
})

const dropdownOpen = ref<number | null>(null)
const chartTypeDropdownOpen = ref<boolean>(false)
const dropdownPosition = ref<{ top: number; left: number }>({ top: 0, left: 0 })

function toggleDropdown(idx: number, event: MouseEvent) {
  if (dropdownOpen.value === idx) {
    dropdownOpen.value = null
  } else {
    const target = event.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    dropdownPosition.value = {
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX
    }
    dropdownOpen.value = idx
  }
  chartTypeDropdownOpen.value = false
}

function toggleChartTypeDropdown(event: MouseEvent) {
  if (chartTypeDropdownOpen.value) {
    chartTypeDropdownOpen.value = false
  } else {
    const target = event.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    dropdownPosition.value = {
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX
    }
    chartTypeDropdownOpen.value = true
  }
  dropdownOpen.value = null
}

function selectType(idx: number, type: string) {
  indicators.value[idx].type = type
  dropdownOpen.value = null
}

function selectChartType(type: string) {
  chartType.value = type
  chartTypeDropdownOpen.value = false
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
    },
    markers: {
      earnings: showMarkers.value.earnings,
      dividends: showMarkers.value.dividends,
      splits: showMarkers.value.splits
    },
    chartType: chartType.value
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
  chartTypeDropdownOpen.value = false
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--base2);
  border-radius: 12px;
  width: 95%;
  max-width: 850px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid var(--base3);
}

.popup-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--base3);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.popup-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text1);
}

.close-btn {
  background: none;
  border: none;
  font-size: 32px;
  color: var(--text2);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--base3);
  color: var(--text1);
}

form {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.popup-body {
  padding: 16px 20px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.popup-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--base3);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.indicator-row-compact {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  background: var(--base1);
  border-radius: 6px;
  border: 1px solid var(--base3);
  transition: all 0.2s;
  gap: 6px;
}

.indicator-row-compact:hover {
  border-color: var(--accent1);
}

.chart-type-row {
  grid-column: 1 / -1;
  justify-content: space-between;
}


.indicator-module {
  transition: filter 0.2s, opacity 0.2s;
}

.indicator-module.indicator-hidden {
  opacity: 0.5;
  filter: grayscale(0.7);
}

.indicator-label {
  flex: 1;
  font-size: 13px;
  color: var(--text1);
  font-weight: 500;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.indicator-module.indicator-hidden .indicator-label {
  text-decoration: line-through;
  color: var(--text2);
}

.indicator-piece {
  display: flex;
  align-items: center;
}

.indicator-visibility {
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.indicator-visibility .checkmark {
  margin-right: 0;
}

.indicator-input {
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--base3);
  background: var(--base2);
  color: var(--text1);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
  width: 55px;
  box-sizing: border-box;
  appearance: textfield;
}

.indicator-input::-webkit-outer-spin-button,
.indicator-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.indicator-input[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.indicator-input:focus {
  border-color: var(--accent1);
}

.custom-dropdown {
  position: relative;
  min-width: 70px;
  cursor: pointer;
  user-select: none;
}

.selected-value {
  background: var(--base2);
  color: var(--text1);
  border-radius: 6px;
  padding: 6px 8px;
  border: 1px solid var(--base3);
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: border-color 0.2s;
}

.selected-value:hover {
  border-color: var(--accent1);
}

.dropdown-arrow {
  display: flex;
  align-items: center;
  margin-left: 6px;
  transition: transform 0.2s;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-list {
  position: fixed;
  background: var(--base2);
  border: 1px solid var(--base3);
  border-radius: 6px;
  z-index: 10001;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px;
  white-space: nowrap;
  width: fit-content;
  min-width: 120px;
}

.dropdown-item {
  padding: 8px 12px;
  color: var(--text1);
  cursor: pointer;
  font-size: 13px;
  border-radius: 0;
  transition: background 0.2s;
  white-space: nowrap;
  display: block;
  width: 100%;
  box-sizing: border-box;
}

.dropdown-item:first-child {
  border-radius: 4px 4px 0 0;
}

.dropdown-item:last-child {
  border-radius: 0 0 4px 4px;
}

.dropdown-item:first-child:last-child {
  border-radius: 4px;
}

.dropdown-item:hover {
  background: var(--base3);
}

.custom-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.checkmark {
  width: 18px;
  height: 18px;
  background-color: var(--base2);
  border-radius: 4px;
  display: inline-block;
  transition: background-color 0.2s, border-color 0.2s;
  border: 2px solid var(--base3);
  box-sizing: border-box;
  position: relative;
}

.custom-checkbox.checked .checkmark {
  background-color: var(--accent1);
  border-color: var(--accent1);
}

.custom-checkbox.checked .checkmark::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text3);
  font-size: 12px;
  font-weight: bold;
}

.btn-secondary,
.btn-primary {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: var(--base3);
  color: var(--text1);
}

.btn-secondary:hover {
  background: var(--base4);
}

.btn-primary {
  background: var(--accent1);
  color: var(--text3);
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-height: 95vh;
  }
  
  .popup-body {
    grid-template-columns: 1fr;
  }
  
  .chart-type-row {
    grid-column: 1;
  }
}

</style>
