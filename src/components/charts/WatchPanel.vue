<template>
  <div class="watch-panel-container" role="region" aria-label="Watch Panel">
    <div class="watch-panel" style="display: flex; gap: 8px;" role="list" aria-label="Watch panel tickers">
      <template v-if="watchPanel.length > 0">
        <div class="watch-panel-track" :class="{ 'scrolling': watchPanel.length > 12 }" role="listbox" aria-label="Ticker list">
          <template v-for="repeat in watchPanel.length > 12 ? 2 : 1">
            <button v-for="(ticker, i) in watchPanel" :key="repeat + '-' + i"
              :class="{ active: props.defaultSymbol === ticker.Symbol, 'index-btn': true }"
              @click="selectSymbol(ticker.Symbol)"
              :aria-label="`Select symbol ${ticker.Symbol}, return ${ticker.percentageReturn}`"
              role="option"
              :aria-selected="props.defaultSymbol === ticker.Symbol">
              {{ ticker.Symbol }}
              <span :class="parseFloat(ticker.percentageReturn) > 0 ? 'positive' : 'negative'">
                {{ ticker.percentageReturn }}
              </span>
              <span v-if="parseFloat(ticker.percentageReturn) > 0" class="arrow-up" aria-label="Up"></span>
              <span v-else class="arrow-down" aria-label="Down"></span>
            </button>
          </template>
        </div>
      </template>
      <template v-else>
        <span class="no-symbols" aria-live="polite">No Symbols in Watch Panel</span>
      </template>
    </div>
    <button class="edit-watch-panel-btn" @click="editWatchPanel = true;" aria-label="Edit watch panel">
      Edit Watch Panel
    </button>
    <slot></slot>
  </div>
  <WatchPanelEditor
    v-if="editWatchPanel"
    :apiKey="apiKey"
    :user="user"
    :watchPanel="watchPanel"
    :fetchWatchPanel="fetchWatchPanel"
    @close="closeEditor"
    @update="fetchWatchPanel"
  />
  <NotificationPopup ref="notification" role="alert" aria-live="polite" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import WatchPanelEditor from '@/components/charts/WatchPanelEditor.vue';
import NotificationPopup from '@/components/NotificationPopup.vue';

interface WatchPanelTicker {
  Symbol: string;
  percentageReturn: string;
}

const props = defineProps({
  user: { type: String, required: true },
  apiKey: { type: String, required: true },
  defaultSymbol: { type: String, required: true },
});
const emit = defineEmits(['select-symbol', 'open-editor']);

function selectSymbol(symbol: string) {
  emit('select-symbol', symbol);
}

const watchPanel = ref<WatchPanelTicker[]>([]);

// --- WebSocket WatchPanel data fetcher ---
let ws: WebSocket | null = null;
let wsReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let wsReceived = false;
function closeWatchPanelWS() {
  if (ws) {
    ws.close();
    ws = null;
  }
  if (wsReconnectTimeout) {
    clearTimeout(wsReconnectTimeout);
    wsReconnectTimeout = null;
  }
}

// Notification popup
const notification = ref<InstanceType<typeof NotificationPopup> | null>(null);
const showNotification = (msg: string) => {
  if (notification.value) notification.value.show(msg);
};

// Fallback REST API fetch
async function fetchWatchPanel() {
  try {
    const headers = {
      'x-api-key': props.apiKey
    };
    const response = await fetch(`/api/watchpanel/${props.user}`, {
      headers: headers
    });

    if (!response.ok) {
      showNotification('Failed to load watch panel.');
      return;
    }

    const newWatchPanel = await response.json();
    watchPanel.value = newWatchPanel;

  } catch (error) {
    if (typeof error === 'object' && error !== null && 'name' in error && (error as any).name === 'AbortError') {
      return;
    }
    showNotification('Failed to load watch panel.');
  }
}

// WebSocket fetch for WatchPanel (API key sent as protocol, not in query)
async function fetchWatchPanelWS() {
  closeWatchPanelWS();
  wsReceived = false;
  let user = encodeURIComponent(props.user);
  let wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  let wsUrl = `${wsProto}://${window.location.host}/ws/watchpanel?user=${user}`;
  let triedRest = false;
  ws = new WebSocket(wsUrl, props.apiKey); // API key as protocol
  ws.onopen = () => {
    // No-op, server sends initial data
  };
  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (e) {
      return;
    }
    if (msg.type === 'init') {
      watchPanel.value = msg.data;
      wsReceived = true;
    } else if (msg.type === 'update') {
      // Merge updates into existing array
      for (const update of msg.data) {
        const idx = watchPanel.value.findIndex(t => t.Symbol === update.Symbol);
        if (idx !== -1) {
          watchPanel.value[idx] = { ...watchPanel.value[idx], ...update };
        }
      }
      wsReceived = true;
    } else if (msg.error) {
    }
  };
  ws.onerror = async (e) => {
    if (!triedRest) {
      triedRest = true;
      await fetchWatchPanel();
    }
  };
  ws.onclose = (e) => {
    // Try to reconnect after a delay
    if (!e.wasClean && !triedRest) {
      wsReconnectTimeout = setTimeout(() => {
        fetchWatchPanelWS();
      }, 2000);
    }
  };
}

onMounted(() => {
  if (props.user) {
    fetchWatchPanelWS();
    // Optionally, fallback to REST if websocket doesn't set data in 2s
    setTimeout(() => {
      if (!wsReceived) {
        fetchWatchPanel();
      }
    }, 2000);
  }
});

onUnmounted(() => {
  closeWatchPanelWS();
});

const editWatchPanel = ref(false);

function closeEditor() {
  editWatchPanel.value = false;
}

function openEditor() {
  editWatchPanel.value = true;
}
</script>

<style scoped>
.no-symbols {
  color: var(--text2);
}

.watch-panel-container {
  background-color: var(--base2);
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: calc(100% - 10px);
  margin: 2px 5px;
}
</style>