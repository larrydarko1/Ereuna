<template>
 <h1 style="margin-top: 2px;" class="title3">WEEKLY CHART</h1>
                                <div class="chart-container">
                                  <div class="loading-container1" v-if="isChartLoading1 || isLoading1">
                                    <Loader />
                                  </div>
                                  <div id="wk-chart" ref="wkchart" style="width: 100%; height: 250px;"
                                    :class="{ 'hidden': isChartLoading1 || isLoading1 }"></div>
                                </div>
</template>

<script setup>
import Loader from '@/components/loader.vue'
import { onMounted, ref, watch } from 'vue';
import { createChart, ColorType } from 'lightweight-charts';

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

const emit = defineEmits(['symbol-selected']);
function onSymbolSelect(symbol) {
  emit('symbol-selected', symbol);
}

const data = ref([]); // Weekly OHCL Data
const data2 = ref([]); // Weekly Volume Data
const data3 = ref([]); // weekly 10MA
const data4 = ref([]); // weekly 20MA
const data5 = ref([]); // weekly 50MA
const data6 = ref([]); // weekly 200MA

async function fetchChartData(symbolParam, before = null, append = false) {
  if (!append) isChartLoading1.value = true;
  let symbol = (symbolParam || props.selectedSymbol || props.defaultSymbol || props.selectedItem).toUpperCase();
  let url = `/api/${symbol}/chartdata-wk?limit=500`;
  if (before) url += `&before=${encodeURIComponent(before)}`;
  try {
    const response = await fetch(url, { headers: { 'X-API-KEY': props.apiKey } });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    const ohlc = result.weekly.ohlc || [];
    const volume = result.weekly.volume || [];
    // Indicator arrays
    const ma10 = result.weekly.MA10 || [];
    const ma20 = result.weekly.MA20 || [];
    const ma50 = result.weekly.MA50 || [];
    const ma200 = result.weekly.MA200 || [];
    if (append) {
      // Prepend older data, avoid duplicates
      const existingTimes = new Set(data.value.map(d => d.time));
      const newOhlc = ohlc.filter(d => !existingTimes.has(d.time));
      data.value = [...newOhlc, ...data.value];
      const existingVolTimes = new Set(data2.value.map(d => d.time));
      const newVolume = volume.filter(d => !existingVolTimes.has(d.time));
      data2.value = [...newVolume, ...data2.value];

      // Prepend indicators, avoid duplicates
      const prependMA = (oldArr, newArr) => {
        if (!Array.isArray(oldArr)) oldArr = [];
        if (!Array.isArray(newArr)) newArr = [];
        const existingMATimes = new Set(oldArr.map(d => d.time));
        const filteredNewArr = newArr.filter(d => !existingMATimes.has(d.time));
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
    if (!append) isChartLoading1.value = false;
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

// mounts Weekly chart (including volume)
onMounted(async () => {
  const chartDiv = wkchart.value;
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
      barSpacing: 0.7,
      minBarSpacing: 0.1,
      rightOffset: 50,
    },
  });

  const barSeries = chart.addCandlestickSeries({
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

  watch(data, (newData) => {
    barSeries.setData(newData);
  });

  watch(data2, (newData2) => {
    Histogram.setData(newData2);
  });

  watch(data3, (newData3) => {
    if (newData3 === null) {
      MaSeries1.setData([]); // Clear the series data when null
    } else {
      MaSeries1.setData(newData3);
    }
  });

  watch(data4, (newData4) => {
    if (newData4 === null) {
      MaSeries2.setData([]); // Clear the series data when null
    } else {
      MaSeries2.setData(newData4);
    }
  });

  watch(data5, (newData5) => {
    if (newData5 === null) {
      MaSeries3.setData([]); // Clear the series data when null
    } else {
      MaSeries3.setData(newData5);
    }
  });

  watch(data6, (newData6) => {
    if (newData6 === null) {
      MaSeries4.setData([]); // Clear the series data when null
    } else {
      MaSeries4.setData(newData6);
    }
  });

  watch(data2, (newData2) => {
    const relativeVolumeData = newData2.map((dataPoint, index) => {
      const averageVolume = calculateAverageVolume(newData2, index);
      const relativeVolume = dataPoint.value / averageVolume;
      const color = relativeVolume > 2 ? theme.accent1 : theme.volume; // green for above-average volume, gray for below-average volume
      return {
        time: dataPoint.time, // add the time property
        value: dataPoint.value,
        color,
      };
    });
    Histogram.setData(relativeVolumeData);
  });

  function calculateAverageVolume(data, index) {
    const windowSize = 365; // adjust this value to change the window size for calculating average volume
    const start = Math.max(0, index - windowSize + 1);
    const end = index + 1;
    const sum = data.slice(start, end).reduce((acc, current) => acc + current.value, 0);
    return sum / (end - start);
  }

  // Initial fetch
  await fetchChartData();
  isLoading1.value = false;

  chart.timeScale().subscribeVisibleLogicalRangeChange(async (range) => {
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
  height: 250px;
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