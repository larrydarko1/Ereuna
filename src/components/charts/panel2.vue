<template>
  <div class="watch-panel-editor-backdrop" @click.self="$emit('close')" role="dialog" aria-modal="true" aria-label="Edit Summary Fields">
    <div class="watch-panel-editor-modal" role="document">
      <h2 id="summary-editor-title">Edit Summary Fields</h2>
      <div class="sections-list" role="list" aria-labelledby="summary-editor-title">
        <div
          v-for="(field, index) in summaryFields"
          :key="index"
          class="section-mini"
          :class="{ 'hidden-section': field.hidden }"
          draggable="true"
          @dragstart="dragStart($event, index)"
          @dragover="dragOver($event)"
          @drop="drop($event, index)"
          role="listitem"
          :aria-label="field.name + (field.hidden ? ' (hidden)' : '')"
        >
          <span class="mobile-arrows">
            <button
              class="arrow-btn"
              :disabled="index === 0"
              @click="moveFieldUp(index)"
              aria-label="Move field up"
            >▲</button>
            <button
              class="arrow-btn"
              :disabled="index === summaryFields.length - 1"
              @click="moveFieldDown(index)"
              aria-label="Move field down"
            >▼</button>
          </span>
          <button
            class="hide-button"
            :class="{ 'hidden-button': field.hidden }"
            @click="toggleHidden(index)"
            :aria-label="field.hidden ? 'Add field to summary' : 'Remove field from summary'"
          >
            {{ field.hidden ? 'Add' : 'Remove' }}
          </button>
          <span class="section-name">{{ field.name }}</span>
        </div>
      </div>
      <div class="nav-buttons">
        <button class="nav-button" @click="$emit('close')" aria-label="Close editor">Close</button>
        <button class="nav-button" @click="resetOrder" aria-label="Reset summary fields order">Reset</button>
        <button class="nav-button" @click="updatePanel2" aria-label="Submit summary fields">Submit</button>
      </div>
      <NotificationPopup v-if="errorMsg" :message="errorMsg" type="error" @close="errorMsg = ''" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useUserStore } from '@/store/store';
import NotificationPopup from '@/components/NotificationPopup.vue';

interface SummaryField {
  order: number;
  tag: string;
  name: string;
  hidden: boolean;
}

const userStore = useUserStore();
const user = computed(() => userStore.getUser);
const apiKey = import.meta.env.VITE_EREUNA_KEY;
const emit = defineEmits(['close', 'updated', 'panel-updated']);

const initialFields: SummaryField[] = [
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
  { order: 42, tag: 'FundCategory', name: 'Fund Category', hidden: false },
  { order: 43, tag: 'FundFamily', name: 'Fund Family', hidden: false },
  { order: 44, tag: 'NetExpenseRatio', name: 'Net Expense Ratio', hidden: false },
  { order: 45, tag: 'IntrinsicValue', name: 'Intrinsic Value', hidden: false },
  { order: 46, tag: 'CAGR', name: 'CAGR', hidden: false },
  { order: 47, tag: 'CAGRYears', name: 'CAGR Years', hidden: false },
  { order: 48, tag: 'Description', name: 'Description', hidden: false },
];


const summaryFields = ref<SummaryField[]>(initialFields.map(field => ({ ...field })));

const dragStart = (event: DragEvent, index: number) => {
  event.dataTransfer?.setData('index', String(index));
  event.dataTransfer!.effectAllowed = 'move';
};

const dragOver = (event: DragEvent) => {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
};

const drop = (event: DragEvent, index: number) => {
  const draggedIndex = Number(event.dataTransfer?.getData('index'));
  if (isNaN(draggedIndex)) return;

  const draggedField = summaryFields.value[draggedIndex];
  summaryFields.value.splice(draggedIndex, 1);
  summaryFields.value.splice(index, 0, draggedField);
  updateOrder();
};

const toggleHidden = (index: number) => {
  summaryFields.value[index].hidden = !summaryFields.value[index].hidden;
};

function updateOrder() {
  summaryFields.value.forEach((section: SummaryField, index: number) => {
    section.order = index + 1;
  });
}

const resetOrder = () => {
  summaryFields.value = initialFields.map(field => ({ ...field }));
  updateOrder();
};

const errorMsg = ref('');

async function updatePanel2() {
  try {
    if (!user.value?.Username || user.value.Username.trim().length === 0) {
      errorMsg.value = 'User not logged in. Please log in to save changes.';
      return;
    }

    summaryFields.value.sort((a, b) => a.order - b.order);

    const newListOrder = summaryFields.value.map((section, index) => ({
      order: index + 1,
      tag: section.tag,
      name: section.name,
      hidden: section.hidden,
    }));
    const requestBody = {
      username: user.value.Username,
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
    errorMsg.value = 'Error updating summary fields. Please try again.';
  }
}

async function fetchPanel2() {
  try {
    if (!user.value?.Username || user.value.Username.trim().length === 0) {
      summaryFields.value = initialFields.map(field => ({ ...field }));
      return;
    }

    const headers = { 'X-API-KEY': apiKey };
    const response = await fetch(`/api/panel2?username=${user.value.Username}`, { headers });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const newPanel = await response.json();

    // Merge backend fields with initialFields for robust UI
    if (newPanel.panel2 && Array.isArray(newPanel.panel2) && newPanel.panel2.length) {
      // Create a map for quick lookup of user-saved fields
      const userMap = new Map(newPanel.panel2.map((f: any) => [f.tag, f]));
      // Start with user-saved fields
      const merged = [...newPanel.panel2];
      // Add any new fields from initialFields that aren't in user-saved data
      initialFields.forEach((field) => {
        if (!userMap.has(field.tag)) {
          merged.push({ ...field });
        }
      });
      // Sort by order (user order if present, else default)
      merged.sort((a, b) => a.order - b.order);
      summaryFields.value = merged;
    } else {
      summaryFields.value = initialFields.map(field => ({ ...field }));
    }
  } catch (error) {
    errorMsg.value = 'Error loading summary fields.';
    summaryFields.value = initialFields.map(field => ({ ...field }));
  }
}

onMounted(() => {
  fetchPanel2();
});


function moveFieldUp(index: number) {
  if (index > 0) {
    const temp = summaryFields.value[index - 1];
    summaryFields.value[index - 1] = summaryFields.value[index];
    summaryFields.value[index] = temp;
    updateOrder();
  }
}

function moveFieldDown(index: number) {
  if (index < summaryFields.value.length - 1) {
    const temp = summaryFields.value[index + 1];
    summaryFields.value[index + 1] = summaryFields.value[index];
    summaryFields.value[index] = temp;
    updateOrder();
  }
}

</script>

<style scoped>
.watch-panel-editor-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: color-mix(in srgb, var(--base1) 70%, transparent);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.watch-panel-editor-modal {
  background: color-mix(in srgb, var(--base2) 85%, transparent);
  color: var(--text3);
  padding: 2.5rem 2rem 2rem 2rem;
  border-radius: 18px;
  min-width: 340px;
  box-shadow: 0 8px 32px color-mix(in srgb, var(--base1) 35%, transparent);
  border: 1.5px solid var(--base4);
  backdrop-filter: blur(8px);
  transition: box-shadow 0.2s;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.watch-panel-editor-modal h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  letter-spacing: 0.02em;
  color: var(--accent1);
  text-align: left;
}

.sections-list {
  margin-bottom: 1.5rem;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 2px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-mini {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--base4);
  border-radius: 6px;
  padding: 0.5rem 0.8rem;
  transition: background 0.2s;
  font-size: 1.05rem;
  font-weight: 500;
  letter-spacing: 0.03em;
  color: var(--accent3);
  cursor: grab;
}

.section-mini:active {
  cursor: grabbing;
}

.section-name {
  flex: 1;
  color: var(--text1);
}

.hidden-section {
  background-color: transparent;
  color: var(--text3);
  border: none;
  opacity: 0.5;
  text-decoration: line-through;
}

.hide-button {
  background: transparent;
  border: 1px solid var(--accent1);
  color: var(--accent1);
  border-radius: 5px;
  cursor: pointer;
  padding: 0.3rem 0.9rem;
  font-size: 0.95rem;
  font-weight: 500;
  transition: background 0.2s, color 0.2s;
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

.mobile-arrows {
  display: flex;
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

.nav-buttons {
  display: flex;
  gap: 10px;
  margin-top: 1.5rem;
}

.nav-button {
  width: 100%;
  padding: 0.7rem 0;
  border-radius: 8px;
  border: none;
  background: var(--accent1);
  color: var(--text3);
  font-weight: 600;
  font-size: 1.05rem;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}
.nav-button:hover {
  background: var(--accent2);
  color: var(--text4);
  transform: scale(1.03);
}

/* Mobile version */
@media (max-width: 1150px) {
  .watch-panel-editor-modal {
    width: 90%;
    min-width: unset;
    padding: 1.5rem 0.7rem 1rem 0.7rem;
  }
  .sections-list {
    max-height: 180px;
  }
  .section-mini {
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
  flex-direction: column;
  gap: 2px;
  margin-right: 6px;
}}

</style>