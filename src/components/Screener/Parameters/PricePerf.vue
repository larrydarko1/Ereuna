<template>
  <div :class="[showPricePerfModel ? 'param-card-expanded' : 'param-card']">
    <div class="header">
      <div class="title-section">
        <span class="title">{{ t('params.pricePerformance') }}</span>
        <svg class="info-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
          @mouseover="handleMouseOver($event, 'perf')" @mouseout="handleMouseOut($event)" aria-label="Show info for Price Performance parameter">
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
        <input type="checkbox" id="price-check" v-model="showPricePerfModel" aria-label="Toggle Price Performance filter">
        <span class="slider"></span>
      </label>
    </div>
    
    <div class="content" v-if="showPricePerfModel">
      <div class="perf-section">
        <div class="section-title">{{ t('params.changePercent') }}</div>
        <div class="input-group">
          <div class="input-wrapper">
            <label class="input-label">{{ t('params.minimum') }}</label>
            <input class="input-field" id="changeperc1" type="number" step="0.01" placeholder="0.00" aria-label="Change Percent minimum">
          </div>
          <div class="input-wrapper">
            <label class="input-label">{{ t('params.maximum') }}</label>
            <input class="input-field" id="changeperc2" type="number" step="0.01" placeholder="0.00" aria-label="Change Percent maximum">
          </div>
          <div class="input-wrapper">
            <label class="input-label">{{ t('params.period') }}</label>
            <div class="dropdown-container">
              <div class="dropdown-btn" @click="toggleChangepercDropdown" aria-label="Select Change Percent period">
                <span class="selected-value">{{ changepercDisplay }}</span>
                <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="dropdown-menu" v-show="changepercDropdownOpen">
                <div
                  v-for="option in changepercOptions"
                  :key="option.value"
                  class="dropdown-item"
                  @click="selectChangepercOption(option)"
                >
                  {{ option.display }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="perf-section">
        <div class="section-title">{{ t('params.percOff52WeekHigh') }}</div>
        <div class="input-group">
          <div class="input-wrapper">
            <label class="input-label">{{ t('params.minimum') }}</label>
            <input class="input-field" id="weekhigh1" type="number" step="0.01" placeholder="0.00" aria-label="52 Week High minimum">
          </div>
          <div class="input-wrapper">
            <label class="input-label">{{ t('params.maximum') }}</label>
            <input class="input-field" id="weekhigh2" type="number" step="0.01" placeholder="0.00" aria-label="52 Week High maximum">
          </div>
        </div>
      </div>
      
      <div class="perf-section">
        <div class="section-title">{{ t('params.percOff52WeekLow') }}</div>
        <div class="input-group">
          <div class="input-wrapper">
            <label class="input-label">{{ t('params.minimum') }}</label>
            <input class="input-field" id="weeklow1" type="number" step="0.01" placeholder="0.00" aria-label="52 Week Low minimum">
          </div>
          <div class="input-wrapper">
            <label class="input-label">{{ t('params.maximum') }}</label>
            <input class="input-field" id="weeklow2" type="number" step="0.01" placeholder="0.00" aria-label="52 Week Low maximum">
          </div>
        </div>
      </div>
      
      <div class="perf-section">
        <div class="section-title">{{ t('params.allTimeRecords') }}</div>
        <div class="checkbox-group">
          <label class="custom-checkbox" :class="{ checked: allTimeHigh }" @click="toggleAllTimeHigh" aria-label="New All Time High">
            <span class="checkmark"></span>
            {{ t('params.newAllTimeHigh') }}
          </label>
          <label class="custom-checkbox" :class="{ checked: allTimeLow }" @click="toggleAllTimeLow" aria-label="New All Time Low">
            <span class="checkmark"></span>
            {{ t('params.newAllTimeLow') }}
          </label>
        </div>
      </div>
      
      <div class="perf-section">
        <div class="section-title">{{ t('params.movingAverages') }}</div>
        <div class="ma-group">
          <div class="ma-item">
            <span class="ma-label">{{ t('params.ma200') }}</span>
            <div class="dropdown-container">
              <div class="dropdown-btn" @click="toggleMa200Dropdown" aria-label="Select 200 DMA">
                <span class="selected-value">{{ ma200Display }}</span>
                <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="dropdown-menu" v-show="ma200DropdownOpen">
                <div
                  v-for="option in ma200Options"
                  :key="option.value"
                  class="dropdown-item"
                  @click="selectMa200Option(option)"
                >
                  {{ option.display }}
                </div>
              </div>
            </div>
          </div>
          <div class="ma-item">
            <span class="ma-label">{{ t('params.ma50') }}</span>
            <div class="dropdown-container">
              <div class="dropdown-btn" @click="toggleMa50Dropdown" aria-label="Select 50 DMA">
                <span class="selected-value">{{ ma50Display }}</span>
                <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="dropdown-menu" v-show="ma50DropdownOpen">
                <div
                  v-for="option in ma50Options"
                  :key="option.value"
                  class="dropdown-item"
                  @click="selectMa50Option(option)"
                >
                  {{ option.display }}
                </div>
              </div>
            </div>
          </div>
          <div class="ma-item">
            <span class="ma-label">{{ t('params.ma20') }}</span>
            <div class="dropdown-container">
              <div class="dropdown-btn" @click="toggleMa20Dropdown" aria-label="Select 20 DMA">
                <span class="selected-value">{{ ma20Display }}</span>
                <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="dropdown-menu" v-show="ma20DropdownOpen">
                <div
                  v-for="option in ma20Options"
                  :key="option.value"
                  class="dropdown-item"
                  @click="selectMa20Option(option)"
                >
                  {{ option.display }}
                </div>
              </div>
            </div>
          </div>
          <div class="ma-item">
            <span class="ma-label">{{ t('params.ma10') }}</span>
            <div class="dropdown-container">
              <div class="dropdown-btn" @click="toggleMa10Dropdown" aria-label="Select 10 DMA">
                <span class="selected-value">{{ ma10Display }}</span>
                <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="dropdown-menu" v-show="ma10DropdownOpen">
                <div
                  v-for="option in ma10Options"
                  :key="option.value"
                  class="dropdown-item"
                  @click="selectMa10Option(option)"
                >
                  {{ option.display }}
                </div>
              </div>
            </div>
          </div>
          <div class="ma-item">
            <span class="ma-label">{{ t('params.priceLabel') }}</span>
            <div class="dropdown-container">
              <div class="dropdown-btn" @click="togglePriceDropdown" aria-label="Select Price">
                <span class="selected-value">{{ priceDisplay }}</span>
                <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="dropdown-menu" v-show="priceDropdownOpen">
                <div
                  v-for="option in priceOptions"
                  :key="option.value"
                  class="dropdown-item"
                  @click="selectPriception(option)"
                >
                  {{ option.display }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="actions">
        <button class="btn btn-secondary" @click="emit('reset'); emit('update:showPricePerf', false)" aria-label="Reset Price Performance filter">
          {{ t('params.reset') }}
        </button>
        <button class="btn btn-primary" @click="SetPricePerformance()" aria-label="Set Price Performance filter">
          {{ t('params.apply') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const emit = defineEmits(['fetchScreeners', 'handleMouseOver', 'handleMouseOut', 'reset', 'notify', 'update:showPricePerf']);

function handleMouseOver(event: MouseEvent, type: string) {
  emit('handleMouseOver', event, type);
}

function handleMouseOut(event: MouseEvent) {
  emit('handleMouseOut', event);
}

const props = defineProps<{
  user: string;
  apiKey: string;
  notification: { message?: string; type?: string };
  selectedScreener: string;
  isScreenerError: boolean;
  showPricePerf: boolean;
  initialSettings?: Record<string, any>;
}>();

// Computed getter/setter for v-model
const showPricePerfModel = computed({
  get: () => props.showPricePerf,
  set: (val: boolean) => emit('update:showPricePerf', val)
});
const changepercOptions = computed(() => [
  { display: t('params.optionDash'), value: '-' },
  { display: t('params.option1Day'), value: '1D' },
  { display: t('params.option1Week'), value: '1W' },
  { display: t('params.option1Month'), value: '1M' },
  { display: t('params.option4Months'), value: '4M' },
  { display: t('params.option6Months'), value: '6M' },
  { display: t('params.option1Year'), value: '1Y' },
  { display: t('params.optionYTD'), value: 'YTD' }
]);

const ma200Options = computed(() => [
  { display: t('params.optionDash'), value: '-' },
  { display: t('params.optionAbove50DMA'), value: 'abv50' },
  { display: t('params.optionAbove20DMA'), value: 'abv20' },
  { display: t('params.optionAbove10DMA'), value: 'abv10' },
  { display: t('params.optionAbovePrice'), value: 'abvPrice' },
  { display: t('params.optionBelow50DMA'), value: 'blw50' },
  { display: t('params.optionBelow20DMA'), value: 'blw20' },
  { display: t('params.optionBelow10DMA'), value: 'blw10' },
  { display: t('params.optionBelowPrice'), value: 'blwPrice' }
]);

const ma50Options = computed(() => [
  { display: t('params.optionDash'), value: '-' },
  { display: t('params.optionAbove200DMA'), value: 'abv200' },
  { display: t('params.optionAbove20DMA'), value: 'abv20' },
  { display: t('params.optionAbove10DMA'), value: 'abv10' },
  { display: t('params.optionAbovePrice'), value: 'abvPrice' },
  { display: t('params.optionBelow200DMA'), value: 'blw200' },
  { display: t('params.optionBelow20DMA'), value: 'blw20' },
  { display: t('params.optionBelow10DMA'), value: 'blw10' },
  { display: t('params.optionBelowPrice'), value: 'blwPrice' }
]);

const ma20Options = computed(() => [
  { display: t('params.optionDash'), value: '-' },
  { display: t('params.optionAbove200DMA'), value: 'abv200' },
  { display: t('params.optionAbove50DMA'), value: 'abv50' },
  { display: t('params.optionAbove10DMA'), value: 'abv10' },
  { display: t('params.optionAbovePrice'), value: 'abvPrice' },
  { display: t('params.optionBelow200DMA'), value: 'blw200' },
  { display: t('params.optionBelow50DMA'), value: 'blw50' },
  { display: t('params.optionBelow10DMA'), value: 'blw10' },
  { display: t('params.optionBelowPrice'), value: 'blwPrice' }
]);

const ma10Options = computed(() => [
  { display: t('params.optionDash'), value: '-' },
  { display: t('params.optionAbove200DMA'), value: 'abv200' },
  { display: t('params.optionAbove50DMA'), value: 'abv50' },
  { display: t('params.optionAbove20DMA'), value: 'abv20' },
  { display: t('params.optionAbovePrice'), value: 'abvPrice' },
  { display: t('params.optionBelow200DMA'), value: 'blw200' },
  { display: t('params.optionBelow50DMA'), value: 'blw50' },
  { display: t('params.optionBelow20DMA'), value: 'blw20' },
  { display: t('params.optionBelowPrice'), value: 'blwPrice' }
]);

const priceOptions = computed(() => [
  { display: t('params.optionDash'), value: '-' },
  { display: t('params.optionAbove200DMA'), value: 'abv200' },
  { display: t('params.optionAbove50DMA'), value: 'abv50' },
  { display: t('params.optionAbove20DMA'), value: 'abv20' },
  { display: t('params.optionAbove10DMA'), value: 'abv10' },
  { display: t('params.optionBelow200DMA'), value: 'blw200' },
  { display: t('params.optionBelow50DMA'), value: 'blw50' },
  { display: t('params.optionBelow20DMA'), value: 'blw20' },
  { display: t('params.optionBelow10DMA'), value: 'blw10' }
]);

const changepercSelect = ref('-');
const ma200Select = ref('-');
const ma50Select = ref('-');
const ma20Select = ref('-');
const ma10Select = ref('-');
const priceSelect = ref('-');

const changepercDisplay = ref(t('params.optionDash'));
const ma200Display = ref(t('params.optionDash'));
const ma50Display = ref(t('params.optionDash'));
const ma20Display = ref(t('params.optionDash'));
const ma10Display = ref(t('params.optionDash'));
const priceDisplay = ref(t('params.optionDash'));

const changepercDropdownOpen = ref<boolean>(false);
const ma200DropdownOpen = ref<boolean>(false);
const ma50DropdownOpen = ref<boolean>(false);
const ma20DropdownOpen = ref<boolean>(false);
const ma10DropdownOpen = ref<boolean>(false);
const priceDropdownOpen = ref<boolean>(false);

function selectChangepercOption(option: { display: string; value: string }) {
  changepercSelect.value = option.value;
  changepercDisplay.value = option.display;
  changepercDropdownOpen.value = false;
}

function selectMa200Option(option: { display: string; value: string }) {
  ma200Select.value = option.value;
  ma200Display.value = option.display;
  ma200DropdownOpen.value = false;
}

function selectMa50Option(option: { display: string; value: string }) {
  ma50Select.value = option.value;
  ma50Display.value = option.display;
  ma50DropdownOpen.value = false;
}

function selectMa20Option(option: { display: string; value: string }) {
  ma20Select.value = option.value;
  ma20Display.value = option.display;
  ma20DropdownOpen.value = false;
}

function selectMa10Option(option: { display: string; value: string }) {
  ma10Select.value = option.value;
  ma10Display.value = option.display;
  ma10DropdownOpen.value = false;
}

function selectPriception(option: { display: string; value: string }) {
  priceSelect.value = option.value;
  priceDisplay.value = option.display;
  priceDropdownOpen.value = false;
}

function toggleChangepercDropdown() {
  changepercDropdownOpen.value = !changepercDropdownOpen.value;
  ma200DropdownOpen.value = false;
  ma50DropdownOpen.value = false;
  ma20DropdownOpen.value = false;
  ma10DropdownOpen.value = false;
  priceDropdownOpen.value = false;
}

function toggleMa200Dropdown() {
  ma200DropdownOpen.value = !ma200DropdownOpen.value;
  changepercDropdownOpen.value = false;
  ma50DropdownOpen.value = false;
  ma20DropdownOpen.value = false;
  ma10DropdownOpen.value = false;
  priceDropdownOpen.value = false;
}

function toggleMa50Dropdown() {
  ma50DropdownOpen.value = !ma50DropdownOpen.value;
  changepercDropdownOpen.value = false;
  ma200DropdownOpen.value = false;
  ma20DropdownOpen.value = false;
  ma10DropdownOpen.value = false;
  priceDropdownOpen.value = false;
}

function toggleMa20Dropdown() {
  ma20DropdownOpen.value = !ma20DropdownOpen.value;
  changepercDropdownOpen.value = false;
  ma200DropdownOpen.value = false;
  ma50DropdownOpen.value = false;
  ma10DropdownOpen.value = false;
  priceDropdownOpen.value = false;
}

function toggleMa10Dropdown() {
  ma10DropdownOpen.value = !ma10DropdownOpen.value;
  changepercDropdownOpen.value = false;
  ma200DropdownOpen.value = false;
  ma50DropdownOpen.value = false;
  ma20DropdownOpen.value = false;
  priceDropdownOpen.value = false;
}

function togglePriceDropdown() {
  priceDropdownOpen.value = !priceDropdownOpen.value;
  changepercDropdownOpen.value = false;
  ma200DropdownOpen.value = false;
  ma50DropdownOpen.value = false;
  ma20DropdownOpen.value = false;
  ma10DropdownOpen.value = false;
}

const allTimeHigh = ref(false);
const allTimeLow = ref(false);

function toggleAllTimeHigh() {
  allTimeHigh.value = !allTimeHigh.value;
}

function toggleAllTimeLow() {
  allTimeLow.value = !allTimeLow.value;
}

// apply initial settings when parent loads a screener
watch(() => props.initialSettings, (val) => {
  if (!val) return;
  try {
    allTimeHigh.value = !!val.NewHigh;
    allTimeLow.value = !!val.NewLow;
    changepercSelect.value = val.changePerc?.[2] ?? changepercSelect.value;
    ma200Select.value = val.MA200?.[2] ?? ma200Select.value;
    ma50Select.value = val.MA50?.[2] ?? ma50Select.value;
    ma20Select.value = val.MA20?.[2] ?? ma20Select.value;
    ma10Select.value = val.MA10?.[2] ?? ma10Select.value;
    priceSelect.value = val.CurrentPrice?.[2] ?? priceSelect.value;
    // Set display values
    changepercDisplay.value = changepercOptions.value.find(opt => opt.value === changepercSelect.value)?.display ?? '-';
    ma200Display.value = ma200Options.value.find(opt => opt.value === ma200Select.value)?.display ?? '-';
    ma50Display.value = ma50Options.value.find(opt => opt.value === ma50Select.value)?.display ?? '-';
    ma20Display.value = ma20Options.value.find(opt => opt.value === ma20Select.value)?.display ?? '-';
    ma10Display.value = ma10Options.value.find(opt => opt.value === ma10Select.value)?.display ?? '-';
    priceDisplay.value = priceOptions.value.find(opt => opt.value === priceSelect.value)?.display ?? '-';
    // set numeric inputs if provided
    const setVal = (id: string, v: any) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = v ?? '';
    };
    setVal('changeperc1', val.changePerc?.[0] ?? '');
    setVal('changeperc2', val.changePerc?.[1] ?? '');
    setVal('weekhigh1', val.PercOffWeekHigh?.[0] ?? '');
    setVal('weekhigh2', val.PercOffWeekHigh?.[1] ?? '');
    setVal('weeklow1', val.PercOffWeekLow?.[0] ?? '');
    setVal('weeklow2', val.PercOffWeekLow?.[1] ?? '');
  } catch (e) {
    // ignore
  }
}, { immediate: true });

// updates screener value with price performance parameters 
async function SetPricePerformance() {
  try {
    if (!props.selectedScreener) {
      emit('notify', { message: t('params.errorSelectScreener'), type: 'error' });
      emit('fetchScreeners', props.selectedScreener);
      return;
    }
    // Defensive DOM element access and typing
    const changeperc1Input = document.getElementById('changeperc1') as HTMLInputElement | null;
    const changeperc2Input = document.getElementById('changeperc2') as HTMLInputElement | null;
    const weekhigh1Input = document.getElementById('weekhigh1') as HTMLInputElement | null;
    const weekhigh2Input = document.getElementById('weekhigh2') as HTMLInputElement | null;
    const weeklow1Input = document.getElementById('weeklow1') as HTMLInputElement | null;
    const weeklow2Input = document.getElementById('weeklow2') as HTMLInputElement | null;
    if (!changeperc1Input || !changeperc2Input || !weekhigh1Input || !weekhigh2Input || !weeklow1Input || !weeklow2Input) {
      emit('notify', { message: t('params.errorInputNotFound'), type: 'error' });
      emit('fetchScreeners', props.selectedScreener);
      return;
    }
    // Validate min/max pairs: change %, 52w high, 52w low
    const pairs = [
      {
        min: changeperc1Input.value,
        max: changeperc2Input.value,
        label: 'Change %',
        transform: (v: string) => v.trim() === '' ? null : parseFloat(v) / 100
      },
      {
        min: weekhigh1Input.value,
        max: weekhigh2Input.value,
        label: '% off 52weekhigh',
        transform: (v: string) => v.trim() === '' ? null : parseFloat(v)
      },
      {
        min: weeklow1Input.value,
        max: weeklow2Input.value,
        label: '% off 52weeklow',
        transform: (v: string) => v.trim() === '' ? null : parseFloat(v)
      }
    ];
    // Consider dropdowns and checkboxes as valid inputs as well (compute early so we can relax numeric validation)
    const dropdownOrCheckboxHasValue = (
      changepercSelect.value !== '-' ||
      ma200Select.value !== '-' ||
      ma50Select.value !== '-' ||
      ma20Select.value !== '-' ||
      ma10Select.value !== '-' ||
      priceSelect.value !== '-' ||
      allTimeHigh.value ||
      allTimeLow.value
    );

    let hasAnyValue = false;
    for (const pair of pairs) {
      const minVal = pair.transform(pair.min);
      const maxVal = pair.transform(pair.max);
      // If both missing, skip this pair
      if (minVal === null && maxVal === null) {
        continue;
      }
      // If both present and valid, check order
      if (minVal !== null && !isNaN(minVal) && maxVal !== null && !isNaN(maxVal)) {
        if (minVal >= maxVal) {
          emit('notify', { message: `${t('params.errorMinMax')} (${pair.label})`, type: 'error' });
          emit('fetchScreeners', props.selectedScreener);
          return;
        }
      }
      // If at least one value is valid, mark as having a value
      if ((minVal !== null && !isNaN(minVal)) || (maxVal !== null && !isNaN(maxVal))) {
        hasAnyValue = true;
      } else {
        // If both are present but both invalid:
        // - If a dropdown/checkbox has a value, we allow it (don't fail here)
        // - Otherwise, treat as an error
        if (!dropdownOrCheckboxHasValue) {
          emit('notify', { message: `${t('params.errorEnterNumber')} (${pair.label})`, type: 'error' });
          emit('fetchScreeners', props.selectedScreener);
          return;
        }
      }
    }
    // If at least one numeric pair or any dropdown/checkbox has a value, ok
    if (!hasAnyValue && !dropdownOrCheckboxHasValue) {
      emit('notify', { message: t('params.errorEnterNumber'), type: 'error' });
      emit('fetchScreeners', props.selectedScreener);
      return;
    }
    // Prepare values for request
  // normalize numeric values: transform may return NaN for invalid inputs — convert those to null
  const raw_changeperc1 = pairs[0].transform(pairs[0].min);
  const raw_changeperc2 = pairs[0].transform(pairs[0].max);
  const raw_weekhigh1 = pairs[1].transform(pairs[1].min);
  const raw_weekhigh2 = pairs[1].transform(pairs[1].max);
  const raw_weeklow1 = pairs[2].transform(pairs[2].min);
  const raw_weeklow2 = pairs[2].transform(pairs[2].max);

  const changeperc1 = typeof raw_changeperc1 === 'number' && !isNaN(raw_changeperc1) ? raw_changeperc1 : null;
  const changeperc2 = typeof raw_changeperc2 === 'number' && !isNaN(raw_changeperc2) ? raw_changeperc2 : null;
  const weekhigh1 = typeof raw_weekhigh1 === 'number' && !isNaN(raw_weekhigh1) ? raw_weekhigh1 : null;
  const weekhigh2 = typeof raw_weekhigh2 === 'number' && !isNaN(raw_weekhigh2) ? raw_weekhigh2 : null;
  const weeklow1 = typeof raw_weeklow1 === 'number' && !isNaN(raw_weeklow1) ? raw_weeklow1 : null;
  const weeklow2 = typeof raw_weeklow2 === 'number' && !isNaN(raw_weeklow2) ? raw_weeklow2 : null;
    const changepercselect = changepercSelect.value;
    const alltimehigh = allTimeHigh.value ? 'yes' : 'no';
    const alltimelow = allTimeLow.value ? 'yes' : 'no';
    const ma200 = ma200Select.value;
    const ma50 = ma50Select.value;
    const ma20 = ma20Select.value;
    const ma10 = ma10Select.value;
    const pricevalue = priceSelect.value;

    const response = await fetch('/api/screener/price-performance', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify({
        value1: changeperc1,
        value2: changeperc2,
        value3: changepercselect,
        value4: weekhigh1,
        value5: weekhigh2,
        value6: weeklow1,
        value7: weeklow2,
        value8: alltimehigh,
        value9: alltimelow,
        value10: ma200,
        value11: ma50,
        value12: ma20,
        value13: ma10,
        value14: pricevalue,
        screenerName: props.selectedScreener,
        user: props.user
      })
    });
    if (response.status === 200) {
      emit('fetchScreeners', props.selectedScreener);
    } else {
      const data = await response.json();
      emit('notify', { message: data?.message || `Error: ${response.status} ${response.statusText}`, type: 'error' });
      emit('fetchScreeners', props.selectedScreener);
    }
  } catch (error: unknown) {
    let message = 'Unknown error';
    if (typeof error === 'object' && error !== null) {
      if ('response' in error && typeof error.response === 'object' && error.response !== null && 'status' in error.response && error.response.status === 400) {
        const data = 'data' in error.response && typeof error.response.data === 'object' ? error.response.data : undefined;
        message = (data && 'message' in data && typeof data.message === 'string' ? data.message : undefined) || 'Bad request';
      } else if ('message' in error && typeof error.message === 'string') {
        message = error.message;
      }
    }
    emit('notify', { message, type: 'error' });
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

/* Performance Sections */
.perf-section {
  margin-bottom: 12px;
}

.perf-section:last-child {
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

/* Checkbox Group */
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.custom-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  background-color: var(--base3);
  border: 1px solid var(--base4);
}

.custom-checkbox:hover {
  background-color: var(--base4);
  border-color: var(--text2);
}

.custom-checkbox.checked {
  background-color: var(--accent1);
  color: var(--text3);
  border-color: var(--accent1);
}

.checkmark {
  width: 10px;
  height: 10px;
  background-color: var(--text2);
  border-radius: 50%;
  margin-right: 8px;
  display: inline-block;
  transition: all 0.2s ease;
  border: 2px solid var(--text2);
}

.custom-checkbox.checked .checkmark {
  background-color: var(--text3);
  border-color: var(--text3);
}

/* MA Group */
.ma-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.ma-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background-color: var(--base3);
  border: 1px solid var(--base4);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.ma-item:hover {
  background-color: var(--base4);
  border-color: var(--text2);
}

.ma-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text1);
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