<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-content">
  <button class="close-x" @click="close" aria-label="Close Edit Columns Modal">&times;</button>
      <h2>Edit Columns</h2>
      <div class="attribute-section">
        <div class="available-attributes">
          <div class="section-label">Available Attributes</div>
          <div class="chips">
            <div
              v-for="attr in attributes"
              :key="attr.value"
              class="chip"
              :class="{ selected: localSelected.includes(attr.value) }"
              @click="addAttribute(attr.value)"
              :aria-label="`Add ${attr.label} column`"
            >
              {{ attr.label }}
            </div>
          </div>
        </div>
        <div class="selected-attributes">
          <div class="section-label">Selected Columns</div>
          <div v-if="localSelected.length === 0" class="empty-selected">No columns selected.</div>
          <div v-else class="selected-list">
            <div
              v-for="(attrValue, idx) in localSelected"
              :key="attrValue"
              class="selected-chip"
            >
              <span>{{ getLabel(attrValue) }}</span>
              <button class="move-btn" @click="moveUp(idx)" :disabled="idx === 0" title="Move Up" :aria-label="`Move ${getLabel(attrValue)} up`">▲</button>
              <button class="move-btn" @click="moveDown(idx)" :disabled="idx === localSelected.length - 1" title="Move Down" :aria-label="`Move ${getLabel(attrValue)} down`">▼</button>
              <button class="remove-btn" @click="removeAttribute(attrValue)" title="Remove" :aria-label="`Remove ${getLabel(attrValue)} column`">✕</button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-actions">
  <button type="button" class="trade-btn" @click="submitEditColumn" aria-label="Save selected columns">Save</button>
  <button type="button" class="reset-btn" @click="resetColumns" aria-label="Reset selected columns">Reset</button>
  <button type="button" class="cancel-btn" @click="close" aria-label="Cancel editing columns">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

// Use popup notification pattern
function notify(message: string) {
  emit('notify', message);
}

// Define component props
const props = defineProps({
  showEditColumn: { type: Object, required: true },
  error: { type: Object, required: false },
  user: { type: String, required: true },
  apiKey: { type: String, required: true },
  selectedAttributes: { type: Array, required: true },
})

// Emit events for closing the modal, updating columns, reloading data, and showing notifications
const emit = defineEmits(['close', 'insert', 'update-columns', 'reload-columns', 'notify'])

// Define available attributes for the screener
const attributes = [
  { label: 'Price', value: 'price' },
  { label: 'Market Cap', value: 'market_cap' },
  { label: 'Volume', value: 'volume' },
  { label: 'IPO Date', value: 'ipo' },
  { label: 'Asset Type', value: 'assettype' },
  { label: 'Sector', value: 'sector' },
  { label: 'Exchange', value: 'exchange' },
  { label: 'Country', value: 'country' },
  { label: 'P/E Ratio', value: 'pe_ratio' },
  { label: 'P/S Ratio', value: 'ps_ratio' },
  { label: 'FCF', value: 'fcf' },
  { label: 'Cash & Equivalents', value: 'cash' },
  { label: 'Current Debt', value: 'current_debt' },
  { label: 'Current Assets', value: 'current_assets' },
  { label: 'Current Liabilities', value: 'current_liabilities' },
  { label: 'Current Ratio', value: 'current_ratio' },
  { label: 'ROE', value: 'roe' },
  { label: 'ROA', value: 'roa' },
  { label: 'PEG', value: 'peg' },
  { label: 'EPS', value: 'eps' },
  { label: 'P/B Ratio', value: 'pb_ratio' },
  { label: 'Dividend Yield', value: 'dividend_yield' },
  { label: 'Name', value: 'name' },
  { label: 'Currency', value: 'currency' },
  { label: 'Industry', value: 'industry' },
  { label: 'Book Value', value: 'book_value' },
  { label: 'Shares Outstanding', value: 'shares' },
  { label: 'Technical Score (1W)', value: 'rs_score1w' },
  { label: 'Technical Score (1M)', value: 'rs_score1m' },
  { label: 'Technical Score (4M)', value: 'rs_score4m' },
  { label: 'All Time High', value: 'all_time_high' },
  { label: 'All Time Low', value: 'all_time_low' },
  { label: '52W High', value: 'high_52w' },
  { label: '52W Low', value: 'low_52w' },
  { label: '% Change', value: 'perc_change' },
  { label: 'ISIN', value: 'isin' },
  { label: 'Gap', value: 'gap' },
  { label: 'EV', value: 'ev' },
  { label: 'ADV (1W)', value: 'adv1w' },
  { label: 'ADV (1M)', value: 'adv1m' },
  { label: 'ADV (4M)', value: 'adv4m' },
  { label: 'ADV (1Y)', value: 'adv1y' },
  { label: 'RSI', value: 'rsi' },
  { label: 'Intrinsic Value', value: 'intrinsic_value' },
  { label: 'CAGR', value: 'cagr' },
  { label: 'Fund Family', value: 'fund_family' },
  { label: 'Fund Category', value: 'fund_category' },
  { label: 'Net Expense Ratio', value: 'net_expense_ratio' },
]
// Close the modal
function close() {
  emit('close')
}
const localSelected = ref<string[]>([...props.selectedAttributes as string[]]);

watch(() => props.selectedAttributes, (val) => {
  localSelected.value = [...(val as string[])];
});

// Add an attribute to the selected list
function addAttribute(attrValue: string) {
  if (!localSelected.value.includes(attrValue)) {
    localSelected.value.push(attrValue)
  }
}

// Remove an attribute from the selected list
function removeAttribute(attrValue: string) {
  localSelected.value = localSelected.value.filter(v => v !== attrValue)
}

// Move the selected attribute up in the list
function moveUp(idx: number) {
  if (idx > 0) {
    const arr = localSelected.value
    ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
    localSelected.value = [...arr]
  }
}

// Move the selected attribute down in the list
function moveDown(idx: number) {
  if (idx < localSelected.value.length - 1) {
    const arr = localSelected.value
    ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
    localSelected.value = [...arr]
  }
}

// Get the label for a given attribute value
function getLabel(attrValue: string): string {
  const found = attributes.find(a => a.value === attrValue)
  return found ? found.label : attrValue
}

// Submit the selected columns to the server
async function submitEditColumn() {
  if (localSelected.value.length === 0) {
    notify('Please select at least one column');
    return;
  }
  // Send PATCH request to update columns
  try {
    const endpoint = `/api/update/columns`;
    const payload = {
      user: props.user,
      columns: [...localSelected.value]
    };

    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (response.ok) {
      emit('update-columns', [...localSelected.value]);
      emit('reload-columns');
      emit('close');
    } else {
      notify(responseData.message || 'Failed to update columns');
    }
  } catch (err) {
    let errorMsg = 'Unknown error';
    if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string') {
      errorMsg = (err as any).message;
    } else if (typeof err === 'string') {
      errorMsg = err;
    }
  if (props.error) props.error.value = errorMsg;
  notify(errorMsg);
  }
}

// Reset selected columns and persist to backend
async function resetColumns() {
  localSelected.value = [];
}
</script>

<style scoped>
.modal-content {
  position: relative;
  background: var(--base2);
  color: var(--text1);
  border-radius: 18px;
  padding: 36px 32px 28px 32px;
  min-width: 340px;
  max-width: 800px;
  width: 100%;
  box-shadow: 0 8px 32px 0 rgba(0,0,0,0.18), 0 1.5px 8px 0 var(--accent4);
  display: flex;
  flex-direction: column;
  gap: 18px;
  animation: popup-in 0.18s cubic-bezier(.4,1.4,.6,1) backwards;
}
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
  z-index: 10000000;
}
.close-x {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  color: var(--text2);
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.18s;
}
.close-x:hover {
  color: var(--accent1);
}
h2 {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--accent1);
  margin: 0 0 18px 0;
  text-align: center;
}
.attribute-section {
  display: flex;
  gap: 32px;
  margin-bottom: 18px;
  flex-wrap: nowrap;
  flex-direction: row;
  align-items: flex-start;
}

.available-attributes {
  flex: 3 1 0%;
  min-width: 220px;
  max-width: 60%;
}
.selected-attributes {
  flex: 2 1 0%;
  min-width: 120px;
  max-width: 40%;
}

.section-label {
  font-size: 1.08rem;
  font-weight: 600;
  color: var(--accent1);
  margin-bottom: 8px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  background: var(--base3);
  color: var(--text2);
  border-radius: 16px;
  padding: 7px 16px;
  font-size: 1rem;
  cursor: pointer;
  border: 1.5px solid var(--base4);
  transition: background 0.18s, color 0.18s, border-color 0.18s;
  user-select: none;
}
.chip.selected {
  background: var(--accent1);
  color: var(--base1);
  border-color: var(--accent1);
  cursor: not-allowed;
  opacity: 0.6;
}
.selected-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 360px;
  overflow-y: scroll;
}
.selected-chip {
  background: var(--base4);
  color: var(--text1);
  border-radius: 10px;
  padding: 7px 12px;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1.5px solid var(--accent1);
}
.move-btn {
  background: var(--base2);
  color: var(--accent1);
  border: none;
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
}
.move-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.remove-btn {
  background: none;
  color: var(--accent2);
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  margin-left: 4px;
  transition: color 0.18s;
}
.remove-btn:hover {
  color: var(--accent1);
}
.empty-selected {
  color: var(--text2);
  font-size: 0.98rem;
  padding: 8px 0;
}

.trade-btn {
  background: var(--accent1);
  margin-right: 7px;
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

.reset-btn {
  background: var(--accent2);
  color: var(--text3);
  border: none;
  border-radius: 7px;
  padding: 10px 24px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  margin-right: 7px;
  transition: background 0.18s;
}
.reset-btn:hover {
  background: var(--accent1);
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
