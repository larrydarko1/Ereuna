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


let isChartLoading2 = ref(false); // Local loader for this chart
let isLoading2 = ref(false); // If you want a second loader, keep this, else remove

const emit = defineEmits(['symbol-selected']);


function onSymbolSelect(symbol) {
  emit('symbol-selected', symbol);
}

// CHARTS SECTION
const data = ref([]); // Daily OHCL Data
const data2 = ref([]); // Daily Volume Data
const data3 = ref([]); // daily 10MA
const data4 = ref([]); // daily 20MA
const data5 = ref([]); // daily 50MA
const data6 = ref([]); // daily 200MA

async function fetchChartData(symbolParam) {
  isChartLoading2.value = true;
  try {
    let symbol = (symbolParam || props.selectedSymbol || props.defaultSymbol || props.selectedItem).toUpperCase();
    const response = await fetch(`/api/${symbol}/chartdata-dl`, { headers: { 'X-API-KEY': props.apiKey } });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    // Daily
    data.value = result.daily.ohlc || [];
    data2.value = result.daily.volume || [];
    data3.value = result.daily.MA10 || null;
    data4.value = result.daily.MA20 || null;
    data5.value = result.daily.MA50 || null;
    data6.value = result.daily.MA200 || null;
  } catch (error) {
    console.error(error);
  } finally {
    isChartLoading2.value = false;
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

const dlchart = ref(null);

// mounts daily chart (including volume)
onMounted(async () => {
  const chartDiv = dlchart.value;
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
    crosshairMarkerVisible: false,
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
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    priceLineVisible: false,
    lineWidth: 1,
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

  await fetchChartData();
  isLoading2.value = false

});

// Watch for prop changes to selectedSymbol and update chart
watch(() => props.selectedSymbol, (newSymbol, oldSymbol) => {
  if (newSymbol && newSymbol !== oldSymbol) {
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