<template>
 <div :class="[showPricePerf ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div
              style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
              <p>Price Performance</p>
              <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                @mouseover="handleMouseOver($event, 'perf')" @mouseout="handleMouseOut">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                    d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                    stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
                  <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)"
                    stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
                  <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round"
                    stroke-linejoin="round"></path>
                </g>
              </svg>
            </div>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showPricePerf" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showPricePerf">
            <div class="DataInputs11">
              <p style="text-align: center;">Change %</p>
              <div style="display: flex; justify-content: center; align-items: center; border: none;">
                <input class="input" id="changeperc1" type="text" style="width: 70px; margin: 0 5px;" placeholder="Min">
                <input class="input" id="changeperc2" type="text" style="width: 70px; margin: 0 5px;" placeholder="Max">
                <div class="changeperc-select-container">
                  <div class="changeperc-dropdown-btn">
                    <p class="selected-value">{{ changepercSelect }}</p>
                  </div>
                  <div class="changeperc-dropdown-menu">
                    <div v-for="(option, index) in changepercOptions" :key="index"
                      @click="selectChangepercOption(option)">
                      {{ option }}
                    </div>
                  </div>
                </div>
              </div>
              <div style="border: none;">
                <p style="text-align: center;">% off 52weekhigh</p>
                <div style="display: flex; justify-content: center; align-items: center; border:none;">
                  <input class="input" type="text" id="weekhigh1" style="width: 70px; margin: 0 5px;" placeholder="Min">
                  <input class="input" type="text" id="weekhigh2" style="width: 70px; margin: 0 5px;" placeholder="Max">
                </div>
                <p style="text-align: center;">% off 52weeklow</p>
                <div style="display: flex; justify-content: center; align-items: center; border:none;">
                  <input class="input" type="text" id="weeklow1" style="width: 70px; margin: 0 5px;" placeholder="Min">
                  <input class="input" type="text" id="weeklow2" style="width: 70px; margin: 0 5px;" placeholder="Max">
                </div>
              </div>
              <div style="display: flex; flex-direction: column; align-items: center; border:none;">
                <br>
                <div class="custom-checkbox" :class="{ checked: allTimeHigh }" @click="toggleAllTimeHigh">
                  <span class="checkmark"></span>
                  New All time High
                </div>
                <div class="custom-checkbox" :class="{ checked: allTimeLow }" @click="toggleAllTimeLow">
                  <span class="checkmark"></span>
                  New All time Low
                </div>
              </div>
              <br>
              <div style="display: flex; flex-direction: column; align-items: center; border: none;">
                <div style="display: flex; align-items: center; border: none;">
                  <p style="margin-right: 10px;">200 DMA</p>
                  <div class="ma200-select-container">
                    <div class="ma200-dropdown-btn">
                      <p class="selected-value">{{ ma200Select }}</p>
                    </div>
                    <div class="ma200-dropdown-menu">
                      <div v-for="(option, index) in ma200Options" :key="index" @click="selectMa200Option(option)">
                        {{ option }}
                      </div>
                    </div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; border: none;">
                  <p style="margin-right: 10px;">50 DMA</p>
                  <div class="ma50-select-container">
                    <div class="ma50-dropdown-btn">
                      <p class="selected-value">{{ ma50Select }}</p>
                    </div>
                    <div class="ma50-dropdown-menu">
                      <div v-for="(option, index) in ma50Options" :key="index" @click="selectMa50Option(option)">
                        {{ option }}
                      </div>
                    </div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; border: none;">
                  <p style="margin-right: 10px;">20 DMA</p>
                  <div class="ma20-select-container">
                    <div class="ma20-dropdown-btn">
                      <p class="selected-value">{{ ma20Select }}</p>
                    </div>
                    <div class="ma20-dropdown-menu">
                      <div v-for="(option, index) in ma20Options" :key="index" @click="selectMa20Option(option)">
                        {{ option }}
                      </div>
                    </div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; border: none;">
                  <p style="margin-right: 10px;">10 DMA</p>
                  <div class="ma10-select-container">
                    <div class="ma10-dropdown-btn">
                      <p class="selected-value">{{ ma10Select }}</p>
                    </div>
                    <div class="ma10-dropdown-menu">
                      <div v-for="(option, index) in ma10Options" :key="index" @click="selectMa10Option(option)">
                        {{ option }}
                      </div>
                    </div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; border: none;">
                  <p style="margin-right: 10px;">Price</p>
                  <div class="price-select-container">
                    <div class="price-dropdown-btn">
                      <p class="selected-value">{{ priceSelect }}</p>
                    </div>
                    <div class="price-dropdown-menu">
                      <div v-for="(option, index) in priceOptions" :key="index" @click="selectPriception(option)">
                        {{ option }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="row">
              <button class="btns" style="float:right" @click="SetPricePerformance()">
                <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32"
                  style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1"
                  xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/"
                  xmlns:xlink="http://www.w3.org/1999/xlink">
                  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                  <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                  <g id="SVGRepo_iconCarrier">
                    <path
                      d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z">
                    </path>
                    <g></g>
                  </g>
                </svg>
              </button>
              <button class="btnsr" style="float:right" @click="emit('reset'), showPricePerf = false">
                <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg"
                  transform="rotate(90)">
                  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                  <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                  <g id="SVGRepo_iconCarrier">
                    <path
                      d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0"
                      fill-rule="evenodd"></path>
                  </g>
                </svg>
              </button>
            </div>
          </div>
        </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits(['fetchScreeners', 'handleMouseOver', 'handleMouseOut', 'reset']);

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
}>();

let showPricePerf = ref(false);
const changepercOptions = ref([
  '-',
  '1D',
  '1W',
  '1M',
  '4M',
  '6M',
  '1Y',
  'YTD'
]);

const ma200Options = ref([
  '-',
  'abv50',
  'abv20',
  'abv10',
  'abvPrice',
  'blw50',
  'blw20',
  'blw10',
  'blwPrice'
]);

const ma50Options = ref([
  '-',
  'abv200',
  'abv20',
  'abv10',
  'abvPrice',
  'blw200',
  'blw20',
  'blw10',
  'blwPrice'
]);

const ma20Options = ref([
  '-',
  'abv200',
  'abv50',
  'abv10',
  'abvPrice',
  'blw200',
  'blw50',
  'blw10',
  'blwPrice'
]);

const ma10Options = ref([
  '-',
  'abv200',
  'abv50',
  'abv20',
  'abvPrice',
  'blw200',
  'blw50',
  'blw20',
  'blwPrice'
]);

const priceOptions = ref([
  '-',
  'abv200',
  'abv50',
  'abv20',
  'abv10',
  'blw200',
  'blw50',
  'blw20',
  'blw10'
]);

const changepercSelect = ref('-');
const ma200Select = ref('-');
const ma50Select = ref('-');
const ma20Select = ref('-');
const ma10Select = ref('-');
const priceSelect = ref('-');

function selectChangepercOption(option: string) {
  changepercSelect.value = option;
}

function selectMa200Option(option: string) {
  ma200Select.value = option;
}

function selectMa50Option(option: string) {
  ma50Select.value = option;
}

function selectMa20Option(option: string) {
  ma20Select.value = option;
}

function selectMa10Option(option: string) {
  ma10Select.value = option;
}

function selectPriception(option: string) {
  priceSelect.value = option;
}

const allTimeHigh = ref(false);
const allTimeLow = ref(false);

function toggleAllTimeHigh() {
  allTimeHigh.value = !allTimeHigh.value;
}

function toggleAllTimeLow() {
  allTimeLow.value = !allTimeLow.value;
}

// updates screener value with price performance parameters 
async function SetPricePerformance() {
  try {
    if (!props.selectedScreener) {
      // Cannot assign to readonly prop, use notification pattern
      if (props.notification) {
        props.notification.message = 'Please select a screener';
        props.notification.type = 'error';
      }
      throw new Error('Please select a screener');
    }
    // Defensive DOM element access and typing
    const changeperc1Input = document.getElementById('changeperc1') as HTMLInputElement | null;
    const changeperc2Input = document.getElementById('changeperc2') as HTMLInputElement | null;
    const weekhigh1Input = document.getElementById('weekhigh1') as HTMLInputElement | null;
    const weekhigh2Input = document.getElementById('weekhigh2') as HTMLInputElement | null;
    const weeklow1Input = document.getElementById('weeklow1') as HTMLInputElement | null;
    const weeklow2Input = document.getElementById('weeklow2') as HTMLInputElement | null;
    if (!changeperc1Input || !changeperc2Input || !weekhigh1Input || !weekhigh2Input || !weeklow1Input || !weeklow2Input) {
      throw new Error('Input elements not found');
    }
    const changeperc1 = parseFloat(changeperc1Input.value) / 100;
    const changeperc2 = parseFloat(changeperc2Input.value) / 100;
    const changepercselect = changepercSelect.value;
    const weekhigh1 = parseFloat(weekhigh1Input.value);
    const weekhigh2 = parseFloat(weekhigh2Input.value);
    const weeklow1 = parseFloat(weeklow1Input.value);
    const weeklow2 = parseFloat(weeklow2Input.value);
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
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.message === 'updated successfully') {
      emit('fetchScreeners', props.selectedScreener);
    } else {
      throw new Error('Error updating');
    }
  } catch (error: unknown) {
    // Defensive error handling for unknown type
    let message = 'Unknown error';
    if (typeof error === 'object' && error !== null) {
      // Check for axios-style error
      if ('response' in error && typeof error.response === 'object' && error.response !== null && 'status' in error.response && error.response.status === 400) {
        // Defensive type guard for error.response.data
        const data = 'data' in error.response && typeof error.response.data === 'object' ? error.response.data : undefined;
        message = (data && 'message' in data && typeof data.message === 'string' ? data.message : undefined) || 'Bad request';
      } else if ('message' in error && typeof error.message === 'string') {
        message = error.message;
      }
    }
    if (props.notification) {
      props.notification.message = message;
      props.notification.type = 'error';
    }
    emit('fetchScreeners', props.selectedScreener);
  }
}

</script>

<style scoped>

.param-s1 {
  margin: 3px;
  padding: 5px;
  color: var(--text2);
  background-color: var(--base2);
  border: none;
  height: 20px;
  position: relative;
}

.param-s1-expanded {
   margin: 3px;
  padding: 5px;
  color: var(--text2);
  background-color: var(--base2);
  border: none;
  height: 450px;
  position: relative;
}

.btns {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  bottom: 0%;
  left: 89%;
}

.btnsr {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  bottom: 0%;
  left: 80%;
}

.row {
  border: none;
  margin: none;
  padding: none;
}

.left {
  border: none;
  outline: none;
  display: inline-flex;
  width: 100px;
  height: 15px;
  margin: 5px;
  position: absolute;
  top: 35%;
  left: 2%;
}

.right {
  border: none;
  outline: none;
  display: inline-flex;
  width: 100px;
  height: 15px;
  margin: 5px;
  position: absolute;
  top: 60%;
  left: 2%;
}

.iconbtn {
  width: 15px;
  height: 15px;
  opacity: 0.60;
  cursor: pointer;
}

.iconbtn:hover {
  opacity: 1;
}

.question-img {
  width: 15px;
  cursor: pointer;
  margin-left: 5px;
}

label,
input,
p {
  border: none;
}

.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
  margin: none;
  padding: none;
}

/* Hide default HTML checkbox */
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
  margin: none;
  padding: none;
}

/* The slider */
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--base3);
  -webkit-transition: .3s;
  transition: .3s;
  margin: none;
  padding: none;
}

.slider:before {
  position: absolute;
  content: "";
  height: 13px;
  width: 13px;
  left: 2px;
  bottom: 3.5px;
  background-color: var(--text3);
  -webkit-transition: .3s;
  transition: .3s;
  margin: none;
  padding: none;
}

input:checked+.slider {
  background-color: var(--accent1);
}

input:focus+.slider {
  box-shadow: 0 0 1px var(--accent1);
}

input:checked+.slider:before {
  -webkit-transform: translateX(13px);
  -ms-transform: translateX(13px);
  transform: translateX(22px);
}

/* Rounded sliders */
.slider.round {
  border-radius: 17px;
}

.slider.round:before {
  border-radius: 50%;
}

.input {
  border-radius: 5px;
  padding: 5px 5px 5px 15px;
  margin: 7px;
  width: 160px;
  outline: none;
  color: var(--text1);
  transition: border-color 0.3s, box-shadow 0.3s;
  border: solid 1px var(--base4);
  background-color: var(--base4);
}

.input:focus {
  border-color: var(--accent1);
  outline: none;
}

.custom-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 5px;
  opacity: 0.7;
  transition: opacity 0.3s;
}

.custom-checkbox.checked {
  color: var(--text1);
  opacity: 1;
}

.checkmark {
  width: 8px;
  height: 8px;
  background-color: var(--text1);
  border-radius: 50%;
  margin-right: 5px;
  display: inline-block;
  transition: background-color 0.3s, border-color 0.3s;
}

.custom-checkbox.checked .checkmark {
  background-color: var(--accent1);
  border-color: var(--accent1);
}

.custom-checkbox.checked {
  color: var(--text1);
}

.DataInputs11 {
  position: absolute;
  left: 10%;
  top: 10%;
  border: none;
}

.DataInputs11 p {
  font-weight: bold;
}

.changeperc-select-container {
  position: relative;
  background-color: var(--base2);
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 20px;
  height: 5px;
  border-radius: 5px;
  margin-left: 4px;
  padding: 7px;
  z-index: 1000;
  border: solid 2px var(--base1);
}

.changeperc-dropdown-btn {
  background-color: transparent;
  border: none;
  cursor: pointer;
}

.changeperc-dropdown-menu {
  display: none;
  cursor: pointer;
  width: 125px;
  position: absolute;
  z-index: 1000;
  top: -10px;
  left: 20px;
}

.changeperc-dropdown-menu>div {
  background-color: var(--base1);
  padding: 5px;
  height: 14px;
  display: flex;
  align-items: center;
}

.changeperc-dropdown-menu>div:hover {
  background-color: var(--base2);
}

.changeperc-dropdown-btn:hover+.changeperc-dropdown-menu,
.changeperc-dropdown-menu:hover {
  display: block;
}

.ma200-select-container,
.ma50-select-container,
.ma20-select-container,
.ma10-select-container,
.price-select-container {
  position: relative;
  background-color: var(--base2);
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 40px;
  height: 5px;
  border-radius: 5px;
  margin-left: 4px;
  padding: 7px;
  border: solid 2px var(--base1);
}

.ma200-dropdown-btn,
.ma50-dropdown-btn,
.ma20-dropdown-btn,
.ma10-dropdown-btn,
.price-dropdown-btn {
  background-color: transparent;
  border: none;
  cursor: pointer;
}

.ma200-dropdown-menu,
.ma50-dropdown-menu,
.ma20-dropdown-menu,
.ma10-dropdown-menu,
.price-dropdown-menu {
  display: none;
  cursor: pointer;
  width: 125px;
  position: absolute;
  z-index: 1000;
  top: -10px;
  left: 20px;
}

.ma200-dropdown-menu>div,
.ma50-dropdown-menu>div,
.ma20-dropdown-menu>div,
.ma10-dropdown-menu>div,
.price-dropdown-menu>div {
  background-color: var(--base1);
  padding: 5px;
  height: 14px;
  display: flex;
  align-items: center;
}

.ma200-dropdown-menu>div:hover,
.ma50-dropdown-menu>div:hover,
.ma20-dropdown-menu>div:hover,
.ma10-dropdown-menu>div:hover,
.price-dropdown-menu>div:hover {
  background-color: var(--base2);
  color: var(--text1);
}

.ma200-dropdown-btn:hover+.ma200-dropdown-menu,
.ma200-dropdown-menu:hover,
.ma50-dropdown-btn:hover+.ma50-dropdown-menu,
.ma50-dropdown-menu:hover,
.ma20-dropdown-btn:hover+.ma20-dropdown-menu,
.ma20-dropdown-menu:hover,
.ma10-dropdown-btn:hover+.ma10-dropdown-menu,
.ma10-dropdown-menu:hover,
.price-dropdown-btn:hover+.price-dropdown-menu,
.price-dropdown-menu:hover {
  display: block;
}

</style>