<template>
  <EditChart 
    v-if="showEditChart" 
    @close="showEditChart = false" 
    @settings-saved="onSettingsSaved"
    :apiKey="props.apiKey"
    :user="props.user"
    :indicatorList="indicatorList"
    :intrinsicVisible="intrinsicVisible"
    :chartType="isBarChart ? 'bar' : 'candlestick'"
  />
  <AIPopup
    v-if="showAIPopup"
    @close="showAIPopup = false"
    :aiData="aiData"
    :Symbol="assetInfo?.Symbol"
  />
  <div class="mainchart-dashboard">
                               <div class="chart-container">
                                  <div class="loading-container1" v-if="isChartLoading1 || isLoading1">
                                    <Loader />
                                  </div>
                                  <div class="no-data-container" v-if="!isChartLoading1 && !isLoading1 && data.length === 0">
                                    <p>No Data Available</p>
                                  </div>
                                  <div id="legend">
                                      <div class="chart-img-wrapper" style="position: relative; display: inline-block;">
                                        <img
                                          class="chart-img"
                                          :src="getImagePath(assetInfo?.Symbol)"
                                          alt=""
                                          @error="imgError = true"
                                          @load="imgError = false"
                                          style="display: block;"
                                        >
                                        <div v-if="imgError" class="chart-img-fallback">
                                          N/A
                                        </div>
                                      </div>
  <div class="title-inline">
    <p class="ticker">{{ assetInfo?.Symbol }}</p>
    <span class="dash"> - </span>
    <p class="name" ref="nameContainer" @mouseenter="handleNameMouseEnter" @mouseleave="handleNameMouseLeave"><span ref="nameSpan">{{ assetInfo?.Name }}</span></p>
  </div>
  <div v-if="!assetInfo?.Delisted && isInHiddenList(assetInfo?.Symbol)" class="badge-message">
    <p>HIDDEN LIST</p>
  </div>
  <div v-if="assetInfo?.Delisted === true" class="badge-message">
    <p>DELISTED</p>
  </div>
                                  </div>
<div id="legend2">
  <div style="display: flex; gap: 3px; margin-bottom: 3px;">
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
  <div style="display: flex; gap: 3px; justify-content: flex-end;">
    <button class="navbt2" @click="showAIPopup = true" v-if="hasAIData">
      <svg class="chart-type-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
        <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
        <g id="SVGRepo_iconCarrier">
          <path d="M12 3C12 7.97056 16.0294 12 21 12C16.0294 12 12 16.0294 12 21C12 16.0294 7.97056 12 3 12C7.97056 12 12 7.97056 12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
        </g>
      </svg>
    </button>
    <button class="navbt2" @click="showEditChart = true">
      <svg class="chart-type-icon" fill="currentColor" viewBox="0 0 32 32" enable-background="new 0 0 32 32" id="Glyph" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
        <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
        <g id="SVGRepo_iconCarrier">
          <path d="M27.526,18.036L27,17.732c-0.626-0.361-1-1.009-1-1.732s0.374-1.371,1-1.732l0.526-0.304 c1.436-0.83,1.927-2.662,1.098-4.098l-1-1.732c-0.827-1.433-2.666-1.925-4.098-1.098L23,7.339c-0.626,0.362-1.375,0.362-2,0 c-0.626-0.362-1-1.009-1-1.732V5c0-1.654-1.346-3-3-3h-2c-1.654,0-3,1.346-3,3v0.608c0,0.723-0.374,1.37-1,1.732 c-0.626,0.361-1.374,0.362-2,0L8.474,7.036C7.042,6.209,5.203,6.701,4.375,8.134l-1,1.732c-0.829,1.436-0.338,3.269,1.098,4.098 L5,14.268C5.626,14.629,6,15.277,6,16s-0.374,1.371-1,1.732l-0.526,0.304c-1.436,0.829-1.927,2.662-1.098,4.098l1,1.732 c0.828,1.433,2.667,1.925,4.098,1.098L9,24.661c0.626-0.363,1.374-0.361,2,0c0.626,0.362,1,1.009,1,1.732V27c0,1.654,1.346,3,3,3h2 c1.654,0,3-1.346,3-3v-0.608c0-0.723,0.374-1.37,1-1.732c0.625-0.361,1.374-0.362,2,0l0.526,0.304 c1.432,0.826,3.271,0.334,4.098-1.098l1-1.732C29.453,20.698,28.962,18.865,27.526,18.036z M16,21c-2.757,0-5-2.243-5-5s2.243-5,5-5 s5,2.243,5,5S18.757,21,16,21z" id="XMLID_273_"></path>
        </g>
      </svg>
    </button>
  </div>
</div>
<div id="legend3">
   <span v-if="ohlcDisplay" class="ohlc-line">
    Open: <span>{{ ohlcDisplay.open }}</span>
    High: <span>{{ ohlcDisplay.high }}</span>
    Close: <span>{{ ohlcDisplay.close }}</span>
    Low: <span>{{ ohlcDisplay.low }}</span>
    <span :class="['change', Number(ohlcDisplay.changeRaw) >= 0 ? 'pos' : 'neg']">
      {{ Number(ohlcDisplay.changeRaw) >= 0 ? '+' : '' }}{{ ohlcDisplay.changeRaw }}
      {{ Number(ohlcDisplay.changeRaw) >= 0 ? '+' : '' }}{{ ohlcDisplay.changePct }}%
    </span>
  </span>
</div>
<div id="legend3-5">
  <div v-if="isMarketStatusLoading" class="loader-line"></div>
  <div v-else class="market-status-badge">
    <span v-if="marketStatus !== 'holiday'" class="status-indicator" :class="marketStatusClass"></span>
    <svg v-else viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="status-indicator holiday-icon">
      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
      <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
      <g id="SVGRepo_iconCarrier">
        <g>
          <path fill="none" d="M0 0H24V24H0z"></path>
          <path d="M11 6v8h8c0 4.418-3.582 8-8 8s-8-3.582-8-8c0-4.335 3.58-8 8-8zm10-4v2l-5.327 6H21v2h-8v-2l5.326-6H13V2h8z" fill="currentColor"></path>
        </g>
      </g>
    </svg>
    <span class="status-text">{{ marketStatusText }}</span>
  </div>
  <div v-if="isEODOnly" class="eod-only-badge">
    <span class="eod-text">EOD Only</span>
  </div>
</div>
<div id="legend4">
  <span
    v-for="indicator in activeIndicators"
    :key="indicator.label"
    :style="{ color: indicator.color }"
  >
    {{ indicator.label }}
  </span>
</div>
                                  <div id="wk-chart" ref="wkchart" style="width: 100%; height: 250px;"
                                    :class="{ 'hidden': isChartLoading1 || isLoading1 || data.length === 0 }"></div>
                                </div>
  </div>
</template>

<script setup lang="ts">
import Loader from '@/components/loader.vue';
import { onMounted, ref, watch, computed, onUnmounted, nextTick } from 'vue';
import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  Time,
  IPriceLine
} from 'lightweight-charts';
import EditChart from '@/components/charts/EditChart.vue';
import AIPopup from '@/components/charts/AIPopup.vue';

// --- Chart Data Interfaces ---
interface OHLCData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface VolumeData {
  time: Time;
  value: number;
  color?: string;
}

interface MAData {
  time: Time;
  value: number;
}

interface Indicator {
  type: string;
  timeframe: number;
  visible: boolean;
}

interface ChartDataResult {
  ohlc: OHLCData[];
  volume: VolumeData[];
  MA1: MAData[];
  MA2: MAData[];
  MA3: MAData[];
  MA4: MAData[];
  intrinsicValue?: number;
}


const showEditChart = ref(false);
const showAIPopup = ref(false);
const imgError = ref(false);
let isLoadingMore: boolean = false;
let allDataLoaded: boolean = false;


const props = defineProps<{
  apiKey: string;
  user: string;
  defaultSymbol: string;
  selectedSymbol?: string | null;
  assetInfo?: Record<string, any>;
  getImagePath: (symbol: string) => string;
}>();

const hasAIData = computed(() => {
  return props.assetInfo?.AI && Array.isArray(props.assetInfo.AI) && props.assetInfo.AI.length > 0;
});

const aiData = computed(() => {
  if (!hasAIData.value || !props.assetInfo?.AI) return null;
  return props.assetInfo.AI[0];
});



const isChartLoading1 = ref<boolean>(false);
const isLoading1 = ref<boolean>(false);
const data = ref<OHLCData[]>([]);
const data2 = ref<VolumeData[]>([]);
const data3 = ref<MAData[]>([]);
const data4 = ref<MAData[]>([]);
const data5 = ref<MAData[]>([]);
const data6 = ref<MAData[]>([]);
const IntrinsicValue = ref<number | null>(null);

function isIntraday(timeframe: string): boolean {
  return ['intraday1m', 'intraday5m', 'intraday15m', 'intraday30m', 'intraday1hr'].includes(timeframe);
}

let ws: WebSocket | null = null;
let wsReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
function closeChartWS(): void {
  if (ws) {
    ws.close();
    ws = null;
  }
  if (wsReconnectTimeout) {
    clearTimeout(wsReconnectTimeout);
    wsReconnectTimeout = null;
  }
}

async function fetchChartData(symbolParam?: string, timeframeParam?: string): Promise<void> {
  isChartLoading1.value = true;
  closeChartWS();
  isLoadingMore = false;
  allDataLoaded = false;
  const symbol = symbolParam || props.selectedSymbol || props.defaultSymbol;
  const timeframe = timeframeParam || selectedDataType.value || 'daily';
  const user = encodeURIComponent(props.user);
  const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl = `${wsProto}://${window.location.host}/ws/chartdata?ticker=${symbol}&timeframe=${timeframe}&user=${user}`;
  const restUrl = `/api/${symbol}/chartdata?timeframe=${timeframe}&user=${user}`;
  let triedRest = false;
  function handleChartData(result: ChartDataResult): void {
    const transform = isIntraday(timeframe)
      ? (arr: any[]): any[] => {
          const sorted = (arr || [])
            .map((item: any) => ({ ...item, time: Math.floor(new Date(item.time).getTime() / 1000) }))
            .sort((a: any, b: any) => a.time - b.time);
          return sorted.filter((item: any, idx: number, arr: any[]) => idx === 0 || item.time !== arr[idx - 1].time);
        }
      : (arr: any[]): any[] => {
          const sorted = (arr || []).sort((a: any, b: any) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0));
          return sorted.filter((item: any, idx: number, arr: any[]) => idx === 0 || item.time !== arr[idx - 1].time);
        };
    data.value = transform(result.ohlc) as OHLCData[];
    data2.value = transform(result.volume) as VolumeData[];
    data3.value = transform(result.MA1) as MAData[];
    data4.value = transform(result.MA2) as MAData[];
    data5.value = transform(result.MA3) as MAData[];
    data6.value = transform(result.MA4) as MAData[];
    IntrinsicValue.value = result.intrinsicValue ?? null;
    isChartLoading1.value = false;
  }
  try {
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      // No-op, server sends initial data
    };
    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch (e) {
        console.error('WebSocket parse error', e, event.data);
        return;
      }
      if (msg.type === 'init' || msg.type === 'update') {
        handleChartData(msg.data);
      } else if (msg.error) {
        console.error('WebSocket error:', msg.error);
      }
    };
    ws.onerror = async (e) => {
      console.error('WebSocket error', e);
      if (!triedRest) {
        triedRest = true;
        // Fallback to REST API
        try {
          const response = await fetch(restUrl, {
            headers: { 'X-API-KEY': props.apiKey },
          });
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const result = await response.json();
          handleChartData(result);
        } catch (err) {
          console.error('REST API fallback error:', err);
          isChartLoading1.value = false;
        }
      }
    };
    ws.onclose = (e) => {
      // Try to reconnect after a delay
      if (!e.wasClean && !triedRest) {
        wsReconnectTimeout = setTimeout(() => {
          fetchChartData(symbol, timeframe);
        }, 2000);
      }
    };
  } catch (error) {
    console.error(error);
    // Fallback to REST API if WebSocket setup fails
    if (!triedRest) {
      triedRest = true;
      try {
        const response = await fetch(restUrl, {
          headers: { 'X-API-KEY': props.apiKey },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        handleChartData(result);
      } catch (err) {
        console.error('REST API fallback error:', err);
        isChartLoading1.value = false;
      }
    }
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
let chart: IChartApi | null = null;
let resizeObserver: ResizeObserver | null = null;
// Responsive resize: adjust chart width/height when container or window resizes
function updateChartSize(): void {
  const chartDivLocal = wkchart.value as HTMLElement | null;
  if (!chartDivLocal || !chart) return;
  const rect = chartDivLocal.getBoundingClientRect();
  const newWidth = window.innerWidth <= 1150 ? 400 : Math.max(300, Math.floor(rect.width));
  // keep previous height logic but ensure a reasonable minimum
  const newHeight = rect.height <= 1150 ? 550 : Math.max(300, Math.floor(rect.height));
  try {
    chart.applyOptions({ width: newWidth, height: newHeight });
  } catch (e) {
    // ignore applyOptions errors
  }
}
const isBarChart = ref(false); // Will be set from user settings

// Chart series and update logic at top-level scope
let mainSeries: ReturnType<IChartApi['addBarSeries']> | ReturnType<IChartApi['addCandlestickSeries']> | null = null;
function updateMainSeries(): void {
  if (!chart) return;
  const c = chart as IChartApi;
  if (mainSeries) {
    c.removeSeries(mainSeries);
  }
  if (isBarChart.value) {
    mainSeries = c.addBarSeries({
      downColor: theme.negative,
      upColor: theme.positive,
      lastValueVisible: true,
      priceLineVisible: true,
    });
  } else {
    mainSeries = c.addCandlestickSeries({
      downColor: theme.negative,
      upColor: theme.positive,
      borderDownColor: theme.negative,
      borderUpColor: theme.positive,
      wickDownColor: theme.negative,
      wickUpColor: theme.positive,
      lastValueVisible: true,
      priceLineVisible: true,
    });
  }
  mainSeries.setData(data.value);

  c.subscribeCrosshairMove((param) => {
    if (!param || !param.time || !mainSeries) {
      crosshairOhlc.value = null;
      return;
    }
    const idx = data.value.findIndex((d: OHLCData) => d.time === param.time);
    if (idx !== -1) {
      crosshairOhlc.value = { ...data.value[idx], index: idx };
    } else {
      crosshairOhlc.value = null;
    }
  });
}

// mounts chart (candlestick or bar) and volume
onMounted(async () => {
  const chartDiv = wkchart.value as HTMLElement | null;
  if (!chartDiv) return;
  const rect = chartDiv.getBoundingClientRect();
  const width = window.innerWidth <= 1150 ? 400 : rect.width;
  const height = rect.height <= 1150 ? 550 : rect.width;
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
    },
    crosshair: {
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
      timeVisible: true,
      secondsVisible: false,
      // Removed invalid timeFormatter option
    },
  });

  // Chart type toggle logic

  // Observe container size changes and window resize
  try {
    if (window && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => {
        updateChartSize();
      });
      if (chartDiv) resizeObserver.observe(chartDiv);
    }
  } catch (e) {
    // ignore if ResizeObserver is not available
  }
  window.addEventListener('resize', updateChartSize);
  // No initial fetch here; handled by watcher below

  watch(isBarChart, () => {
    updateMainSeries();
  });

  watch(data, (newData: OHLCData[]) => {
  if (mainSeries) mainSeries.setData(newData);
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

  watch(data2, (newData2: VolumeData[]) => {
  Histogram.setData(newData2);
  });

  watch(data3, (newData3: MAData[] | null) => {
  MaSeries1.setData(newData3 ?? []);
  });
  watch(data4, (newData4: MAData[] | null) => {
  MaSeries2.setData(newData4 ?? []);
  });
  watch(data5, (newData5: MAData[] | null) => {
  MaSeries3.setData(newData5 ?? []);
  });
  watch(data6, (newData6: MAData[] | null) => {
  MaSeries4.setData(newData6 ?? []);
  });

  watch(data2, (newData2: VolumeData[]) => {
    const relativeVolumeData: VolumeData[] = newData2.map((dataPoint: VolumeData, index: number) => {
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

  function calculateAverageVolume(data: VolumeData[], index: number): number {
    const windowSize = 365;
    const start = Math.max(0, index - windowSize + 1);
    const end = index + 1;
    const sum = data.slice(start, end).reduce((acc: number, current: VolumeData) => acc + current.value, 0);
    return sum / (end - start);
  }


// Watch for symbol changes and fetch chart data when a valid symbol is available
watch(
  [() => props.selectedSymbol, () => props.defaultSymbol],
  ([newSelected, newDefault]) => {
    const symbol = newSelected || newDefault;
    if (symbol && typeof symbol === 'string' && symbol.trim() !== '') {
      fetchChartData(symbol, selectedDataType.value);
      updateMainSeries();
    }
  },
  { immediate: true }
);

  let intrinsicPriceLine: IPriceLine | null = null;
  function updateIntrinsicPriceLine(): void {
    if (!mainSeries) return;
    if (intrinsicPriceLine) {
      mainSeries.removePriceLine(intrinsicPriceLine);
      intrinsicPriceLine = null;
    }
    if (IntrinsicValue.value !== null && !isNaN(IntrinsicValue.value)) {
      intrinsicPriceLine = mainSeries.createPriceLine({
        price: Number(IntrinsicValue.value),
        color: theme.base3,
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: '✦ Intrinsic Value',
        // Removed invalid labelVisible option
      });
    }
  }

  watch(IntrinsicValue, updateIntrinsicPriceLine);
  watch(isBarChart, updateIntrinsicPriceLine);
  updateIntrinsicPriceLine();
  // ensure initial sizing is correct
  updateChartSize();
  isLoading1.value = false;

  chart.timeScale().subscribeVisibleLogicalRangeChange(async (range) => {
    // range: LogicalRange | null
    if (isLoadingMore || allDataLoaded) return;
    if (selectedDataType.value !== 'daily' && selectedDataType.value !== 'weekly') return;
    if (range && typeof range.from === 'number' && range.from < 20) {
      isLoadingMore = true;
      const oldest = data.value.length > 0 ? data.value[0].time : null;
      if (!oldest) {
        isLoadingMore = false;
        return;
      }
      try {
        const symbol = props.selectedSymbol || props.defaultSymbol;
        const timeframe = selectedDataType.value;
        const url = `/api/${symbol}/chartdata?timeframe=${timeframe}&user=${props.user}&before=${oldest}`;
        const response = await fetch(url, {
          headers: { 'X-API-KEY': props.apiKey },
        });
        if (!response.ok) throw new Error('Failed to fetch more data');
        const result: ChartDataResult = await response.json();
        if (!result.ohlc || result.ohlc.length === 0) {
          allDataLoaded = true;
          isLoadingMore = false;
          return;
        }
        let newOhlc = [...result.ohlc];
        if (newOhlc.length > 1 && newOhlc[0].time > newOhlc[newOhlc.length - 1].time) {
          newOhlc = newOhlc.reverse();
        }
        const existingTimes = new Set(data.value.map((d: OHLCData) => d.time));
        newOhlc = newOhlc.filter((d: OHLCData) => !existingTimes.has(d.time));
        data.value = [...newOhlc, ...data.value];
        let newVolume = result.volume || [];
        if (newVolume.length > 1 && newVolume[0].time > newVolume[newVolume.length - 1].time) {
          newVolume = newVolume.reverse();
        }
        const existingVolTimes = new Set(data2.value.map((d: VolumeData) => d.time));
        newVolume = newVolume.filter((d: VolumeData) => !existingVolTimes.has(d.time));
        data2.value = [...newVolume, ...data2.value];
        if (result.MA1) {
          let newMA1 = result.MA1;
          if (newMA1.length > 1 && newMA1[0].time > newMA1[newMA1.length - 1].time) {
            newMA1 = newMA1.reverse();
          }
          const existingMA1Times = new Set(data3.value.map((d: MAData) => d.time));
          newMA1 = newMA1.filter((d: MAData) => !existingMA1Times.has(d.time));
          data3.value = [...newMA1, ...data3.value];
        }
        if (result.MA2) {
          let newMA2 = result.MA2;
          if (newMA2.length > 1 && newMA2[0].time > newMA2[newMA2.length - 1].time) {
            newMA2 = newMA2.reverse();
          }
          const existingMA2Times = new Set(data4.value.map((d: MAData) => d.time));
          newMA2 = newMA2.filter((d: MAData) => !existingMA2Times.has(d.time));
          data4.value = [...newMA2, ...data4.value];
        }
        if (result.MA3) {
          let newMA3 = result.MA3;
          if (newMA3.length > 1 && newMA3[0].time > newMA3[newMA3.length - 1].time) {
            newMA3 = newMA3.reverse();
          }
          const existingMA3Times = new Set(data5.value.map((d: MAData) => d.time));
          newMA3 = newMA3.filter((d: MAData) => !existingMA3Times.has(d.time));
          data5.value = [...newMA3, ...data5.value];
        }
        if (result.MA4) {
          let newMA4 = result.MA4;
          if (newMA4.length > 1 && newMA4[0].time > newMA4[newMA4.length - 1].time) {
            newMA4 = newMA4.reverse();
          }
          const existingMA4Times = new Set(data6.value.map((d: MAData) => d.time));
          newMA4 = newMA4.filter((d: MAData) => !existingMA4Times.has(d.time));
          data6.value = [...newMA4, ...data6.value];
        }
        updateMainSeries();
      } catch (err) {
        console.error('Lazy load error:', err);
      }
      isLoadingMore = false;
    }
  });
});
// cleanup listeners and observers
onUnmounted(() => {
  try {
    window.removeEventListener('resize', updateChartSize);
  } catch (e) {}
  try {
    if (typeof ResizeObserver !== 'undefined') {
      // disconnect any local observer if exists
      // we don't have direct access to the variable here due to block scope in onMounted,
      // but we can try to disconnect if it was stored globally — above we stored in a local variable,
      // so to be safe, nothing to do here beyond removing window listener.
    }
  } catch (e) {}
  // close websocket if open
  closeChartWS();
});


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

function setChartView(label: string): void {
  const type = chartTypes.find(t => t.label === label);
  if (type) {
    selectedDataType.value = type.value;
    fetchChartData(undefined, type.value);
  }
}

// Crosshair OHLC tracking
interface CrosshairOHLC extends OHLCData {
  index: number;
}
const crosshairOhlc = ref<CrosshairOHLC | null>(null);

// Compute OHLC and change for crosshair or latest
interface OHLCDisplay {
  open: string;
  high: string;
  low: string;
  close: string;
  changeRaw: string;
  changePct: string;
}
const ohlcDisplay = computed<OHLCDisplay | null>(() => {
  let idx = -1;
  if (!data.value || data.value.length < 2) return null;
  if (crosshairOhlc.value && typeof crosshairOhlc.value.index === 'number') {
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

const hiddenList = ref<string[]>([]); // stores hidden tickers for user (for hidden badge in chart)
const indicatorList = ref<Indicator[]>([]); // stores in indicators settings for each user
const intrinsicVisible = ref<boolean>(false);
const marketStatus = ref<'open' | 'closed' | 'holiday'>('closed');
const currentHolidayName = ref<string>('');
const holidays = ref<Array<{date: string, name: string}>>([]);
const isMarketStatusLoading = ref<boolean>(true);

// Refs used to measure & animate the Name text when truncated
const nameContainer = ref<HTMLElement | null>(null);
const nameSpan = ref<HTMLElement | null>(null);

function handleNameMouseEnter(): void {
  nextTick(() => {
    if (!nameContainer.value || !nameSpan.value) return;
    const containerWidth = nameContainer.value.clientWidth;
    const contentWidth = nameSpan.value.scrollWidth;
    // If content fits, do nothing
    if (contentWidth <= containerWidth) return;
    const distance = containerWidth - contentWidth; // negative value
    // Duration scales with distance but kept in reasonable bounds
    const duration = Math.min(10, Math.max(2, Math.abs(distance) / 30));
    nameSpan.value.style.transition = `transform ${duration}s linear`;
    nameSpan.value.style.willChange = 'transform';
    // Slight small delay to make the movement feel natural
    requestAnimationFrame(() => {
      nameSpan.value && (nameSpan.value.style.transform = `translateX(${distance}px)`);
    });
  });
}

function handleNameMouseLeave(): void {
  if (!nameSpan.value) return;
  nameSpan.value.style.transition = 'transform 0.45s ease-out';
  nameSpan.value.style.transform = 'translateX(0)';
}

// Reset transforms when the asset name changes
watch(() => props.assetInfo?.Name, () => {
  if (nameSpan.value) {
    nameSpan.value.style.transition = '';
    nameSpan.value.style.transform = '';
  }
});

async function fetchHiddenList() {
  try {
    const response = await fetch(`/api/${props.user}/hidden`, {
      headers: { 'X-API-KEY': props.apiKey },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
  hiddenList.value = data.Hidden as string[];
  } catch (err) {
    console.error('Error fetching hidden list:', err); // Log errors
  }
}

// Fetch indicator list from backend
async function fetchIndicatorList() {
  try {
    // Adjust the endpoint as needed for your backend
    const response = await fetch(`/api/${props.user}/indicators`, {
      headers: { 'X-API-KEY': props.apiKey },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const payload = await response.json();
  // Ensure timeframe is a number for each indicator and set intrinsic flag
  const indicatorsRaw = Array.isArray(payload.indicators) ? payload.indicators : [];
  indicatorList.value = indicatorsRaw.map((ind: any) => ({
    ...ind,
    timeframe: typeof ind.timeframe === 'string' ? Number(ind.timeframe) : ind.timeframe
  })) as Indicator[];
  intrinsicVisible.value = !!payload.intrinsicValueVisible;
  // Set chart type from user settings
  if (payload.chartType === 'bar') {
    isBarChart.value = true;
  } else {
    isBarChart.value = false;
  }
  } catch (err) {
    // Handle errors as needed
  }
}

async function fetchHolidays() {
  try {
    const response = await fetch('/api/holidays', {
      headers: { 'X-API-KEY': props.apiKey },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const payload = await response.json();
    holidays.value = payload.Holidays || [];
  } catch (err) {
    // Handle errors as needed - fallback to empty array
    holidays.value = [];
  } finally {
    isMarketStatusLoading.value = false;
  }
}

let statusInterval: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  fetchHiddenList();
  fetchIndicatorList();
  await fetchHolidays();
  checkMarketStatus();
  
  // Check market status every 5 seconds for more accurate updates
  statusInterval = setInterval(checkMarketStatus, 5000);
  
  onUnmounted(() => {
    if (statusInterval) {
      clearInterval(statusInterval);
      statusInterval = null;
    }
  });
});

const isInHiddenList = (item: string): boolean => {
  return hiddenList.value.includes(item);
};

// Handle chart refresh after settings are saved
function onSettingsSaved() {
  // Fetch indicator list first to get updated chart type
  fetchIndicatorList();
  // Then refresh chart data
  fetchChartData();
}

// Computed properties for market status
const marketStatusClass = computed<string>(() => {
  return `status-${marketStatus.value}`;
});

const marketStatusText = computed<string>(() => {
  if (marketStatus.value === 'open') return 'Market Open';
  if (marketStatus.value === 'closed') return 'Market Close';
  if (marketStatus.value === 'holiday') return 'Holiday | ' + currentHolidayName.value;
  return 'Holiday';
});

// Computed property for EOD Only badge
const isEODOnly = computed<boolean>(() => {
  const exchange = props.assetInfo?.Exchange;
  return exchange && exchange !== 'NASDAQ' && exchange !== 'NYSE';
});

// Function to check market status
function checkMarketStatus(): void {
  currentHolidayName.value = '';
  // Get current time in US Eastern Time
  const nowET = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = nowET.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = nowET.getHours();
  const minutes = nowET.getMinutes();
  const time = hours * 60 + minutes; // Convert to minutes since midnight
  
  // US holidays (fetched from database)
  const holidayList = holidays.value;
  
  // Get date string in ET timezone
  const year = nowET.getFullYear();
  const month = String(nowET.getMonth() + 1).padStart(2, '0');
  const date = String(nowET.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${date}`;
  
  const holiday = holidayList.find(h => h.date === dateStr);
  if (holiday) {
    marketStatus.value = 'holiday';
    currentHolidayName.value = holiday.name;
    return;
  }
  
  // Weekend check
  if (day === 0 || day === 6) {
    marketStatus.value = 'closed';
    return;
  }
  
  // Market hours: 9:30 AM - 4:00 PM EST/EDT (in minutes: 570 - 960)
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM
  
  if (time >= marketOpen && time < marketClose) {
    marketStatus.value = 'open';
  } else {
    marketStatus.value = 'closed';
  }
}

// Computed property for active indicators in the chart
interface ActiveIndicator {
  label: string;
  color: string;
}
const activeIndicators = computed<ActiveIndicator[]>(() => {
  const dataRefs = [data3, data4, data5, data6];
  const colorRefs = [theme.ma1, theme.ma2, theme.ma3, theme.ma4];
  const indicators: ActiveIndicator[] = [];
  if (!Array.isArray(indicatorList.value)) return indicators;
  indicatorList.value.forEach((indicator: Indicator, idx: number) => {
    if (indicator.visible && dataRefs[idx] && dataRefs[idx].value && dataRefs[idx].value.length > 0) {
      indicators.push({
        label: `${indicator.type} (${indicator.timeframe})`,
        color: colorRefs[idx] || theme.text2
      });
    }
  });
  return indicators;
});

defineExpose({
  ohlcDisplay,
  activeIndicators,
  isInHiddenList,
  onSettingsSaved,
  indicatorList
});
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
  border-radius: 6px;
}

.mainchart-dashboard {
  display: flex;
  flex-direction: column;
  color: var(--text2);
  border: none;
  border-radius: 6px;
  padding: 5px;
  background-color: var(--base2);
  width: calc(100% - 10px);
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

.no-data-container {
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

.no-data-container p {
  color: var(--text2);
  font-size: 16px;
  font-weight: 500;
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
  font-weight: bold;
  opacity: 1;
  max-width: 250px;
  overflow: hidden;
  white-space: nowrap;
  position: relative;
}

.name span {
  display: inline-block;
  font-size: 15px;
  white-space: nowrap;
  width: max-content;
  transition: transform 0.45s ease-out;
  will-change: transform;
  padding-right: 12px; 
}

.title-inline {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dash {
  color: var(--text1);
  font-weight: bold;
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
  gap: 3px;
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

#legend3-5 {
  position: absolute;
  top: 7%;
  left: 0;
  z-index: 1000;
  background-color: transparent;
  color: var(--text2);
  border: none;
  margin-top: 20px;
  margin-left: 12px;
  display: flex;
  flex-direction: row;
  align-items: center;
}

#legend4 {
  position: absolute;
  top: 10%;
  left: 0;
  z-index: 1000;
  background-color: transparent;
  color: var(--text2);
  border: none;
  margin-top: 20px;
  margin-left: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2px;
}

.badge-message {
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

.badge-message p{
font-size: 8px;
font-weight: bold;
}

.loader-line {
  width: 10px;
  height: 2px;
  background: var(--text2);
  border-radius: 2px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: scaleX(1);
  }

  50% {
    transform: scaleX(0.5);
  }

  100% {
    transform: scaleX(1);
  }
}

.market-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  position: relative;
}

.status-indicator.status-open {
  background-color: var(--positive);
  box-shadow: 0 0 4px var(--positive), 0 0 8px var(--positive);
  animation: pulse-open 2s ease-in-out infinite;
}

.status-indicator.status-closed {
  background-color: var(--negative);
  box-shadow: 0 0 3px var(--negative);
  animation: fade-pulse 3s ease-in-out infinite;
}

.status-indicator.status-holiday {
  background-color: var(--accent1);
  box-shadow: 0 0 4px var(--accent1), 0 0 8px var(--accent1);
  animation: pulse-holiday 1.5s ease-in-out infinite;
}

.holiday-icon {
  width: 12px;
  height: 12px;
  color: var(--text2);
}

@keyframes pulse-open {
  0%, 100% {
    box-shadow: 0 0 4px var(--positive), 0 0 8px var(--positive);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 6px var(--positive), 0 0 12px var(--positive);
    transform: scale(1.1);
  }
}

@keyframes pulse-holiday {
  0%, 100% {
    box-shadow: 0 0 4px var(--accent1), 0 0 8px var(--accent1);
    opacity: 1;
  }
  50% {
    box-shadow: 0 0 6px var(--accent1), 0 0 14px var(--accent1);
    opacity: 0.8;
  }
}

@keyframes fade-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-text {
  color: var(--text2);
  font-size: 1rem;
  font-weight: 600;
}

.eod-only-badge {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  padding: 2px 6px;
  background-color: var(--text2);
  border-radius: 3px;
  opacity: 0.85;
}

.eod-text {
  color: var(--base1);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.3px;
}


.chart-img {
  width: 20px;
  height: 20px;
  border-radius: 25%;
  border: solid var(--text2) 1px;
  margin-right: 5px;
  object-fit: cover;
  background: transparent;
}

.chart-img-fallback {
  position: absolute;
  top: 0;
  left: 0;
  width: 20px;
  height: 20px;
  background: var(--text2);
  color: var(--base2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  border-radius: 25%;
  z-index: 2;
  pointer-events: none;
  border: solid var(--text2) 1px;
  margin-right: 5px;
}

.navbt {
  background-color: transparent;
  color: var(--text2);
  text-align: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  border-radius: 0;
  opacity: 1;
  width: 28px;
  height: 28px;
  align-items: center;
  display: flex;
  font-weight: normal;
  padding: 0;
  transition: all 0.2s ease;
}


.chart-type-icon {
  width: 20px;
  height: 20px;
  display: block;
}

.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.navbt:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text1);
}

.navbt.selected {
  background-color: transparent;
  color: var(--text1);
  font-weight: bold;
  border-bottom: 1px solid var(--text1);
}

.navbt2 {
  background-color: transparent;
  color: var(--text2);
  text-align: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  border-radius: 0;
  padding: 4px;
  opacity: 1;
  height: 28px;
  align-items: center;
  display: flex;
  font-weight: normal;
  font-size: 12px;
  transition: all 0.2s ease;
}

.navbt2:hover {
  color: var(--text1);
}

.navbt2.selected {
  background-color: transparent;
  color: var(--text1);
  font-weight: bold;
  border-bottom: 1px solid var(--text1);
}

</style>