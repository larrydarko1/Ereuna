<template>
  <div class="watch-panel-container" style="display: flex; align-items: center; justify-content: space-between;">
    <div class="watch-panel" style="display: flex; gap: 8px;">
      <template v-if="watchPanel.length > 0">
        <div class="watch-panel-track" :class="{ 'scrolling': watchPanel.length > 12 }">
          <template v-for="repeat in watchPanel.length > 12 ? 2 : 1">
            <button v-for="(ticker, i) in watchPanel" :key="repeat + '-' + i"
              :class="{ active: defaultSymbol === ticker.Symbol, 'index-btn': true }"
              @click="selectSymbol(ticker.Symbol)">
              {{ ticker.Symbol }}
              <span :class="parseFloat(ticker.percentageReturn) > 0 ? 'positive' : 'negative'">
                {{ ticker.percentageReturn }}
              </span>
              <span v-if="parseFloat(ticker.percentageReturn) > 0" class="arrow-up"></span>
              <span v-else class="arrow-down"></span>
            </button>
          </template>
        </div>
      </template>
      <template v-else>
        <span class="no-symbols">No Symbols in Watch Panel</span>
      </template>
    </div>
    <button class="edit-watch-panel-btn" @click="$emit('open-editor')">
      Edit Watch Panel
    </button>
    <slot></slot>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const props = defineProps({
  user: { type: String, required: true },
  apiKey: { type: String, required: true },
  Tier: { type: String, required: true },
  defaultSymbol: { type: String, required: true }
});
const emit = defineEmits(['select-symbol', 'open-editor']);

const watchPanel = ref([]);

function selectSymbol(symbol) {
  emit('select-symbol', symbol);
}

// Fetch WatchPanel data
async function fetchWatchPanel() {
  try {
    const headers = { 'x-api-key': props.apiKey };
    const response = await fetch(`/api/watchpanel/${props.user}`, { headers });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    watchPanel.value = await response.json();
  } catch (error) {
    // Optionally handle errors
  }
}

// WebSocket for real-time updates
let ws = null;
function WatchPanelWebSocket() {
  if (ws) ws.close();
  let wsUrl;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    wsUrl = `ws://localhost:8000/ws/watchpanel?user=${props.user}`;
  } else {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    wsUrl = `${protocol}://${window.location.host}/ws/watchpanel?user=${props.user}`;
  }
  ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.Symbol && data.percentageReturn) {
        const idx = watchPanel.value.findIndex(item => item.Symbol === data.Symbol);
        if (idx !== -1) {
          watchPanel.value[idx].percentageReturn = data.percentageReturn;
        } else {
          watchPanel.value.push(data);
        }
      }
    } catch (err) {
      console.error('WatchPanel WebSocket message error:', err, event.data);
    }
  };

  ws.onerror = (err) => {
    console.error('WatchPanel WebSocket error:', err);
  };

  ws.onclose = () => {
    ws = null;
    // Optionally implement reconnect logic here
    console.warn('WatchPanel WebSocket closed');
  };
}

// React to Tier/user changes
watch(
  () => [props.Tier, props.user],
  ([newTier, newUser]) => {
    if (newTier === 'Premium' && newUser) {
      WatchPanelWebSocket();
    } else if (newUser) {
      fetchWatchPanel();
      if (ws) {
        ws.close();
        ws = null;
      }
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (props.Tier === 'Premium' && props.user) {
    WatchPanelWebSocket();
  } else if (props.user) {
    fetchWatchPanel();
  }
});
</script>