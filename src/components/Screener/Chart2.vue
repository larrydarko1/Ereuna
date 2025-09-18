<template>
   <h1 class="title3">DAILY CHART</h1>
                                <div class="chart-container">
                                  <div class="loading-container2" v-if="isChartLoading2 || isLoading2">
                                    <Loader />
                                  </div>
                                  <div id="dl-chart" ref="dlchart" style="width: 100%; height: 250px;"
                                    :class="{ 'hidden': isChartLoading2 || isLoading2 }"></div>
                                </div>
</template>

<script setup lang="ts">

import Loader from '@/components/loader.vue';
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { createChart, ColorType } from 'lightweight-charts';

interface OHLC {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}
interface Volume {
  time: string;
  value: number;
}
interface MA {
  time: string;
  value: number;
}


const props = defineProps({
  apiKey: {
    type: String,
    required: true
  },
  defaultSymbol: {
    type: String,
    required: true
  },
  selectedItem: {
    type: String,
    required: true
  },
  selectedSymbol: {
    type: String,
    required: true
  },
  updateUserDefaultSymbol: {
    type: Function,
    required: true
  }
});


let isChartLoading2 = ref(false);
let isLoading2 = ref(false);
let isLoadingMore = false;
let allDataLoaded = false;


const emit = defineEmits<{ (e: 'symbol-selected', symbol: string): void }>();
function onSymbolSelect(symbol: string) {
  emit('symbol-selected', symbol);
}


// CHARTS SECTION
const data = ref<OHLC[]>([]); // Daily OHCL Data
const data2 = ref<Volume[]>([]); // Daily Volume Data
const data3 = ref<MA[]>([]); // daily 10MA
const data4 = ref<MA[]>([]); // daily 20MA
const data5 = ref<MA[]>([]); // daily 50MA
const data6 = ref<MA[]>([]); // daily 200MA


// --- WebSocket connection for daily chart data ---
let chartWS: WebSocket | null = null;
let chartWSReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let chartWSReceived: boolean = false;


function closeChartWS(): void {
  if (chartWS) {
    chartWS.close();
    chartWS = null;
  }
  if (chartWSReconnectTimeout) {
    clearTimeout(chartWSReconnectTimeout);
    chartWSReconnectTimeout = null;
  }
}


// REST API fallback
async function fetchChartDataREST(symbolParam: string | null, before: string | number | null = null, append: boolean = false): Promise<void> {
  if (!append) isChartLoading2.value = true;
  let symbol = (symbolParam || props.selectedSymbol || props.defaultSymbol || props.selectedItem).toUpperCase();
  let url = `/api/${symbol}/chartdata-dl?limit=500`;
  if (before) url += `&before=${encodeURIComponent(before)}`;
  try {
    const response = await fetch(url, { headers: { 'X-API-KEY': props.apiKey } });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    const ohlc: OHLC[] = result.daily.ohlc || [];
    const volume: Volume[] = result.daily.volume || [];
    // Indicator arrays
    const ma10: MA[] = result.daily.MA10 || [];
    const ma20: MA[] = result.daily.MA20 || [];
    const ma50: MA[] = result.daily.MA50 || [];
    const ma200: MA[] = result.daily.MA200 || [];
    if (append) {
      // Prepend older data, avoid duplicates
      const existingTimes = new Set(data.value.map((d: OHLC) => d.time));
      const newOhlc = ohlc.filter((d: OHLC) => !existingTimes.has(d.time));
      data.value = [...newOhlc, ...data.value];
      const existingVolTimes = new Set(data2.value.map((d: Volume) => d.time));
      const newVolume = volume.filter((d: Volume) => !existingVolTimes.has(d.time));
      data2.value = [...newVolume, ...data2.value];
      // Prepend indicators, avoid duplicates
      const prependMA = (oldArr: MA[], newArr: MA[]): MA[] => {
        if (!Array.isArray(oldArr)) oldArr = [];
        if (!Array.isArray(newArr)) newArr = [];
        const existingMATimes = new Set(oldArr.map((d: MA) => d.time));
        const filteredNewArr = newArr.filter((d: MA) => !existingMATimes.has(d.time));
        return [...filteredNewArr, ...oldArr];
      };
      data3.value = prependMA(data3.value, ma10);
      data4.value = prependMA(data4.value, ma20);
      data5.value = prependMA(data5.value, ma50);
      data6.value = prependMA(data6.value, ma200);
    } else {
      data.value = ohlc;
      data2.value = volume;
      data3.value = ma10;
      data4.value = ma20;
      data5.value = ma50;
      data6.value = ma200;
    }
    // If less than 500, no more data to load
    if (ohlc.length < 500) {
      allDataLoaded = true;
    }
  } catch (error) {
    console.error(error);
    allDataLoaded = true;
  } finally {
    if (!append) isChartLoading2.value = false;
  }
}


// WebSocket fetch for daily chart data
async function fetchChartDataWS(symbolParam: string | null): Promise<void> {
  closeChartWS();
  chartWSReceived = false;
  let symbol = (symbolParam || props.selectedSymbol || props.defaultSymbol || props.selectedItem).toUpperCase();
  let wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  let wsUrl = `${wsProto}://localhost:8000/ws/chartdata-dl?ticker=${encodeURIComponent(symbol)}&timeframe=daily`;
  chartWS = new WebSocket(wsUrl, props.apiKey);
  let triedRest = false;
  chartWS.onopen = () => {};
  chartWS.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (e) {
      console.error('WebSocket parse error', e, event.data);
      return;
    }
    if (msg.type === 'init' || msg.type === 'update') {
      const ohlc: OHLC[] = msg.data.ohlc || [];
      const volume: Volume[] = msg.data.volume || [];
      const ma10: MA[] = msg.data.MA10 || [];
      const ma20: MA[] = msg.data.MA20 || [];
      const ma50: MA[] = msg.data.MA50 || [];
      const ma200: MA[] = msg.data.MA200 || [];
      data.value = ohlc;
      data2.value = volume;
      data3.value = ma10;
      data4.value = ma20;
      data5.value = ma50;
      data6.value = ma200;
      chartWSReceived = true;
    } else if (msg.error) {
      console.error('WebSocket error:', msg.error);
    }
  };
  chartWS.onerror = async (e) => {
    console.error('WebSocket error', e);
    if (!triedRest) {
      triedRest = true;
      await fetchChartDataREST(symbolParam);
    }
  };
  chartWS.onclose = (e) => {
    if (!e.wasClean && !triedRest) {
      chartWSReconnectTimeout = setTimeout(() => {
        fetchChartDataWS(symbolParam);
      }, 2000);
    }
  };
}


// Unified fetchChartData function
async function fetchChartData(symbolParam: string | null, before: string | number | null = null, append: boolean = false): Promise<void> {
  chartWSReceived = false;
  fetchChartDataWS(symbolParam);
  setTimeout(() => {
    if (!chartWSReceived) {
      fetchChartDataREST(symbolParam, before, append);
    }
  }, 2000);
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


const dlchart = ref<HTMLElement | null>(null);


// mounts daily chart (including volume)
onMounted(async () => {
  const chartDiv = dlchart.value;
  if (!chartDiv) return;
  const rect = chartDiv.getBoundingClientRect();
  const width = window.innerWidth <= 1150 ? 400 : rect.width;
  const height = rect.height <= 1150 ? 250 : rect.width;
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
      vertLine: {
        color: "transparent",
        labelBackgroundColor: "transparent",
      },
      horzLine: {
        color: "transparent",
        labelBackgroundColor: "transparent",
      },
    },
    timeScale: {
      barSpacing: 2,
      minBarSpacing: 0.1,
      rightOffset: 20,
    },
  });

  const barSeries = chart.addCandlestickSeries({
    downColor: theme.negative,
    upColor: theme.positive,
    borderDownColor: theme.negative,
    borderUpColor: theme.positive,
    wickDownColor: theme.negative,
    wickUpColor: theme.positive,
    priceLineVisible: false,
    lastValueVisible: false,
  });

  const Histogram = chart.addHistogramSeries({
    color: theme.text1,
    lastValueVisible: false,
    priceLineVisible: false,
    priceFormat: {
      type: 'volume',
    },
    priceScaleId: '',
  });

  const MaSeries1 = chart.addLineSeries({
    color: theme.ma1,
    lastValueVisible: false,
    priceLineVisible: false,
    lineWidth: 1,
    crosshairMarkerVisible: false,
  });

  const MaSeries2 = chart.addLineSeries({
    color: theme.ma2,
    lineWidth: 1,
    lastValueVisible: false,
    priceLineVisible: false,
    crosshairMarkerVisible: false,
  });

  const MaSeries3 = chart.addLineSeries({
    color: theme.ma3,
    lineWidth: 1,
    lastValueVisible: false,
    priceLineVisible: false,
    crosshairMarkerVisible: false,
  });

  const MaSeries4 = chart.addLineSeries({
    color: theme.ma4,
    lineWidth: 1,
    lastValueVisible: false,
    priceLineVisible: false,
    crosshairMarkerVisible: false,
  });

  Histogram.priceScale().applyOptions({
    scaleMargins: {
      top: 0.9,
      bottom: 0,
    }
  });

  // --- Add transform function for sorting and deduplication ---
  function transformOHLC(arr: OHLC[]): OHLC[] {
    if (!Array.isArray(arr)) return [];
    const sorted = arr.slice().sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0));
    return sorted.filter((item, idx, arr) => idx === 0 || item.time !== arr[idx - 1].time).map(o => ({ ...o, time: String(o.time) }));
  }
  function transformVolume(arr: Volume[]): Volume[] {
    if (!Array.isArray(arr)) return [];
    const sorted = arr.slice().sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0));
    return sorted.filter((item, idx, arr) => idx === 0 || item.time !== arr[idx - 1].time).map(o => ({ ...o, time: String(o.time) }));
  }
  function transformMA(arr: MA[]): MA[] {
    if (!Array.isArray(arr)) return [];
    const sorted = arr.slice().sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0));
    return sorted.filter((item, idx, arr) => idx === 0 || item.time !== arr[idx - 1].time).map(o => ({ ...o, time: String(o.time) }));
  }

  watch(data, (newData: OHLC[]) => {
    barSeries.setData(transformOHLC(newData));
  });

  watch(data2, (newData2: Volume[]) => {
    Histogram.setData(transformVolume(newData2));
  });

  watch(data3, (newData3: MA[] | null) => {
    if (newData3 === null) {
      MaSeries1.setData([]); // Clear the series data when null
    } else {
      MaSeries1.setData(transformMA(newData3));
    }
  });

  watch(data4, (newData4: MA[] | null) => {
    if (newData4 === null) {
      MaSeries2.setData([]); // Clear the series data when null
    } else {
      MaSeries2.setData(transformMA(newData4));
    }
  });

  watch(data5, (newData5: MA[] | null) => {
    if (newData5 === null) {
      MaSeries3.setData([]); // Clear the series data when null
    } else {
      MaSeries3.setData(transformMA(newData5));
    }
  });

  watch(data6, (newData6: MA[] | null) => {
    if (newData6 === null) {
      MaSeries4.setData([]); // Clear the series data when null
    } else {
      MaSeries4.setData(transformMA(newData6));
    }
  });

  watch(data2, (newData2: Volume[]) => {
    const cleanData2 = transformVolume(newData2);
    const relativeVolumeData = cleanData2.map((dataPoint: Volume, index: number) => {
      const averageVolume = calculateAverageVolume(cleanData2, index);
      const relativeVolume = dataPoint.value / averageVolume;
      const color = relativeVolume > 2 ? theme.accent1 : theme.volume;
      return {
        time: dataPoint.time,
        value: dataPoint.value,
        color,
      };
    });
    Histogram.setData(relativeVolumeData as any);
  });

  function calculateAverageVolume(data: Volume[], index: number): number {
    const windowSize = 365;
    const start = Math.max(0, index - windowSize + 1);
    const end = index + 1;
    const sum = data.slice(start, end).reduce((acc: number, current: Volume) => acc + current.value, 0);
    return sum / (end - start);
  }

  // Initial fetch
  await fetchChartData(props.selectedSymbol);
  isLoading2.value = false;

  chart.timeScale().subscribeVisibleLogicalRangeChange(async (range: any) => {
    if (isLoadingMore || allDataLoaded) return;
    if (range && range.from < 20) {
      isLoadingMore = true;
      const oldest = data.value.length > 0 ? data.value[0].time : null;
      if (!oldest) {
        isLoadingMore = false;
        return;
      }
      try {
        await fetchChartData(null, oldest, true);
      } catch (err) {
        console.error('Lazy load error:', err);
      }
      isLoadingMore = false;
    }
  });
});


// Watch for prop changes to selectedSymbol and update chart
watch(() => props.selectedSymbol, (newSymbol, oldSymbol) => {
  if (newSymbol && newSymbol !== oldSymbol) {
    allDataLoaded = false;
    fetchChartData(newSymbol);
  }
});


onUnmounted(() => {
  closeChartWS();
});

</script>

<style scoped>

.title3 {
  border: none;
  width: 98%;
  margin: none;
  align-self: center;
  justify-content: center;
  padding: 7px 3px;
}

.chart-container {
  position: relative;
  width: 100%;
  height: 250px;
}

.loading-container2 {
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

h1 {
  background-color: var(--base2);
  color: var(--text2);
  text-align: center;
  padding: 3.5px;
  margin: 0;
}

#dl-chart {
  background-repeat: no-repeat;
}

</style>