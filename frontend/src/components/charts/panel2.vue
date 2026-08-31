<template>
  <div class="watch-panel-editor-backdrop" @click.self="$emit('close')" role="dialog" aria-modal="true" :aria-label="t('summaryEditor.ariaLabel')">
    <div class="watch-panel-editor-modal" role="document">
      <h2 id="summary-editor-title">{{ t('summaryEditor.title') }}</h2>
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
              :aria-label="t('summaryEditor.moveUp')"
            >▲</button>
            <button
              class="arrow-btn"
              :disabled="index === summaryFields.length - 1"
              @click="moveFieldDown(index)"
              :aria-label="t('summaryEditor.moveDown')"
            >▼</button>
          </span>
          <button
            class="hide-button"
            :class="{ 'hidden-button': field.hidden }"
            @click="toggleHidden(index)"
            :aria-label="field.hidden ? t('summaryEditor.addToSummary') : t('summaryEditor.removeFromSummary')"
          >
            {{ field.hidden ? t('summaryEditor.add') : t('summaryEditor.remove') }}
          </button>
          <span class="section-name">{{ field.name }}</span>
        </div>
      </div>
      <div class="nav-buttons">
        <button class="nav-button" @click="$emit('close')" :aria-label="t('summaryEditor.closeEditor')">{{ t('summaryEditor.close') }}</button>
        <button class="nav-button" @click="resetOrder" :aria-label="t('summaryEditor.resetOrder')">{{ t('summaryEditor.reset') }}</button>
        <button class="nav-button" @click="updatePanel2" :aria-label="t('summaryEditor.submitFields')">{{ t('summaryEditor.submit') }}</button>
      </div>
      <NotificationPopup v-if="errorMsg" :message="errorMsg" type="error" @close="errorMsg = ''" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@/store/store';
import NotificationPopup from '@/components/NotificationPopup.vue';

const { t } = useI18n();

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

// Function to get translated field name based on tag
function getFieldName(tag: string): string {
  const tagMap: Record<string, string> = {
    'Symbol': t('summaryEditor.fields.symbol'),
    'CompanyName': t('summaryEditor.fields.companyName'),
    'AssetType': t('summaryEditor.fields.assetType'),
    'Exchange': t('summaryEditor.fields.exchange'),
    'ISIN': t('summaryEditor.fields.isin'),
    'IPODate': t('summaryEditor.fields.ipoDate'),
    'Sector': t('summaryEditor.fields.sector'),
    'Industry': t('summaryEditor.fields.industry'),
    'ReportedCurrency': t('summaryEditor.fields.reportedCurrency'),
    'TechnicalScore1W': t('summaryEditor.fields.technicalScore1W'),
    'TechnicalScore1M': t('summaryEditor.fields.technicalScore1M'),
    'TechnicalScore4M': t('summaryEditor.fields.technicalScore4M'),
    'MarketCap': t('summaryEditor.fields.marketCap'),
    'SharesOutstanding': t('summaryEditor.fields.sharesOutstanding'),
    'Location': t('summaryEditor.fields.location'),
    'DividendDate': t('summaryEditor.fields.dividendDate'),
    'DividendYieldTTM': t('summaryEditor.fields.dividendYieldTTM'),
    'BookValue': t('summaryEditor.fields.bookValue'),
    'PEGRatio': t('summaryEditor.fields.pegRatio'),
    'PERatio': t('summaryEditor.fields.peRatio'),
    'PSRatio': t('summaryEditor.fields.psRatio'),
    'AllTimeHigh': t('summaryEditor.fields.allTimeHigh'),
    'AllTimeLow': t('summaryEditor.fields.allTimeLow'),
    'fiftytwoWeekHigh': t('summaryEditor.fields.fiftyTwoWeekHigh'),
    'fiftytwoWeekLow': t('summaryEditor.fields.fiftyTwoWeekLow'),
    'PercentageOff52wkHigh': t('summaryEditor.fields.percentageOff52wkHigh'),
    'PercentageOff52wkLow': t('summaryEditor.fields.percentageOff52wkLow'),
    'RSI': t('summaryEditor.fields.rsi'),
    'Gap': t('summaryEditor.fields.gap'),
    'ADV1W': t('summaryEditor.fields.adv1W'),
    'ADV1M': t('summaryEditor.fields.adv1M'),
    'ADV4M': t('summaryEditor.fields.adv4M'),
    'ADV1Y': t('summaryEditor.fields.adv1Y'),
    'RelativeVolume1W': t('summaryEditor.fields.relativeVolume1W'),
    'RelativeVolume1M': t('summaryEditor.fields.relativeVolume1M'),
    'RelativeVolume6M': t('summaryEditor.fields.relativeVolume6M'),
    'RelativeVolume1Y': t('summaryEditor.fields.relativeVolume1Y'),
    'AverageVolume1W': t('summaryEditor.fields.averageVolume1W'),
    'AverageVolume1M': t('summaryEditor.fields.averageVolume1M'),
    'AverageVolume6M': t('summaryEditor.fields.averageVolume6M'),
    'AverageVolume1Y': t('summaryEditor.fields.averageVolume1Y'),
    'FundCategory': t('summaryEditor.fields.fundCategory'),
    'FundFamily': t('summaryEditor.fields.fundFamily'),
    'NetExpenseRatio': t('summaryEditor.fields.netExpenseRatio'),
    'IntrinsicValue': t('summaryEditor.fields.intrinsicValue'),
    'CAGR': t('summaryEditor.fields.cagr'),
    'CAGRYears': t('summaryEditor.fields.cagrYears'),
    'CompanyWebsite': t('summaryEditor.fields.companyWebsite'),
    'AIRecommendation': t('summaryEditor.fields.aiRecommendation'),
    'Description': t('summaryEditor.fields.description'),
  };
  return tagMap[tag] || tag;
}

const initialFields: SummaryField[] = [
  { order: 1, tag: 'Symbol', name: getFieldName('Symbol'), hidden: false },
  { order: 2, tag: 'CompanyName', name: getFieldName('CompanyName'), hidden: false },
  { order: 3, tag: 'AssetType', name: getFieldName('AssetType'), hidden: false },
  { order: 4, tag: 'Exchange', name: getFieldName('Exchange'), hidden: false },
  { order: 5, tag: 'ISIN', name: getFieldName('ISIN'), hidden: false },
  { order: 6, tag: 'IPODate', name: getFieldName('IPODate'), hidden: false },
  { order: 7, tag: 'Sector', name: getFieldName('Sector'), hidden: false },
  { order: 8, tag: 'Industry', name: getFieldName('Industry'), hidden: false },
  { order: 9, tag: 'ReportedCurrency', name: getFieldName('ReportedCurrency'), hidden: false },
  { order: 10, tag: 'TechnicalScore1W', name: getFieldName('TechnicalScore1W'), hidden: false },
  { order: 11, tag: 'TechnicalScore1M', name: getFieldName('TechnicalScore1M'), hidden: false },
  { order: 12, tag: 'TechnicalScore4M', name: getFieldName('TechnicalScore4M'), hidden: false },
  { order: 13, tag: 'MarketCap', name: getFieldName('MarketCap'), hidden: false },
  { order: 14, tag: 'SharesOutstanding', name: getFieldName('SharesOutstanding'), hidden: false },
  { order: 15, tag: 'Location', name: getFieldName('Location'), hidden: false },
  { order: 16, tag: 'DividendDate', name: getFieldName('DividendDate'), hidden: false },
  { order: 17, tag: 'DividendYieldTTM', name: getFieldName('DividendYieldTTM'), hidden: false },
  { order: 18, tag: 'BookValue', name: getFieldName('BookValue'), hidden: false },
  { order: 19, tag: 'PEGRatio', name: getFieldName('PEGRatio'), hidden: false },
  { order: 20, tag: 'PERatio', name: getFieldName('PERatio'), hidden: false },
  { order: 21, tag: 'PSRatio', name: getFieldName('PSRatio'), hidden: false },
  { order: 22, tag: 'AllTimeHigh', name: getFieldName('AllTimeHigh'), hidden: false },
  { order: 23, tag: 'AllTimeLow', name: getFieldName('AllTimeLow'), hidden: false },
  { order: 24, tag: 'fiftytwoWeekHigh', name: getFieldName('fiftytwoWeekHigh'), hidden: false },
  { order: 25, tag: 'fiftytwoWeekLow', name: getFieldName('fiftytwoWeekLow'), hidden: false },
  { order: 26, tag: 'PercentageOff52wkHigh', name: getFieldName('PercentageOff52wkHigh'), hidden: false },
  { order: 27, tag: 'PercentageOff52wkLow', name: getFieldName('PercentageOff52wkLow'), hidden: false },
  { order: 28, tag: 'RSI', name: getFieldName('RSI'), hidden: false },
  { order: 29, tag: 'Gap', name: getFieldName('Gap'), hidden: false },
  { order: 30, tag: 'ADV1W', name: getFieldName('ADV1W'), hidden: false },
  { order: 31, tag: 'ADV1M', name: getFieldName('ADV1M'), hidden: false },
  { order: 32, tag: 'ADV4M', name: getFieldName('ADV4M'), hidden: false },
  { order: 33, tag: 'ADV1Y', name: getFieldName('ADV1Y'), hidden: false },
  { order: 34, tag: 'RelativeVolume1W', name: getFieldName('RelativeVolume1W'), hidden: false },
  { order: 35, tag: 'RelativeVolume1M', name: getFieldName('RelativeVolume1M'), hidden: false },
  { order: 36, tag: 'RelativeVolume6M', name: getFieldName('RelativeVolume6M'), hidden: false },
  { order: 37, tag: 'RelativeVolume1Y', name: getFieldName('RelativeVolume1Y'), hidden: false },
  { order: 38, tag: 'AverageVolume1W', name: getFieldName('AverageVolume1W'), hidden: false },
  { order: 39, tag: 'AverageVolume1M', name: getFieldName('AverageVolume1M'), hidden: false },
  { order: 40, tag: 'AverageVolume6M', name: getFieldName('AverageVolume6M'), hidden: false },
  { order: 41, tag: 'AverageVolume1Y', name: getFieldName('AverageVolume1Y'), hidden: false },
  { order: 42, tag: 'FundCategory', name: getFieldName('FundCategory'), hidden: false },
  { order: 43, tag: 'FundFamily', name: getFieldName('FundFamily'), hidden: false },
  { order: 44, tag: 'NetExpenseRatio', name: getFieldName('NetExpenseRatio'), hidden: false },
  { order: 45, tag: 'IntrinsicValue', name: getFieldName('IntrinsicValue'), hidden: false },
  { order: 46, tag: 'CAGR', name: getFieldName('CAGR'), hidden: false },
  { order: 47, tag: 'CAGRYears', name: getFieldName('CAGRYears'), hidden: false },
  { order: 48, tag: 'CompanyWebsite', name: getFieldName('CompanyWebsite'), hidden: false },
  { order: 49, tag: 'AIRecommendation', name: getFieldName('AIRecommendation'), hidden: false },
  { order: 50, tag: 'Description', name: getFieldName('Description'), hidden: false },
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
      errorMsg.value = t('summaryEditor.errorNotLoggedIn');
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
    errorMsg.value = t('summaryEditor.errorUpdating');
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
      // Start with user-saved fields and translate names
      const merged = newPanel.panel2.map((field: any) => ({
        ...field,
        name: getFieldName(field.tag)
      }));
      // Add any new fields from initialFields that aren't in user-saved data
      initialFields.forEach((field) => {
        if (!userMap.has(field.tag)) {
          merged.push({ ...field });
        }
      });
      // Sort by order (user order if present, else default)
      merged.sort((a: SummaryField, b: SummaryField) => a.order - b.order);
      summaryFields.value = merged;
    } else {
      summaryFields.value = initialFields.map(field => ({ ...field }));
    }
  } catch (error) {
    errorMsg.value = t('summaryEditor.errorLoading');
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