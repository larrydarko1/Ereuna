<template>
  <EditChart 
    v-if="showEditChart" 
    @close="showEditChart = false" 
    @settings-saved="onSettingsSaved"
    :apiKey="props.apiKey"
    :user="props.user"
    :indicatorList="indicatorList"
    :intrinsicVisible="intrinsicVisible"
    :chartType="chartType"
  />
  <AIPopup
    v-if="showAIPopup"
    @close="showAIPopup = false"
    :aiData="aiData"
    :Symbol="assetInfo?.Symbol"
  />
  <SignalsPopup
    v-if="showSignalsPopup"
    @close="showSignalsPopup = false"
    :signals="todaySignals"
    :Symbol="assetInfo?.Symbol"
  />
  <ScreenshotPopup
    v-if="showScreenshotPopup"
    @close="showScreenshotPopup = false"
    @export="handleExportScreenshot"
    :chartInfo="screenshotChartInfo"
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
  <span v-else-if="simplePriceDisplay" class="ohlc-line">
    Price: <span>{{ simplePriceDisplay.price }}</span>
    <span :class="['change', Number(simplePriceDisplay.changeRaw) >= 0 ? 'pos' : 'neg']">
      {{ Number(simplePriceDisplay.changeRaw) >= 0 ? '+' : '' }}{{ simplePriceDisplay.changeRaw }}
      {{ Number(simplePriceDisplay.changeRaw) >= 0 ? '+' : '' }}{{ simplePriceDisplay.changePct }}%
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
                                
                                <!-- Chart Tools Toolbar -->
                                <div class="chart-tools-toolbar">
                                  <div class="toolbar-section">
                                    <div class="toolbar-label">Toolbar</div>
                                    <div class="toolbar-buttons">
                                      <button 
                                        class="tool-btn" 
                                        :class="{ 'active': isRulerActive }" 
                                        @click="toggleRuler" 
                                        title="Measure Tool"
                                      >
                                        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke-width="0"></g><g stroke-linecap="round" stroke-linejoin="round"></g><g> <path d="M2 15.6157C2 16.463 2.68179 17.1448 4.04537 18.5083L5.49167 19.9546C6.85525 21.3182 7.53704 22 8.38426 22C9.23148 22 9.91327 21.3182 11.2769 19.9546L19.9546 11.2769C21.3182 9.91327 22 9.23148 22 8.38426C22 7.53704 21.3182 6.85525 19.9546 5.49167L18.5083 4.04537C17.1448 2.68179 16.463 2 15.6157 2C14.8623 2 14.2396 2.53926 13.1519 3.61778C13.1817 3.63981 13.2103 3.66433 13.2373 3.69135L14.6515 5.10556C14.9444 5.39846 14.9444 5.87333 14.6515 6.16622C14.3586 6.45912 13.8837 6.45912 13.5908 6.16622L12.1766 4.75201C12.1494 4.7248 12.1247 4.69601 12.1026 4.66595L11.0299 5.73861C11.06 5.76077 11.0888 5.78545 11.116 5.81267L13.2373 7.93399C13.5302 8.22688 13.5302 8.70176 13.2373 8.99465C12.9444 9.28754 12.4695 9.28754 12.1766 8.99465L10.0553 6.87333C10.0281 6.84612 10.0034 6.81733 9.98125 6.78726L8.90859 7.85993C8.93865 7.88209 8.96744 7.90678 8.99465 7.93399L10.4089 9.3482C10.7018 9.6411 10.7018 10.116 10.4089 10.4089C10.116 10.7018 9.6411 10.7018 9.3482 10.4089L7.93399 8.99465C7.90678 8.96744 7.88209 8.93865 7.85993 8.90859L6.78727 9.98125C6.81733 10.0034 6.84612 10.0281 6.87333 10.0553L8.99465 12.1766C9.28754 12.4695 9.28754 12.9444 8.99465 13.2373C8.70176 13.5302 8.22688 13.5302 7.93399 13.2373L5.81267 11.116C5.78545 11.0888 5.76077 11.06 5.73861 11.0299L4.66595 12.1026C4.69601 12.1247 4.7248 12.1494 4.75201 12.1766L6.16622 13.5908C6.45912 13.8837 6.45912 14.3586 6.16622 14.6515C5.87333 14.9444 5.39846 14.9444 5.10556 14.6515L3.69135 13.2373C3.66433 13.2103 3.63981 13.1817 3.61778 13.1519C2.53926 14.2396 2 14.8623 2 15.6157Z" fill="currentColor"></path> </g></svg>
                                      </button>
                                      <button 
                                        class="tool-btn" 
                                        :class="{ 'active': isTrendlineActive }" 
                                        @click="toggleTrendline" 
                                        title="Trendline"
                                      >
                                        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                                          <path d="M4 20 L20 4" />
                                        </svg>
                                      </button>
                                      <button 
                                        class="tool-btn" 
                                        :class="{ 'active': isBoxActive }" 
                                        @click="toggleBox" 
                                        title="Box (Support/Resistance)"
                                      >
                                        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                          <rect x="3" y="3" width="18" height="18" />
                                        </svg>
                                      </button>
                                      <button 
                                        class="tool-btn" 
                                        :class="{ 'active': isTextActive }" 
                                        @click="toggleText" 
                                        title="Text Annotation"
                                      >
                                        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                          <path d="M4 7V4h16v3M9 20h6M12 4v16" />
                                        </svg>
                                      </button>
                                      <button 
                                        class="tool-btn" 
                                        :class="{ 'active': isFreehandActive }" 
                                        @click="toggleFreehand" 
                                        title="Freehand Drawing"
                                      >
                                        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                          <path d="M12 19l7-7 3 3-7 7-3-3z" />
                                          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                                          <path d="M2 2l7.586 7.586" />
                                          <circle cx="11" cy="11" r="2" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <div class="toolbar-divider"></div>
                              
                                  
                                  <div class="toolbar-section">
                                    <div class="toolbar-buttons">
                                      <button class="tool-btn" @click="showSignalsPopup = true" v-if="hasSignals" title="Trading Signals">
                                        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <g stroke-width="0"></g>
                                          <g stroke-linecap="round" stroke-linejoin="round"></g>
                                          <g>
                                            <path d="M13 3L13 10L21 10C21 13.866 17.866 17 14 17H13V21M11 21L11 14L3 14C3 10.134 6.13401 7 10 7H11V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                                          </g>
                                        </svg>
                                      </button>
                                      <button class="tool-btn" @click="showAIPopup = true" v-if="hasAIData" title="AI Analysis">
                                        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <g stroke-width="0"></g>
                                          <g stroke-linecap="round" stroke-linejoin="round"></g>
                                          <g>
                                            <path d="M12 3C12 7.97056 16.0294 12 21 12C16.0294 12 12 16.0294 12 21C12 16.0294 7.97056 12 3 12C7.97056 12 12 7.97056 12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                                          </g>
                                        </svg>
                                      </button>
                                            <button class="tool-btn" @click="takeScreenshot" title="Take Screenshot (Download PNG)">
                                        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                          <circle cx="12" cy="13" r="4"></circle>
                                        </svg>
                                      </button>
                                      <button class="tool-btn" @click="clearAllDrawings" title="Clear All Drawings" v-if="hasAnyDrawings">
                                        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                          <polyline points="3 6 5 6 21 6"></polyline>
                                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                          <line x1="10" y1="11" x2="10" y2="17"></line>
                                          <line x1="14" y1="11" x2="14" y2="17"></line>
                                        </svg>
                                      </button>
                                      <button class="tool-btn" @click="showEditChart = true" title="Chart Settings">
                                        <svg class="tool-icon" fill="currentColor" viewBox="0 0 32 32" enable-background="new 0 0 32 32" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg">
                                          <g stroke-width="0"></g>
                                          <g stroke-linecap="round" stroke-linejoin="round"></g>
                                          <g>
                                            <path d="M27.526,18.036L27,17.732c-0.626-0.361-1-1.009-1-1.732s0.374-1.371,1-1.732l0.526-0.304 c1.436-0.83,1.927-2.662,1.098-4.098l-1-1.732c-0.827-1.433-2.666-1.925-4.098-1.098L23,7.339c-0.626,0.362-1.375,0.362-2,0 c-0.626-0.362-1-1.009-1-1.732V5c0-1.654-1.346-3-3-3h-2c-1.654,0-3,1.346-3,3v0.608c0,0.723-0.374,1.37-1,1.732 c-0.626,0.361-1.374,0.362-2,0L8.474,7.036C7.042,6.209,5.203,6.701,4.375,8.134l-1,1.732c-0.829,1.436-0.338,3.269,1.098,4.098 L5,14.268C5.626,14.629,6,15.277,6,16s-0.374,1.371-1,1.732l-0.526,0.304c-1.436,0.829-1.927,2.662-1.098,4.098l1,1.732 c0.828,1.433,2.667,1.925,4.098,1.098L9,24.661c0.626-0.363,1.374-0.361,2,0c0.626,0.362,1,1.009,1,1.732V27c0,1.654,1.346,3,3,3h2 c1.654,0,3-1.346,3-3v-0.608c0-0.723,0.374-1.37,1-1.732c0.625-0.361,1.374-0.362,2,0l0.526,0.304 c1.432,0.826,3.271,0.334,4.098-1.098l1-1.732C29.453,20.698,28.962,18.865,27.526,18.036z M16,21c-2.757,0-5-2.243-5-5s2.243-5,5-5 s5,2.243,5,5S18.757,21,16,21z"></path>
                                          </g>
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
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
  IPriceLine,
  MouseEventParams,
  LogicalRange
} from '@/lib/lightweight-charts';
import { ChartRuler } from '@/lib/lightweight-charts/ruler';
import { TrendLineManager } from '@/lib/lightweight-charts/trendline';
import { BoxManager } from '@/lib/lightweight-charts/box';
import { TextAnnotationManager } from '@/lib/lightweight-charts/text-annotation';
import { FreehandManager } from '@/lib/lightweight-charts/freehand';
import { ChartScreenshot, type ChartInfo } from '@/lib/lightweight-charts/screenshot';
import { DrawingPersistence } from '@/lib/lightweight-charts/drawing-persistence';
import EditChart from '@/components/charts/EditChart.vue';
import AIPopup from '@/components/charts/AIPopup.vue';
import SignalsPopup from '@/components/charts/SignalsPopup.vue';
import ScreenshotPopup from '@/components/charts/ScreenshotPopup.vue';

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
const showSignalsPopup = ref(false);
const showScreenshotPopup = ref(false);
const screenshotChartInfo = ref<ChartInfo>({} as ChartInfo);
const imgError = ref(false);
let isLoadingMore: boolean = false;
let allDataLoaded: boolean = false;
const hasAnyDrawings = ref(false);


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

const hasSignals = computed(() => {
  return props.assetInfo?.Signals && Array.isArray(props.assetInfo.Signals) && props.assetInfo.Signals.length > 0;
});

const todaySignals = computed(() => {
  if (!hasSignals.value || !props.assetInfo?.Signals) return null;
  const today = new Date().toISOString().split('T')[0];
  return props.assetInfo.Signals.filter((signal: any) => signal.date === today);
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
const displayData = ref<OHLCData[]>([]); // Stores the actual data being displayed (could be Heikin-Ashi or regular OHLC)

function isIntraday(timeframe: string): boolean {
  return ['intraday1m', 'intraday5m', 'intraday15m', 'intraday30m', 'intraday1hr'].includes(timeframe);
}

function calculateHeikinAshi(ohlcData: OHLCData[]): OHLCData[] {
  if (ohlcData.length === 0) return [];
  
  const haData: OHLCData[] = [];
  let prevHAOpen = ohlcData[0].open;
  let prevHAClose = ohlcData[0].close;
  
  for (let i = 0; i < ohlcData.length; i++) {
    const current = ohlcData[i];
    
    // HA Close = (Open + High + Low + Close) / 4
    const haClose = (current.open + current.high + current.low + current.close) / 4;
    
    // HA Open = (Previous HA Open + Previous HA Close) / 2
    const haOpen = i === 0 ? (current.open + current.close) / 2 : (prevHAOpen + prevHAClose) / 2;
    
    // HA High = Max(High, HA Open, HA Close)
    const haHigh = Math.max(current.high, haOpen, haClose);
    
    // HA Low = Min(Low, HA Open, HA Close)
    const haLow = Math.min(current.low, haOpen, haClose);
    
    haData.push({
      time: current.time,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose
    });
    
    prevHAOpen = haOpen;
    prevHAClose = haClose;
  }
  
  return haData;
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

function toggleRuler(): void {
  if (ruler) {
    ruler.toggle();
    isRulerActive.value = ruler.isRulerActive();
    // Deactivate other tools when ruler is activated
    if (isRulerActive.value) {
      if (trendlineManager) {
        trendlineManager.deactivate();
        isTrendlineActive.value = false;
      }
      if (boxManager) {
        boxManager.deactivate();
        isBoxActive.value = false;
      }
      if (textAnnotationManager) {
        textAnnotationManager.deactivate();
        isTextActive.value = false;
      }
      if (freehandManager) {
        freehandManager.deactivate();
        isFreehandActive.value = false;
      }
    }
  }
}

function toggleTrendline(): void {
  if (trendlineManager) {
    trendlineManager.toggle();
    isTrendlineActive.value = trendlineManager.isToolActive();
    // Deactivate other tools when trendline is activated
    if (isTrendlineActive.value) {
      if (ruler) {
        ruler.deactivate();
        isRulerActive.value = false;
      }
      if (boxManager) {
        boxManager.deactivate();
        isBoxActive.value = false;
      }
      if (textAnnotationManager) {
        textAnnotationManager.deactivate();
        isTextActive.value = false;
      }
      if (freehandManager) {
        freehandManager.deactivate();
        isFreehandActive.value = false;
      }
    }
  }
}

function toggleBox(): void {
  if (boxManager) {
    boxManager.toggle();
    isBoxActive.value = boxManager.isToolActive();
    // Deactivate other tools when box is activated
    if (isBoxActive.value) {
      if (ruler) {
        ruler.deactivate();
        isRulerActive.value = false;
      }
      if (trendlineManager) {
        trendlineManager.deactivate();
        isTrendlineActive.value = false;
      }
      if (textAnnotationManager) {
        textAnnotationManager.deactivate();
        isTextActive.value = false;
      }
      if (freehandManager) {
        freehandManager.deactivate();
        isFreehandActive.value = false;
      }
    }
  }
}

function toggleText(): void {
  if (textAnnotationManager) {
    textAnnotationManager.toggle();
    isTextActive.value = textAnnotationManager.isToolActive();
    // Deactivate other tools when text is activated
    if (isTextActive.value) {
      if (ruler) {
        ruler.deactivate();
        isRulerActive.value = false;
      }
      if (trendlineManager) {
        trendlineManager.deactivate();
        isTrendlineActive.value = false;
      }
      if (boxManager) {
        boxManager.deactivate();
        isBoxActive.value = false;
      }
      if (freehandManager) {
        freehandManager.deactivate();
        isFreehandActive.value = false;
      }
    }
  }
}

function toggleFreehand(): void {
  if (freehandManager) {
    freehandManager.toggle();
    isFreehandActive.value = freehandManager.isToolActive();
    // Deactivate other tools when freehand is activated
    if (isFreehandActive.value) {
      if (ruler) {
        ruler.deactivate();
        isRulerActive.value = false;
      }
      if (trendlineManager) {
        trendlineManager.deactivate();
        isTrendlineActive.value = false;
      }
      if (boxManager) {
        boxManager.deactivate();
        isBoxActive.value = false;
      }
      if (textAnnotationManager) {
        textAnnotationManager.deactivate();
        isTextActive.value = false;
      }
    }
  }
}

function takeScreenshot(): void {
  screenshotChartInfo.value = {
    symbol: props.assetInfo?.Symbol || '',
    name: props.assetInfo?.Name || '',
    timeframe: chartTypes.find(t => t.value === selectedDataType.value)?.label || 'Daily Chart',
    price: ohlcDisplay.value?.close || simplePriceDisplay.value?.price || '',
    change: ohlcDisplay.value?.changeRaw || simplePriceDisplay.value?.changeRaw || '',
    changePercent: ohlcDisplay.value?.changePct ? `${ohlcDisplay.value.changePct}%` : 
                   simplePriceDisplay.value?.changePct ? `${simplePriceDisplay.value.changePct}%` : '',
    date: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  };
  
  showScreenshotPopup.value = true;
}

function handleExportScreenshot(config: any): void {
  if (!screenshotManager) return;
  
  screenshotManager.takeScreenshot(screenshotChartInfo.value, config);
  showScreenshotPopup.value = false;
}

async function clearAllDrawings(): Promise<void> {
  if (!drawingPersistence) return;
  
  if (confirm('Are you sure you want to clear all drawings for this symbol? This cannot be undone.')) {
    await drawingPersistence.clearDrawings();
    hasAnyDrawings.value = false;
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
let ruler: ChartRuler | null = null;
const isRulerActive = ref(false);
let trendlineManager: TrendLineManager | null = null;
const isTrendlineActive = ref(false);
let boxManager: BoxManager | null = null;
const isBoxActive = ref(false);
let textAnnotationManager: TextAnnotationManager | null = null;
const isTextActive = ref(false);
let freehandManager: FreehandManager | null = null;
const isFreehandActive = ref(false);
let screenshotManager: ChartScreenshot | null = null;
let drawingPersistence: DrawingPersistence | null = null;

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
const chartType = ref<string>('candlestick'); // Will be set from user settings

// Chart series and update logic at top-level scope
let mainSeries: any = null;
function updateMainSeries(): void {
  if (!chart) return;
  const c = chart as IChartApi;
  if (mainSeries) {
    c.removeSeries(mainSeries);
  }
  
  // Create series based on chart type
  switch (chartType.value) {
    case 'bar':
      mainSeries = c.addBarSeries({
        downColor: theme.negative,
        upColor: theme.positive,
        lastValueVisible: true,
        priceLineVisible: true,
      });
      mainSeries.setData(data.value);
      break;
    
    case 'candlestick':
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
      mainSeries.setData(data.value);
      break;
    
    case 'heikinashi':
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
      // Convert OHLC data to Heikin-Ashi
      const heikinAshiData = calculateHeikinAshi(data.value);
      mainSeries.setData(heikinAshiData);
      break;
    
    case 'line':
      mainSeries = c.addLineSeries({
        color: theme.accent1,
        lineWidth: 2,
        lastValueVisible: true,
        priceLineVisible: true,
        crosshairMarkerVisible: true,
      });
      // For line chart, use close prices
      const lineData = data.value.map((d: OHLCData) => ({
        time: d.time,
        value: d.close
      }));
      mainSeries.setData(lineData);
      break;
    
    case 'area':
      mainSeries = c.addAreaSeries({
        topColor: theme.accent1 + '80',
        bottomColor: theme.accent1 + '10',
        lineColor: theme.accent1,
        lineWidth: 2,
        lastValueVisible: true,
        priceLineVisible: true,
        crosshairMarkerVisible: true,
      });
      // For area chart, use close prices
      const areaData = data.value.map((d: OHLCData) => ({
        time: d.time,
        value: d.close
      }));
      mainSeries.setData(areaData);
      break;
    
    case 'baseline':
      // Calculate average close price for baseline
      const avgClose = data.value.length > 0
        ? data.value.reduce((sum: number, d: OHLCData) => sum + d.close, 0) / data.value.length
        : 0;
      mainSeries = c.addBaselineSeries({
        baseValue: { type: 'price', price: avgClose },
        topLineColor: theme.positive,
        topFillColor1: theme.positive + '40',
        topFillColor2: theme.positive + '10',
        bottomLineColor: theme.negative,
        bottomFillColor1: theme.negative + '10',
        bottomFillColor2: theme.negative + '40',
        lineWidth: 2,
        lastValueVisible: true,
        priceLineVisible: true,
      });
      // For baseline chart, use close prices
      const baselineData = data.value.map((d: OHLCData) => ({
        time: d.time,
        value: d.close
      }));
      mainSeries.setData(baselineData);
      break;
    
    default:
      // Default to candlestick
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
      mainSeries.setData(data.value);
  }
  
  // Update ruler with the new series reference
  if (ruler) {
    ruler.setMainSeries(mainSeries);
  }
  
  // Update trendline manager with the new series reference
  if (trendlineManager) {
    trendlineManager.setMainSeries(mainSeries);
  }
  
  // Update box manager with the new series reference
  if (boxManager) {
    boxManager.setMainSeries(mainSeries);
  }
  
  // Update text annotation manager with the new series reference
  if (textAnnotationManager) {
    textAnnotationManager.setMainSeries(mainSeries);
  }
  
  // Update freehand manager with the new series reference
  if (freehandManager) {
    freehandManager.setMainSeries(mainSeries);
  }
  
  // Update drawing persistence with new manager references
  if (drawingPersistence) {
    drawingPersistence.setManagers(trendlineManager!, boxManager!, textAnnotationManager!, freehandManager!);
  }
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
  
  // Add keyboard event listener for tool controls
  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (trendlineManager && isTrendlineActive.value) {
        trendlineManager.removeSelectedLine();
      }
      if (boxManager && isBoxActive.value) {
        boxManager.removeSelectedBox();
      }
      if (textAnnotationManager && isTextActive.value) {
        textAnnotationManager.removeSelectedAnnotation();
      }
      if (freehandManager && isFreehandActive.value) {
        freehandManager.removeSelectedPath();
      }
    }
    if (event.key === 'Escape') {
      if (trendlineManager && isTrendlineActive.value) {
        trendlineManager.deactivate();
        isTrendlineActive.value = false;
      }
      if (boxManager && isBoxActive.value) {
        boxManager.deactivate();
        isBoxActive.value = false;
      }
      if (textAnnotationManager && isTextActive.value) {
        textAnnotationManager.deactivate();
        isTextActive.value = false;
      }
      if (freehandManager && isFreehandActive.value) {
        freehandManager.deactivate();
        isFreehandActive.value = false;
      }
      if (ruler && isRulerActive.value) {
        ruler.deactivate();
        isRulerActive.value = false;
      }
    }
  };
  window.addEventListener('keydown', handleKeyPress);
  
  // Add crosshair subscription once
  chart.subscribeCrosshairMove((param: MouseEventParams<Time>) => {
    if (!param || !param.time) {
      crosshairOhlc.value = null;
      return;
    }
    const idx = displayData.value.findIndex((d: OHLCData) => d.time === param.time);
    if (idx !== -1) {
      crosshairOhlc.value = { ...displayData.value[idx], index: idx };
    } else {
      crosshairOhlc.value = null;
    }
  });
  
  // No initial fetch here; handled by watcher below

  watch(chartType, () => {
    updateMainSeries();
  });

  watch(data, (newData: OHLCData[]) => {
    if (!mainSeries) return;
    
    // For line, area, and baseline charts, transform OHLC to value-based data
    if (chartType.value === 'line' || chartType.value === 'area' || chartType.value === 'baseline') {
      const transformedData = newData.map((d: OHLCData) => ({
        time: d.time,
        value: d.close
      }));
      mainSeries.setData(transformedData);
      displayData.value = newData; // Store original data for legend
    } else if (chartType.value === 'heikinashi') {
      // For Heikin-Ashi, transform OHLC data
      const heikinAshiData = calculateHeikinAshi(newData);
      mainSeries.setData(heikinAshiData);
      displayData.value = heikinAshiData; // Store Heikin-Ashi data for legend
    } else {
      // For candlestick and bar, use OHLC data as-is
      mainSeries.setData(newData);
      displayData.value = newData; // Store original data for legend
    }
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
        title: '✧ IV',
        // Removed invalid labelVisible option
      });
    }
  }

  watch(IntrinsicValue, updateIntrinsicPriceLine);
  watch(chartType, updateIntrinsicPriceLine);
  updateIntrinsicPriceLine();
  
  // Initialize main series with current chart type
  updateMainSeries();
  
  // Initialize ruler with the main series
  ruler = new ChartRuler(chart, mainSeries);
  
  // Initialize trendline manager with the main series
  trendlineManager = new TrendLineManager(chart, mainSeries);
  
  // Initialize box manager with the main series
  boxManager = new BoxManager(chart, mainSeries);
  
  // Initialize text annotation manager with the main series
  textAnnotationManager = new TextAnnotationManager(chart, mainSeries);
  
  // Initialize freehand manager with the main series
  freehandManager = new FreehandManager(chart, mainSeries);
  
  // Initialize screenshot manager
  screenshotManager = new ChartScreenshot(chart, 'wk-chart');
  
  // Initialize drawing persistence
  drawingPersistence = new DrawingPersistence(
    props.user,
    props.apiKey,
    trendlineManager,
    boxManager,
    textAnnotationManager,
    freehandManager
  );
  
  // Set up onChange callbacks to trigger auto-save
  trendlineManager.onChange(() => drawingPersistence?.autoSave());
  boxManager.onChange(() => drawingPersistence?.autoSave());
  textAnnotationManager.onChange(() => drawingPersistence?.autoSave());
  freehandManager.onChange(() => drawingPersistence?.autoSave());
  
  // ensure initial sizing is correct
  updateChartSize();
  isLoading1.value = false;

  chart.timeScale().subscribeVisibleLogicalRangeChange(async (range: LogicalRange | null) => {
    if (isLoadingMore || allDataLoaded) return;
    // Enable lazy loading for all timeframes
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
        // Convert Unix timestamp back to ISO string for intraday before parameter
        let beforeParam = oldest;
        if (isIntraday(timeframe) && typeof oldest === 'number') {
          beforeParam = new Date(oldest * 1000).toISOString();
        }
        const url = `/api/${symbol}/chartdata?timeframe=${timeframe}&user=${props.user}&before=${beforeParam}`;
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
        
        // Transform new data using same logic as initial load
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
        
        let newOhlc = transform(result.ohlc) as OHLCData[];
        const existingTimes = new Set(data.value.map((d: OHLCData) => d.time));
        newOhlc = newOhlc.filter((d: OHLCData) => !existingTimes.has(d.time));
        data.value = [...newOhlc, ...data.value];
        
        let newVolume = transform(result.volume) as VolumeData[];
        const existingVolTimes = new Set(data2.value.map((d: VolumeData) => d.time));
        newVolume = newVolume.filter((d: VolumeData) => !existingVolTimes.has(d.time));
        data2.value = [...newVolume, ...data2.value];
        
        if (result.MA1) {
          let newMA1 = transform(result.MA1) as MAData[];
          const existingMA1Times = new Set(data3.value.map((d: MAData) => d.time));
          newMA1 = newMA1.filter((d: MAData) => !existingMA1Times.has(d.time));
          data3.value = [...newMA1, ...data3.value];
        }
        if (result.MA2) {
          let newMA2 = transform(result.MA2) as MAData[];
          const existingMA2Times = new Set(data4.value.map((d: MAData) => d.time));
          newMA2 = newMA2.filter((d: MAData) => !existingMA2Times.has(d.time));
          data4.value = [...newMA2, ...data4.value];
        }
        if (result.MA3) {
          let newMA3 = transform(result.MA3) as MAData[];
          const existingMA3Times = new Set(data5.value.map((d: MAData) => d.time));
          newMA3 = newMA3.filter((d: MAData) => !existingMA3Times.has(d.time));
          data5.value = [...newMA3, ...data5.value];
        }
        if (result.MA4) {
          let newMA4 = transform(result.MA4) as MAData[];
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
  
  // Set up periodic auto-save (every 30 seconds)
  const autoSaveInterval = setInterval(() => {
    if (drawingPersistence) {
      const hasDrawings = drawingPersistence.hasDrawings();
      hasAnyDrawings.value = hasDrawings;
      if (hasDrawings) {
        drawingPersistence.autoSave();
      }
    }
  }, 30000); // 30 seconds
  
  // Store interval ID for cleanup
  (window as any).__chartAutoSaveInterval = autoSaveInterval;
  
  // Load initial drawings after first symbol is set
  nextTick(async () => {
    const initialSymbol = props.selectedSymbol || props.defaultSymbol;
    if (initialSymbol && drawingPersistence) {
      drawingPersistence.setSymbol(initialSymbol);
      await drawingPersistence.loadDrawings();
    }
  });
});
// cleanup listeners and observers
onUnmounted(() => {
  // Clear auto-save interval
  if ((window as any).__chartAutoSaveInterval) {
    clearInterval((window as any).__chartAutoSaveInterval);
    delete (window as any).__chartAutoSaveInterval;
  }
  
  // Clear status interval
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
  
  // Save drawings one last time before unmounting
  if (drawingPersistence) {
    drawingPersistence.autoSave();
    drawingPersistence.destroy();
  }
  
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
  // Destroy ruler
  if (ruler) {
    ruler.destroy();
    ruler = null;
  }
  // Destroy trendline manager
  if (trendlineManager) {
    trendlineManager.destroy();
    trendlineManager = null;
  }
  // Destroy box manager
  if (boxManager) {
    boxManager.destroy();
    boxManager = null;
  }
  // Destroy text annotation manager
  if (textAnnotationManager) {
    textAnnotationManager.destroy();
    textAnnotationManager = null;
  }
  // Destroy freehand manager
  if (freehandManager) {
    freehandManager.destroy();
    freehandManager = null;
  }
  // close websocket if open
  closeChartWS();
});

// Watch for prop changes to selectedSymbol and update chart
watch(() => props.selectedSymbol, async (newSymbol, oldSymbol) => {
  if (newSymbol && newSymbol !== oldSymbol) {
    // Save drawings for old symbol before switching
    if (oldSymbol && drawingPersistence) {
      await drawingPersistence.autoSave();
    }
    
    // Reset ruler measurement when changing symbols (keep it active if it was)
    if (ruler) {
      ruler.resetMeasurement();
    }
    
    // Fetch chart data first
    await fetchChartData(newSymbol, selectedDataType.value);
    
    // Then load drawings for new symbol
    if (drawingPersistence) {
      drawingPersistence.setSymbol(newSymbol);
      await drawingPersistence.loadDrawings();
    }
  }
});

watch(() => props.defaultSymbol, async (newSymbol, oldSymbol) => {
  if (newSymbol && newSymbol !== oldSymbol) {
    // Save drawings for old symbol before switching
    if (oldSymbol && drawingPersistence) {
      await drawingPersistence.autoSave();
    }
    
    // Reset ruler measurement when changing symbols
    if (ruler) {
      ruler.resetMeasurement();
    }
    
    // Fetch chart data first
    await fetchChartData(newSymbol, selectedDataType.value);
    
    // Then load drawings for new symbol
    if (drawingPersistence) {
      drawingPersistence.setSymbol(newSymbol);
      await drawingPersistence.loadDrawings();
    }
  }
});

const selectedDataType = ref('daily');

const chartTypes = [
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
  // Only show OHLC data for candlestick, bar, and heikinashi charts
  if (chartType.value !== 'candlestick' && chartType.value !== 'bar' && chartType.value !== 'heikinashi') return null;
  
  let idx = -1;
  if (!displayData.value || displayData.value.length < 2) return null;
  if (crosshairOhlc.value && typeof crosshairOhlc.value.index === 'number') {
    idx = crosshairOhlc.value.index;
  } else {
    idx = displayData.value.length - 1;
  }
  if (idx < 0 || idx >= displayData.value.length) return null;
  const curr = displayData.value[idx];
  const prev = idx > 0 ? displayData.value[idx - 1] : null;
  if (!curr || !prev) return null;
  const open = curr.open?.toFixed(2) ?? '-';
  const high = curr.high?.toFixed(2) ?? '-';
  const low = curr.low?.toFixed(2) ?? '-';
  const close = curr.close?.toFixed(2) ?? '-';
  const changeRaw = (curr.close - prev.close).toFixed(2);
  const changePct = prev.close !== 0 ? ((curr.close - prev.close) / prev.close * 100).toFixed(2) : '0.00';
  return { open, high, low, close, changeRaw, changePct };
});

// Simple price display for line/area/baseline charts
interface SimplePriceDisplay {
  price: string;
  changeRaw: string;
  changePct: string;
}
const simplePriceDisplay = computed<SimplePriceDisplay | null>(() => {
  // Only show for line, area, and baseline charts
  if (chartType.value !== 'line' && chartType.value !== 'area' && chartType.value !== 'baseline') return null;
  
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
  const price = curr.close?.toFixed(2) ?? '-';
  const changeRaw = (curr.close - prev.close).toFixed(2);
  const changePct = prev.close !== 0 ? ((curr.close - prev.close) / prev.close * 100).toFixed(2) : '0.00';
  return { price, changeRaw, changePct };
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
  if (payload.chartType) {
    chartType.value = payload.chartType;
  } else {
    chartType.value = 'candlestick';
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
}

.navbt2.ruler-active {
  background: color-mix(in srgb, var(--text2) 15%, transparent);
  color: var(--text1);
}

.navbt2.ruler-active:hover {
  background: color-mix(in srgb, var(--text2) 25%, transparent);
  color: var(--text1);
}

.navbt2.trendline-active {
  background: color-mix(in srgb, var(--text2) 15%, transparent);
  color: var(--text1);
}

.navbt2.trendline-active:hover {
  background: color-mix(in srgb, var(--text2) 25%, transparent);
  color: var(--text1);
}

.navbt2.box-active {
  background: color-mix(in srgb, var(--text2) 15%, transparent);
  color: var(--text1);
}

.navbt2.box-active:hover {
  background: color-mix(in srgb, var(--text2) 25%, transparent);
  color: var(--text1);
}

.navbt2.text-active {
  background: color-mix(in srgb, var(--text2) 15%, transparent);
  color: var(--text1);
}

.navbt2.text-active:hover {
  background: color-mix(in srgb, var(--text2) 25%, transparent);
  color: var(--text1);
}

.navbt2.freehand-active {
  background: color-mix(in srgb, var(--text2) 15%, transparent);
  color: var(--text1);
}

.navbt2.freehand-active:hover {
  background: color-mix(in srgb, var(--text2) 25%, transparent);
  color: var(--text1);
}

/* Chart Tools Toolbar */
.chart-tools-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 5px;
  background: var(--base2);
  border-top: 1px solid var(--base3);
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-label {
  font-size: 11px;
  color: var(--text2);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-right: 12px;
  border-right: 1px solid var(--base3);
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--base3);
}

.toolbar-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.tool-btn {
  background-color: transparent;
  color: var(--text2);
  border: none;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.tool-btn:hover {
  background: color-mix(in srgb, var(--text2) 10%, transparent);
  color: var(--text1);
}

.tool-btn.active {
  background: color-mix(in srgb, var(--text2) 20%, transparent);
  color: var(--text1);
}

.tool-icon {
  width: 18px;
  height: 18px;
  display: block;
}

</style>