<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="patterns-title">
        <button class="close-x" @click="$emit('close')" :aria-label="t('patterns.close')">&times;</button>
        <svg class="patterns-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <span class="symbol-badge">{{ Symbol }}</span>
        <h2>{{ t('patterns.title') }}</h2>
        <span class="beta-badge">Beta</span>
      </div>
      
      <div class="patterns-popup-content">
        <div v-if="!patterns || patterns.length === 0" class="no-patterns">
          <svg viewBox="0 0 24 24" fill="none" class="no-pattern-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" 
                  fill="currentColor" opacity="0.3"/>
          </svg>
          <p>{{ t('patterns.noPatterns') }}</p>
          <span class="no-pattern-subtext">{{ t('patterns.noPatternsSubtext') }}</span>
        </div>

        <div v-else class="patterns-list">
          <div 
            v-for="(pattern, index) in patterns" 
            :key="index" 
            class="pattern-card"
            :class="getPatternClass(pattern.type)"
          >
            <div class="pattern-header">
              <div class="pattern-type" :class="getPatternClass(pattern.type)">
                {{ formatPatternName(pattern.type) }}
              </div>
              <div class="pattern-confidence">{{ (pattern.confidence * 100).toFixed(0) }}%</div>
            </div>

            <div class="pattern-body">
              <div class="pattern-description">{{ pattern.description }}</div>
              <div class="pattern-points-count">{{ pattern.points.length }} key points</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface PivotPoint {
  index: number;
  time: number;
  price: number;
}

interface Pattern {
  type: string;
  points: PivotPoint[];
  confidence: number;
  description: string;
  timeframe: { start: number; end: number };
}

const props = defineProps<{
  patterns: Pattern[] | null;
  Symbol: string;
}>();

defineEmits<{
  close: [];
}>();

function getPatternClass(patternType: string): string {
  if (patternType.includes('Bottom') || patternType.includes('inverse') || 
      patternType === 'ascendingTriangle' || patternType === 'bullishFlag') {
    return 'bullish';
  } else if (patternType.includes('Top') || patternType === 'headAndShoulders' || 
             patternType === 'descendingTriangle' || patternType === 'bearishFlag') {
    return 'bearish';
  } else {
    return 'neutral';
  }
}

function formatPatternName(type: string): string {
  return type
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
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

.patterns-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--base1);
  border-bottom: 1px solid var(--base3);
  border-radius: 8px 8px 0 0;
  position: relative;
}

.patterns-icon {
  width: 16px;
  height: 16px;
  color: var(--accent2);
}

.patterns-title h2 {
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

.beta-badge {
  display: inline-block;
  background: var(--text2);
  color: var(--base1);
  font-size: 0.8rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  vertical-align: middle;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-right: 4rem;
}

.patterns-popup-content {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  max-height: 400px;
  padding: 8px;
}

.no-patterns {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 15px;
  text-align: center;
}

.no-pattern-icon {
  width: 32px;
  height: 32px;
  color: var(--text2);
  opacity: 0.5;
  margin-bottom: 8px;
}

.no-patterns p {
  font-size: 12px;
  color: var(--text1);
  margin: 0 0 4px 0;
  font-weight: 500;
}

.no-pattern-subtext {
  font-size: 10px;
  color: var(--text2);
}

.patterns-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pattern-card {
  background: var(--base1);
  border-radius: 6px;
  padding: 8px;
  border: 1px solid var(--base3);
  transition: all 0.2s;
}

.pattern-card:hover {
  transform: translateX(-2px);
}

.pattern-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.pattern-type {
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.2px;
  padding: 3px 7px;
  border-radius: 4px;
}

.pattern-type.bullish {
  color: var(--positive);
  background: rgba(38, 166, 154, 0.15);
}

.pattern-type.bearish {
  color: var(--negative);
  background: rgba(239, 83, 80, 0.15);
}

.pattern-type.neutral {
  color: #ffa726;
  background: rgba(255, 167, 38, 0.15);
}

.pattern-confidence {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent1);
  padding: 2px 6px;
  background: var(--base2);
  border-radius: 4px;
}

.pattern-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pattern-description {
  font-size: 10px;
  color: var(--text2);
  line-height: 1.3;
}

.pattern-points-count {
  font-size: 9px;
  color: var(--text2);
  font-style: italic;
}

/* Scrollbar styling */
.patterns-popup-content::-webkit-scrollbar {
  width: 4px;
}

.patterns-popup-content::-webkit-scrollbar-track {
  background: var(--base2);
}

.patterns-popup-content::-webkit-scrollbar-thumb {
  background: var(--base3);
  border-radius: 3px;
}

.patterns-popup-content::-webkit-scrollbar-thumb:hover {
  background: var(--accent2);
}
</style>
