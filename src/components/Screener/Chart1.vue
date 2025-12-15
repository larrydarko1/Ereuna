<template>
  <div class="chart-container">
    <div class="chart-controls">
      <div class="timeframe-selector">
        <button
          v-for="tf in timeframes"
          :key="tf.value"
          class="tf-btn"
          :class="{ selected: selectedTimeframe === tf.value }"
          @click="setTimeframe(tf.value)"
        >
          {{ tf.label }}
        </button>
      </div>
      <div class="charttype-dropdown" @click="toggleChartTypeDropdown">
        <div class="dropdown-selected">
          {{ chartTypeOptions.find(o => o.value === selectedChartType)?.label }}
          <span class="dropdown-arrow" :class="{ open: chartTypeDropdownOpen }">&#9662;</span>
        </div>
        <div class="dropdown-list" v-if="chartTypeDropdownOpen">
          <div
            v-for="opt in chartTypeOptions"
            :key="opt.value"
            class="dropdown-item"
            @click.stop="selectChartType(opt.value)"
          >
            {{ opt.label }}
          </div>
        </div>
      </div>
    </div>
    <div class="loading-container1" v-if="isChartLoading1 || isLoading1">
      <Loader />
    </div>
    <div id="wk-chart" ref="wkchart" style="width: 100%; height: 250px;"
      :class="{ 'hidden': isChartLoading1 || isLoading1 }"></div>
  </div>
</template>

<script setup lang="ts">
import Loader from '@/components/loader.vue';
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { createChart, ColorType } from '@/lib/lightweight-charts';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

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


let isChartLoading1 = ref(false);
let isLoading1 = ref(false);
let isLoadingMore = false;
let allDataLoaded = false;

const emit = defineEmits<{ (e: 'symbol-selected', symbol: string): void }>();
function onSymbolSelect(symbol: string) {
  emit('symbol-selected', symbol);
}

// Timeframe and chart type selection
const selectedTimeframe = ref('weekly');
const selectedChartType = ref('candlestick');
const chartTypeDropdownOpen = ref(false);

const timeframes = computed(() => [
  { label: t('screenerComponents.timeframe5m'), value: 'intraday5m' },
  { label: t('screenerComponents.timeframe15m'), value: 'intraday15m' },
  { label: t('screenerComponents.timeframe30m'), value: 'intraday30m' },
  { label: t('screenerComponents.timeframe1h'), value: 'intraday1hr' },
  { label: t('screenerComponents.timeframe1D'), value: 'daily' },
  { label: t('screenerComponents.timeframe1W'), value: 'weekly' },
]);

const chartTypeOptions = computed(() => [
  { label: t('screenerComponents.chartCandlestick'), value: 'candlestick' },
  { label: t('screenerComponents.chartBar'), value: 'bar' },
  { label: t('screenerComponents.chartLine'), value: 'line' },
  { label: t('screenerComponents.chartArea'), value: 'area' },
]);

function setTimeframe(tf: string) {
  selectedTimeframe.value = tf;
  fetchChartData(props.selectedSymbol, null, false);
}

function toggleChartTypeDropdown() {
  chartTypeDropdownOpen.value = !chartTypeDropdownOpen.value;
}

function selectChartType(type: string) {
  selectedChartType.value = type;
  chartTypeDropdownOpen.value = false;
  updateMainSeries();
}

function setChartType(ct: string) {
  selectedChartType.value = ct;
  updateMainSeries();
}

// Helper function to check if timeframe is intraday
function isIntraday(timeframe: string): boolean {
  return ['intraday1m', 'intraday5m', 'intraday15m', 'intraday30m', 'intraday1hr'].includes(timeframe);
}

const data = ref<OHLC[]>([]); // OHLC Data
const data2 = ref<Volume[]>([]); // Volume Data
const data3 = ref<MA[]>([]); // MA1
const data4 = ref<MA[]>([]); // MA2
const data5 = ref<MA[]>([]); // MA3
const data6 = ref<MA[]>([]); // MA4

// --- WebSocket connection for chart data ---
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
  if (!append) isChartLoading1.value = true;
  let symbol = (symbolParam || props.selectedSymbol || props.defaultSymbol || props.selectedItem).toUpperCase();
  let url = `/api/${symbol}/chartdata?timeframe=${selectedTimeframe.value}&limit=500`;
  if (before) url += `&before=${encodeURIComponent(before)}`;
  try {
    const response = await fetch(url, { headers: { 'X-API-KEY': props.apiKey } });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    
    // Transform data based on timeframe
    const transform = isIntraday(selectedTimeframe.value)
      ? (arr: any[]): any[] => {
          const sorted = (arr || [])
            .map((item: any) => ({ ...item, time: typeof item.time === 'string' ? Math.floor(new Date(item.time).getTime() / 1000) : item.time }))
            .sort((a: any, b: any) => a.time - b.time);
          return sorted.filter((item: any, idx: number, arr: any[]) => idx === 0 || item.time !== arr[idx - 1].time);
        }
      : (arr: any[]): any[] => {
          const sorted = (arr || []).sort((a: any, b: any) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0));
          return sorted.filter((item: any, idx: number, arr: any[]) => idx === 0 || item.time !== arr[idx - 1].time);
        };
    
    const ohlc = transform(result.ohlc || []);
    const volume = transform(result.volume || []);
    const ma1 = transform(result.MA1 || []);
    const ma2 = transform(result.MA2 || []);
    const ma3 = transform(result.MA3 || []);
    const ma4 = transform(result.MA4 || []);
    
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
      data3.value = prependMA(data3.value, ma1);
      data4.value = prependMA(data4.value, ma2);
      data5.value = prependMA(data5.value, ma3);
      data6.value = prependMA(data6.value, ma4);
    } else {
      data.value = ohlc;
      data2.value = volume;
      data3.value = ma1;
      data4.value = ma2;
      data5.value = ma3;
      data6.value = ma4;
    }
    // If less than 500, no more data to load
    if (ohlc.length < 500) {
      allDataLoaded = true;
    }
  } catch (error) {
    allDataLoaded = true;
  } finally {
    if (!append) isChartLoading1.value = false;
  }
}


// WebSocket fetch for chart data with immediate REST fallback
async function fetchChartDataWS(symbolParam: string | null): Promise<void> {
  closeChartWS();
  chartWSReceived = false;
  let symbol = (symbolParam || props.selectedSymbol || props.defaultSymbol || props.selectedItem).toUpperCase();
  let wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  let wsUrl = `${wsProto}://${window.location.host}/ws/chartdata?ticker=${symbol}&timeframe=${selectedTimeframe.value}`;
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
      const ohlc = msg.data.ohlc || [];
      const volume = msg.data.volume || [];
      const ma1 = msg.data.MA1 || [];
      const ma2 = msg.data.MA2 || [];
      const ma3 = msg.data.MA3 || [];
      const ma4 = msg.data.MA4 || [];
      
      // Transform data based on timeframe (intraday uses timestamps)
      const transform = isIntraday(selectedTimeframe.value)
        ? (arr: any[]): any[] => {
            const sorted = (arr || [])
              .map((item: any) => ({ ...item, time: typeof item.time === 'string' ? Math.floor(new Date(item.time).getTime() / 1000) : item.time }))
              .sort((a: any, b: any) => a.time - b.time);
            return sorted.filter((item: any, idx: number, arr: any[]) => idx === 0 || item.time !== arr[idx - 1].time);
          }
        : (arr: any[]): any[] => {
            const sorted = (arr || []).sort((a: any, b: any) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0));
            return sorted.filter((item: any, idx: number, arr: any[]) => idx === 0 || item.time !== arr[idx - 1].time);
          };
      
      data.value = transform(ohlc);
      data2.value = transform(volume);
      data3.value = transform(ma1);
      data4.value = transform(ma2);
      data5.value = transform(ma3);
      data6.value = transform(ma4);
      chartWSReceived = true;
      isChartLoading1.value = false;
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

// Unified fetchChartData function with immediate fallback logic
async function fetchChartData(symbolParam: string | null, before: string | number | null = null, append: boolean = false): Promise<void> {
  if (!append) isChartLoading1.value = true;
  if (append) {
    // For lazy loading, use REST API directly
    await fetchChartDataREST(symbolParam, before, append);
  } else {
    // For initial load, use WebSocket
    await fetchChartDataWS(symbolParam);
  }
}
onUnmounted(() => {
  closeChartWS();
});

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

const wkchart = ref<HTMLElement | null>(null);

// Chart instance and series references
let chart: any = null;
let mainSeries: any = null;
let Histogram: any = null;
let MaSeries1: any = null;
let MaSeries2: any = null;
let MaSeries3: any = null;
let MaSeries4: any = null;

// Function to update main series based on chart type
function updateMainSeries(): void {
  if (!chart || !data.value.length) return;
  
  if (mainSeries) {
    chart.removeSeries(mainSeries);
  }
  
  switch (selectedChartType.value) {
    case 'bar':
      mainSeries = chart.addBarSeries({
        downColor: theme.negative,
        upColor: theme.positive,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      mainSeries.setData(data.value);
      break;
    
    case 'candlestick':
      mainSeries = chart.addCandlestickSeries({
        downColor: theme.negative,
        upColor: theme.positive,
        borderDownColor: theme.negative,
        borderUpColor: theme.positive,
        wickDownColor: theme.negative,
        wickUpColor: theme.positive,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      mainSeries.setData(data.value);
      break;
    
    case 'line':
      mainSeries = chart.addLineSeries({
        color: theme.accent1,
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
      });
      const lineData = data.value.map((d: OHLC) => ({
        time: d.time,
        value: d.close
      }));
      mainSeries.setData(lineData);
      break;
    
    case 'area':
      mainSeries = chart.addAreaSeries({
        topColor: theme.accent1 + '80',
        bottomColor: theme.accent1 + '10',
        lineColor: theme.accent1,
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
      });
      const areaData = data.value.map((d: OHLC) => ({
        time: d.time,
        value: d.close
      }));
      mainSeries.setData(areaData);
      break;
  }
}

// mounts chart (including volume)
onMounted(async () => {
  const chartDiv = wkchart.value;
  if (!chartDiv) return;
  const rect = chartDiv.getBoundingClientRect();
  const width = window.innerWidth <= 1150 ? 400 : rect.width;
  const height = rect.height <= 1150 ? 250 : rect.width;
  chart = createChart(chartDiv, {
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
      barSpacing: 1.5,
      minBarSpacing: 0.1,
      rightOffset: 50,
    },
  });

  // Initialize with candlestick series
  mainSeries = chart.addCandlestickSeries({
    downColor: theme.negative,
    upColor: theme.positive,
    borderDownColor: theme.negative,
    borderUpColor: theme.positive,
    wickDownColor: theme.negative,
    wickUpColor: theme.positive,
    lastValueVisible: false,
    priceLineVisible: false,
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
    lineWidth: 1,
    lastValueVisible: false,
    priceLineVisible: false,
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

  // --- Data is already correctly formatted from fetch, just pass through ---
  // No transformation needed - intraday has Unix timestamps, daily/weekly has date strings

  watch(data, (newData: OHLC[]) => {
    if (!mainSeries || !newData.length) return;
    if (selectedChartType.value === 'line' || selectedChartType.value === 'area') {
      const lineData = newData.map((d: OHLC) => ({
        time: d.time,
        value: d.close
      }));
      mainSeries.setData(lineData);
    } else {
      mainSeries.setData(newData);
    }
  });

  watch(data2, (newData2: Volume[]) => {
    if (newData2 && newData2.length) {
      Histogram.setData(newData2);
    }
  });

  watch(data3, (newData3: MA[] | null) => {
    MaSeries1.setData(newData3 || []);
  });

  watch(data4, (newData4: MA[] | null) => {
    MaSeries2.setData(newData4 || []);
  });

  watch(data5, (newData5: MA[] | null) => {
    MaSeries3.setData(newData5 || []);
  });

  watch(data6, (newData6: MA[] | null) => {
    MaSeries4.setData(newData6 || []);
  });

  watch(data2, (newData2: Volume[]) => {
    if (!newData2 || !newData2.length) return;
    const relativeVolumeData = newData2.map((dataPoint: Volume, index: number) => {
      const averageVolume = calculateAverageVolume(newData2, index);
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
    const windowSize = 365; // adjust this value to change the window size for calculating average volume
    const start = Math.max(0, index - windowSize + 1);
    const end = index + 1;
    const sum = data.slice(start, end).reduce((acc: number, current: Volume) => acc + current.value, 0);
    return sum / (end - start);
  }

  // Initial fetch
  await fetchChartData(props.selectedSymbol);
  isLoading1.value = false;

  chart.timeScale().subscribeVisibleLogicalRangeChange(async (range: any) => {
    if (isLoadingMore || allDataLoaded) return;
    if (range && (range as any).from < 20) {
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

</script>

<style scoped>

.chart-container {
  position: relative;
  width: 100%;
  height: 250px;
  border-radius: 12px;
  overflow: hidden;
}

.chart-controls {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 5;
  gap: 8px;
}

.timeframe-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  background-color: var(--base2);
  padding: 4px;
  border-radius: 6px;
}

.tf-btn {
  padding: 3px 6px;
  background-color: var(--base3);
  color: var(--text2);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tf-btn:hover {
  background-color: var(--base4);
  color: var(--text1);
}

.tf-btn.selected {
  background-color: var(--accent1);
  color: var(--base1);
}

.charttype-dropdown {
  position: relative;
  background-color: var(--base2);
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
}

.dropdown-selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text1);
  white-space: nowrap;
  min-width: 100px;
}

.dropdown-arrow {
  font-size: 10px;
  color: var(--text2);
  transition: transform 0.2s ease;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-list {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background-color: var(--base2);
  border: 1px solid var(--base3);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 100;
  min-width: 120px;
}

.dropdown-item {
  padding: 8px 12px;
  font-size: 11px;
  color: var(--text2);
  cursor: pointer;
  transition: all 0.15s ease;
}

.dropdown-item:hover {
  background-color: var(--base3);
  color: var(--text1);
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

</style>