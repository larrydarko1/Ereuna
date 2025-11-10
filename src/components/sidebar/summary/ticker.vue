<template>
    <div class="summary-row">
              <div class="category">Ticker</div>
              <div class="response">
                <span>{{ assetInfo.Symbol}}</span>
                <button v-if="assetInfo.Symbol" @click="copyToClipboard(assetInfo.Symbol)" class="copy-icon" title="Copy to clipboard">
                  <transition name="icon" mode="out-in">
                    <svg v-if="!copied" key="copy" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/>
                    </svg>
                    <svg v-else key="check" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
                    </svg>
                  </transition>
                </button>
              </div>
            </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps(['assetInfo', 'formatDate', 'showAllDescription']);

const copied = ref(false);

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
};
</script>

<style lang="scss">
.response {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.copy-icon {
  background: none;
  border: none;
  color: var(--text2);
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.copy-icon:hover {
  background-color: var(--base3);
}

.icon-enter-active,
.icon-leave-active {
  transition: opacity 0.3s ease;
}

.icon-enter-from,
.icon-leave-to {
  opacity: 0;
}
</style>