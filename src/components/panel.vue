<template>
  <div class="panel-menu">
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
      <button
        class="hide-button"
        :class="{ 'hidden-button': section.hidden }"
        @click="toggleHidden(index)"
      >
        {{ section.hidden ? 'Add' : 'Remove' }}
      </button>
       {{ section.name }}
      <!-- Edit Summary Button -->
      <button
        v-if="section.tag === 'Summary'"
        class="edit-summary-btn"
        @click="showEditSummary = true"
      >
        Edit Summary
      </button>
    </div>
    <div class="nav-buttons">
      <button class="nav-button" @click="$emit('close')">Close</button>
      <button class="nav-button" @click="resetOrder">Reset</button>
      <button class="nav-button" @click="updatePanel">Submit</button>
    </div>
    <!-- Edit Summary Popup -->
    <Panel2 v-if="showEditSummary" @close="showEditSummary = false" @panel-updated="onPanelUpdated" />
  </div>
</template>


<script setup>
import { ref, defineEmits, onMounted } from 'vue';
const emit = defineEmits(['updated', 'panel-updated']);
import { useStore } from 'vuex';
import Panel2 from '@/components/panel2.vue'; 

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

</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

.panel-menu {
  background-color: var(--base2);
  color: var(--text1);
  font-weight: 600;
  font-size: 1.2rem;
  padding: 10px;
  border-radius: 8px;
  text-align: center;
  user-select: none;
  box-shadow: 0 8px 16px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 70%;
  width: 300px;
  box-sizing: border-box;
  margin: 0 auto;
   position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000000000;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.section-mini{
    background-color: var(--base1);
    padding: 10px;
    border-radius: 10px;
    width: 90%;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: grab;
}

.section-mini:active {
  cursor: grabbing;
}

.hidden-section {
  background-color: transparent;
  color: var(--text2);
  border: none;
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

.hidden-section {
  opacity: 0.5;
  text-decoration: line-through;
}
.nav-buttons {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.nav-button {
  background-color: var(--accent1);
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
}

.edit-summary-btn {
  margin-left: auto;
  background-color: var(--accent2);
  color: var(--text1);
  border: none;
  padding: 5px 12px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.95em;
}

/* Mobile version */
@media (max-width: 1150px) {
  .panel-menu {
    width: 90%;
    height: 80%;
    padding: 10px;
    font-size: 1rem;
  }
  .section-mini {
    width: 90%;
    font-size: 0.9rem;
  }
}
</style>
