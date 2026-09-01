<template>
  <div class="screenshot-overlay" @click.self="$emit('close')">
    <div class="screenshot-popup">
      <div class="popup-header">
        <h2>{{ t('screenshotExport.title') }}</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      
      <div class="popup-content">
        <div class="preview-section">
          <div class="preview-label">{{ t('screenshotExport.previewLabel') }}</div>
          <div class="preview-box">
            <div class="preview-chart" :style="{ backgroundColor: config.backgroundColor }">
              <div class="preview-header">
                <div v-if="config.includeLogo" class="preview-logo">
                  <img :src="ereunaLogoSvg" alt="Ereuna" class="preview-logo-img" :style="{ filter: logoFilter }" />
                </div>
                <div v-if="config.includeChartInfo" class="preview-info">
                  <div class="preview-date-time" :style="{ color: previewSecondaryColor }">
                    <span class="preview-date">{{ chartInfo.date }}</span>
                    <span class="preview-timeframe">{{ chartInfo.timeframe }}</span>
                  </div>
                  <div class="preview-ticker-line">
                    <span class="preview-symbol" :style="{ color: previewTextColor }">{{ chartInfo.symbol }}</span>
                    <span class="preview-name" :style="{ color: previewSecondaryColor }">{{ chartInfo.name }}</span>
                    <span class="preview-price" :style="{ color: previewTextColor }">{{ chartInfo.price }}</span>
                    <span class="preview-change">{{ chartInfo.change }} ({{ chartInfo.changePercent }})</span>
                  </div>
                  <div class="preview-branding" :style="{ color: previewSecondaryColor }">Made by Ereuna -- ereuna.io</div>
                </div>
              </div>
              <div class="preview-chart-area">{{ t('screenshotExport.chartPreview') }}</div>
            </div>
          </div>
        </div>
        
        <div class="options-section">
          <div class="option-group">
            <label class="option-label">
              <input type="checkbox" v-model="config.includeChartInfo" />
              <span>{{ t('screenshotExport.includeChartInfo') }}</span>
            </label>
            <p class="option-description">{{ t('screenshotExport.includeChartInfoDesc') }}</p>
          </div>
          
          <div class="option-group">
            <label class="option-label">
              <input type="checkbox" v-model="config.includeLogo" />
              <span>{{ t('screenshotExport.includeLogo') }}</span>
            </label>
            <p class="option-description">{{ t('screenshotExport.includeLogoDesc') }}</p>
          </div>
          
          <div class="option-group">
            <label class="option-label-full">{{ t('screenshotExport.backgroundColorLabel') }}</label>
            <div class="color-options">
              <button 
                v-for="color in colorOptions" 
                :key="color.value"
                class="color-btn"
                :class="{ active: config.backgroundColor === color.value }"
                @click="config.backgroundColor = color.value"
                :style="{ backgroundColor: color.value }"
              >
                <span v-if="config.backgroundColor === color.value">✓</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="popup-footer">
        <button class="btn-secondary" @click="$emit('close')">{{ t('screenshotExport.cancel') }}</button>
        <button class="btn-primary" @click="handleExport">{{ t('screenshotExport.download') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ScreenshotConfig, ChartInfo } from '@/lib/lightweight-charts/screenshot';
import ereunaLogoSvg from '@/assets/icons/ereuna.svg';

const { t } = useI18n();

const props = defineProps<{
  chartInfo: ChartInfo;
}>();

const emit = defineEmits<{
  close: [];
  export: [config: ScreenshotConfig];
}>();

const config = reactive<ScreenshotConfig>({
  includeWatermark: true,
  includeLogo: true,
  includeChartInfo: true,
  appName: 'Ereuna',
  websiteUrl: 'ereuna.io',
  backgroundColor: '#0f1419',
  watermarkOpacity: 0.8
});

const colorOptions = computed(() => [
  { name: t('screenshotExport.colorDark'), value: '#0f1419' },
  { name: t('screenshotExport.colorLight'), value: '#f3f4f4' }
]);

const isLightBackground = computed(() => {
  const color = config.backgroundColor;
  let r = 0, g = 0, b = 0;
  
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
  }
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
});

const previewTextColor = computed(() => {
  return isLightBackground.value ? '#1a1b26' : '#ffffff';
});

const previewSecondaryColor = computed(() => {
  return isLightBackground.value ? '#6b7280' : '#9ca3af';
});

const logoFilter = computed(() => {
  return isLightBackground.value 
    ? 'brightness(0) saturate(100%)' 
    : 'brightness(0) saturate(100%) invert(100%)';
});

function handleExport() {
  emit('export', { ...config });
}
</script>

<style scoped>
.screenshot-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.screenshot-popup {
  background: var(--color-surface);
  border-radius: 12px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid var(--color-elevated);
}

.popup-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-elevated);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.popup-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
}

.close-btn {
  background: none;
  border: none;
  font-size: 32px;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--color-elevated);
  color: var(--color-text);
}

.popup-content {
  padding: 24px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview-box {
  background: var(--color-bg);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--color-elevated);
}

.preview-chart {
  background: var(--color-surface);
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 300px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-elevated);
}

.preview-logo {
  flex-shrink: 0;
}

.preview-logo-img {
  height: 32px;
  width: auto;
  filter: brightness(0) saturate(100%) invert(100%);
}

.preview-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.preview-date-time {
  display: flex;
  gap: 8px;
  font-size: 10px;
  color: var(--color-text-muted);
}

.preview-timeframe {
  font-weight: 600;
}

.preview-ticker-line {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.preview-symbol {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text);
}

.preview-name {
  font-size: 9px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}

.preview-price {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text);
}

.preview-change {
  font-size: 10px;
  color: #10b981;
}

.preview-branding {
  font-size: 9px;
  color: var(--color-text-muted);
  opacity: 0.7;
}

.preview-chart-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 12px;
  background: var(--color-bg);
  border-radius: 4px;
  border: 1px dashed var(--color-elevated);
}

.options-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.option-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 500;
}

.option-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--color-text);
}

.option-label-full {
  display: block;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.option-description {
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 0;
  padding-left: 28px;
}

.color-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-btn {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  transition: all 0.2s;
  position: relative;
}

.color-btn:hover {
  transform: scale(1.05);
  border-color: var(--color-text-muted);
}

.color-btn.active {
  border-color: var(--color-text);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
}

.popup-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-elevated);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-secondary,
.btn-primary {
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: var(--color-elevated);
  color: var(--color-text);
}

.btn-secondary:hover {
  background: var(--color-sunken);
}

.btn-primary {
  background: var(--color-text);
  color: var(--color-bg);
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .popup-content {
    grid-template-columns: 1fr;
  }
  
  .screenshot-popup {
    width: 95%;
    max-height: 95vh;
  }
}
</style>
