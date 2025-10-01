<template>
  <div :class="[showRSIModel ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div
              style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
              <p>RSI (Relative Strength Index)</p>
              <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                aria-label="RSI Info" @mouseover="handleMouseOver($event, 'rsi')" @mouseout="handleMouseOut($event)">
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
              <input type="checkbox" id="rsi-check" v-model="showRSIModel" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showRSIModel">
            <div class="row">
              <input class="left input" id="left-rsi" type="number" placeholder="min" min="1" max="100" aria-label="RSI Min">
              <input class="right input" id="right-rsi" type="number" placeholder="max" min="1" max="100" aria-label="RSI Max">
            </div>
            <div class="row">
              <button class="btns" style="float:right" @click="SetRSI()" aria-label="Set RSI">
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
              <button class="btnsr" style="float:right" @click="emit('reset'); emit('update:showRSI', false)" aria-label="Reset RSI">
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
import { ref, computed } from 'vue';

const emit = defineEmits(['fetchScreeners', 'handleMouseOver', 'handleMouseOut', 'reset', 'notify', 'update:showRSI']);

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
  showRSI: { type: Boolean, required: true }
});

const error = ref('');
const isLoading = ref(false);

function showNotification(msg: string) {
  emit('notify', msg);
}

// Computed getter/setter for v-model
const showRSIModel = computed({
  get: () => props.showRSI,
  set: (val: boolean) => emit('update:showRSI', val)
});

// add and or modifies RSI value and sends it
async function SetRSI() {
  error.value = '';
  if (!props.selectedScreener) {
    emit('reset');
    error.value = 'Please select a screener';
    showNotification(error.value);
    emit('fetchScreeners', props.selectedScreener);
    return;
  }
  const leftInput = document.getElementById('left-rsi') as HTMLInputElement | null;
  const rightInput = document.getElementById('right-rsi') as HTMLInputElement | null;
  if (!leftInput || !rightInput) {
    error.value = 'Input elements not found';
    showNotification(error.value);
    emit('fetchScreeners', props.selectedScreener);
    return;
  }
  const leftValue = leftInput.value.trim();
  const rightValue = rightInput.value.trim();
  const leftRSI = leftValue === '' ? null : parseFloat(leftValue);
  const rightRSI = rightValue === '' ? null : parseFloat(rightValue);
  // If both missing or both invalid, error
  if ((leftRSI === null && rightRSI === null) ||
      (leftRSI !== null && isNaN(leftRSI) && rightRSI !== null && isNaN(rightRSI))) {
    error.value = 'Please enter at least one valid number';
    showNotification(error.value);
    emit('fetchScreeners', props.selectedScreener);
    return;
  }
  // If only one is present, allow it (backend will fill missing)
  // If both are present, validate order
  if (leftRSI !== null && !isNaN(leftRSI) && rightRSI !== null && !isNaN(rightRSI)) {
    if (leftRSI >= rightRSI) {
      error.value = 'Min RSI cannot be higher than or equal to max RSI';
      showNotification(error.value);
      emit('fetchScreeners', props.selectedScreener);
      return;
    }
  }
  isLoading.value = true;
  try {
    const response = await fetch('/api/screener/rsi', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify({
        minPrice: leftRSI,
        maxPrice: rightRSI,
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
  height: 120px;
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

.input[type="number"]::-webkit-inner-spin-button,
.input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

</style>
