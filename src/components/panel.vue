<template>
  <div class="panel-menu">
   <div v-for="(section, index) in sections" :key="index" class="section-mini" :class="{ 'hidden-section': section.hidden }" draggable="true" @dragstart="dragStart($event, index)" @dragover="dragOver($event)" @drop="drop($event, index)">
      <button class="hide-button" @click="toggleHidden(index)">Hide</button>
      {{ section.name }}
    </div>
    <div class="nav-buttons">
      <button class="nav-button">Submit</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const sections = ref([
  { name: 'Summary', hidden: false },
  { name: 'EPS Growth Table', hidden: false },
  { name: 'Earnings Growth Table', hidden: false },
  { name: 'Sales Growth Table', hidden: false },
  { name: 'Dividend Table', hidden: false },
  { name: 'Split Table', hidden: false },
  { name: 'Financial Statements', hidden: false },
  { name: 'Notes', hidden: false },
]);

function dragStart(event, index) {
  event.dataTransfer.setData('index', index);
}
function dragOver(event) {
  event.preventDefault();
}
function drop(event, index) {
  const draggedIndex = event.dataTransfer.getData('index');
  const draggedSection = sections.value[draggedIndex];
  sections.value.splice(draggedIndex, 1);
  sections.value.splice(index, 0, draggedSection);
}

function toggleHidden(index) {
  sections.value[index].hidden = !sections.value[index].hidden;
}

</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

.panel-menu {
  max-width: 600px;
  max-height: 600px;
  background-color: var(--base2);
  color: var(--text1);
  font-weight: 600;
  font-size: 1.2rem;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  user-select: none;
  box-shadow: 0 8px 16px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 70%;
  width: 40%;
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
    width: 50%;
    display: flex;
    align-items: center;
    gap: 10px;
}
.hidden-section {
  background-color: var(--base2); // assign a different color
  color: var(--text2);
}

.hide-button {
  background-color: var(--base1);
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
}

.nav-buttons {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}
.nav-button {
  background-color: var(--base1);
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
}
</style>
