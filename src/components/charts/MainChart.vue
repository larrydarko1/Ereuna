<template>
  <EditChart 
    v-if="showEditChart" 
    @close="showEditChart = false" 
    @settings-saved="onSettingsSaved"
    :apiKey="props.apiKey"
    :user="props.user"
    :indicatorList="indicatorList"
    :intrinsicVisible="intrinsicVisible"
    :markersVisible="markersVisible"
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
  <PatternsPopup
    v-if="showPatternsPopup"
    @close="showPatternsPopup = false"
    :patterns="detectedPatterns"
    :Symbol="assetInfo?.Symbol || ''"
  />
  <div 
    v-if="showMarkerPopup && markerPopupData" 
    class="marker-popup" 
    :style="{ left: markerPopupPosition.x + 'px', top: markerPopupPosition.y + 'px' }"
  >
    <div class="marker-popup-header">
      <span class="marker-popup-title">{{ markerPopupData.title }}</span>
      <button class="marker-popup-close" @click="showMarkerPopup = false">×</button>
    </div>
    <div class="marker-popup-content">
      <div v-for="(value, key) in markerPopupData.data" :key="key" class="marker-popup-row">
        <span class="marker-popup-label">{{ key }}:</span>
        <span class="marker-popup-value">{{ value }}</span>
      </div>
    </div>
  </div>
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
    <p>{{ t('mainChart.hiddenList') }}</p>
  </div>
  <div v-if="assetInfo?.Delisted === true" class="badge-message">
    <p>{{ t('mainChart.delisted') }}</p>
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
  <!-- Earnings Countdown -->
  <div v-if="nextEarnings && nextEarnings.reportDate" class="earnings-countdown-badge">
    <span class="earnings-label">Earnings in:</span>
    <span class="earnings-timer" :class="earningsUrgencyClass">{{ earningsCountdown }}</span>
  </div>
  <div v-if="isEODOnly" class="eod-only-badge">
    <span class="eod-text">{{ t('mainChart.eodOnly') }}</span>
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
                                      <button 
                                        class="tool-btn" 
                                        :class="{ 'active': isPriceLevelActive }" 
                                        @click="togglePriceLevel" 
                                        title="Price Level"
                                      >
                                        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                          <line x1="3" y1="12" x2="21" y2="12" />
                                          <circle cx="3" cy="12" r="2" fill="currentColor" />
                                          <circle cx="21" cy="12" r="2" fill="currentColor" />
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
                                        <button 
                                        class="tool-btn" 
                                        :class="{ 'active': isPatternRecognitionActive }" 
                                        @click="detectAndShowPatterns" 
                                        title="Pattern Recognition"
                                      >
                                        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
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
                                    
                                    <!-- Replay Section -->
                                    <div class="toolbar-section">
                                      <span class="toolbar-label">Replay</span>
                                      <div class="toolbar-buttons">
                                        <button 
                                          v-if="!isReplayMode"
                                          class="tool-btn" 
                                          @click="openReplayPicker" 
                                          :title="t('mainChart.startReplay')"
                                          :disabled="isLoadingReplayData"
                                        >
                                          <svg class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="23 4 23 10 17 10"></polyline>
                                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                          </svg>
                                        </button>
                                        <button 
                                          v-if="isReplayMode"
                                          class="tool-btn active" 
                                          @click="exitReplay" 
                                          :title="t('mainChart.exitReplay')"
                                        >
                                          <svg class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <!-- Replay Date Picker Popup -->
                                <div v-if="showReplayDatePicker" class="replay-date-picker-overlay" @click="showReplayDatePicker = false">
                                  <div class="replay-date-picker-popup" @click.stop>
                                    <div class="replay-date-picker-header">
                                      <h3>{{ t('mainChart.selectReplayStartDate') }}</h3>
                                      <button class="replay-date-picker-close" @click="showReplayDatePicker = false">×</button>
                                    </div>
                                    <div class="replay-date-picker-content">
                                      <input 
                                        type="date" 
                                        v-model="replayStartDate"
                                        :min="minReplayDate"
                                        :max="maxReplayDate"
                                        class="replay-date-input"
                                      />
                                      <div class="replay-date-presets">
                                        <button @click="setReplayPreset(7)" class="replay-preset-btn">1 Week Ago</button>
                                        <button @click="setReplayPreset(30)" class="replay-preset-btn">1 Month Ago</button>
                                        <button @click="setReplayPreset(90)" class="replay-preset-btn">3 Months Ago</button>
                                        <button @click="setReplayPreset(180)" class="replay-preset-btn">6 Months Ago</button>
                                        <button @click="setReplayPreset(365)" class="replay-preset-btn">1 Year Ago</button>
                                      </div>
                                      <button @click="startReplayFromDate" class="replay-start-confirm-btn">Start Replay</button>
                                    </div>
                                  </div>
                                </div>
                                
                                <!-- Compact Replay Controls -->
                                <div v-if="isReplayMode" class="replay-controls-compact">
                                  <div class="replay-controls-left">
                                    <button class="replay-btn-compact" @click="replayStepBackward" :title="t('mainChart.stepBackward')">
                                      <svg class="replay-icon-compact" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polygon points="19 20 9 12 19 4 19 20"></polygon>
                                        <line x1="5" y1="19" x2="5" y2="5"></line>
                                      </svg>
                                    </button>
                                    
                                    <button class="replay-btn-compact replay-play-btn-compact" @click="toggleReplayPlayPause" :title="isReplayPlaying ? t('mainChart.pause') : t('mainChart.play')">
                                      <svg v-if="!isReplayPlaying" class="replay-icon-compact" viewBox="0 0 24 24" fill="currentColor">
                                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                      </svg>
                                      <svg v-else class="replay-icon-compact" viewBox="0 0 24 24" fill="currentColor">
                                        <rect x="6" y="4" width="4" height="16"></rect>
                                        <rect x="14" y="4" width="4" height="16"></rect>
                                      </svg>
                                    </button>
                                    
                                    <button class="replay-btn-compact" @click="replayStepForward" :title="t('mainChart.stepForward')">
                                      <svg class="replay-icon-compact" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polygon points="5 4 15 12 5 20 5 4"></polygon>
                                        <line x1="19" y1="5" x2="19" y2="19"></line>
                                      </svg>
                                    </button>
                                    
                                    <select class="replay-speed-compact" v-model="replaySpeed" @change="handleReplaySpeedChange" :title="t('mainChart.speed')">
                                      <option :value="0.5">0.5x</option>
                                      <option :value="1">1x</option>
                                      <option :value="2">2x</option>
                                      <option :value="5">5x</option>
                                      <option :value="10">10x</option>
                                    </select>
                                  </div>
                                  
                                  <div class="replay-progress-wrapper">
                                    <input 
                                      type="range" 
                                      class="replay-progress-compact"
                                      :min="0" 
                                      :max="100" 
                                      step="0.1"
                                      :value="replayProgress"
                                      @input="handleReplayProgressChange"
                                    />
                                  </div>
                                  
                                  <span class="replay-date-compact">{{ replayDate }}</span>
                                </div>
  </div>
</template>

<script setup lang="ts">
import Loader from '@/components/loader.vue';
import { onMounted, ref, watch, computed, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  Time,
  IPriceLine,
  MouseEventParams,
  LogicalRange,
  SeriesMarker
} from '@/lib/lightweight-charts';
import { ChartRuler } from '@/lib/lightweight-charts/ruler';
import { TrendLineManager } from '@/lib/lightweight-charts/trendline';
import { BoxManager } from '@/lib/lightweight-charts/box';
import { TextAnnotationManager } from '@/lib/lightweight-charts/text-annotation';
import { FreehandManager } from '@/lib/lightweight-charts/freehand';
import { PriceLevelManager } from '@/lib/lightweight-charts/price-level';
import { ChartScreenshot, type ChartInfo } from '@/lib/lightweight-charts/screenshot';
import { DrawingPersistence } from '@/lib/lightweight-charts/drawing-persistence';
import { ReplayManager } from '@/lib/lightweight-charts/replay-manager';
import { detectAllPatterns, type PatternMatch } from '@/lib/lightweight-charts/pattern-detection';
import { PatternOverlayManager } from '@/lib/lightweight-charts/pattern-overlay';
import EditChart from '@/components/charts/EditChart.vue';
import AIPopup from '@/components/charts/AIPopup.vue';
import SignalsPopup from '@/components/charts/SignalsPopup.vue';
import ScreenshotPopup from '@/components/charts/ScreenshotPopup.vue';
import PatternsPopup from '@/components/charts/PatternsPopup.vue';

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

interface EarningsData {
  fiscalDateEnding: string;
  netIncome: number;
}

interface DividendData {
  payment_date: string;
  amount: string | number;
  ex_dividend_date?: string;
}

interface SplitData {
  effective_date: string;
  split_factor: string;
  split_ratio?: string;
}


const showEditChart = ref(false);
const showAIPopup = ref(false);
const showSignalsPopup = ref(false);
const showScreenshotPopup = ref(false);
const showPatternsPopup = ref(false);
const screenshotChartInfo = ref<ChartInfo>({} as ChartInfo);
const showMarkerPopup = ref(false);
const markerPopupData = ref<{ title: string; data: Record<string, any> } | null>(null);
const markerPopupPosition = ref({ x: 0, y: 0 });
const imgError = ref(false);
let isLoadingMore: boolean = false;
let allDataLoaded: boolean = false;
const hasAnyDrawings = ref(false);

// Replay feature state
const replayManager = ref<ReplayManager | null>(null);
const isReplayMode = ref(false);
const isReplayPlaying = ref(false);
const replayProgress = ref(0);
const replayDate = ref<string>('');
const replaySpeed = ref(1);
const isLoadingReplayData = ref(false);
const replayDataLoaded = ref(false);
const fullHistoricalData = ref<OHLCData[]>([]);
const fullVolumeData = ref<VolumeData[]>([]);
const fullMA1Data = ref<MAData[]>([]);
const fullMA2Data = ref<MAData[]>([]);
const fullMA3Data = ref<MAData[]>([]);
const fullMA4Data = ref<MAData[]>([]);
const showReplayDatePicker = ref(false);
const replayStartDate = ref<string>('');

// Backup of normal data when entering replay mode
const normalData = ref<OHLCData[]>([]);
const normalVolumeData = ref<VolumeData[]>([]);
const normalMA1Data = ref<MAData[]>([]);
const normalMA2Data = ref<MAData[]>([]);
const normalMA3Data = ref<MAData[]>([]);
const normalMA4Data = ref<MAData[]>([]);

// Computed properties for min/max replay dates
const minReplayDate = computed(() => {
  if (fullHistoricalData.value.length === 0) return '';
  const firstBar = fullHistoricalData.value[0];
  const timestamp = typeof firstBar.time === 'number' ? firstBar.time : 
                    typeof firstBar.time === 'string' ? Math.floor(new Date(firstBar.time).getTime() / 1000) : 0;
  return new Date(timestamp * 1000).toISOString().split('T')[0];
});

const maxReplayDate = computed(() => {
  if (fullHistoricalData.value.length === 0) return '';
  const lastBar = fullHistoricalData.value[fullHistoricalData.value.length - 1];
  const timestamp = typeof lastBar.time === 'number' ? lastBar.time : 
                    typeof lastBar.time === 'string' ? Math.floor(new Date(lastBar.time).getTime() / 1000) : 0;
  return new Date(timestamp * 1000).toISOString().split('T')[0];
});

interface NextEarnings {
  reportDate: string;
  fiscalDateEnding: string;
  estimate: number;
  timeOfTheDay: string;
}

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

// Next Earnings computed properties
const nextEarnings = computed<NextEarnings | null>(() => {
  return props.assetInfo?.NextEarnings || null;
});

const earningsCountdown = ref<string>('');
const earningsUrgencyClass = ref<string>('');

function updateEarningsCountdown(): void {
  if (!nextEarnings.value?.reportDate) {
    earningsCountdown.value = '';
    return;
  }

  const now = new Date().getTime();
  const reportDate = new Date(nextEarnings.value.reportDate).getTime();
  const distance = reportDate - now;

  if (distance < 0) {
    earningsCountdown.value = 'Past Due';
    earningsUrgencyClass.value = 'urgency-past';
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  // Set urgency class based on time remaining
  if (days === 0 && hours < 24) {
    earningsUrgencyClass.value = 'urgency-high';
  } else if (days <= 7) {
    earningsUrgencyClass.value = 'urgency-medium';
  } else {
    earningsUrgencyClass.value = 'urgency-low';
  }

  // Format countdown string - only show days
  if (days > 0) {
    earningsCountdown.value = `${days} day${days === 1 ? '' : 's'}`;
  } else if (hours > 0) {
    earningsCountdown.value = 'Today';
  } else {
    earningsCountdown.value = 'Today';
  }
}

function formatEarningsDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Update countdown every second
let earningsInterval: number | null = null;

function startEarningsCountdown(): void {
  if (earningsInterval) {
    clearInterval(earningsInterval);
  }
  updateEarningsCountdown();
  earningsInterval = window.setInterval(updateEarningsCountdown, 1000);
}

const isChartLoading1 = ref<boolean>(false);
const isLoading1 = ref<boolean>(false);
const data = ref<OHLCData[]>([]);
const data2 = ref<VolumeData[]>([]);
const data3 = ref<MAData[]>([]);
const data4 = ref<MAData[]>([]);
const data5 = ref<MAData[]>([]);
const data6 = ref<MAData[]>([]);

// Computed property for data displayed on chart (respects replay mode)
const visibleOHLCData = computed<OHLCData[]>(() => {
  if (!isReplayMode.value || !replayManager.value) {
    return data.value;
  }
  const state = replayManager.value.getState();
  return fullHistoricalData.value.slice(0, state.currentIndex + 1);
});

const visibleVolumeData = computed<VolumeData[]>(() => {
  if (!isReplayMode.value || !replayManager.value) {
    return data2.value;
  }
  const state = replayManager.value.getState();
  return fullVolumeData.value.slice(0, state.currentIndex + 1);
});

const visibleMA1Data = computed<MAData[]>(() => {
  if (!isReplayMode.value || !replayManager.value) {
    return data3.value;
  }
  const state = replayManager.value.getState();
  const visibleData = fullHistoricalData.value.slice(0, state.currentIndex + 1);
  
  // Get the time of the last visible bar
  if (visibleData.length === 0) return [];
  const lastVisibleTime = visibleData[visibleData.length - 1].time;
  
  // Filter MA data to only include points up to the last visible time
  return fullMA1Data.value.filter(ma => {
    // Handle different time formats
    const maTime = typeof ma.time === 'number' ? ma.time :
                   typeof ma.time === 'string' ? ma.time : 
                   (ma.time as any).timestamp || ma.time;
    const visTime = typeof lastVisibleTime === 'number' ? lastVisibleTime :
                    typeof lastVisibleTime === 'string' ? lastVisibleTime :
                    (lastVisibleTime as any).timestamp || lastVisibleTime;
    return maTime <= visTime;
  });
});

const visibleMA2Data = computed<MAData[]>(() => {
  if (!isReplayMode.value || !replayManager.value) {
    return data4.value;
  }
  const state = replayManager.value.getState();
  const visibleData = fullHistoricalData.value.slice(0, state.currentIndex + 1);
  
  if (visibleData.length === 0) return [];
  const lastVisibleTime = visibleData[visibleData.length - 1].time;
  
  return fullMA2Data.value.filter(ma => {
    const maTime = typeof ma.time === 'number' ? ma.time :
                   typeof ma.time === 'string' ? ma.time : 
                   (ma.time as any).timestamp || ma.time;
    const visTime = typeof lastVisibleTime === 'number' ? lastVisibleTime :
                    typeof lastVisibleTime === 'string' ? lastVisibleTime :
                    (lastVisibleTime as any).timestamp || lastVisibleTime;
    return maTime <= visTime;
  });
});

const visibleMA3Data = computed<MAData[]>(() => {
  if (!isReplayMode.value || !replayManager.value) {
    return data5.value;
  }
  const state = replayManager.value.getState();
  const visibleData = fullHistoricalData.value.slice(0, state.currentIndex + 1);
  
  if (visibleData.length === 0) return [];
  const lastVisibleTime = visibleData[visibleData.length - 1].time;
  
  return fullMA3Data.value.filter(ma => {
    const maTime = typeof ma.time === 'number' ? ma.time :
                   typeof ma.time === 'string' ? ma.time : 
                   (ma.time as any).timestamp || ma.time;
    const visTime = typeof lastVisibleTime === 'number' ? lastVisibleTime :
                    typeof lastVisibleTime === 'string' ? lastVisibleTime :
                    (lastVisibleTime as any).timestamp || lastVisibleTime;
    return maTime <= visTime;
  });
});

const visibleMA4Data = computed<MAData[]>(() => {
  if (!isReplayMode.value || !replayManager.value) {
    return data6.value;
  }
  const state = replayManager.value.getState();
  const visibleData = fullHistoricalData.value.slice(0, state.currentIndex + 1);
  
  if (visibleData.length === 0) return [];
  const lastVisibleTime = visibleData[visibleData.length - 1].time;
  
  return fullMA4Data.value.filter(ma => {
    const maTime = typeof ma.time === 'number' ? ma.time :
                   typeof ma.time === 'string' ? ma.time : 
                   (ma.time as any).timestamp || ma.time;
    const visTime = typeof lastVisibleTime === 'number' ? lastVisibleTime :
                    typeof lastVisibleTime === 'string' ? lastVisibleTime :
                    (lastVisibleTime as any).timestamp || lastVisibleTime;
    return maTime <= visTime;
  });
});

const IntrinsicValue = ref<number | null>(null);
const displayData = ref<OHLCData[]>([]);

// Earnings, Dividends, and Splits data for chart markers
const dividendsData = ref<DividendData[]>([]);
const splitsData = ref<SplitData[]>([]);

// Fetch dividends data from API
async function fetchDividendsData(symbol: string): Promise<void> {
  try {
    const response = await fetch(`/api/${symbol}/dividendsdate?all=true`, {
      headers: {
        'X-API-KEY': props.apiKey,
      },
    });
    
    if (!response.ok) {
      dividendsData.value = [];
      return;
    }
    
    const dividends = await response.json();
    dividendsData.value = Array.isArray(dividends) ? dividends : [];
  } catch (error) {
    dividendsData.value = [];
  }
}

// Fetch splits data from API
async function fetchSplitsData(symbol: string): Promise<void> {
  try {
    const response = await fetch(`/api/${symbol}/splitsdate?all=true`, {
      headers: {
        'X-API-KEY': props.apiKey,
      },
    });
    
    if (!response.ok) {
      splitsData.value = [];
      return;
    }
    
    const splits = await response.json();
    splitsData.value = Array.isArray(splits) ? splits : [];
  } catch (error) {
    splitsData.value = [];
  }
}

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

function togglePriceLevel(): void {
  if (priceLevelManager) {
    if (isPriceLevelActive.value) {
      priceLevelManager.deactivate();
      isPriceLevelActive.value = false;
    } else {
      // Deactivate other drawing tools
      if (ruler && isRulerActive.value) {
        ruler.deactivate();
        isRulerActive.value = false;
      }
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
      priceLevelManager.activate();
      isPriceLevelActive.value = true;
    }
  }
}

function togglePatternRecognition(): void {
  if (!chart || !mainSeries) return;
  
  if (isPatternRecognitionActive.value) {
    // Deactivate: clear patterns
    if (patternOverlayManager) {
      patternOverlayManager.clearPatterns();
    }
    isPatternRecognitionActive.value = false;
    detectedPatterns.value = [];
  } else {
    // Activate: detect and display patterns
    isPatternRecognitionActive.value = true;
    
    // Get current chart data (use visible data in replay mode)
    const chartData = isReplayMode.value ? visibleOHLCData.value : data.value;
    
    if (chartData.length < 20) {
      isPatternRecognitionActive.value = false;
      return;
    }
    
    // Convert chart data to detection format
    const detectionData = chartData.map(bar => ({
      time: typeof bar.time === 'string' 
        ? new Date(bar.time).getTime() / 1000 
        : typeof bar.time === 'object' && 'year' in bar.time
          ? new Date(bar.time.year, bar.time.month - 1, bar.time.day).getTime() / 1000
          : bar.time as number,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close
    }));
    
    // Detect patterns
    const patterns = detectAllPatterns(detectionData, {
      minBarsForPivot: 5,
      tolerance: 0.025,
      enabledPatterns: [
        'doubleTop',
        'doubleBottom',
        'headAndShoulders',
        'inverseHeadAndShoulders',
        'ascendingTriangle',
        'descendingTriangle',
        'symmetricTriangle',
        'bullishFlag',
        'bearishFlag'
      ]
    });
    
    detectedPatterns.value = patterns;
    
    // Display patterns on chart
    if (!patternOverlayManager) {
      patternOverlayManager = new PatternOverlayManager(chart, mainSeries);
    }
    
    patternOverlayManager.displayPatterns(patterns);
    patternOverlayManager.finalize();
    
    // Show popup if patterns were found
    if (patterns.length > 0) {
      showPatternsPopup.value = true;
    }
  }
}

function detectAndShowPatterns(): void {
  if (!chart || !mainSeries) return;
  
  // Get current chart data (use visible data in replay mode)
  const chartData = isReplayMode.value ? visibleOHLCData.value : data.value;
  
  if (chartData.length < 20) {
    return;
  }
  
  // Convert chart data to detection format
  const detectionData = chartData.map(bar => ({
    time: typeof bar.time === 'string' 
      ? new Date(bar.time).getTime() / 1000 
      : typeof bar.time === 'object' && 'year' in bar.time
        ? new Date(bar.time.year, bar.time.month - 1, bar.time.day).getTime() / 1000
        : bar.time as number,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close
  }));
  
  // Detect patterns
  const patterns = detectAllPatterns(detectionData, {
    minBarsForPivot: 5,
    tolerance: 0.025,
    enabledPatterns: [
      'doubleTop',
      'doubleBottom',
      'headAndShoulders',
      'inverseHeadAndShoulders',
      'ascendingTriangle',
      'descendingTriangle',
      'symmetricTriangle',
      'bullishFlag',
      'bearishFlag'
    ]
  });
  
  detectedPatterns.value = patterns;
  
  // Toggle visual overlays on chart
  if (isPatternRecognitionActive.value) {
    // Turn off overlays
    if (patternOverlayManager) {
      patternOverlayManager.clearPatterns();
    }
    isPatternRecognitionActive.value = false;
  } else {
    // Turn on overlays
    isPatternRecognitionActive.value = true;
    
    if (!patternOverlayManager) {
      patternOverlayManager = new PatternOverlayManager(chart, mainSeries);
    }
    
    patternOverlayManager.displayPatterns(patterns);
    patternOverlayManager.finalize();
  }
  
  // Always show popup
  showPatternsPopup.value = true;
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
  
  if (confirm(t('mainChart.clearDrawingsConfirm'))) {
    await drawingPersistence.clearDrawings();
    
    // Also clear pattern recognition if active
    if (isPatternRecognitionActive.value && patternOverlayManager) {
      patternOverlayManager.clearPatterns();
      isPatternRecognitionActive.value = false;
      detectedPatterns.value = [];
    }
    
    hasAnyDrawings.value = false;
  }
}

// Replay control functions
function startReplay(): void {
  if (fullHistoricalData.value.length === 0) return;
  
  // Close websocket when starting replay
  closeChartWS();
  
  // Initialize replay manager if needed
  if (!replayManager.value) {
    replayManager.value = new ReplayManager(fullHistoricalData.value);
  }
  
  // Subscribe to replay updates
  replayManager.value.onChange((index: number, dateString: string) => {
    replayProgress.value = replayManager.value?.getProgress() || 0;
    replayDate.value = dateString;
    isReplayPlaying.value = replayManager.value?.getState().isPlaying || false;
  });
  
  // Start replay from 50% back in history by default
  const startIndex = Math.floor(fullHistoricalData.value.length * 0.5);
  replayManager.value.startReplay(startIndex);
  isReplayMode.value = true;
  replayProgress.value = replayManager.value.getProgress();
  replayDate.value = replayManager.value.getCurrentDateString();
}

// Fetch ALL historical data for replay mode
async function fetchReplayData(): Promise<void> {
  const symbol = props.selectedSymbol || props.defaultSymbol;
  if (!symbol) return;
  
  const timeframe = selectedDataType.value || 'daily';
  const user = encodeURIComponent(props.user);
  const url = `/api/${symbol}/chartdata?timeframe=${timeframe}&user=${user}&replay=true`;
  
  isLoadingReplayData.value = true;
  
  try {
    const response = await fetch(url, { headers: { 'X-API-KEY': props.apiKey } });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const result = await response.json();
    
    const transform = isIntraday(timeframe)
      ? (arr: any[]) => (arr || [])
          .map((item: any) => ({ ...item, time: Math.floor(new Date(item.time).getTime() / 1000) }))
          .sort((a: any, b: any) => a.time - b.time)
          .filter((item: any, idx: number, arr: any[]) => idx === 0 || item.time !== arr[idx - 1].time)
      : (arr: any[]) => (arr || [])
          .sort((a: any, b: any) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0))
          .filter((item: any, idx: number, arr: any[]) => idx === 0 || item.time !== arr[idx - 1].time);
    
    fullHistoricalData.value = transform(result.ohlc) as OHLCData[];
    fullVolumeData.value = transform(result.volume) as VolumeData[];
    fullMA1Data.value = transform(result.MA1) as MAData[];
    fullMA2Data.value = transform(result.MA2) as MAData[];
    fullMA3Data.value = transform(result.MA3) as MAData[];
    fullMA4Data.value = transform(result.MA4) as MAData[];
    
    replayDataLoaded.value = true;
    
    if (fullHistoricalData.value.length > 0) {
      const first = fullHistoricalData.value[0].time;
      const last = fullHistoricalData.value[fullHistoricalData.value.length - 1].time;
      const firstDate = typeof first === 'number' ? new Date(first * 1000) : new Date(first as string);
      const lastDate = typeof last === 'number' ? new Date(last * 1000) : new Date(last as string);
    }
  } catch (error) {
    replayDataLoaded.value = false;
  } finally {
    isLoadingReplayData.value = false;
  }
}

// Open replay picker
async function openReplayPicker(): Promise<void> {
  await fetchReplayData();
  if (replayDataLoaded.value && fullHistoricalData.value.length > 0) {
    showReplayDatePicker.value = true;
  }
}

function startReplayFromDate(): void {
  if (fullHistoricalData.value.length === 0 || !replayStartDate.value) return;
  
  // Close websocket
  closeChartWS();
  
  // Backup current data
  normalData.value = [...data.value];
  normalVolumeData.value = [...data2.value];
  normalMA1Data.value = [...data3.value];
  normalMA2Data.value = [...data4.value];
  normalMA3Data.value = [...data5.value];
  normalMA4Data.value = [...data6.value];
  
  // Hide drawings
  const chartContainer = document.querySelector('#wk-chart');
  if (chartContainer) {
    const canvases = chartContainer.querySelectorAll('canvas');
    canvases.forEach((canvas: Element) => {
      const c = canvas as HTMLCanvasElement;
      if (c.style.position === 'absolute' && c.style.zIndex && parseInt(c.style.zIndex) > 1) {
        c.style.display = 'none';
      }
    });
  }
  
  // Initialize replay manager
  if (!replayManager.value) {
    replayManager.value = new ReplayManager(fullHistoricalData.value);
  } else {
    replayManager.value.setFullData(fullHistoricalData.value);
  }
  
  replayManager.value.onChange((index: number, dateString: string) => {
    replayProgress.value = replayManager.value?.getProgress() || 0;
    replayDate.value = dateString;
    isReplayPlaying.value = replayManager.value?.getState().isPlaying || false;
    
    // Swap dataset to replay data sliced at current index
    const currentIndex = replayManager.value?.getState().currentIndex || 0;
    data.value = fullHistoricalData.value.slice(0, currentIndex + 1);
    data2.value = fullVolumeData.value.slice(0, currentIndex + 1);
    data3.value = fullMA1Data.value.slice(0, currentIndex + 1);
    data4.value = fullMA2Data.value.slice(0, currentIndex + 1);
    data5.value = fullMA3Data.value.slice(0, currentIndex + 1);
    data6.value = fullMA4Data.value.slice(0, currentIndex + 1);
  });
  
  // Start from selected date
  const selectedDate = new Date(replayStartDate.value);
  replayManager.value.startReplayFromDate(selectedDate);
  
  // Initial data swap
  const currentIndex = replayManager.value.getState().currentIndex;
  data.value = fullHistoricalData.value.slice(0, currentIndex + 1);
  data2.value = fullVolumeData.value.slice(0, currentIndex + 1);
  data3.value = fullMA1Data.value.slice(0, currentIndex + 1);
  data4.value = fullMA2Data.value.slice(0, currentIndex + 1);
  data5.value = fullMA3Data.value.slice(0, currentIndex + 1);
  data6.value = fullMA4Data.value.slice(0, currentIndex + 1);
  
  isReplayMode.value = true;
  replayProgress.value = replayManager.value.getProgress();
  replayDate.value = replayManager.value.getCurrentDateString();
  showReplayDatePicker.value = false;
}

function setReplayPreset(daysAgo: number): void {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  replayStartDate.value = date.toISOString().split('T')[0];
}

function exitReplay(): void {
  if (replayManager.value) {
    replayManager.value.exitReplay();
  }
  
  // Restore backed up data
  if (normalData.value.length > 0) {
    data.value = [...normalData.value];
    data2.value = [...normalVolumeData.value];
    data3.value = [...normalMA1Data.value];
    data4.value = [...normalMA2Data.value];
    data5.value = [...normalMA3Data.value];
    data6.value = [...normalMA4Data.value];
  }
  
  // Show drawings
  const chartContainer = document.querySelector('#wk-chart');
  if (chartContainer) {
    const canvases = chartContainer.querySelectorAll('canvas');
    canvases.forEach((canvas: Element) => {
      const c = canvas as HTMLCanvasElement;
      if (c.style.position === 'absolute' && c.style.zIndex && parseInt(c.style.zIndex) > 1) {
        c.style.display = '';
      }
    });
  }
  
  isReplayMode.value = false;
  isReplayPlaying.value = false;
  replayProgress.value = 0;
  replayDate.value = '';
  
  // Reconnect websocket
  if (props.selectedSymbol || props.defaultSymbol) {
    fetchChartData();
  }
}

function toggleReplayPlayPause(): void {
  if (!replayManager.value) return;
  replayManager.value.togglePlayPause();
  isReplayPlaying.value = replayManager.value.getState().isPlaying;
}

function replayStepForward(): void {
  if (!replayManager.value) return;
  replayManager.value.stepForward();
}

function replayStepBackward(): void {
  if (!replayManager.value) return;
  replayManager.value.stepBackward();
}

function handleReplaySpeedChange(): void {
  if (!replayManager.value) return;
  replayManager.value.setSpeed(replaySpeed.value);
}

function handleReplayProgressChange(event: Event): void {
  if (!replayManager.value) return;
  const target = event.target as HTMLInputElement;
  const progress = parseFloat(target.value);
  replayManager.value.seekByProgress(progress);
}

// Generate chart markers from earnings, dividends, and splits data
function generateMarkers(): SeriesMarker<Time>[] {
  const markers: SeriesMarker<Time>[] = [];
  
  // Add earnings markers (E badge below bar, green/red based on performance)
  if (markersVisible.value.earnings && props.assetInfo?.quarterlyFinancials && Array.isArray(props.assetInfo.quarterlyFinancials)) {
    props.assetInfo.quarterlyFinancials.forEach((earning: any, index: number) => {
      try {
        const date = earning.fiscalDateEnding;
        if (!date) return;
        
        // Determine color based on QoQ performance
        const prevEarning = props.assetInfo?.quarterlyFinancials?.[index + 1];
        let color = theme.text2; // neutral
        if (prevEarning && earning.netIncome && prevEarning.netIncome) {
          const change = ((earning.netIncome - prevEarning.netIncome) / Math.abs(prevEarning.netIncome)) * 100;
          color = change > 0 ? theme.positive : theme.negative;
        }
        
        // Ensure date is in YYYY-MM-DD format (lightweight-charts Time format)
        const formattedDate = typeof date === 'string' ? date.split('T')[0] : date;
        
        markers.push({
          time: formattedDate as Time,
          position: 'aboveBar',
          color: color,
          shape: 'roundedSquare',
          text: 'E',
          textColor: theme.text3,
          size: 2.5,
          id: `earnings-${date}`,
          originalTime: formattedDate
        });
      } catch (err) {
        console.error('Error creating earnings marker:', err);
      }
    });
  }
  
  // Add dividends markers (D badge below bar, blue color)
  if (markersVisible.value.dividends && dividendsData.value && Array.isArray(dividendsData.value)) {
    dividendsData.value.forEach((dividend: DividendData) => {
      try {
        const date = dividend.payment_date;
        if (!date) return;
        
        // Ensure date is in YYYY-MM-DD format
        const formattedDate = typeof date === 'string' ? date.split('T')[0] : date;
        
        markers.push({
          time: formattedDate as Time,
          position: 'aboveBar',
          color: theme.accent3,
          shape: 'roundedSquare',
          text: 'D',
          textColor: theme.text3,
          size: 2.5,
          id: `dividend-${date}`,
          originalTime: formattedDate
        });
      } catch (err) {
        console.error('Error creating dividend marker:', err);
      }
    });
  }
  
  // Add splits markers (S badge above bar, orange color)
  if (markersVisible.value.splits && splitsData.value && Array.isArray(splitsData.value)) {
    splitsData.value.forEach((split: SplitData) => {
      try {
        const date = split.effective_date;
        if (!date) return;
        
        // Ensure date is in YYYY-MM-DD format
        const formattedDate = typeof date === 'string' ? date.split('T')[0] : date;
        
        markers.push({
          time: formattedDate as Time,
          position: 'aboveBar',
          color: theme.ma3,
          shape: 'roundedSquare',
          text: 'S',
          textColor: theme.text3,
          size: 2.5,
          id: `split-${date}`,
          originalTime: formattedDate
        });
      } catch (err) {
        console.error('Error creating split marker:', err);
      }
    });
  }
  
  // Sort markers by time
  markers.sort((a, b) => {
    const timeA = typeof a.time === 'string' ? new Date(a.time).getTime() : (a.time as any).timestamp || 0;
    const timeB = typeof b.time === 'string' ? new Date(b.time).getTime() : (b.time as any).timestamp || 0;
    return timeA - timeB;
  });
  
  return markers;
}

// Update markers on the chart
function updateChartMarkers(): void {
  if (!volumeSeries) return;
  
  try {
    const markers = generateMarkers();
    volumeSeries.setMarkers(markers);
  } catch (err) {
    console.error('Error updating chart markers:', err);
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
    
    // Store full historical data for replay (only copy, don't interfere with original data)
    fullHistoricalData.value = [...(transform(result.ohlc) as OHLCData[])];
    fullVolumeData.value = [...(transform(result.volume) as VolumeData[])];
    fullMA1Data.value = [...(transform(result.MA1) as MAData[])];
    fullMA2Data.value = [...(transform(result.MA2) as MAData[])];
    fullMA3Data.value = [...(transform(result.MA3) as MAData[])];
    fullMA4Data.value = [...(transform(result.MA4) as MAData[])];
    
    // Update replay manager if in replay mode
    if (replayManager.value) {
      replayManager.value.setFullData(fullHistoricalData.value);
    }
    
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
let priceLevelManager: PriceLevelManager | null = null;
const isPriceLevelActive = ref(false);
let screenshotManager: ChartScreenshot | null = null;
let drawingPersistence: DrawingPersistence | null = null;
let volumeSeries: any = null; // Volume histogram series for markers
let patternOverlayManager: PatternOverlayManager | null = null;
const isPatternRecognitionActive = ref(false);
const detectedPatterns = ref<PatternMatch[]>([]);

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
  
  // Update price level manager with the new series reference
  if (priceLevelManager) {
    priceLevelManager.setMainSeries(mainSeries);
  }
  
  // Update drawing persistence with new manager references
  if (drawingPersistence) {
    drawingPersistence.setManagers(trendlineManager!, boxManager!, textAnnotationManager!, freehandManager!);
  }
  
  // Update markers after series is ready and data is set
  nextTick(() => {
    updateChartMarkers();
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

  // Add click handler for markers
  chart.subscribeClick((param) => {
    if (param.hoveredObjectId && typeof param.hoveredObjectId === 'string') {
      const markerId = param.hoveredObjectId as string;
      
      // Parse marker type and date from ID
      if (markerId.startsWith('earnings-')) {
        const fullDate = markerId.replace('earnings-', '');
        const date = fullDate.split('T')[0]; // Extract YYYY-MM-DD part
        const earning = props.assetInfo?.quarterlyFinancials?.find((e: any) => 
          e.fiscalDateEnding && e.fiscalDateEnding.split('T')[0] === date
        );
        if (earning) {
          markerPopupData.value = {
            title: 'Earnings Report',
            data: {
              'Date': date,
              'Revenue': earning.totalRevenue ? `$${(earning.totalRevenue / 1e9).toFixed(2)}B` : 'N/A',
              'Net Income': earning.netIncome ? `$${(earning.netIncome / 1e9).toFixed(2)}B` : 'N/A',
              'EPS': earning.reportedEPS || 'N/A',
            }
          };
        }
      } else if (markerId.startsWith('dividend-')) {
        const fullDate = markerId.replace('dividend-', '');
        const date = fullDate.split('T')[0]; // Extract YYYY-MM-DD part
        const dividend = dividendsData.value?.find((d: DividendData) => 
          d.payment_date && d.payment_date.split('T')[0] === date
        );
        if (dividend) {
          markerPopupData.value = {
            title: 'Dividend Payment',
            data: {
              'Payment Date': date,
              'Amount': `$${dividend.amount}`,
            }
          };
        }
      } else if (markerId.startsWith('split-')) {
        const fullDate = markerId.replace('split-', '');
        const date = fullDate.split('T')[0]; // Extract YYYY-MM-DD part
        const split = splitsData.value?.find((s: SplitData) => 
          s.effective_date && s.effective_date.split('T')[0] === date
        );
        if (split) {
          markerPopupData.value = {
            title: 'Stock Split',
            data: {
              'Effective Date': date,
              'Ratio': split.split_factor || 'N/A',
            }
          };
        }
      }
      
      if (markerPopupData.value && param.point) {
        markerPopupPosition.value = {
          x: param.point.x + 20,
          y: param.point.y - 80
        };
        showMarkerPopup.value = true;
      }
    } else {
      showMarkerPopup.value = false;
    }
  });

  // Observe container size changes and window resize
  try {
    if (window && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => {
        updateChartSize();
        // Update price level positions when chart is resized
        if (priceLevelManager) {
          priceLevelManager.updatePositions();
        }
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
      if (priceLevelManager && isPriceLevelActive.value) {
        priceLevelManager.removeSelectedLevel();
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
    // Update markers after series change
    nextTick(() => {
      updateChartMarkers();
    });
  });
  
  // Watch for assetInfo changes to update markers
  watch(() => props.assetInfo, () => {
    if (mainSeries) {
      nextTick(() => {
        updateChartMarkers();
      });
    }
  }, { deep: true });

  watch(data, (newData: OHLCData[]) => {
    // Skip update if in replay mode - use visibleOHLCData watcher instead
    if (isReplayMode.value) return;
    
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
    
    // Update markers when data changes
    nextTick(() => {
      updateChartMarkers();
    });
  });
  
  // Watch visible OHLC data for replay mode
  watch(visibleOHLCData, (newData: OHLCData[]) => {
    if (!mainSeries || !isReplayMode.value) return;
    
    // For line, area, and baseline charts, transform OHLC to value-based data
    if (chartType.value === 'line' || chartType.value === 'area' || chartType.value === 'baseline') {
      const transformedData = newData.map((d: OHLCData) => ({
        time: d.time,
        value: d.close
      }));
      mainSeries.setData(transformedData);
      displayData.value = newData;
    } else if (chartType.value === 'heikinashi') {
      const heikinAshiData = calculateHeikinAshi(newData);
      mainSeries.setData(heikinAshiData);
      displayData.value = heikinAshiData;
    } else {
      mainSeries.setData(newData);
      displayData.value = newData;
    }
    
    // Update markers when replay data changes
    nextTick(() => {
      updateChartMarkers();
    });
  });

  volumeSeries = chart.addHistogramSeries({
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

  volumeSeries.priceScale().applyOptions({
    scaleMargins: {
      top: 0.9,
      bottom: 0,
    }
  });

  // Watch visible volume data (respects replay mode)
  watch(visibleVolumeData, (newData2: VolumeData[]) => {
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
    volumeSeries.setData(relativeVolumeData);
  });

  // Watch visible MA data (respects replay mode)
  watch(visibleMA1Data, (newData3: MAData[]) => {
    MaSeries1.setData(newData3);
  });
  watch(visibleMA2Data, (newData4: MAData[]) => {
    MaSeries2.setData(newData4);
  });
  watch(visibleMA3Data, (newData5: MAData[]) => {
    MaSeries3.setData(newData5);
  });
  watch(visibleMA4Data, (newData6: MAData[]) => {
    MaSeries4.setData(newData6);
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
  async ([newSelected, newDefault]) => {
    const symbol = newSelected || newDefault;
    if (symbol && typeof symbol === 'string' && symbol.trim() !== '') {
      await fetchChartData(symbol, selectedDataType.value);
      // Fetch dividends and splits data for markers
      await Promise.all([
        fetchDividendsData(symbol),
        fetchSplitsData(symbol)
      ]);
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
  
  // Initialize price level manager
  if (wkchart.value) {
    priceLevelManager = new PriceLevelManager(chart, mainSeries, wkchart.value);
  }
  
  // Initialize screenshot manager
  screenshotManager = new ChartScreenshot(chart, 'wk-chart');
  
  // Initialize drawing persistence
  drawingPersistence = new DrawingPersistence(
    props.user,
    props.apiKey,
    trendlineManager,
    boxManager,
    textAnnotationManager,
    freehandManager,
    priceLevelManager || undefined
  );
  
  // Set up onChange callbacks to trigger auto-save
  trendlineManager.onChange(() => drawingPersistence?.autoSave());
  boxManager.onChange(() => drawingPersistence?.autoSave());
  textAnnotationManager.onChange(() => drawingPersistence?.autoSave());
  freehandManager.onChange(() => drawingPersistence?.autoSave());
  if (priceLevelManager) {
    priceLevelManager.onChange(() => drawingPersistence?.autoSave());
  }
  
  // Set up onActivate callback to auto-activate tool when clicking on drawings
  trendlineManager.onActivate(() => {
    if (!isTrendlineActive.value) {
      toggleTrendline();
    }
  });
  
  boxManager.onActivate(() => {
    if (!isBoxActive.value) {
      toggleBox();
    }
  });
  
  textAnnotationManager.onActivate(() => {
    if (!isTextActive.value) {
      toggleText();
    }
  });
  
  freehandManager.onActivate(() => {
    if (!isFreehandActive.value) {
      toggleFreehand();
    }
  });
  
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
  
  // Update price level positions when scrolling/zooming
  chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
    if (priceLevelManager) {
      priceLevelManager.updatePositions();
    }
  });
  
  // Set up periodic auto-save (every 30 seconds)
  const autoSaveInterval = setInterval(() => {
    if (drawingPersistence) {
      const hasDrawings = drawingPersistence.hasDrawings();
      hasAnyDrawings.value = hasDrawings || isPatternRecognitionActive.value;
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
  
  // Clear earnings countdown interval
  if (earningsInterval) {
    clearInterval(earningsInterval);
    earningsInterval = null;
  }
  
  // Save drawings one last time before unmounting
  if (drawingPersistence) {
    drawingPersistence.autoSave();
    drawingPersistence.destroy();
  }
  
  // Destroy replay manager
  if (replayManager.value) {
    replayManager.value.destroy();
    replayManager.value = null;
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
  // Destroy price level manager
  if (priceLevelManager) {
    priceLevelManager.destroy();
    priceLevelManager = null;
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
    
    // Clear price levels from chart before switching symbols
    if (priceLevelManager) {
      priceLevelManager.clear();
    }
    
    // Reset ruler measurement when changing symbols (keep it active if it was)
    if (ruler) {
      ruler.resetMeasurement();
    }
    
    // Reset pattern recognition state
    showPatternsPopup.value = false;
    detectedPatterns.value = [];
    isPatternRecognitionActive.value = false;
    
    // Clear pattern overlays from chart
    if (patternOverlayManager) {
      patternOverlayManager.clearPatterns();
    }
    
    // Fetch chart data first
    await fetchChartData(newSymbol, selectedDataType.value);
    
    // Fetch dividends and splits data for markers
    await Promise.all([
      fetchDividendsData(newSymbol),
      fetchSplitsData(newSymbol)
    ]);
    
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
    
    // Clear price levels from chart before switching symbols
    if (priceLevelManager) {
      priceLevelManager.clear();
    }
    
    // Reset ruler measurement when changing symbols
    if (ruler) {
      ruler.resetMeasurement();
    }
    
    // Reset pattern recognition state
    showPatternsPopup.value = false;
    detectedPatterns.value = [];
    isPatternRecognitionActive.value = false;
    
    // Clear pattern overlays from chart
    if (patternOverlayManager) {
      patternOverlayManager.clearPatterns();
    }
    
    // Fetch chart data first
    await fetchChartData(newSymbol, selectedDataType.value);
    
    // Fetch dividends and splits data for markers
    await Promise.all([
      fetchDividendsData(newSymbol),
      fetchSplitsData(newSymbol)
    ]);
    
    // Then load drawings for new symbol
    if (drawingPersistence) {
      drawingPersistence.setSymbol(newSymbol);
      await drawingPersistence.loadDrawings();
    }
  }
});

// Watch for dividends and splits data changes to update markers
watch([dividendsData, splitsData], () => {
  if (mainSeries) {
    nextTick(() => {
      updateChartMarkers();
    });
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
const markersVisible = ref<{ earnings: boolean; dividends: boolean; splits: boolean }>({
  earnings: true,
  dividends: true,
  splits: true
});
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

// Watch for marker visibility changes to update markers
watch(markersVisible, () => {
  if (mainSeries) {
    nextTick(() => {
      updateChartMarkers();
    });
  }
}, { deep: true });

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
  // Set markers visibility from user settings
  if (payload.markers && typeof payload.markers === 'object') {
    markersVisible.value = {
      earnings: payload.markers.earnings !== false,
      dividends: payload.markers.dividends !== false,
      splits: payload.markers.splits !== false
    };
  }
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

function startMarketStatusCheck() {
  checkMarketStatus();
  
  // Clear existing interval
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
  
  // Only set interval for non-crypto assets (crypto is always open)
  if (!isCrypto.value) {
    statusInterval = setInterval(checkMarketStatus, 5000);
  }
}

onMounted(async () => {
  fetchHiddenList();
  fetchIndicatorList();
  await fetchHolidays();
  startMarketStatusCheck();
  
  // Start earnings countdown if available
  if (nextEarnings.value) {
    startEarningsCountdown();
  }
});

// Restart status check when asset changes
watch(() => props.assetInfo?.Exchange, () => {
  startMarketStatusCheck();
});

// Watch for changes to NextEarnings data and restart countdown
watch(() => props.assetInfo?.NextEarnings, (newValue) => {
  if (newValue) {
    startEarningsCountdown();
  } else {
    if (earningsInterval) {
      clearInterval(earningsInterval);
      earningsInterval = null;
    }
    earningsCountdown.value = '';
  }
}, { deep: true });

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
  if (marketStatus.value === 'open') return t('mainChart.marketOpen');
  if (marketStatus.value === 'closed') return t('mainChart.marketClosed');
  if (marketStatus.value === 'holiday') return t('mainChart.marketHoliday') + ' | ' + currentHolidayName.value;
  return t('mainChart.marketHoliday');
});

// Computed property for EOD Only badge
const isEODOnly = computed<boolean>(() => {
  const exchange = props.assetInfo?.Exchange;
  return exchange && exchange !== 'NASDAQ' && exchange !== 'NYSE';
});

// Computed property to check if asset is crypto
const isCrypto = computed<boolean>(() => {
  return props.assetInfo?.Exchange === 'CRYPTO';
});

// Function to check market status
function checkMarketStatus(): void {
  // Crypto markets are always open (24/7)
  if (isCrypto.value) {
    marketStatus.value = 'open';
    currentHolidayName.value = '';
    return;
  }
  
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

.earnings-countdown-badge {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  padding: 2px 6px;
  background-color: var(--text2);
  border-radius: 3px;
  opacity: 0.85;
  gap: 4px;
}

.earnings-label {
  color: var(--base1);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.earnings-timer {
  color: var(--base1);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.earnings-timer.urgency-medium {
  animation: fade-pulse 2s ease-in-out infinite;
}

.earnings-timer.urgency-high {
  animation: fade-pulse 1.2s ease-in-out infinite;
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

.marker-popup {
  position: fixed;
  background: var(--base2);
  border: 1px solid var(--base3);
  border-radius: 8px;
  padding: 0;
  z-index: 99999;
  min-width: 200px;
  max-width: 300px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  font-size: 13px;
  pointer-events: auto;
}

.marker-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--base3);
  background: var(--base1);
  border-radius: 8px 8px 0 0;
}

.marker-popup-title {
  font-weight: bold;
  color: var(--text1);
  font-size: 14px;
}

.marker-popup-close {
  background: none;
  border: none;
  color: var(--text2);
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.marker-popup-close:hover {
  background: var(--base3);
  color: var(--text1);
}

.marker-popup-content {
  padding: 12px;
}

.marker-popup-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  gap: 16px;
}

.marker-popup-row:not(:last-child) {
  border-bottom: 1px solid color-mix(in srgb, var(--base3) 30%, transparent);
}

.marker-popup-label {
  color: var(--text2);
  font-weight: 500;
}

.marker-popup-value {
  color: var(--text1);
  font-weight: 600;
  text-align: right;
}

/* Replay Controls */
.replay-controls-compact {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--base2);
  border-top: 1px solid var(--base3);
  border-bottom: 1px solid var(--base3);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 10;
}

.replay-controls-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

.replay-btn-compact {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  min-width: 28px;
  height: 28px;
  background: var(--base3);
  border: 1px solid var(--base4);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: var(--text1);
}

.replay-btn-compact:hover {
  background: var(--accent2);
  border-color: var(--accent1);
  transform: scale(1.05);
}

.replay-btn-compact:active {
  transform: scale(0.98);
}

.replay-play-btn-compact {
  background: color-mix(in srgb, var(--accent1) 15%, var(--base3));
  border-color: var(--accent1);
}

.replay-play-btn-compact:hover {
  background: var(--accent1);
}

.replay-icon-compact {
  width: 14px;
  height: 14px;
}

.replay-speed-compact {
  padding: 4px 6px;
  background: var(--base3);
  border: 1px solid var(--base4);
  border-radius: 4px;
  color: var(--text1);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  min-width: 50px;
  height: 28px;
}

.replay-speed-compact:hover {
  background: var(--accent2);
  border-color: var(--accent1);
}

.replay-speed-compact:focus {
  outline: none;
  border-color: var(--accent1);
}

.replay-progress-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 8px;
  min-width: 200px;
}

.replay-progress-compact {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--base4);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.replay-progress-compact::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: var(--accent1);
  border: 1px solid var(--text1);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.replay-progress-compact::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  background: var(--positive);
}

.replay-progress-compact::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: var(--accent1);
  border: 1px solid var(--text1);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.replay-progress-compact::-moz-range-thumb:hover {
  transform: scale(1.15);
  background: var(--positive);
}

.replay-date-compact {
  font-size: 11px;
  font-weight: 600;
  color: var(--text1);
  background: var(--base3);
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--base4);
  min-width: 140px;
  text-align: center;
  white-space: nowrap;
}

/* Old replay controls - hidden/removed */
.replay-controls {
  display: none;
}

.replay-start-container {
  display: none;
}

.replay-start-btn {
  display: none;
}

/* Replay Date Picker */
.replay-date-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.replay-date-picker-popup {
  background: var(--base2);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid var(--base3);
}

.replay-date-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--base3);
}

.replay-date-picker-header h3 {
  margin: 0;
  color: var(--text1);
  font-size: 18px;
  font-weight: 600;
}

.replay-date-picker-close {
  background: none;
  border: none;
  color: var(--text2);
  font-size: 32px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.replay-date-picker-close:hover {
  background: var(--base3);
  color: var(--text1);
}

.replay-loading {
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.replay-loader {
  width: 40px;
  height: 40px;
  border: 4px solid var(--base3);
  border-top-color: var(--accent1);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.replay-loading p {
  color: var(--text2);
  font-size: 14px;
  margin: 0;
}

.replay-date-picker-content {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.replay-data-info {
  padding: 10px 14px;
  background: var(--base1);
  border-radius: 6px;
  text-align: center;
  border: 1px solid var(--base3);
}

.replay-data-info span {
  color: var(--text1);
  font-size: 13px;
  font-weight: 500;
}

.replay-date-input {
  width: 100%;
  padding: 10px 14px;
  background: var(--base1);
  border: 1px solid var(--base3);
  border-radius: 6px;
  color: var(--text1);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-sizing: border-box;
}

.replay-date-input:hover {
  border-color: var(--accent1);
}

.replay-date-input:focus {
  outline: none;
  border-color: var(--accent1);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent1) 20%, transparent);
}

.replay-date-presets {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.replay-preset-btn {
  padding: 8px 14px;
  background: var(--base1);
  border: 1px solid var(--base3);
  border-radius: 6px;
  color: var(--text1);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.replay-preset-btn:hover {
  background: var(--base3);
  border-color: var(--accent1);
  transform: translateY(-1px);
}

.replay-preset-btn:active {
  transform: translateY(0);
}

.replay-start-confirm-btn {
  width: 100%;
  padding: 10px 20px;
  background: var(--accent1);
  border: none;
  border-radius: 6px;
  color: var(--text3);
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 4px;
}

.replay-start-confirm-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.replay-start-confirm-btn:active {
  transform: translateY(0);
}

@media (max-width: 768px) {
  .replay-date-picker-popup {
    width: 95%;
    max-width: none;
  }
  
  .replay-date-presets {
    grid-template-columns: 1fr;
  }
}

/* Price Level Styles - Labels are created dynamically in price-level.ts */
:deep(.price-level-label) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}


</style>