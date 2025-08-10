<template>
                                <div class="chart-container">
                                  <div class="loading-container1" v-if="isChartLoading1 || isLoading1">
                                    <Loader />
                                  </div>
                                  <div id="legend">
                                      <img class="chart-img" :src="getImagePath(assetInfo?.Symbol)" alt="">
  <p class="ticker">{{ assetInfo?.Symbol }} </p>
  <p class="name"> - {{ assetInfo?.Name }}</p>
  <div v-if="isInHiddenList(assetInfo?.Symbol)" class="hidden-message">
              <p>HIDDEN LIST</p>
            </div>
                                  </div>
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
<div id="legend3">
   <span v-if="ohlcDisplay" class="ohlc-line">
    Open: <span>{{ ohlcDisplay.open }}</span>
    High: <span>{{ ohlcDisplay.high }}</span>
    Close: <span>{{ ohlcDisplay.close }}</span>
    Low: <span>{{ ohlcDisplay.low }}</span>
    <span :class="['change', ohlcDisplay.changeRaw >= 0 ? 'pos' : 'neg']">
      {{ ohlcDisplay.changeRaw >= 0 ? '+' : '' }}{{ ohlcDisplay.changeRaw }}
      {{ ohlcDisplay.changeRaw >= 0 ? '+' : '' }}{{ ohlcDisplay.changePct }}%
    </span>
  </span>
</div>
                                  <div id="wk-chart" ref="wkchart" style="width: 100%; height: 250px;"
                                    :class="{ 'hidden': isChartLoading1 || isLoading1 }"></div>
                                </div>
</template>

<script setup>
import Loader from '@/components/loader.vue'
import { onMounted, ref, watch, computed  } from 'vue';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

const props = defineProps({
  apiKey: {
    type: String,
    required: true
  },
  user: {
    type: String,
    required: true
  },
  defaultSymbol: {
    type: String,
    required: true
  },
  selectedSymbol: {
    type: String,
    default: null
  },
  assetInfo: {
    type: Object,
  },
  getImagePath: {
    type: Function,
    required: true
  }
});


let isChartLoading1 = ref(false); // Local loader for this chart
let isLoading1 = ref(false); // If you want a second loader, keep this, else remove

const data = ref([]); // OHCL Data
const data2 = ref([]); // Volume Data
const data3 = ref([]); // 10MA
const data4 = ref([]); // 20MA
const data5 = ref([]); // 50MA
const data6 = ref([]); // 200MA

function isIntraday(timeframe) {
  return ['intraday1m', 'intraday5m', 'intraday15m', 'intraday30m', 'intraday1hr'].includes(timeframe);
}

async function fetchChartData(symbolParam, timeframeParam) {
  isChartLoading1.value = true;
  try {
    let symbol = (symbolParam || props.selectedSymbol || props.defaultSymbol).toUpperCase();
    let timeframe = timeframeParam || selectedDataType.value || 'daily';
    const response = await fetch(`/api/${symbol}/chartdata?timeframe=${timeframe}`, {
      headers: { 'X-API-KEY': props.apiKey }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    const transform = isIntraday(timeframe)
  ? (arr) => {
      const sorted = (arr || [])
        .map(item => ({ ...item, time: Math.floor(new Date(item.time).getTime() / 1000) }))
        .sort((a, b) => a.time - b.time);
      // Remove duplicates
      return sorted.filter((item, idx, arr) => idx === 0 || item.time !== arr[idx - 1].time);
    }
  : (arr) => {
      const sorted = (arr || []).sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0));
      return sorted.filter((item, idx, arr) => idx === 0 || item.time !== arr[idx - 1].time);
    };
    data.value = transform(result.ohlc);
    data2.value = transform(result.volume);
    data3.value = transform(result.MA1);
    data4.value = transform(result.MA2);
    data5.value = transform(result.MA3);
    data6.value = transform(result.MA4);
  } catch (error) {
    console.error(error);
  } finally {
    isChartLoading1.value = false;
  }
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

const wkchart = ref(null);
const isBarChart = ref(false);

// mounts chart (candlestick or bar) and volume
onMounted(async () => {
  const chartDiv = wkchart.value;
  const rect = chartDiv.getBoundingClientRect();
  const width = window.innerWidth <= 1150 ? 400 : rect.width;
  const height = rect.height <= 1150 ? 550 : rect.width;
  const chart = createChart(chartDiv, {
    height: height,
    width: width,
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
          color: theme.base3,
          labelBackgroundColor: theme.base3,
        },
        horzLine: {
          color: theme.base3,
          labelBackgroundColor: theme.base3,
      },
    },
    timeScale: {
      barSpacing: 3,
      minBarSpacing: 0.1,
      rightOffset: 50,
    },
  });

  // Chart type toggle logic
  let mainSeries;
  function updateMainSeries() {
    if (mainSeries) {
      chart.removeSeries(mainSeries);
    }
    if (isBarChart.value) {
      mainSeries = chart.addBarSeries({
        downColor: theme.negative,
        upColor: theme.positive,
        borderDownColor: theme.negative,
        borderUpColor: theme.positive,
        wickDownColor: theme.negative,
        wickUpColor: theme.positive,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
      });
    } else {
      mainSeries = chart.addCandlestickSeries({
        downColor: theme.negative,
        upColor: theme.positive,
        borderDownColor: theme.negative,
        borderUpColor: theme.positive,
        wickDownColor: theme.negative,
        wickUpColor: theme.positive,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
      });
    }
    mainSeries.setData(data.value);

    // Crosshair event
    chart.subscribeCrosshairMove(param => {
      if (!param || !param.time || !mainSeries) {
        crosshairOhlc.value = null;
        return;
      }
      // Find index in data array for the hovered time
      const idx = data.value.findIndex(d => d.time === param.time);
      if (idx !== -1) {
        crosshairOhlc.value = { ...data.value[idx], index: idx };
      } else {
        crosshairOhlc.value = null;
      }
    });
  }

  watch(isBarChart, () => {
    updateMainSeries();
  });

  watch(data, (newData) => {
    if (mainSeries) mainSeries.setData(newData);
  });

  const Histogram = chart.addHistogramSeries({
    color: theme.text1,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    priceLineVisible: false,
    priceFormat: {
      type: 'volume',
    },
    priceScaleId: '',
  });

  const MaSeries1 = chart.addLineSeries({
    color: theme.ma1,
    lineWidth: 1,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    priceLineVisible: false,
  });

  const MaSeries2 = chart.addLineSeries({
    color: theme.ma2,
    lineWidth: 1,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    priceLineVisible: false,
  });

  const MaSeries3 = chart.addLineSeries({
    color: theme.ma3,
    lineWidth: 1,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    priceLineVisible: false,
  });

  const MaSeries4 = chart.addLineSeries({
    color: theme.ma4,
    lineWidth: 1,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    priceLineVisible: false,
  });

  Histogram.priceScale().applyOptions({
    scaleMargins: {
      top: 0.9,
      bottom: 0,
    }
  });
  

  watch(data2, (newData2) => {
    Histogram.setData(newData2);
  });

  watch(data3, (newData3) => {
    if (newData3 === null) {
      MaSeries1.setData([]);
    } else {
      MaSeries1.setData(newData3);
    }
  });
  watch(data4, (newData4) => {
    if (newData4 === null) {
      MaSeries2.setData([]);
    } else {
      MaSeries2.setData(newData4);
    }
  });
  watch(data5, (newData5) => {
    if (newData5 === null) {
      MaSeries3.setData([]);
    } else {
      MaSeries3.setData(newData5);
    }
  });
  watch(data6, (newData6) => {
    if (newData6 === null) {
      MaSeries4.setData([]);
    } else {
      MaSeries4.setData(newData6);
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

  function calculateAverageVolume(data, index) {
    const windowSize = 365;
    const start = Math.max(0, index - windowSize + 1);
    const end = index + 1;
    const sum = data.slice(start, end).reduce((acc, current) => acc + current.value, 0);
    return sum / (end - start);
  }

  // Initial fetch
  await fetchChartData();
  updateMainSeries();
  isLoading1.value = false;
});
function toggleChartType() {
  isBarChart.value = !isBarChart.value;
}

// Watch for prop changes to selectedSymbol and update chart
watch(() => props.selectedSymbol, (newSymbol, oldSymbol) => {
  if (newSymbol && newSymbol !== oldSymbol) {
    fetchChartData(newSymbol, selectedDataType.value);
  }
});

watch(() => props.defaultSymbol, (newSymbol, oldSymbol) => {
  if (newSymbol && newSymbol !== oldSymbol) {
    fetchChartData(newSymbol, selectedDataType.value);
  }
});

const selectedDataType = ref('daily');

const chartTypes = [
  { label: 'Intraday 1m', value: 'intraday1m', shortLabel: '1m' },
  { label: 'Intraday 5m', value: 'intraday5m', shortLabel: '5m' },
  { label: 'Intraday 15m', value: 'intraday15m', shortLabel: '15m' },
  { label: 'Intraday 30m', value: 'intraday30m', shortLabel: '30m' },
  { label: 'Intraday 1hr', value: 'intraday1hr', shortLabel: '1h' },
  { label: 'Daily Chart', value: 'daily', shortLabel: '1D' },
  { label: 'Weekly Chart', value: 'weekly', shortLabel: '1W' },
];

function setChartView(label) {
  const type = chartTypes.find(t => t.label === label);
  if (type) {
    selectedDataType.value = type.value;
    fetchChartData(undefined, type.value);
  }
}

// Crosshair OHLC tracking
const crosshairOhlc = ref(null);

// Compute OHLC and change for crosshair or latest
const ohlcDisplay = computed(() => {
  let idx = -1;
  if (!data.value || data.value.length < 2) return null;
  if (crosshairOhlc.value && crosshairOhlc.value.index !== undefined) {
    idx = crosshairOhlc.value.index;
  } else {
    idx = data.value.length - 1;
  }
  if (idx < 0 || idx >= data.value.length) return null;
  const curr = data.value[idx];
  const prev = idx > 0 ? data.value[idx - 1] : null;
  if (!curr || !prev) return null;
  const open = curr.open?.toFixed(2) ?? '-';
  const high = curr.high?.toFixed(2) ?? '-';
  const low = curr.low?.toFixed(2) ?? '-';
  const close = curr.close?.toFixed(2) ?? '-';
  const changeRaw = (curr.close - prev.close).toFixed(2);
  const changePct = prev.close !== 0 ? ((curr.close - prev.close) / prev.close * 100).toFixed(2) : '0.00';
  return { open, high, low, close, changeRaw, changePct };
});

const hiddenList = ref([]);

async function fetchHiddenList() {
  try {
    const response = await fetch(`/api/${props.user}/hidden`, {
      headers: { 'X-API-KEY': props.apiKey },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    hiddenList.value = data.Hidden;
    console.log('Hidden list fetched:', hiddenList.value); // Move log here
  } catch (err) {
    console.error('Error fetching hidden list:', err); // Log errors
  }
}

onMounted(() => {
  fetchHiddenList();
});

const isInHiddenList = (item) => {
  return hiddenList.value.includes(item);
};
</script>

<style scoped>

.ohlc-line {
  color: var(--text2);
  display: flex;
  gap: 4px;
  align-items: center;
  font-weight: bold;
}
.ohlc-line .change {
  font-weight: bold;
}

.ohlc-line .pos {
  color: var(--positive);
}
.ohlc-line .neg {
  color: var(--negative);
}

h1 {
  background-color: var(--base2);
  color: var(--text2);
  text-align: center;
  padding: 3.5px;
  margin: 0;
}

.chart-container {
  position: relative;
  width: 100%;
  height: 550px;
}

.loading-container1 {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--base1);
  z-index: 10;
}


.hidden {
  visibility: hidden;
}

#wk-chart {
  background-repeat: no-repeat;
}

.ticker {
  color: var(--text1);
  font-size: 20px;
  font-weight: bold;
  opacity: 1;
}

.name {
  color: var(--text1);
  font-size: 15px;
  font-weight: bold;
  opacity: 1;
}

#legend {
  position: absolute;
  top: -5%;
  left: 0;
  z-index: 1000;
  background-color: transparent;
  color: var(--text2);
  border: none;
  margin-top: 20px;
  margin-left: 12px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 2px;
}

#legend2 {
  position: absolute;
  top: 2%;
  right: 10%;
  z-index: 1000;
  background-color: transparent;
  color: var(--text1);
  border: none;
  flex-direction: column;
  display: flex;
}

#legend3 {
  position: absolute;
  top: 4%;
  left: 0;
  z-index: 1000;
  background-color: transparent;
  color: var(--text2);
  border: none;
  margin-top: 20px;
  margin-left: 12px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 2px;
}

.hidden-message {
  display: inline-block;
  background-color: var(--text2);
  color: var(--base2);
  border: solid 1px var(--text2);
  border-radius: 2.5px;
  margin-left: 5px;
  opacity: 0.85;
  user-select: none;
  text-align: center;
  padding: 0px 4px;
  line-height: 0.5;
}

.hidden-message p{
font-size: 8px;
font-weight: bold;
}

.chart-img {
  width: 20px;
  height: 20px;
  border-radius: 25%;
  border: solid var(--text2) 1px;
  margin-right: 5px;
}

.navbt {
  background-color: var(--text2);
  color: var(--base1);
  text-align: center;
  justify-content: center;
  cursor: pointer;
  border: solid var(--text2) 1px;
  border-radius: 5px;
  padding: 12px;
  opacity: 0.60;
  width: 20px;
  height: 20px;
  align-items: center;
  display: flex;
}

.navbt:hover {
  opacity: 1;
}

.navbt.selected {
  opacity: 1;
  background-color: var(--text1);
  color: var(--base2);
  border: solid var(--text1) 1px;
}

.chart-type-icon {
  width: 20px;
  height: 20px;
}

</style>