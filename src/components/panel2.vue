<template>
  <div class="edit-summary-popup">
    <div class="popup-content">
      <div class="summaryDiv-container">
        <div
          v-for="(field, index) in summaryFields"
          :key="index"
          class="summaryDiv"
          :class="{ 'hidden-section': field.hidden }"
          draggable="true"
          @dragstart="dragStart($event, index)"
          @dragover="dragOver($event)"
          @drop="drop($event, index)"
        >
          <!-- Mobile-only up/down arrows -->
          <span class="mobile-arrows">
            <button
              class="arrow-btn"
              :disabled="index === 0"
              @click="moveFieldUp(index)"
              aria-label="Move up"
            >▲</button>
            <button
              class="arrow-btn"
              :disabled="index === summaryFields.length - 1"
              @click="moveFieldDown(index)"
              aria-label="Move down"
            >▼</button>
          </span>
          <button
            class="hide-button"
            :class="{ 'hidden-button': field.hidden }"
            @click="toggleHidden(index)"
          >
            {{ field.hidden ? 'Add' : 'Remove' }}
          </button>
          {{ field.name }}
        </div>
      </div>
      <div class="nav-buttons">
        <button class="nav-button" @click="$emit('close')">Close</button>
        <button class="nav-button" @click="resetOrder">Reset</button>
        <button class="nav-button" @click="updatePanel2">Submit</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineEmits, onMounted } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
let user = store.getters.getUser;
const apiKey = import.meta.env.VITE_EREUNA_KEY;
const emit = defineEmits(['close', 'updated', 'panel-updated']);

const initialFields = [
  { order: 1, tag: 'Symbol', name: 'Symbol', hidden: false },
  { order: 2, tag: 'CompanyName', name: 'Company Name', hidden: false },
  { order: 3, tag: 'AssetType', name: 'Asset Type', hidden: false },
  { order: 4, tag: 'Exchange', name: 'Exchange', hidden: false },
  { order: 5, tag: 'ISIN', name: 'ISIN', hidden: false },
  { order: 6, tag: 'IPODate', name: 'IPO Date', hidden: false },
  { order: 7, tag: 'Sector', name: 'Sector', hidden: false },
  { order: 8, tag: 'Industry', name: 'Industry', hidden: false },
  { order: 9, tag: 'ReportedCurrency', name: 'Reported Currency', hidden: false },
  { order: 10, tag: 'TechnicalScore1W', name: 'Technical Score (1W)', hidden: false },
  { order: 11, tag: 'TechnicalScore1M', name: 'Technical Score (1M)', hidden: false },
  { order: 12, tag: 'TechnicalScore4M', name: 'Technical Score (4M)', hidden: false },
  { order: 13, tag: 'MarketCap', name: 'Market Cap', hidden: false },
  { order: 14, tag: 'SharesOutstanding', name: 'Shares Outstanding', hidden: false },
  { order: 15, tag: 'Location', name: 'Location', hidden: false },
  { order: 16, tag: 'DividendDate', name: 'Dividend Date', hidden: false },
  { order: 17, tag: 'DividendYieldTTM', name: 'Dividend Yield TTM', hidden: false },
  { order: 18, tag: 'BookValue', name: 'Book Value', hidden: false },
  { order: 19, tag: 'PEGRatio', name: 'PEG Ratio', hidden: false },
  { order: 20, tag: 'PERatio', name: 'PE Ratio', hidden: false },
  { order: 21, tag: 'PSRatio', name: 'PS Ratio', hidden: false },
  { order: 22, tag: 'AllTimeHigh', name: 'All Time High', hidden: false },
  { order: 23, tag: 'AllTimeLow', name: 'All Time Low', hidden: false },
  { order: 24, tag: 'fiftytwoWeekHigh', name: '52wk High', hidden: false },
  { order: 25, tag: 'fiftytwoWeekLow', name: '52wk Low', hidden: false },
  { order: 26, tag: 'PercentageOff52wkHigh', name: 'Percentage off 52wk High', hidden: false },
  { order: 27, tag: 'PercentageOff52wkLow', name: 'Percentage off 52wk Low', hidden: false },
  { order: 28, tag: 'RSI', name: 'RSI', hidden: false },
  { order: 29, tag: 'Gap', name: 'Gap (%)', hidden: false },
  { order: 30, tag: 'ADV1W', name: 'ADV 1W', hidden: false },
  { order: 31, tag: 'ADV1M', name: 'ADV 1M', hidden: false },
  { order: 32, tag: 'ADV4M', name: 'ADV 4M', hidden: false },
  { order: 33, tag: 'ADV1Y', name: 'ADV 1Y', hidden: false },
  { order: 34, tag: 'RelativeVolume1W', name: 'Relative Volume 1W', hidden: false },
  { order: 35, tag: 'RelativeVolume1M', name: 'Relative Volume 1M', hidden: false },
  { order: 36, tag: 'RelativeVolume6M', name: 'Relative Volume 6M', hidden: false },
  { order: 37, tag: 'RelativeVolume1Y', name: 'Relative Volume 1Y', hidden: false },
  { order: 38, tag: 'AverageVolume1W', name: 'Average Volume 1W', hidden: false },
  { order: 39, tag: 'AverageVolume1M', name: 'Average Volume 1M', hidden: false },
  { order: 40, tag: 'AverageVolume6M', name: 'Average Volume 6M', hidden: false },
  { order: 41, tag: 'AverageVolume1Y', name: 'Average Volume 1Y', hidden: false },
  { order: 42, tag: 'Description', name: 'Description', hidden: false },
];

const summaryFields = ref(initialFields.map(field => ({ ...field })));

const dragStart = (event, index) => {
  event.dataTransfer.setData('index', index);
  event.dataTransfer.effectAllowed = 'move';
};

const dragOver = (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
};

const drop = (event, index) => {
  const draggedIndex = event.dataTransfer.getData('index');
  if (draggedIndex === '') return;

  const draggedField = summaryFields.value[draggedIndex];
  summaryFields.value.splice(draggedIndex, 1);
  summaryFields.value.splice(index, 0, draggedField);
  updateOrder()
};

const toggleHidden = (index) => {
  summaryFields.value[index].hidden = !summaryFields.value[index].hidden;
};

function updateOrder() {
  summaryFields.value.forEach((section, index) => {
    section.order = index + 1;
  });
}

const resetOrder = () => {
  summaryFields.value = initialFields.map(field => ({ ...field }));
  updateOrder()
};

async function updatePanel2() {
  try {
    summaryFields.value.sort((a, b) => a.order - b.order);

    const newListOrder = summaryFields.value.map((section, index) => ({
      order: index + 1,
      tag: section.tag,
      name: section.name,
      hidden: section.hidden,
    }));
    const requestBody = {
      username: user,
      newListOrder,
    };

    const response = await fetch('/api/panel2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Error updating panel order: ${response.status}`);
    }

    // Emit event to inform parent that panel was updated
    emit('panel-updated');
  } catch (error) {
    // error handling if needed
  }
}

async function fetchPanel2() {
  try {
    const headers = { 'X-API-KEY': apiKey };
    const response = await fetch(`/api/panel2?username=${user}`, { headers });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const newPanel = await response.json();
    console.log('Fetched panel data:', newPanel); // Debugging log

    // Defensive: fallback to default if empty
    summaryFields.value = (newPanel.panel2 && newPanel.panel2.length)
      ? newPanel.panel2
      : initialFields.map(field => ({ ...field }));

    console.log('Updated summaryFields:', summaryFields.value); // Debugging log
  } catch (error) {
    console.error('Error fetching panel data:', error);
  }
}

onMounted(() => {
  fetchPanel2();
});


function moveFieldUp(index) {
  if (index > 0) {
    const temp = summaryFields.value[index - 1];
    summaryFields.value[index - 1] = summaryFields.value[index];
    summaryFields.value[index] = temp;
    updateOrder();
  }
}

function moveFieldDown(index) {
  if (index < summaryFields.value.length - 1) {
    const temp = summaryFields.value[index + 1];
    summaryFields.value[index + 1] = summaryFields.value[index];
    summaryFields.value[index] = temp;
    updateOrder();
  }
}


</script>

<style scoped>
.edit-summary-popup {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3);
  z-index: 1000000001;
  display: flex;
  align-items: center;
  justify-content: center;
}

.popup-content {
  background: var(--base2);
  padding: 30px;
  border-radius: 10px;
  min-width: 300px;
  max-height: 80vh;
  overflow-y: auto;
  text-align: center;
}

.summaryDiv-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 500px;
  overflow-y: auto;
}

.summaryDiv {
  background-color: var(--base1);
  padding: 10px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  margin-top: 0;
  user-select: none;
  gap: 10px;
}

.hidden-section {
  opacity: 0.5;
  text-decoration: line-through;
}

.hide-button {
  background: transparent;
  border: 1px solid var(--accent1);
  color: var(--accent1);
  border-radius: 3px;
  cursor: pointer;
  padding: 3px 7px;
  font-size: 12px;
  user-select: none;
  flex-shrink: 0;
  transition: background-color 0.3s ease;
}

.hide-button:hover {
  background-color: var(--accent1);
  color: var(--base2);
}

.hidden-button {
  background-color: var(--accent1);
  color: var(--base2);
  border: none;
}

.nav-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  justify-content: center;
}

.nav-button {
  background-color: var(--accent1);
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  user-select: none;
  font-weight: 600;
  transition: background-color 0.3s ease;
}

.nav-button:hover {
  background-color: var(--accent2);
}

.mobile-arrows {
  display: none;
  flex-direction: column;
  gap: 2px;
  margin-right: 6px;
}

.arrow-btn {
  background: var(--base2);
  border: 1px solid var(--accent2);
  color: var(--accent2);
  border-radius: 3px;
  font-size: 1em;
  width: 24px;
  height: 24px;
  padding: 0;
  cursor: pointer;
  transition: background 0.2s;
}

.arrow-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Mobile version: smaller divs and buttons */
@media (max-width: 1150px) {
  .popup-content {
    min-width: 90vw;
    padding: 10px;
    font-size: 1rem;
  }
  .summaryDiv {
    font-size: 0.85rem;
    padding: 6px 4px;
    border-radius: 7px;
    gap: 6px;
    min-height: 32px;
  }
  .hide-button,
  .arrow-btn {
    font-size: 0.8em;
    padding: 3px 7px;
    height: 28px;
    min-width: 28px;
    border-radius: 4px;
  }
  .arrow-btn {
    width: 20px;
    height: 20px;
    font-size: 0.9em;
    padding: 0;
  }
  .mobile-arrows {
    display: flex;
    gap: 1px;
    margin-right: 2px;
  }
}

</style>
