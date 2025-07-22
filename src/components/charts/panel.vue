<template>
  <div class="watch-panel-editor-backdrop" @click.self="$emit('close')">
    <div class="watch-panel-editor-modal">
      <h2>Edit Panel Sections</h2>
      <div class="sections-list">
        <div
          v-for="(section, index) in sections"
          :key="index"
          class="section-mini"
          :class="{ 'hidden-section': section.hidden }"
          draggable="true"
          @dragstart="dragStart($event, index)"
          @dragover="dragOver($event)"
          @drop="drop($event, index)"
        >
          <span class="mobile-arrows">
            <button
              class="arrow-btn"
              :disabled="index === 0"
              @click="moveSectionUp(index)"
              aria-label="Move up"
            >▲</button>
            <button
              class="arrow-btn"
              :disabled="index === sections.length - 1"
              @click="moveSectionDown(index)"
              aria-label="Move down"
            >▼</button>
          </span>
          <button
            class="hide-button"
            :class="{ 'hidden-button': section.hidden }"
            @click="toggleHidden(index)"
          >
            {{ section.hidden ? 'Add' : 'Remove' }}
          </button>
          <span class="section-name">{{ section.name }}</span>
          <button
            v-if="section.tag === 'Summary'"
            class="edit-summary-btn"
            @click="showEditSummary = true"
          >
            Edit Summary
          </button>
        </div>
      </div>
      <div class="nav-buttons">
        <button class="nav-button" @click="$emit('close')">Close</button>
        <button class="nav-button" @click="resetOrder">Reset</button>
        <button class="nav-button" @click="updatePanel">Submit</button>
      </div>
      <Panel2 v-if="showEditSummary" @close="showEditSummary = false" @panel-updated="onPanelUpdated" />
    </div>
  </div>
</template>

<script setup>
import { ref, defineEmits, onMounted } from 'vue';
const emit = defineEmits(['updated', 'panel-updated']);
import { useStore } from 'vuex';
import Panel2 from '@/components/charts/panel2.vue'; 

function onPanelUpdated() {
  // Propagate event upward
  emit('panel-updated');
}

const store = useStore();
let user = store.getters.getUser;
const apiKey = import.meta.env.VITE_EREUNA_KEY;

const sections = ref([]); // Start empty, fill from backend
const showEditSummary = ref(false);

async function fetchPanel() {
  try {
    const headers = { 'X-API-KEY': apiKey };
    const response = await fetch(`/api/panel?username=${user}`, { headers });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const newPanel = await response.json();
    // Defensive: fallback to default if empty
    sections.value = (newPanel.panel && newPanel.panel.length)
      ? newPanel.panel
      : [
          { order: 1, tag: 'Summary', name: 'Summary', hidden: false },
          { order: 2, tag: 'EpsTable', name: 'EPS Growth Table', hidden: false },
          { order: 3, tag: 'EarnTable', name: 'Earnings Growth Table', hidden: false },
          { order: 4, tag: 'SalesTable', name: 'Sales Growth Table', hidden: false },
          { order: 5, tag: 'DividendsTable', name: 'Dividend Table', hidden: false },
          { order: 6, tag: 'SplitsTable', name: 'Split Table', hidden: false },
          { order: 7, tag: 'Financials', name: 'Financial Statements', hidden: false },
          { order: 8, tag: 'Notes', name: 'Notes', hidden: false },
          { order: 9, tag: 'News', name: 'News', hidden: false },
        ];
  } catch (error) {
    console.error('Error fetching panel data:', error);
  }
}

onMounted(() => {
  fetchPanel();
});

const originalOrder = ref([
  { order: 1, tag: 'Summary', name: 'Summary', hidden: false },
  { order: 2, tag: 'EpsTable', name: 'EPS Growth Table', hidden: false },
  { order: 3, tag: 'EarnTable', name: 'Earnings Growth Table', hidden: false },
  { order: 4, tag: 'SalesTable', name: 'Sales Growth Table', hidden: false },
  { order: 5, tag: 'DividendsTable', name: 'Dividend Table', hidden: false },
  { order: 6, tag: 'SplitsTable', name: 'Split Table', hidden: false },
  { order: 7, tag: 'Financials', name: 'Financial Statements', hidden: false },
  { order: 8, tag: 'Notes', name: 'Notes', hidden: false },
  { order: 9, tag: 'News', name: 'News', hidden: false },
]);

function dragStart(event, index) {
  event.dataTransfer.setData('index', index);
  event.dataTransfer.effectAllowed = 'move';
}
function dragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function drop(event, index) {
  const draggedIndex = event.dataTransfer.getData('index');
  const draggedSection = sections.value[draggedIndex];
  sections.value.splice(draggedIndex, 1);
  sections.value.splice(index, 0, draggedSection);
  updateOrder();
}

function toggleHidden(index) {
  sections.value[index].hidden = !sections.value[index].hidden;
}

function updateOrder() {
  sections.value.forEach((section, index) => {
    section.order = index + 1;
  });
}

function resetOrder() {
  sections.value = originalOrder.value.map(section => ({ ...section }));
  updateOrder();
}

async function updatePanel() {
  try {
    sections.value.sort((a, b) => a.order - b.order);

    const newListOrder = sections.value.map((section, index) => ({
      order: index + 1,
      tag: section.tag,
      name: section.name,
      hidden: section.hidden,
    }));
    const requestBody = {
      username: user,
      newListOrder,
    };

    const response = await fetch('/api/panel', {
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
     emit('updated');

  } catch (error) {
    // handle error if needed
  }
}

function moveSectionUp(index) {
  if (index > 0) {
    const temp = sections.value[index - 1];
    sections.value[index - 1] = sections.value[index];
    sections.value[index] = temp;
    updateOrder();
  }
}

function moveSectionDown(index) {
  if (index < sections.value.length - 1) {
    const temp = sections.value[index + 1];
    sections.value[index + 1] = sections.value[index];
    sections.value[index] = temp;
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
  max-height: 220px;
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
  color: var(--accent3);
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

.edit-summary-btn {
  margin-left: auto;
  padding: 0.3rem 0.9rem;
  border-radius: 6px;
  border: none;
  background: linear-gradient(90deg, var(--accent2) 0%, var(--accent1) 100%);
  color: var(--text3);
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}
.edit-summary-btn:hover {
  background: linear-gradient(90deg, var(--accent1) 0%, var(--accent2) 100%);
  transform: scale(1.05);
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
  background: linear-gradient(90deg, var(--accent1) 0%, var(--accent2) 100%);
  color: var(--text3);
  font-weight: 600;
  font-size: 1.05rem;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}
.nav-button:hover {
  background: linear-gradient(90deg, var(--accent1) 0%, var(--accent2) 100%);
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
  .edit-summary-btn,
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
    gap: 1px;
    margin-right: 2px;
  }
}
</style>