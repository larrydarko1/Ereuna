<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="signals-title">
              <button class="close-x" @click="$emit('close')" :aria-label="t('tradingSignals.close')">&times;</button>
        <svg class="signals-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g stroke-width="0"></g>
          <g stroke-linecap="round" stroke-linejoin="round"></g>
          <g>
            <path d="M13 3L13 10L21 10C21 13.866 17.866 17 14 17H13V21M11 21L11 14L3 14C3 10.134 6.13401 7 10 7H11V3" 
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
          </g>
        </svg>
                <span class="symbol-badge">{{ Symbol }}</span>
        <h2>{{ t('tradingSignals.title') }}</h2>
      </div>
      
      <div class="signals-popup-content">
        <div v-if="!signals || signals.length === 0" class="no-signals">
          <svg viewBox="0 0 24 24" fill="none" class="no-signal-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" 
                  fill="currentColor" opacity="0.3"/>
          </svg>
          <p>{{ t('tradingSignals.noSignals') }}</p>
          <span class="no-signal-subtext">{{ t('tradingSignals.noSignalsSubtext') }}</span>
        </div>

        <div v-else class="signals-list">
          <div 
            v-for="(signal, index) in signals" 
            :key="index" 
            class="signal-card"
            :class="signal.type.toLowerCase()"
          >
            <div class="signal-header">
              <div class="signal-type" :class="signal.type.toLowerCase()">
                <svg v-if="signal.type === 'BUY'" viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="currentColor" class="signal-arrow">
                  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                  <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                  <g id="SVGRepo_iconCarrier"> <title>triangle-filled</title> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="drop" fill="currentColor" transform="translate(32.000000, 42.666667)"> <path d="M246.312928,5.62892705 C252.927596,9.40873724 258.409564,14.8907053 262.189374,21.5053731 L444.667042,340.84129 C456.358134,361.300701 449.250007,387.363834 428.790595,399.054926 C422.34376,402.738832 415.04715,404.676552 407.622001,404.676552 L42.6666667,404.676552 C19.1025173,404.676552 7.10542736e-15,385.574034 7.10542736e-15,362.009885 C7.10542736e-15,354.584736 1.93772021,347.288125 5.62162594,340.84129 L188.099293,21.5053731 C199.790385,1.04596203 225.853517,-6.06216498 246.312928,5.62892705 Z" id="Combined-Shape"> </path> </g> </g> </g>
                </svg>
                <svg v-else viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="currentColor" transform="rotate(180)" class="signal-arrow">
                  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                  <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                  <g id="SVGRepo_iconCarrier"> <title>triangle-filled</title> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="drop" fill="currentColor" transform="translate(32.000000, 42.666667)"> <path d="M246.312928,5.62892705 C252.927596,9.40873724 258.409564,14.8907053 262.189374,21.5053731 L444.667042,340.84129 C456.358134,361.300701 449.250007,387.363834 428.790595,399.054926 C422.34376,402.738832 415.04715,404.676552 407.622001,404.676552 L42.6666667,404.676552 C19.1025173,404.676552 7.10542736e-15,385.574034 7.10542736e-15,362.009885 C7.10542736e-15,354.584736 1.93772021,347.288125 5.62162594,340.84129 L188.099293,21.5053731 C199.790385,1.04596203 225.853517,-6.06216498 246.312928,5.62892705 Z" id="Combined-Shape"> </path> </g> </g> </g>
                </svg>
                {{ t(`tradingSignals.${signal.type.toLowerCase()}`) }}
              </div>
              <div class="signal-price">${{ signal.price?.toFixed(2) || 'N/A' }}</div>
            </div>

            <div class="signal-body">
              <div class="signal-strategy">{{ formatStrategy(signal.strategy) }}</div>
              <div class="signal-description">{{ signal.description }}</div>
              
              <div v-if="signal.indicator_value !== undefined" class="signal-indicator">
                <span class="indicator-label">{{ t('tradingSignals.indicatorLabel') }}</span>
                <span class="indicator-value">{{ signal.indicator_value }}</span>
              </div>
            </div>
          </div>
        </div>

       
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface Signal {
  date: string;
  type: 'BUY' | 'SELL';
  strategy: string;
  indicator_value?: number;
  price: number;
  description: string;
}

const props = defineProps<{
  signals: Signal[] | null;
  Symbol: string;
}>();

defineEmits<{
  close: [];
}>();

function formatStrategy(strategy: string): string {
  // Convert snake_case to Title Case
  return strategy
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'Today';
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  };
  return date.toLocaleDateString('en-US', options);
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  z-index: 10000;
  padding: 20px;
}

.modal-content {
  background: var(--base2);
  border-radius: 8px;
  padding: 0;
  width: 300px;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--base3);
  animation: slideIn 0.15s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.close-x {
  position: absolute;
  top: 8px;
  right: 8px;
  background: transparent;
  border: none;
  color: var(--text2);
  font-size: 18px;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  padding: 0;
  z-index: 1;
}

.close-x:hover {
  background: var(--base3);
  color: var(--text1);
}

.signals-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--base1);
  border-bottom: 1px solid var(--base3);
  border-radius: 8px 8px 0 0;
  position: relative;
}

.signals-icon {
  width: 16px;
  height: 16px;
  color: var(--accent2);
}

.signals-title h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text1);
  flex: 1;
}

.symbol-badge {
  background: var(--accent2);
  color: var(--text3);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.signals-popup-content {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  max-height: 400px;
  padding: 8px;
}

.no-signals {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 15px;
  text-align: center;
}

.no-signal-icon {
  width: 32px;
  height: 32px;
  color: var(--text2);
  opacity: 0.5;
  margin-bottom: 8px;
}

.no-signals p {
  font-size: 12px;
  color: var(--text1);
  margin: 0 0 4px 0;
  font-weight: 500;
}

.no-signal-subtext {
  font-size: 10px;
  color: var(--text2);
}

.signals-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.signal-card {
  background: var(--base1);
  border-radius: 6px;
  padding: 8px;
  border: 1px solid var(--base3);
}

.signal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.signal-type {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.2px;
}

.signal-type.buy {
  color: var(--positive);
}

.signal-type.sell {
  color: var(--negative);
}

.signal-arrow {
  width: 12px;
  height: 12px;
}

.signal-price {
  font-size: 11px;
  font-weight: 600;
  color: var(--text1);
}

.signal-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.signal-strategy {
  font-size: 11px;
  font-weight: 600;
  color: var(--text1);
}

.signal-description {
  font-size: 10px;
  color: var(--text2);
  line-height: 1.3;
}

.signal-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  font-size: 9px;
}

.indicator-label {
  color: var(--text2);
  font-weight: 500;
}

.indicator-value {
  color: var(--accent2);
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.signals-footer {
  padding: 8px;
  border-top: 1px solid var(--base3);
  background: var(--base1);
  border-radius: 0 0 8px 8px;
}

.disclaimer {
  display: flex;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.info-icon {
  width: 11px;
  height: 11px;
  color: #f59e0b;
  flex-shrink: 0;
  margin-top: 1px;
}

.disclaimer span {
  font-size: 9px;
  color: var(--text2);
  line-height: 1.3;
}

.arrow-up {
  font-size: 0.75em;
  line-height: 0.8em;
  display: inline-block;
  vertical-align: middle;
  position: relative;
  margin-left: 4px;
}

.arrow-up::after {
  content: "\25B2";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.arrow-down {
  font-size: 0.75em;
  line-height: 0.1em;
  display: inline-block;
  vertical-align: middle;
  position: relative;
  margin-left: 4px;
}

.arrow-down::after {
  content: "\25BC";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* Scrollbar styling */
.signals-popup-content::-webkit-scrollbar {
  width: 4px;
}

.signals-popup-content::-webkit-scrollbar-track {
  background: var(--base2);
}

.signals-popup-content::-webkit-scrollbar-thumb {
  background: var(--base3);
  border-radius: 3px;
}

.signals-popup-content::-webkit-scrollbar-thumb:hover {
  background: var(--accent2);
}
</style>
