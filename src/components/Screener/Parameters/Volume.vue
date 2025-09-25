<template>
    <div :class="[showVolume ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div
              style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
              <p>Volume</p>
              <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                @mouseover="handleMouseOver($event, 'volume')" @mouseout="handleMouseOut"
                aria-label="Show info about Volume">
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
              <input type="checkbox" id="price-check" v-model="showVolume" style="border: none;" aria-label="Toggle Volume inputs">
              <span class="slider round" aria-label="Toggle switch"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showVolume">
            <div class="DataInputs">
              <p>Relative Volume</p>
              <div style="display: flex; align-items: center;">
                <input class="input" id="left-relvol" type="text" placeholder="min" style="width: 70px; margin: 0 5px;" aria-label="Relative Volume min">
                <input class="input" id="right-relvol" type="text" placeholder="max"
                  style="width: 70px; margin: 0 5px;" aria-label="Relative Volume max">
                <div class="relvol-select-container" style="margin-left: 5px;">
                  <div class="relvol-dropdown-btn" aria-label="Select Relative Volume period">
                    <p class="selected-value">{{ relVolSelect }}</p>
                  </div>
                  <div class="relvol-dropdown-menu">
                    <div v-for="(option, index) in relVolOptions" :key="index" @click="selectRelVolOption(option)" aria-label="Relative Volume option {{ option }}">
                      {{ option }}
                    </div>
                  </div>
                </div>
              </div>
              <p>Average Volume (1000s)</p>
              <div style="display: flex; align-items: center;">
                <input class="input" id="left-avgvol" type="text" placeholder="min" style="width: 70px; margin: 0 5px;" aria-label="Average Volume min">
                <input class="input" id="right-avgvol" type="text" placeholder="max"
                  style="width: 70px; margin: 0 5px;" aria-label="Average Volume max">
                <div class="avgvol-select-container" style="margin-left: 5px;">
                  <div class="avgvol-dropdown-btn" aria-label="Select Average Volume period">
                    <p class="selected-value">{{ avgVolSelect }}</p>
                  </div>
                  <div class="avgvol-dropdown-menu">
                    <div v-for="(option, index) in avgVolOptions" :key="index" @click="selectAvgVolOption(option)" aria-label="Average Volume option {{ option }}">
                      {{ option }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="row">
              <button class="btns" style="float:right" @click="SetVolume()" aria-label="Set Volume">
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
              <button class="btnsr" style="float:right" @click="emit('reset'), showVolume = false" aria-label="Reset Volume">
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

const emit = defineEmits(['fetchScreeners', 'handleMouseOver', 'handleMouseOut', 'reset', 'notify']);

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
  isScreenerError: { type: Boolean, required: true }
});

let showVolume = ref(false);

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

function selectRelVolOption(option: string) {
  relVolSelect.value = option;
}

function selectAvgVolOption(option: string) {
  avgVolSelect.value = option;
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
  height: 200px;
  position: relative;
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

.DataInputs {
  position: absolute;
  left: 5%;
  top: 15%;
  border: none;
}

.DataInputs input {
  width: 50px;
  margin-right: 5px;
}

.DataInputs p {
  font-weight: bold;
}

.relvol-select-container,
.avgvol-select-container {
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

.relvol-dropdown-btn,
.avgvol-dropdown-btn {
  background-color: transparent;
  border: none;
  cursor: pointer;
}

.relvol-dropdown-menu,
.avgvol-dropdown-menu {
  display: none;
  cursor: pointer;
  width: 125px;
  position: absolute;
  z-index: 1000;
  top: -10px;
  left: 20px;
}

.relvol-dropdown-menu>div,
.avgvol-dropdown-menu>div {
  background-color: var(--base1);
  padding: 5px;
  height: 14px;
  display: flex;
  align-items: center;
}

.relvol-dropdown-menu>div:hover,
.avgvol-dropdown-menu>div:hover {
  background-color: var(--base2);
  color: var(--text1);
}

.relvol-dropdown-btn:hover+.relvol-dropdown-menu,
.relvol-dropdown-menu:hover,
.avgvol-dropdown-btn:hover+.avgvol-dropdown-menu,
.avgvol-dropdown-menu:hover {
  display: block;
}

</style>
