<template>
 <div id="chart-container">
          <div id="legend"></div>
          <div id="legend2">
            <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                <button
    v-for="type in chartTypes"
    :key="type.value"
    class="navbt"
    :class="{ selected: selectedDataType === type.value }"
    @click="setChartView(type.label)"
  >
    {{ type.shortLabel }}
  </button>
            </div>
            <div style="display: flex; gap: 5px; justify-content: flex-end;">
              <button class="navbt" v-b-tooltip.hover title="Change Chart type" @click="toggleChartType"
              aria-label="Toggle chart type">
              {{ isBarChart ? 'C' : 'B' }}
            </button>
            <button class="navbt">
             <svg width="5" height="5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M2 15.6157C2 16.463 2.68179 17.1448 4.04537 18.5083L5.49167 19.9546C6.85525 21.3182 7.53704 22 8.38426 22C9.23148 22 9.91327 21.3182 11.2769 19.9546L19.9546 11.2769C21.3182 9.91327 22 9.23148 22 8.38426C22 7.53704 21.3182 6.85525 19.9546 5.49167L18.5083 4.04537C17.1448 2.68179 16.463 2 15.6157 2C14.8623 2 14.2396 2.53926 13.1519 3.61778C13.1817 3.63981 13.2103 3.66433 13.2373 3.69135L14.6515 5.10556C14.9444 5.39846 14.9444 5.87333 14.6515 6.16622C14.3586 6.45912 13.8837 6.45912 13.5908 6.16622L12.1766 4.75201C12.1494 4.7248 12.1247 4.69601 12.1026 4.66595L11.0299 5.73861C11.06 5.76077 11.0888 5.78545 11.116 5.81267L13.2373 7.93399C13.5302 8.22688 13.5302 8.70176 13.2373 8.99465C12.9444 9.28754 12.4695 9.28754 12.1766 8.99465L10.0553 6.87333C10.0281 6.84612 10.0034 6.81733 9.98125 6.78726L8.90859 7.85993C8.93865 7.88209 8.96744 7.90678 8.99465 7.93399L10.4089 9.3482C10.7018 9.6411 10.7018 10.116 10.4089 10.4089C10.116 10.7018 9.6411 10.7018 9.3482 10.4089L7.93399 8.99465C7.90678 8.96744 7.88209 8.93865 7.85993 8.90859L6.78727 9.98125C6.81733 10.0034 6.84612 10.0281 6.87333 10.0553L8.99465 12.1766C9.28754 12.4695 9.28754 12.9444 8.99465 13.2373C8.70176 13.5302 8.22688 13.5302 7.93399 13.2373L5.81267 11.116C5.78545 11.0888 5.76077 11.06 5.73861 11.0299L4.66595 12.1026C4.69601 12.1247 4.7248 12.1494 4.75201 12.1766L6.16622 13.5908C6.45912 13.8837 6.45912 14.3586 6.16622 14.6515C5.87333 14.9444 5.39846 14.9444 5.10556 14.6515L3.69135 13.2373C3.66433 13.2103 3.63981 13.1817 3.61778 13.1519C2.53926 14.2396 2 14.8623 2 15.6157Z" fill="#ffffff"></path> </g></svg>
            </button>
            </div>
          </div>
          <div id="legend3"></div>
          <div id="legend4">
            <img class="chart-img" :src="getImagePath(assetInfo.Symbol)" alt="">
            <p class="ticker">{{ assetInfo.Symbol }} </p>
            <p class="name"> - {{ assetInfo.Name }}</p>
            <div v-if="isInHiddenList(selectedItem)" class="hidden-message">
              <p>HIDDEN LIST</p>
            </div>
          </div>
          <div id="legend5">
            <span :style="{ color: 'var(--ma4)', cursor: 'pointer', opacity: showMA4 ? 1 : 0.3 }"
              @click="showMA4 = !showMA4">-- 200SMA</span>
            <span :style="{ color: 'var(--ma3)', cursor: 'pointer', opacity: showMA3 ? 1 : 0.3 }"
              @click="showMA3 = !showMA3">-- 50SMA</span>
            <span :style="{ color: 'var(--ma2)', cursor: 'pointer', opacity: showMA2 ? 1 : 0.3 }"
              @click="showMA2 = !showMA2">-- 20SMA</span>
            <span :style="{ color: 'var(--ma1)', cursor: 'pointer', opacity: showMA1 ? 1 : 0.3 }"
              @click="showMA1 = !showMA1">-- 10SMA</span>
              <span :style="{ color: 'var(--accent1)', cursor: 'pointer', opacity: showPriceTarget ? 1 : 0.3 }"
      @click="showPriceTarget = !showPriceTarget">Price Target</span>
          </div>
          <div id="chartdiv" ref="mainchart" :class="{ 'chart-loading': isChartLoading }"></div>
          <div class="loading-container" v-if="isChartLoading">
            <Loader />
          </div>
          <div class="loading-container" v-if="isLoading">
            <Loader />
          </div>
        </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

let isChartLoading = ref(false);

const data = ref([]); // Daily OHCL Data
const data2 = ref([]); // Daily Volume Data
const data3 = ref([]); // daily 10MA
const data4 = ref([]); // daily 20MA
const data5 = ref([]); // daily 50MA
const data6 = ref([]); // daily 200MA
const data7 = ref([]); // Weekly OHCL Data
const data8 = ref([]); // Weekly Volume Data
const data9 = ref([]); // weekly 10MA
const data10 = ref([]); // weekly 20MA
const data11 = ref([]); // weekly 50MA
const data12 = ref([]); // weekly 200MA
const data13 = ref([]); // 5m OHLC
const data14 = ref([]); // 5m Volume
const data15 = ref([]); // 5m MA10
const data16 = ref([]); // 5m MA20
const data17 = ref([]); // 5m MA50
const data18 = ref([]); // 5m MA200
const data19 = ref([]); // 15m OHLC
const data20 = ref([]); // 15m Volume
const data21 = ref([]); // 15m MA10
const data22 = ref([]); // 15m MA20
const data23 = ref([]); // 15m MA50
const data24 = ref([]); // 15m MA200
const data25 = ref([]); // 30m OHLC
const data26 = ref([]); // 30m Volume
const data27 = ref([]); // 30m MA10
const data28 = ref([]); // 30m MA20
const data29 = ref([]); // 30m MA50
const data30 = ref([]); // 30m MA200
const data31 = ref([]); // 1hr OHLC
const data32 = ref([]); // 1hr Volume
const data33 = ref([]); // 1hr MA10
const data34 = ref([]); // 1hr MA20
const data35 = ref([]); // 1hr MA50
const data36 = ref([]); // 1hr MA200
const data37 = ref([]); // 1m OHLC
const data38 = ref([]); // 1m Volume
const data39 = ref([]); // 1m MA10
const data40 = ref([]); // 1m MA20
const data41 = ref([]); // 1m MA50
const data42 = ref([]); // 1m MA200
const priceTarget = ref(null);

async function fetchPriceTarget() {
  try {
    let symbol = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/pricetarget/${symbol}`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    // If your API returns { priceTarget: 123.45 }
    priceTarget.value = result.priceTarget;
  } catch (error) {
    if (error.name === 'AbortError') return;
    error.value = error.message;
  }
}

async function fetchChartData() {
  try {
    let symbol = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${symbol}/chartdata`, { headers: { 'X-API-KEY': apiKey } });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();

    // Daily
    data.value = Array.isArray(result.daily?.ohlc) ? result.daily.ohlc : [];
    data2.value = Array.isArray(result.daily?.volume) ? result.daily.volume : [];
    data3.value = Array.isArray(result.daily?.MA10) ? result.daily.MA10 : [];
    data4.value = Array.isArray(result.daily?.MA20) ? result.daily.MA20 : [];
    data5.value = Array.isArray(result.daily?.MA50) ? result.daily.MA50 : [];
    data6.value = Array.isArray(result.daily?.MA200) ? result.daily.MA200 : [];

    // Weekly
    data7.value = Array.isArray(result.weekly?.ohlc) ? result.weekly.ohlc : [];
    data8.value = Array.isArray(result.weekly?.volume) ? result.weekly.volume : [];
    data9.value = Array.isArray(result.weekly?.MA10) ? result.weekly.MA10 : [];
    data10.value = Array.isArray(result.weekly?.MA20) ? result.weekly.MA20 : [];
    data11.value = Array.isArray(result.weekly?.MA50) ? result.weekly.MA50 : [];
    data12.value = Array.isArray(result.weekly?.MA200) ? result.weekly.MA200 : [];

    // Intraday 5m
    data13.value = Array.isArray(result.intraday5m?.ohlc) ? result.intraday5m.ohlc : [];
    data14.value = Array.isArray(result.intraday5m?.volume) ? result.intraday5m.volume : [];
    data15.value = Array.isArray(result.intraday5m?.MA10) ? result.intraday5m.MA10 : [];
    data16.value = Array.isArray(result.intraday5m?.MA20) ? result.intraday5m.MA20 : [];
    data17.value = Array.isArray(result.intraday5m?.MA50) ? result.intraday5m.MA50 : [];
    data18.value = Array.isArray(result.intraday5m?.MA200) ? result.intraday5m.MA200 : [];

    // Intraday 15m
    data19.value = Array.isArray(result.intraday15m?.ohlc) ? result.intraday15m.ohlc : [];
    data20.value = Array.isArray(result.intraday15m?.volume) ? result.intraday15m.volume : [];
    data21.value = Array.isArray(result.intraday15m?.MA10) ? result.intraday15m.MA10 : [];
    data22.value = Array.isArray(result.intraday15m?.MA20) ? result.intraday15m.MA20 : [];
    data23.value = Array.isArray(result.intraday15m?.MA50) ? result.intraday15m.MA50 : [];
    data24.value = Array.isArray(result.intraday15m?.MA200) ? result.intraday15m.MA200 : [];

    // Intraday 30m
    data25.value = Array.isArray(result.intraday30m?.ohlc) ? result.intraday30m.ohlc : [];
    data26.value = Array.isArray(result.intraday30m?.volume) ? result.intraday30m.volume : [];
    data27.value = Array.isArray(result.intraday30m?.MA10) ? result.intraday30m.MA10 : [];
    data28.value = Array.isArray(result.intraday30m?.MA20) ? result.intraday30m.MA20 : [];
    data29.value = Array.isArray(result.intraday30m?.MA50) ? result.intraday30m.MA50 : [];
    data30.value = Array.isArray(result.intraday30m?.MA200) ? result.intraday30m.MA200 : [];

    // Intraday 1hr
    data31.value = Array.isArray(result.intraday1hr?.ohlc) ? result.intraday1hr.ohlc : [];
    data32.value = Array.isArray(result.intraday1hr?.volume) ? result.intraday1hr.volume : [];
    data33.value = Array.isArray(result.intraday1hr?.MA10) ? result.intraday1hr.MA10 : [];
    data34.value = Array.isArray(result.intraday1hr?.MA20) ? result.intraday1hr.MA20 : [];
    data35.value = Array.isArray(result.intraday1hr?.MA50) ? result.intraday1hr.MA50 : [];
    data36.value = Array.isArray(result.intraday1hr?.MA200) ? result.intraday1hr.MA200 : [];

    // Intraday 1m
    data37.value = Array.isArray(result.intraday1m?.ohlc) ? result.intraday1m.ohlc : [];
    data38.value = Array.isArray(result.intraday1m?.volume) ? result.intraday1m.volume : [];
    data39.value = Array.isArray(result.intraday1m?.MA10) ? result.intraday1m.MA10 : [];
    data40.value = Array.isArray(result.intraday1m?.MA20) ? result.intraday1m.MA20 : [];
    data41.value = Array.isArray(result.intraday1m?.MA50) ? result.intraday1m.MA50 : [];
    data42.value = Array.isArray(result.intraday1m?.MA200) ? result.intraday1m.MA200 : [];
  } catch (error) {
    error.value = error.message;
  }
}

let chartView = ref('Daily Chart');

const isLoading = ref(true)
const charttype = ref('C')
const isBarChart = ref(false);

const chartTypes = [
  { label: 'Intraday 1m', value: 'intraday1m', shortLabel: '1m' },
  { label: 'Intraday 5m', value: 'intraday5m', shortLabel: '5m' },
  { label: 'Intraday 15m', value: 'intraday15m', shortLabel: '15m' },
  { label: 'Intraday 30m', value: 'intraday30m', shortLabel: '30m' },
  { label: 'Intraday 1hr', value: 'intraday1hr', shortLabel: '1h' },
  { label: 'Daily Chart', value: 'daily', shortLabel: '1D' },
  { label: 'Weekly Chart', value: 'weekly', shortLabel: '1W' },
];


// Chart data type selection (multi-option)
const dataTypes = [
  { label: 'Intraday 1m', value: 'intraday1m', data: () => data37.value, volume: () => data38.value, ma: [() => data39.value, () => data40.value, () => data41.value, () => data42.value] },
  { label: 'Intraday 5m', value: 'intraday5m', data: () => data13.value, volume: () => data14.value, ma: [() => data15.value, () => data16.value, () => data17.value, () => data18.value] },
  { label: 'Intraday 15m', value: 'intraday15m', data: () => data19.value, volume: () => data20.value, ma: [() => data21.value, () => data22.value, () => data23.value, () => data24.value] },
  { label: 'Intraday 30m', value: 'intraday30m', data: () => data25.value, volume: () => data26.value, ma: [() => data27.value, () => data28.value, () => data29.value, () => data30.value] },
  { label: 'Intraday 1hr', value: 'intraday1hr', data: () => data31.value, volume: () => data32.value, ma: [() => data33.value, () => data34.value, () => data35.value, () => data36.value] },
  { label: 'Daily Chart', value: 'daily', data: () => data.value, volume: () => data2.value, ma: [() => data3.value, () => data4.value, () => data5.value, () => data6.value] },
  { label: 'Weekly Chart', value: 'weekly', data: () => data7.value, volume: () => data8.value, ma: [() => data9.value, () => data10.value, () => data11.value, () => data12.value] },
];
const selectedDataType = ref('daily');

function setChartView(view) {
  // Update selectedDataType instantly for fast UI feedback
  chartView.value = view;
  const typeObj = dataTypes.find(dt => dt.label === view);
  if (typeObj) {
    selectedDataType.value = typeObj.value;
  }
  // Now fetch data (async) after UI update
  isLoading.value = true;
  fetchChartData().finally(() => {
    fetchPriceTarget();
    isLoading.value = false;
  });
}

const defaultStyles = getComputedStyle(document.documentElement);
const theme = {
  accent1: defaultStyles.getPropertyValue('--accent1'),
  accent2: defaultStyles.getPropertyValue('--accent2'),
  accent3: defaultStyles.getPropertyValue('--accent3'),
  accent4: defaultStyles.getPropertyValue('--accent4'),
  text1: defaultStyles.getPropertyValue('--text1'),
  text2: defaultStyles.getPropertyValue('--text2'),
  text3: defaultStyles.getPropertyValue('--text3'),
  base1: defaultStyles.getPropertyValue('--base1'),
  base2: defaultStyles.getPropertyValue('--base2'),
  base3: defaultStyles.getPropertyValue('--base3'),
  base4: defaultStyles.getPropertyValue('--base4'),
  positive: defaultStyles.getPropertyValue('--positive'),
  negative: defaultStyles.getPropertyValue('--negative'),
  volume: defaultStyles.getPropertyValue('--volume'),
  ma1: defaultStyles.getPropertyValue('--ma1'),
  ma2: defaultStyles.getPropertyValue('--ma2'),
  ma3: defaultStyles.getPropertyValue('--ma3'),
  ma4: defaultStyles.getPropertyValue('--ma4'),
};

const mainchart = ref(null);
const chartInstance = ref(null);
const mainchartMobile = ref(null);
const isMobile = ref(window.innerWidth <= 1150);
const showMA1 = ref(true);
const showMA2 = ref(true);
const showMA3 = ref(true);
const showMA4 = ref(true);
const showPriceTarget = ref(true);
const isInitializing = ref(true);

function getChartDimensions() {
  return isMobile.value
    ? { width: mainchartMobile.value?.offsetWidth || 400, height: 200 }
    : { width: mainchart.value?.offsetWidth || 500, height: mainchart.value?.offsetHeight || 550 };
}

function resizeChart() {
  if (chartInstance.value) {
    const { width, height } = getChartDimensions();
    chartInstance.value.applyOptions({ width, height });
  }
}

    function toggleChartType() {
  isBarChart.value = !isBarChart.value;
}

function formatChartTime(timeStr) {
  // Converts '2025-07-16T14:00' to Unix timestamp (seconds)
  return Math.floor(new Date(timeStr).getTime() / 1000);
}

// --- Real-time WebSocket chart updates integration ---
let chartWs = null;
let wsReconnectTimeout = null;
let wsActiveSymbol = null;

function clearAllChartArrays() {
  // Clear all chart data arrays for all timeframes
  [data, data2, data3, data4, data5, data6, data7, data8, data9, data10, data11, data12,
   data13, data14, data15, data16, data17, data18, data19, data20, data21, data22, data23, data24,
   data25, data26, data27, data28, data29, data30, data31, data32, data33, data34, data35, data36,
   data37, data38, data39, data40, data41, data42].forEach(arr => { arr.value = []; });
}

function closeChartWebSocket() {
  if (chartWs) {
    chartWs.onclose = null;
    chartWs.onerror = null;
    chartWs.onmessage = null;
    chartWs.close();
    chartWs = null;
  }
  if (wsReconnectTimeout) {
    clearTimeout(wsReconnectTimeout);
    wsReconnectTimeout = null;
  }
}


function openChartWebSocket(symbol) {
  closeChartWebSocket();
  wsActiveSymbol = symbol;
  let wsUrl;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    wsUrl = `ws://localhost:8000/ws/chartdata?ticker=${symbol}`;
  } else {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    wsUrl = `${protocol}://${window.location.host}/ws/chartdata?ticker=${symbol}`;
  }
  chartWs = new WebSocket(wsUrl);

  // Map backend timeframes to correct frontend arrays
  const tfMap = {
    '1m': data37,
    '5m': data13,
    '15m': data19,
    '30m': data25,
    '60m': data31,
    '1440m': data,
    '10080m': data7,
    // fallback for legacy keys
    '1hr': data31,
    'daily': data,
    'weekly': data7
  };

  chartWs.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      // Handle initial payload (if backend sends it)
      if (msg.type === 'init' && msg.data) {
        clearAllChartArrays();
        Object.entries(msg.data).forEach(([tf, candles]) => {
          const arr = tfMap[tf];
          if (!arr) return;
          arr.value = candles.map(c => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close
          }));
          arr.value = [...arr.value];
        });
        if (typeof updateChartData === 'function') updateChartData();
        return;
      }
      // Handle new candle
      if (msg.type === 'new_candle' && msg.timeframe && msg.candle) {
        const arr = tfMap[msg.timeframe];
        if (!arr) return;
        const cndl = msg.candle;
        // Only push if new (by time)
        if (arr.value.length === 0 || arr.value[arr.value.length-1].time !== cndl.time) {
          arr.value.push({
            time: cndl.time,
            open: cndl.open,
            high: cndl.high,
            low: cndl.low,
            close: cndl.close
          });
          arr.value = [...arr.value];
          // Force chart update if this is the active chart type
          // selectedDataType is like 'daily', 'intraday1m', etc. Map accordingly if needed
          // For now, just always update
          if (typeof updateChartData === 'function') updateChartData();
        }
        return;
      }
      // Handle error
      if (msg.error) {
        console.error('[WS] Error:', msg.error);
      }
    } catch (err) {
      console.error('[WS] Parse error:', err, event.data);
    }
  };

  chartWs.onerror = (e) => {
    // Fallback to REST if error
    closeChartWebSocket();
    wsReconnectTimeout = setTimeout(() => {
      fetchChartData();
    }, 1000);
  };
  chartWs.onclose = () => {
    // Try to reconnect after a delay, or fallback to REST
    wsReconnectTimeout = setTimeout(() => {
      if (wsActiveSymbol === (defaultSymbol || selectedItem)) {
        openChartWebSocket(wsActiveSymbol);
      } else {
        fetchChartData();
      }
    }, 2000);
  };
}

// Watch for symbol changes to re-open WebSocket and clear arrays
watch(() => defaultSymbol, (newSymbol, oldSymbol) => {
  if (newSymbol && newSymbol !== oldSymbol) {
    clearAllChartArrays();
    openChartWebSocket(newSymbol);
  }
});
watch(() => selectedItem, (newSymbol, oldSymbol) => {
  if (newSymbol && newSymbol !== oldSymbol) {
    clearAllChartArrays();
    openChartWebSocket(newSymbol);
  }
});

// On mount, open WebSocket for initial symbol
onMounted(() => {
  const symbol = defaultSymbol || selectedItem;
  if (symbol) {
    openChartWebSocket(symbol);
  }
});

// On unmount, close WebSocket
onBeforeUnmount(() => {
  closeChartWebSocket();
});

async function fetchUserDefaultSymbol() {
  try {
    if (!user) return null;

    const response = await fetch(`/api/${user}/default-symbol`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch default symbol');

    const data = await response.json();
    return data.defaultSymbol;
  } catch (error) {
    error.value = error.message;
    return null;
  }
}

// mounts chart (including volume)
onMounted(async () => {
  try {
    isInitializing.value = true;
    localStorage.removeItem('defaultSymbol');

    selectedItem = await fetchUserDefaultSymbol();
    if (selectedItem) {
      defaultSymbol = selectedItem;
      localStorage.setItem('defaultSymbol', selectedItem);
    }
    await showTicker();
    await nextTick()
    const chartDiv = isMobile.value ? mainchartMobile.value : mainchart.value;
    const { width, height } = getChartDimensions();
    const chart = createChart(chartDiv, {
      height,
      width,
      layout: {
        background: {
          type: ColorType.Solid,
          color: theme.base1,
        },
        textColor: theme.text1,
      },
      grid: {
        vertLines: {
          color: 'transparent',
        },
        horzLines: {
          color: 'transparent',
        }
      }, crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: theme.accent1,
          labelBackgroundColor: theme.accent1,
        },
        horzLine: {
          color: theme.accent1,
          labelBackgroundColor: theme.accent1,
        },
      },
      timeScale: {
        barSpacing: 2.5,
        minBarSpacing: 0.1,
        rightOffset: 20,
      },
    });
    chartInstance.value = chart;


    let barSeries = chart.addCandlestickSeries({
      downColor: theme.negative,
      upColor: theme.positive,
      borderDownColor: theme.negative,
      borderUpColor: theme.positive,
      wickDownColor: theme.negative,
      wickUpColor: theme.positive,
      priceLineVisible: true,
    });

    function updateChartType() {
      chart.removeSeries(barSeries);
      if (isBarChart.value) {
        barSeries = chart.addBarSeries({
          downColor: theme.negative,
          upColor: theme.positive,
          priceLineVisible: true,
        });
      } else {
        barSeries = chart.addCandlestickSeries({
          downColor: theme.negative,
          upColor: theme.positive,
          borderDownColor: theme.negative,
          borderUpColor: theme.positive,
          wickDownColor: theme.negative,
          wickUpColor: theme.positive,
          priceLineVisible: true,
        });
      }
      updateChartData();
    }

function updateChartData() {
  const typeObj = dataTypes.find(dt => dt.value === selectedDataType.value);
  if (!typeObj) return;
  const changes = calculateChanges(typeObj.data());
  barSeries.setData(changes);
  updateLastRecordedValue(changes);

  // --- Time scale formatting and series visibility for intraday ---
  const isIntraday = ["intraday1m","intraday5m", "intraday15m", "intraday30m", "intraday1hr"].includes(selectedDataType.value);
  // Set correct tickMarkFormatter for each chart type
  if (isIntraday) {
    chartInstance.value.timeScale().applyOptions({
      timeVisible: true,
      secondsVisible: false,
      tickMarkFormatter: (time, locale) => {
        if (typeof time !== 'number' || isNaN(time)) return '';
        const date = new Date(time * 1000);
        return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
      }
    });
  } else {
    chartInstance.value.timeScale().applyOptions({
      timeVisible: true,
      secondsVisible: false,
      tickMarkFormatter: (time, tickMarkType, locale) => {
        if (typeof time !== 'number' || isNaN(time)) return '';
        const date = new Date(time * 1000);
        return date.toLocaleDateString(locale, { year: 'numeric', month: 'numeric', day: 'numeric' });
      }
    });
  }

  // Clear all series before updating to prevent leftover data
  Histogram.setData([]);
  MaSeries1.setData([]);
  MaSeries2.setData([]);
  MaSeries3.setData([]);
  MaSeries4.setData([]);

  if (isIntraday) {
    if (!typeObj.volume() || typeObj.volume().length === 0) {
      Histogram.applyOptions({ visible: false });
    } else {
      Histogram.setData(typeObj.volume());
      Histogram.applyOptions({ visible: true });
    }
    // Show intraday moving averages if data exists and toggles are on
    if (typeObj.ma[0]().length > 0) {
      MaSeries1.setData(typeObj.ma[0]());
      MaSeries1.applyOptions({ visible: showMA1.value });
    }
    if (typeObj.ma[1]().length > 0) {
      MaSeries2.setData(typeObj.ma[1]());
      MaSeries2.applyOptions({ visible: showMA2.value });
    }
    if (typeObj.ma[2]().length > 0) {
      MaSeries3.setData(typeObj.ma[2]());
      MaSeries3.applyOptions({ visible: showMA3.value });
    }
    if (typeObj.ma[3]().length > 0) {
      MaSeries4.setData(typeObj.ma[3]());
      MaSeries4.applyOptions({ visible: showMA4.value });
    }
  } else {
    Histogram.setData(typeObj.volume());
    Histogram.applyOptions({ visible: true });
    MaSeries1.setData(typeObj.ma[0]());
    MaSeries1.applyOptions({ visible: showMA1.value });
    MaSeries2.setData(typeObj.ma[1]());
    MaSeries2.applyOptions({ visible: showMA2.value });
    MaSeries3.setData(typeObj.ma[2]());
    MaSeries3.applyOptions({ visible: showMA3.value });
    MaSeries4.setData(typeObj.ma[3]());
    MaSeries4.applyOptions({ visible: showMA4.value });
  }
}

    watch(isBarChart, () => {
      updateChartType();
    });

    watch(selectedDataType, () => {
      updateChartData();
    });

    // Watchers for data updates
    dataTypes.forEach(typeObj => {
      watch(typeObj.data, () => {
        if (selectedDataType.value === typeObj.value) {
          updateChartData();
        }
      });
      watch(typeObj.volume, () => {
        if (selectedDataType.value === typeObj.value) {
          updateChartData();
        }
      });
      typeObj.ma.forEach((maFn, idx) => {
        watch(maFn, () => {
          if (selectedDataType.value === typeObj.value) {
            updateChartData();
          }
        });
      });
    });

    const Histogram = chart.addHistogramSeries({
      color: theme.volume,
      priceLineVisible: true,
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    const MaSeries1 = chart.addLineSeries({
      color: theme.ma1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      lineWidth: 1,
    });

    const MaSeries2 = chart.addLineSeries({
      color: theme.ma2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      lineWidth: 1,
    });

    const MaSeries3 = chart.addLineSeries({
      color: theme.ma3,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      lineWidth: 1,
    });

    const MaSeries4 = chart.addLineSeries({
      color: theme.ma4,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      lineWidth: 1,
    });

    Histogram.priceScale().applyOptions({
      scaleMargins: {
        top: 0.9,
        bottom: 0,
      }
    });

    let lastRecordedValue = null;

    function updateLastRecordedValue(changes) {
      if (chartView.value === 'Daily Chart') {
        lastRecordedValue = changes[changes.length - 1];
      } else if (chartView.value === 'Weekly Chart') {
        lastRecordedValue = changes[changes.length - 1];
      }
      updateFirstRow(lastRecordedValue);
    }

    let priceTargetLine = null;
watch([priceTarget, showPriceTarget], ([newTarget, visible]) => {
  if (barSeries) {
    // Remove previous price line if it exists
    if (priceTargetLine) {
      barSeries.removePriceLine(priceTargetLine);
      priceTargetLine = null;
    }
    // Only add if visible and newTarget is a valid number
    if (visible && typeof newTarget === 'number' && !isNaN(newTarget)) {
      priceTargetLine = barSeries.createPriceLine({
        price: newTarget,
        color: theme.accent1,
        lineWidth: 2,
        lineStyle: 2, // dashed
        axisLabelVisible: true,
        title: 'Price Target'
      });
    }
  }
});


    watch(data2, (newData2) => {
      const relativeVolumeData = newData2.map((dataPoint, index) => {
        const averageVolume = calculateAverageVolume(newData2, index);
        const relativeVolume = dataPoint.value / averageVolume;
        const color = relativeVolume > 2 ? theme.accent1 : theme.volume;
        return {
          time: dataPoint.time,
          value: dataPoint.value,
          color,
        };
      });
      Histogram.setData(relativeVolumeData);
    });

    // Watch for visibility changes and set series visibility
    watch(showMA1, (visible) => {
      MaSeries1.applyOptions({ visible });
    });
    watch(showMA2, (visible) => {
      MaSeries2.applyOptions({ visible });
    });
    watch(showMA3, (visible) => {
      MaSeries3.applyOptions({ visible });
    });
    watch(showMA4, (visible) => {
      MaSeries4.applyOptions({ visible });
    });

    // Set initial visibility
    MaSeries1.applyOptions({ visible: showMA1.value });
    MaSeries2.applyOptions({ visible: showMA2.value });
    MaSeries3.applyOptions({ visible: showMA3.value });
    MaSeries4.applyOptions({ visible: showMA4.value });


    function calculateChanges(dataPoints) {
      const changes = [];
      for (let i = 0; i < dataPoints.length; i++) {
        const currentPoint = dataPoints[i];
        const previousPoint = i > 0 ? dataPoints[i - 1] : null;
        let change = 0;
        let percentageChange = 0;

        if (previousPoint) {
          change = currentPoint.close - previousPoint.close;
          percentageChange = (change / previousPoint.close) * 100;
        }

        // Convert intraday time strings to Unix timestamp
        let chartTime = currentPoint.time;
        if (typeof chartTime === 'string' && chartTime.includes('T')) {
          chartTime = formatChartTime(chartTime);
        }

        changes.push({
          time: chartTime,
          open: currentPoint.open,
          high: currentPoint.high,
          low: currentPoint.low,
          close: currentPoint.close,
          change: change.toFixed(2),
          percentageChange: percentageChange.toFixed(2) + '%',
        });
      }
      // Sort by time ascending and remove duplicates
      const uniqueChanges = [];
      const seenTimes = new Set();
      changes
        .sort((a, b) => a.time - b.time)
        .forEach(item => {
          if (!seenTimes.has(item.time)) {
            uniqueChanges.push(item);
            seenTimes.add(item.time);
          }
        });
      return uniqueChanges;
    }

    watch(data, (newData) => {
      const changes = calculateChanges(newData);
      barSeries.setData(changes);
    });

    function calculateAverageVolume(data, index) {
      const windowSize = 365; // adjust this value to change the window size for calculating average volume
      const start = Math.max(0, index - windowSize + 1);
      const end = index + 1;
      const sum = data.slice(start, end).reduce((acc, current) => acc + current.value, 0);
      return sum / (end - start);
    }

    const container = document.getElementById('legend');
    const firstRow = document.createElement('div');
    container.appendChild(firstRow);

    function updateFirstRow(value) {
      if (value) {
        const priceOpen = value.open.toFixed(2);
        const priceHigh = value.high.toFixed(2);
        const priceLow = value.low.toFixed(2);
        const priceClose = value.close.toFixed(2);
        const priceChange = value.change;
        const changePerc = value.percentageChange;

        // Check if the current candle is up or down
        const isUp = priceClose > priceOpen;
        const className = isUp ? 'positive' : 'negative';

        firstRow.innerHTML = `
      <strong class="${className}"><span style="color: var(--text1)">Open:</span> ${priceOpen}</strong>
      <strong class="${className}"><span style="color: var(--text1)">High:</span> ${priceHigh}</strong>
      <strong class="${className}"><span style="color: var(--text1)">Low:</span> ${priceLow}</strong>
      <strong class="${className}"><span style="color: var(--text1)">Close:</span> ${priceClose}</strong>
      <strong class="${className}">${priceChange}</strong>
      <strong class="${className}">${changePerc}</strong>
    `;
      }
    }

    chart.subscribeCrosshairMove(param => {
      if (param.time) {
        const typeObj = dataTypes.find(dt => dt.value === selectedDataType.value);
        const changes = calculateChanges(typeObj.data());
        const currentChange = changes.find(change => change.time === param.time);
        if (currentChange) {
          const priceOpen = currentChange.open.toFixed(2);
          const priceHigh = currentChange.high.toFixed(2);
          const priceLow = currentChange.low.toFixed(2);
          const priceClose = currentChange.close.toFixed(2);
          const priceChange = currentChange.change;
          const changePerc = currentChange.percentageChange;
          const isUp = priceClose > priceOpen;
          const className = isUp ? 'positive' : 'negative';
          firstRow.innerHTML = `
            <strong class="${className}"><span style="color: ${theme.text1}">Open:</span> ${priceOpen}</strong>
            <strong class="${className}"><span style="color: ${theme.text1}">High:</span> ${priceHigh}</strong>
            <strong class="${className}"><span style="color:${theme.text1}">Low:</span> ${priceLow}</strong>
            <strong class="${className}"><span style="color: ${theme.text1}">Close:</span> ${priceClose}</strong>
            <strong class="${className}">${priceChange}</strong>
            <strong class="${className}">${changePerc}</strong>
          `;
        }
      }
    });

    function calculateReturns(data) {
      const returns = {};
      const periods = ['1W', '1M', '3M', '6M', '1Y', '3Y', '5Y'];

      periods.forEach((period) => {
        let initialValue;
        let finalValue;

        // Get the last (most recent) closing price
        finalValue = data[data.length - 1]?.close || 0;

        switch (period) {
          case '1W':
            // 5 trading days
            initialValue = data[data.length - 5]?.close || 0;
            break;
          case '1M':
            // ~21 trading days
            initialValue = data[data.length - 21]?.close || 0;
            break;
          case '3M':
            // ~63 trading days
            initialValue = data[data.length - 63]?.close || 0;
            break;
          case '6M':
            // ~126 trading days
            initialValue = data[data.length - 126]?.close || 0;
            break;
          case '1Y':
            // ~252 trading days
            initialValue = data[data.length - 252]?.close || 0;
            break;
          case '3Y':
            // ~756 trading days
            initialValue = data[data.length - 756]?.close || 0;
            break;
          case '5Y':
            // ~1260 trading days
            initialValue = data[data.length - 1260]?.close || 0;
            break;
          default:
            break;
        }

        if (initialValue > 0) {
          const returnPercentage = ((finalValue - initialValue) / initialValue * 100).toFixed(2) + '%';
          returns[period] = returnPercentage;
        } else {
          returns[period] = '-';
        }
      });

      return returns;
    }

    const legend3 = document.getElementById('legend3');

    function updateLegend3(data) {
      const returns = calculateReturns(data);
      let html = '';

      Object.keys(returns).forEach((period) => {
        const isUp = parseFloat(returns[period].replace('%', '')) > 0;
        const className = isUp ? 'positive' : 'negative';

        html += `
      <strong style="color: ${theme.text1}">${period}: <span class="${className}">${returns[period]}</span></strong>
    `;
      });

      legend3.innerHTML = html;
    }

    await fetchChartData();
    await fetchPriceTarget();
    updateLegend3(data.value);
    isLoading.value = false

    watch(data, (newData) => {
      updateLegend3(newData);
    });

  } catch (error) {
  } finally {
    isInitializing.value = false;
  }

  window.addEventListener('resize', resizeChart);

});


// UI handler for chart data type selection
function handleDataTypeSelection(type) {
  setChartDataType(type);
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart);
});

const hiddenList = ref([]);

async function fetchHiddenList() {
  try {
    const response = await fetch(`/api/${user}/hidden`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    hiddenList.value = data.Hidden; // Assuming the response structure is { Hidden: [...] }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

const isInHiddenList = (item) => {
  return hiddenList.value.includes(item);
};

</script>