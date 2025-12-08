<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-content">
      <button class="close-x" @click="$emit('close')" aria-label="Close">&times;</button>
      <div class="ai-title">
        <svg class="ai-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
          <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
          <g id="SVGRepo_iconCarrier">
            <path d="M12 3C12 7.97056 16.0294 12 21 12C16.0294 12 12 16.0294 12 21C12 16.0294 7.97056 12 3 12C7.97056 12 12 7.97056 12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
          </g>
        </svg>
        <h2>Archie's Analysis</h2>
        <span class="beta-badge">BETA</span>
      </div>
      
      <div class="ai-popup-content">
        
        <div class="ai-section">
          <label>Recommendation</label>
          <div class="ai-value recommendation" :class="getRecommendationClass(aiData?.Recommendation)">
            {{ aiData?.Recommendation || 'N/A' }}
          </div>
        </div>
        
        <div class="ai-section">
          <label>Intrinsic Value</label>
          <div class="ai-value">{{ formatIntrinsicValue(aiData?.IntrinsicValue) }}</div>
        </div>
        
        <div class="ai-section full-width">
          <label>Report</label>
          <div class="ai-report">
            <span ref="reportText">{{ displayedText }}</span>
            <span v-if="isTyping" class="cursor">|</span>
          </div>
        </div>
        
        <div class="ai-section full-width">
          <label>Disclaimer</label>
          <div class="ai-value disclaimer">
            The AI analysis provided is based on advanced algorithms and is for informational purposes only. It does not constitute financial advice and may be subject to errors or inaccuracies.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

interface AIData {
  Report: string;
  Model: string;
  Recommendation: string;
  IntrinsicValue: number;
  UpdatedAt: string;
}

const props = defineProps<{
  aiData: AIData | null;
  Symbol: string;
}>();

defineEmits<{
  close: [];
}>();

const displayedText = ref('');
const isTyping = ref(true);
let typingInterval: ReturnType<typeof setInterval> | null = null;

function getRecommendationClass(recommendation: string | undefined): string {
  if (!recommendation) return '';
  const rec = recommendation.toLowerCase();
  if (rec.includes('strong buy')) return 'strong-buy';
  if (rec.includes('buy')) return 'buy';
  if (rec.includes('strong sell')) return 'strong-sell';
  if (rec.includes('sell')) return 'sell';
  if (rec.includes('hold')) return 'hold';
  return '';
}

function formatIntrinsicValue(value: number | undefined): string {
  if (value === undefined || value === null) return 'N/A';
  return `$${value.toFixed(2)}`;
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return date.toLocaleDateString('en-US', options);
}

function startTypingAnimation() {
  if (!props.aiData?.Report || props.aiData.Report.trim() === '') {
    displayedText.value = `If you're reading this, apparently I'm still not smart enough and can't seem to produce a coherent report on ${props.Symbol} and the dev had to put this message instead, sorry (-_-#)`;
    isTyping.value = false;
    return;
  }

  const fullText = props.aiData.Report;
  let currentIndex = 0;
  const typingSpeed = 15; // milliseconds per character

  typingInterval = setInterval(() => {
    if (currentIndex < fullText.length) {
      displayedText.value = fullText.substring(0, currentIndex + 1);
      currentIndex++;
    } else {
      isTyping.value = false;
      if (typingInterval) {
        clearInterval(typingInterval);
        typingInterval = null;
      }
    }
  }, typingSpeed);
}

onMounted(() => {
  startTypingAnimation();
});

onUnmounted(() => {
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
});
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(24, 25, 38, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}

.modal-content {
  position: relative;
  background: var(--base2);
  color: var(--text1);
  border-radius: 18px;
  padding: 36px 32px 28px 32px;
  width: 90%;
  max-width: 650px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px 0 rgba(0,0,0,0.18), 0 1.5px 8px 0 var(--accent4);
  animation: popup-in 0.18s cubic-bezier(.4,1.4,.6,1) backwards;
}

@keyframes popup-in {
  from { transform: translateY(30px) scale(0.98); opacity: 0; }
  to   { transform: none; opacity: 1; }
}

.close-x {
  position: absolute;
  top: 18px;
  right: 18px;
  background: none;
  border: none;
  color: var(--text2);
  font-size: 1.7rem;
  cursor: pointer;
  transition: color 0.15s;
  line-height: 1;
  padding: 0;
}
.close-x:hover {
  color: var(--accent1);
}

.ai-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.ai-icon {
  width: 22px;
  height: 22px;
  color: var(--accent1);
  animation: sparkle 2s ease-in-out infinite;
}

@keyframes sparkle {
  0%, 100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1) rotate(180deg);
  }
}

h2 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--accent1);
  letter-spacing: 0.01em;
}

.beta-badge {
  background: var(--accent1);
  color: var(--text3);
  font-size: 0.65rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ai-popup-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.ai-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ai-section.full-width {
  grid-column: 1 / -1;
}

label {
  font-size: 1rem;
  color: var(--text2);
  font-weight: 500;
  letter-spacing: 0.01em;
}

.ai-value {
  padding: 10px 12px;
  border-radius: 7px;
  border: 1.5px solid var(--base3);
  background: var(--base1);
  color: var(--text1);
  font-size: 1.08rem;
  font-weight: 500;
  transition: border-color 0.18s;
}

.ai-value.recommendation {
  font-weight: 600;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 1rem;
}

.recommendation.strong-buy {
  background: var(--base1);
  color: var(--positive);
  border-color: var(--positive);
}

.recommendation.buy {
  background: var(--base1);
  color: var(--positive);
  border-color: var(--positive);
  opacity: 0.85;
}

.recommendation.hold {
  background: var(--base1);
  color: var(--text2);
  border-color: var(--text2);
}

.recommendation.sell {
  background: var(--base1);
  color: var(--negative);
  border-color: var(--negative);
  opacity: 0.85;
}

.recommendation.strong-sell {
  background: var(--base1);
  color: var(--negative);
  border-color: var(--negative);
}

.ai-report {
  padding: 12px;
  border-radius: 7px;
  border: 1.5px solid var(--base3);
  background: var(--base1);
  color: var(--text1);
  font-size: 0.95rem;
  line-height: 1.6;
  height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  transition: border-color 0.18s;
}

/* Report scrollbar styling */
.ai-report::-webkit-scrollbar {
  width: 6px;
}

.ai-report::-webkit-scrollbar-track {
  background: var(--base1);
  border-radius: 7px;
}

.ai-report::-webkit-scrollbar-thumb {
  background: var(--base3);
  border-radius: 7px;
}

.ai-report::-webkit-scrollbar-thumb:hover {
  background: var(--accent1);
}

.ai-value.disclaimer {
  background: var(--base1);
  color: var(--text2);
  font-style: italic;
  font-size: 0.92rem;
  border-color: var(--base3);
}

.cursor {
  display: inline-block;
  width: 2px;
  color: var(--accent1);
  font-weight: bold;
  animation: blink 0.8s infinite;
  margin-left: 2px;
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

/* Scrollbar styling */
.modal-content::-webkit-scrollbar {
  width: 8px;
}

.modal-content::-webkit-scrollbar-track {
  background: var(--base1);
  border-radius: 7px;
}

.modal-content::-webkit-scrollbar-thumb {
  background: var(--base3);
  border-radius: 7px;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background: var(--accent1);
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-height: 85vh;
    padding: 28px 24px 20px 24px;
  }

  .ai-popup-content {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  h2 {
    font-size: 1.2rem;
  }

  .ai-value {
    font-size: 0.98rem;
  }

  .ai-report {
    font-size: 0.9rem;
  }
}
</style>
