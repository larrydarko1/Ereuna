<template>
  <transition name="fade">
    <div v-if="show" class="advanced-search-overlay" @click.self="closeSearch">
      <div class="advanced-search-popup" @click.stop>
        <div class="advanced-search-header">
          <h3>{{ t('advancedSearch.title') }}</h3>
          <button class="close-btn" @click="closeSearch" :aria-label="t('advancedSearch.closeSearch')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        
        <div class="search-input-container">
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            class="advanced-search-input"
            :placeholder="t('advancedSearch.searchPlaceholder')"
            @input="handleInput"
            @keydown.down.prevent="navigateDown"
            @keydown.up.prevent="navigateUp"
            @keydown.enter.prevent="selectHighlighted"
            @keydown.esc="closeSearch"
          />
          <svg v-if="isLoading" class="search-spinner" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="var(--accent1)" stroke-width="3" fill="none" opacity="0.25"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--accent1)" stroke-width="3" fill="none" stroke-linecap="round"/>
          </svg>
        </div>

        <div class="search-results" v-if="searchQuery.length > 0">
          <div v-if="isLoading && results.length === 0" class="search-status">
            {{ t('advancedSearch.searching') }}
          </div>
          <div v-else-if="!isLoading && results.length === 0 && searchQuery.length > 0" class="search-status">
            {{ t('advancedSearch.noResults', { query: searchQuery }) }}
          </div>
          <div
            v-for="(result, index) in results"
            :key="result.Symbol"
            class="search-result-item"
            :class="{ highlighted: index === highlightedIndex }"
            @click="selectResult(result)"
            @mouseenter="highlightedIndex = index"
          >
            <div class="result-main">
              <img 
                :src="getImagePath(result.Symbol, result.Exchange)" 
                class="result-logo"
                @error="handleImageError"
                alt=""
              />
              <div class="result-info">
                <div class="result-symbol">{{ result.Symbol }}</div>
                <div class="result-name">{{ result.Name || '-' }}</div>
              </div>
            </div>
            <div class="result-meta">
              <span class="result-exchange">{{ result.Exchange }}</span>
              <span class="result-type">{{ result.AssetType }}</span>
            </div>
          </div>
        </div>

        <div class="search-hint" v-if="searchQuery.length === 0">
          <p>{{ t('advancedSearch.startTyping') }}</p>
          <div class="keyboard-hints">
            <kbd>↑</kbd> <kbd>↓</kbd> <span v-html="t('advancedSearch.keyboardHint')"></span>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface SearchResult {
  Symbol: string;
  Name: string;
  ISIN: string;
  Exchange: string;
  AssetType: string;
  Currency: string;
  MarketCapitalization: number;
  Sector: string;
}

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  apiKey: {
    type: String,
    required: true
  },
  getImagePath: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(['close', 'select']);

const searchQuery = ref('');
const results = ref<SearchResult[]>([]);
const isLoading = ref(false);
const highlightedIndex = ref(-1);
const searchInput = ref<HTMLInputElement | null>(null);
let debounceTimer: number | null = null;

// Focus input when popup opens
watch(() => props.show, (newVal) => {
  if (newVal) {
    nextTick(() => {
      searchInput.value?.focus();
    });
  } else {
    // Reset state when closing
    searchQuery.value = '';
    results.value = [];
    highlightedIndex.value = -1;
  }
});

function handleInput() {
  highlightedIndex.value = -1;
  
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  if (searchQuery.value.trim().length === 0) {
    results.value = [];
    isLoading.value = false;
    return;
  }

  isLoading.value = true;

  debounceTimer = window.setTimeout(async () => {
    await performSearch();
  }, 300); // 300ms debounce
}

async function performSearch() {
  if (searchQuery.value.trim().length === 0) {
    results.value = [];
    isLoading.value = false;
    return;
  }

  try {
    const response = await fetch(
      `/api/search/assets?q=${encodeURIComponent(searchQuery.value)}&limit=20`,
      {
        headers: {
          'X-API-KEY': props.apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const data = await response.json();
    results.value = data.results || [];
  } catch (error) {
    console.error('Search error:', error);
    results.value = [];
  } finally {
    isLoading.value = false;
  }
}

function navigateDown() {
  if (results.value.length === 0) return;
  highlightedIndex.value = Math.min(highlightedIndex.value + 1, results.value.length - 1);
}

function navigateUp() {
  if (results.value.length === 0) return;
  highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
}

function selectHighlighted() {
  if (highlightedIndex.value >= 0 && highlightedIndex.value < results.value.length) {
    selectResult(results.value[highlightedIndex.value]);
  }
}

function selectResult(result: SearchResult) {
  emit('select', result.Symbol);
  closeSearch();
}

function closeSearch() {
  emit('close');
}

function handleImageError(event: Event) {
  const target = event.target as HTMLImageElement;
  target.style.display = 'none';
}
</script>

<style scoped lang="scss">
.advanced-search-overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--base1) 70%, transparent);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
}

.advanced-search-popup {
  background: color-mix(in srgb, var(--base2) 85%, transparent);
  border-radius: 18px;
  box-shadow: 0 8px 32px color-mix(in srgb, var(--base1) 35%, transparent);
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border: 1.5px solid var(--base4);
  backdrop-filter: blur(8px);
  transition: box-shadow 0.2s;
  animation: popup-in 0.18s cubic-bezier(.4,1.4,.6,1) backwards;
}

@keyframes popup-in {
  from { 
    transform: translateY(30px) scale(0.98); 
    opacity: 0; 
  }
  to { 
    transform: none; 
    opacity: 1; 
  }
}

.advanced-search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.75rem 1rem 1.75rem;
  border-bottom: 1px solid var(--base4);

  h3 {
    margin: 0;
    color: var(--accent1);
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: 0.01em;
  }
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text2);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: var(--base4);
    color: var(--text1);
  }
}

.search-input-container {
  position: relative;
  padding: 1.25rem 1.75rem;
  border-bottom: 1px solid var(--base4);
}

.advanced-search-input {
  width: 100%;
  padding: 0.85rem 1.2rem;
  padding-right: 3.5rem;
  border: none;
  border-radius: 6px;
  background: var(--base4);
  color: var(--text1);
  font-size: 1.05rem;
  font-weight: 500;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &::placeholder {
    color: var(--text2);
    font-weight: 400;
  }

  &:focus {
    background: var(--base1);
    box-shadow: 0 0 0 2px var(--accent1);
    transform: translateY(-1px);
  }
}

.search-spinner {
  position: absolute;
  right: 2.5rem;
  top: 50%;
  transform: translateY(-50%);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: translateY(-50%) rotate(0deg);
  }
  to {
    transform: translateY(-50%) rotate(360deg);
  }
}

.search-results {
  overflow-y: auto;
  max-height: 55vh;
  padding: 0.75rem 1rem;
}

.search-status {
  padding: 2rem;
  text-align: center;
  color: var(--text2);
  font-style: italic;
  font-size: 0.95rem;
}

.search-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.65rem 0.9rem;
  margin-bottom: 0.4rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  background: var(--base4);

  &:hover,
  &.highlighted {
    background: var(--base1);
    transform: translateX(4px);
  }
}

.result-main {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex: 1;
  min-width: 0;
}

.result-logo {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  flex-shrink: 0;
  object-fit: contain;
  border: 1px solid var(--text2);
}

.result-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.result-symbol {
  font-weight: 600;
  color: var(--text1);
  font-size: 1rem;
  letter-spacing: 0.02em;
}

.result-name {
  color: var(--text2);
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.result-meta {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  align-items: center;
}

.result-exchange,
.result-type {
  padding: 0.3rem 0.65rem;
  border-radius: 5px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.result-exchange {
  background: var(--base2);
  color: var(--text2);
}

.result-type {
  background: var(--accent1);
  color: var(--text3);
}

.search-hint {
  padding: 2.5rem 1.75rem;
  text-align: center;
  color: var(--text2);

  p {
    margin: 0 0 1.25rem 0;
    font-size: 1rem;
    font-weight: 500;
  }
}

.keyboard-hints {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text2);

  kbd {
    background: var(--base4);
    color: var(--text1);
    padding: 0.3rem 0.6rem;
    border-radius: 5px;
    font-family: monospace;
    font-size: 0.8rem;
    border: 1px solid var(--base1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    font-weight: 600;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active .advanced-search-popup {
  animation: popup-in 0.18s cubic-bezier(.4,1.4,.6,1) backwards;
}

.fade-leave-active .advanced-search-popup {
  animation: popup-out 0.15s cubic-bezier(.4,0,.6,1) forwards;
}

@keyframes popup-out {
  from { 
    transform: none; 
    opacity: 1; 
  }
  to { 
    transform: translateY(20px) scale(0.98); 
    opacity: 0; 
  }
}

@media (max-width: 1150px) {
  .advanced-search-overlay {
    padding: 0.5rem;
  }

  .advanced-search-popup {
    width: 95%;
    max-height: 90vh;
  }

  .advanced-search-header {
    padding: 1.25rem 1.25rem 0.75rem 1.25rem;

    h3 {
      font-size: 1.2rem;
    }
  }

  .search-input-container {
    padding: 1rem 1.25rem;
  }

  .search-results {
    padding: 0.5rem 0.75rem;
    max-height: 60vh;
  }

  .search-result-item {
    padding: 0.55rem 0.75rem;
    font-size: 0.9rem;
  }

  .result-logo {
    width: 28px;
    height: 28px;
  }

  .result-symbol {
    font-size: 0.9rem;
  }

  .result-name {
    font-size: 0.8rem;
    max-width: 140px;
  }

  .result-exchange,
  .result-type {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
  }

  .search-hint {
    padding: 1.5rem 1.25rem;

    p {
      font-size: 0.9rem;
    }
  }

  .keyboard-hints {
    font-size: 0.8rem;
    flex-wrap: wrap;
  }
}
</style>
