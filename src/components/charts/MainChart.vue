<template>
  <div id="chart-container">
    <div id="legend"></div>
    <div id="legend2">
      <button class="navbtng" v-b-tooltip.hover title="Change Chart View" @click="toggleChartView">
        {{ chartView }}
      </button>
      <button class="navbtng" v-b-tooltip.hover title="Change Chart type" @click="toggleChartType"
        aria-label="Toggle chart type">
        {{ isBarChart ? 'Candlestick' : 'Bar' }}
      </button>
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
import Loader from '@/components/loader.vue';

const props = defineProps({
  chartView: String,
  isBarChart: Boolean,
  isChartLoading: Boolean,
  isLoading: Boolean,
  assetInfo: Object,
  selectedItem: String,
  showMA1: Boolean,
  showMA2: Boolean,
  showMA3: Boolean,
  showMA4: Boolean,
  showPriceTarget: Boolean,
  getImagePath: Function,
  isInHiddenList: Function,
  toggleChartView: Function,
  toggleChartType: Function,
});

const mainchart = defineProps().mainchart || null;
</script>