<template>
  <div :class="[ShowAssetTypeModel ? 'param-card-expanded' : 'param-card']">
    <div class="header">
      <div class="title-section">
        <span class="title">Asset Type</span>
        <svg class="info-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
          @mouseover="handleMouseOver($event, 'assetType')" @mouseout="handleMouseOut($event)" aria-label="Show info for Asset Type parameter">
          <path
            d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="M12 18.01L12.01 17.9989" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round"></path>
        </svg>
      </div>
      <label class="switch">
        <input type="checkbox" v-model="ShowAssetTypeModel" aria-label="Toggle Asset Type filter">
        <span class="slider"></span>
      </label>
    </div>

    <div class="content" v-if="ShowAssetTypeModel">
      <div class="checkbox-group">
        <div class="checkbox-item" v-for="(asset, index) in AssetTypes" :key="index">
          <label class="checkbox-label" :for="`asset-type-${index}`">
            <input
              :id="`asset-type-${index}`"
              type="checkbox"
              v-model="selectedAssetTypes[index]"
              class="checkbox-input"
              :aria-label="'Select ' + asset + ' asset type'"
            >
            <span class="checkbox-custom"></span>
            <span class="checkbox-text">{{ asset }}</span>
          </label>
        </div>
      </div>

      <div class="actions">
        <button class="btn btn-secondary" @click="emit('reset'); ShowAssetTypeModel = false" aria-label="Reset Asset Type filter">
          Reset
        </button>
        <button class="btn btn-primary" @click="SetAssetType()" aria-label="Set Asset Type filter">
          Apply
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const emit = defineEmits(['fetchScreeners', 'handleMouseOver', 'handleMouseOut', 'reset', 'notify', 'update:ShowAssetType']);

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
  ShowAssetType: { type: Boolean, required: true },
  initialSelected: { type: Array as () => string[], required: false, default: () => [] }
});

const ShowAssetTypeModel = computed({
  get: () => props.ShowAssetType,
  set: (val: boolean) => emit('update:ShowAssetType', val)
});

const AssetTypes = ['Stock', 'ETF', 'Mutual Fund'];
const selectedAssetTypes = ref<boolean[]>([]);
// ensure array has the same length as AssetTypes so index access is defined
selectedAssetTypes.value = new Array(AssetTypes.length).fill(false);

// apply initial selected asset types from parent screener (also react to changes)
watch(() => props.initialSelected, (val: string[] | undefined) => {
  if (!val || !Array.isArray(val) || val.length === 0) {
    // keep default false array
    return;
  }
  // Normalize values to handle case/format differences between saved screener and component list
  const normalizedIncoming = val.map(v => (v ?? '').toString().trim().toLowerCase());
  selectedAssetTypes.value = AssetTypes.map(a => normalizedIncoming.includes(a.toString().trim().toLowerCase()));
}, { immediate: true });

function showNotification(msg: string) {
  emit('notify', msg);
}

// Sends asset types data to update screener
async function SetAssetType() {
  const selected = AssetTypes.filter((_, index) => selectedAssetTypes.value[index]); // Get selected asset types
  try {
    const response = await fetch('/api/screener/asset-types', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify({ 
        assetTypes: selected, 
        screenerName: props.selectedScreener, 
        user: props.user 
      })
    });
    if (response.status !== 200) {
      const data = await response.json();
      throw new Error(data.message || `Error: ${response.status} ${response.statusText}`);
    }
    emit('fetchScreeners', props.selectedScreener); 
  } catch (error) {
    const msg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : 'Unknown error';
    showNotification(msg);
    emit('fetchScreeners', props.selectedScreener);
  }
}
</script>

<style scoped>
/* Card Container */
.param-card {
  background-color: var(--base2);
  border-radius: 6px;
  padding: 8px 10px;
  margin: 4px 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.param-card:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  border-color: var(--base3);
}

.param-card-expanded {
  background-color: var(--base2);
  border-radius: 6px;
  padding: 8px 10px;
  margin: 4px 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  border: 1px solid var(--base3);
}

/* Header Section */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 6px;
}

.title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text1);
  background-color: transparent;
}

.info-icon {
  width: 14px;
  height: 14px;
  color: var(--text2);
  cursor: pointer;
  transition: color 0.2s ease;
}

.info-icon:hover {
  color: var(--text1);
}

/* Toggle Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 34px;
  height: 18px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--base3);
  transition: 0.2s;
  border-radius: 18px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 12px;
  width: 12px;
  left: 3px;
  bottom: 3px;
  background-color: var(--text2);
  transition: 0.2s;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

input:checked + .slider {
  background-color: var(--accent1);
}

input:checked + .slider:before {
  transform: translateX(16px);
  background-color: var(--text3);
}

/* Content Section */
.content {
  margin-top: 10px;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Checkbox Group */
.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-bottom: 10px;
}

.checkbox-item {
  flex: 0 0 auto;
  min-width: 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 13px;
  color: var(--text2);
  transition: color 0.2s ease;
  user-select: none;
}

.checkbox-label:hover {
  color: var(--text1);
}

.checkbox-input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkbox-custom {
  position: relative;
  height: 12px;
  width: 12px;
  background-color: var(--base3);
  border: 1px solid var(--base4);
  border-radius: 99px;
  margin-right: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.checkbox-input:checked ~ .checkbox-custom {
  background-color: var(--accent1);
}



.checkbox-input:checked ~ .checkbox-custom:after {
  display: block;
}

.checkbox-input:checked ~ .checkbox-text {
  color: var(--text1);
}

/* Actions */
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.btn {
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 500;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.01em;
}

.btn-secondary {
  background-color: var(--base3);
  color: var(--text2);
  font-weight: 600;
}

.btn-secondary:hover {
  background-color: var(--base4);
  color: var(--text1);
}

.btn-secondary:active {
  transform: scale(0.98);
}

.btn-primary {
  background-color: var(--accent1);
  color: var(--text3);
  font-weight: 600;
}

.btn-primary:hover {
  opacity: 0.9;
  box-shadow: 0 1px 4px rgba(var(--accent1-rgb, 59, 130, 246), 0.3);
}

.btn-primary:active {
  transform: scale(0.98);
}
</style>
