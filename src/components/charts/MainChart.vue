<template>
  <EditChart 
    v-if="showEditChart" 
    @close="showEditChart = false" 
    @settings-saved="onSettingsSaved"
    :apiKey="props.apiKey"
    :user="props.user"
    :indicatorList="indicatorList"
  />
                               <div class="chart-container">
                                  <div class="loading-container1" v-if="isChartLoading1 || isLoading1">
                                    <Loader />
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
    <button class="navbt2" @click="showEditChart = true">
      Edit Chart
    </button>
    <button class="navbt navbt-svg" v-b-tooltip.hover title="Change Chart type" @click="toggleChartType"
      aria-label="Toggle chart type">
      <span v-if="isBarChart">
        <!-- Bar chart SVG -->
        <svg class="chart-type-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="10" width="3" height="8" fill="currentColor"/>
          <rect x="10" y="6" width="3" height="12" fill="currentColor"/>
          <rect x="16" y="2" width="3" height="16" fill="currentColor"/>
        </svg>
      </span>
      <span v-else>
        <!-- Candlestick chart SVG (custom) -->
        <svg class="chart-type-icon" version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve" fill="currentColor">
          <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
          <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
          <g id="SVGRepo_iconCarrier">
            <g>
              <polygon class="st0" points="195.047,75.844 178.797,75.844 178.797,109.047 138.156,109.047 138.156,320.344 178.797,320.344 178.797,360.297 195.047,360.297 195.047,320.344 235.688,320.344 235.688,109.047 195.047,109.047 "></polygon>
              <polygon class="st0" points="512,49.438 471.375,49.438 471.375,16.25 455.109,16.25 455.109,49.438 414.469,49.438 414.469,293.25 455.109,293.25 455.109,333.203 471.375,333.203 471.375,293.25 512,293.25 "></polygon>
              <path class="st0" d="M56.875,203.172h-16.25v36.578H0v219.422h40.625v36.578h16.25v-36.578h40.656V239.75H56.875V203.172z M81.281,256v186.922H16.25V256H81.281z"></path>
              <path class="st0" d="M333.203,151.703h-16.25v33.188h-40.641v227.563h40.641v39.953h16.25v-39.953h40.641V184.891h-40.641V151.703z M357.594,201.156v195.047h-65.031V201.156H357.594z"></path>
            </g>
          </g>
        </svg>
      </span>
    </button>
    <button class="navbt navbt-svg disabled">
      <svg class="chart-type-icon" width="24" height="24" viewBox="0 0 24 24" fill="var(--accent1)" xmlns="http://www.w3.org/2000/svg">
        <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
        <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
        <g id="SVGRepo_iconCarrier">
          <path d="M2 15.6157C2 16.463 2.68179 17.1448 4.04537 18.5083L5.49167 19.9546C6.85525 21.3182 7.53704 22 8.38426 22C9.23148 22 9.91327 21.3182 11.2769 19.9546L19.9546 11.2769C21.3182 9.91327 22 9.23148 22 8.38426C22 7.53704 21.3182 6.85525 19.9546 5.49167L18.5083 4.04537C17.1448 2.68179 16.463 2 15.6157 2C14.8623 2 14.2396 2.53926 13.1519 3.61778C13.1817 3.63981 13.2103 3.66433 13.2373 3.69135L14.6515 5.10556C14.9444 5.39846 14.9444 5.87333 14.6515 6.16622C14.3586 6.45912 13.8837 6.45912 13.5908 6.16622L12.1766 4.75201C12.1494 4.7248 12.1247 4.69601 12.1026 4.66595L11.0299 5.73861C11.06 5.76077 11.0888 5.78545 11.116 5.81267L13.2373 7.93399C13.5302 8.22688 13.5302 8.70176 13.2373 8.99465C12.9444 9.28754 12.4695 9.28754 12.1766 8.99465L10.0553 6.87333C10.0281 6.84612 10.0034 6.81733 9.98125 6.78726L8.90859 7.85993C8.93865 7.88209 8.96744 7.90678 8.99465 7.93399L10.4089 9.3482C10.7018 9.6411 10.7018 10.116 10.4089 10.4089C10.116 10.7018 9.6411 10.7018 9.3482 10.4089L7.93399 8.99465C7.90678 8.96744 7.88209 8.93865 7.85993 8.90859L6.78727 9.98125C6.81733 10.0034 6.84612 10.0281 6.87333 10.0553L8.99465 12.1766C9.28754 12.4695 9.28754 12.9444 8.99465 13.2373C8.70176 13.5302 8.22688 13.5302 7.93399 13.2373L5.81267 11.116C5.78545 11.0888 5.76077 11.06 5.73861 11.0299L4.66595 12.1026C4.69601 12.1247 4.7248 12.1494 4.75201 12.1766L6.16622 13.5908C6.45912 13.8837 6.45912 14.3586 6.16622 14.6515C5.87333 14.9444 5.39846 14.9444 5.10556 14.6515L3.69135 13.2373C3.66433 13.2103 3.63981 13.1817 3.61778 13.1519C2.53926 14.2396 2 14.8623 2 15.6157Z" fill="currentColor"></path>
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
                                    :class="{ 'hidden': isChartLoading1 || isLoading1 }"></div>
                                </div>
</template>

<script setup lang="ts">

import Loader from '@/components/loader.vue';
import { onMounted, ref, watch, computed } from 'vue';
import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  Time,
  IPriceLine
} from 'lightweight-charts';
import EditChart from '@/components/charts/EditChart.vue';

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
  const wsUrl = `${wsProto}://localhost:8000/ws/chartdata?ticker=${symbol}&timeframe=${timeframe}&user=${user}`;
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
const isBarChart = ref(false);

// mounts chart (candlestick or bar) and volume
onMounted(async () => {
  const chartDiv = wkchart.value as HTMLElement | null;
  if (!chartDiv) return;
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
  let mainSeries: ReturnType<IChartApi['addBarSeries']> | ReturnType<IChartApi['addCandlestickSeries']> | null = null;
  function updateMainSeries(): void {
    if (mainSeries) {
      chart.removeSeries(mainSeries);
    }
    if (isBarChart.value) {
      mainSeries = chart.addBarSeries({
        downColor: theme.negative,
        upColor: theme.positive,
        lastValueVisible: true,
        priceLineVisible: true,
      });
    } else {
      mainSeries = chart.addCandlestickSeries({
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

    chart.subscribeCrosshairMove((param) => {
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

  // Initial fetch
  await fetchChartData();
  updateMainSeries();

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
        title: 'Intrinsic Value',
        // Removed invalid labelVisible option
      });
    }
  }

  watch(IntrinsicValue, updateIntrinsicPriceLine);
  watch(isBarChart, updateIntrinsicPriceLine);
  updateIntrinsicPriceLine();
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
    const data = await response.json();
  // Ensure timeframe is a number for each indicator
  indicatorList.value = (data as any[]).map(ind => ({
    ...ind,
    timeframe: typeof ind.timeframe === 'string' ? Number(ind.timeframe) : ind.timeframe
  })) as Indicator[];
  } catch (err) {
    console.error('Error fetching indicator list:', err);
  }
}

onMounted(() => {
  fetchHiddenList();
  fetchIndicatorList();
});

const isInHiddenList = (item: string): boolean => {
  return hiddenList.value.includes(item);
};

// Handle chart refresh after settings are saved
function onSettingsSaved() {
  // Use current symbol and timeframe
  fetchChartData();
  fetchIndicatorList();
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

#legend4 {
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
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
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
  background-color: var(--text2);
  color: var(--base1);
  text-align: center;
  justify-content: center;
  cursor: pointer;
  border: solid var(--text2) 1px;
  border-radius: 5px;
  opacity: 0.60;
  width: 32px;
  height: 32px;
  align-items: center;
  display: flex;
  font-weight: bold;
  padding: 0;
}

.navbt-svg {
  background-color: var(--text2);
}

.chart-type-icon {
  width: 24px;
  height: 24px;
  display: block;
}

.disabled {
  opacity: 0.3;
  cursor: not-allowed;
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

.navbt2 {
  background-color: var(--text2);
  color: var(--base1);
  text-align: center;
  justify-content: center;
  cursor: pointer;
  border: solid var(--text2) 1px;
  border-radius: 5px;
  padding: 15px;
  opacity: 0.60;
  width: 89px;
  height: 25px;
  align-items: center;
  display: flex;
  font-weight: bold;
}

.navbt2:hover {
  opacity: 1;
}

.navbt2.selected {
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