<template>

  <body>
    <Header />
    <div class="watch-panel-container" style="display: flex; align-items: center; justify-content: space-between;">
      <div class="watch-panel" style="display: flex; gap: 8px;">
        <template v-if="watchPanel.length > 0">
          <div class="watch-panel-track" :class="{ 'scrolling': watchPanel.length > 12 }">
            <template v-for="repeat in watchPanel.length > 12 ? 2 : 1">
              <button v-for="(ticker, i) in watchPanel" :key="repeat + '-' + i"
                :class="{ active: defaultSymbol === ticker.Symbol, 'index-btn': true }"
                @click="defaultSymbol = ticker.Symbol; searchTicker(ticker.Symbol)">
                {{ ticker.Symbol }}
                <span :class="parseFloat(ticker.percentageReturn) > 0 ? 'positive' : 'negative'">
                  {{ ticker.percentageReturn }}
                </span>
                <span v-if="parseFloat(ticker.percentageReturn) > 0" class="arrow-up"></span>
                <span v-else class="arrow-down"></span>
              </button>
            </template>
          </div>
        </template>
        <template v-else>
          <span class="no-symbols">No Symbols in Watch Panel</span>
        </template>
      </div>
      <button class="edit-watch-panel-btn" @click="openEditor">
        Edit Watch Panel
      </button>
      <WatchPanelEditor v-if="editWatchPanel" :apiKey="apiKey" :user="user" :watchPanel="watchPanel"
        :fetchWatchPanel="fetchWatchPanel" :notify="(msg) => notification.value.show(msg)" @close="closeEditor" />
    </div>
    <div class="mobilenav">
      <button class="mnavbtn" :class="{ selected: selected === 'info' }" @click="select('info')">
        Info
      </button>
      <button class="mnavbtn" :class="{ selected: selected === 'watchlists' }" @click="select('watchlists')">
        Watchlists
      </button>
    </div>
    <div id="main">
      <div class="tooltip-container">
        <div class="tooltip" v-if="showTooltip" :style="{ top: tooltipTop + 'px', left: tooltipLeft + 'px' }">
          <span class="tooltip-text">{{ tooltipText }}</span>
        </div>
      </div>
<CreateNote
  v-if="showCreateNoteModal"
  :user="user"
  :api-key="apiKey"
  :default-symbol="selectedItem"
  :notification="notification"
  :searchNotes="searchNotes"
  @close="showCreateNoteModal = false"
  @refresh-notes="handleRefreshNotes"
/>
     <CreateWatchlist
  v-if="showCreateWatchlistModal"
  :user="user"
  :api-key="apiKey"
  :watchlist="watchlist"
  :notification="notification"
  :getWatchlists="getWatchlists"
  :filterWatchlist="filterWatchlist"
  @close="showCreateWatchlistModal = false"
/>
<RenameWatchlist
  v-if="showRenameWatchlistModal"
  :user="user"
  :api-key="apiKey"
  :watchlist="watchlist"
  :selected-watchlist="selectedWatchlist"
  :notification="notification"
  :getWatchlists="getWatchlists"
  :filterWatchlist="filterWatchlist"
  @close="showRenameWatchlistModal = false"
/>
      <div id="sidebar-left" :class="{ 'hidden-mobile': selected !== 'info' }">
        <div v-if="isLoading3" style="position: relative; height: 100%;">
          <div style="position: absolute; top: 45%; left: 43%;">
            <Loader />
          </div>
        </div>
        <div v-else style="border:none">
          <div>
            <div class="editbtn" @click="showPanel = !showPanel">
              <svg v-if="!showPanel" viewBox="0 0 24 24" height="10" width="10" fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M20.8477 1.87868C19.6761 0.707109 17.7766 0.707105 16.605 1.87868L2.44744 16.0363C2.02864 16.4551 1.74317 16.9885 1.62702 17.5692L1.03995 20.5046C0.760062 21.904 1.9939 23.1379 3.39334 22.858L6.32868 22.2709C6.90945 22.1548 7.44285 21.8693 7.86165 21.4505L22.0192 7.29289C23.1908 6.12132 23.1908 4.22183 22.0192 3.05025L20.8477 1.87868ZM18.0192 3.29289C18.4098 2.90237 19.0429 2.90237 19.4335 3.29289L20.605 4.46447C20.9956 4.85499 20.9956 5.48815 20.605 5.87868L17.9334 8.55027L15.3477 5.96448L18.0192 3.29289ZM13.9334 7.3787L3.86165 17.4505C3.72205 17.5901 3.6269 17.7679 3.58818 17.9615L3.00111 20.8968L5.93645 20.3097C6.13004 20.271 6.30784 20.1759 6.44744 20.0363L16.5192 9.96448L13.9334 7.3787Z"
                    fill="var(--text1)"></path>
                </g>
              </svg>
              <svg v-else viewBox="0 0 24 24" height="10" width="10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path d="M18 6L6 18" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    stroke="var(--text1)"></path>
                  <path d="M6 6L18 18" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    stroke="var(--text1)"></path>
                </g>
              </svg>
              {{ showPanel ? 'Close Popup' : 'Edit Panel' }}
            </div>
            <transition name="fade">
              <Panel v-if="showPanel" @close="showPanel = false" @updated="fetchPanel"
                @panel-updated="handlePanelUpdated" />
            </transition>
          </div>
          <component v-for="(item, idx) in panelData" :key="idx" :is="sidebarComponentMap[item.tag]"
            v-show="!item.hidden" v-bind="getSidebarProps(item.tag)"
            :refresh-key="item.tag === 'Summary' ? summaryRefreshKey : undefined" @show-popup="showPopup = true"
            @toggle-description="showAllDescription = !showAllDescription" @toggle-eps="showAllEPS = !showAllEPS"
            @toggle-earnings="showAllEarnings = !showAllEarnings" @toggle-sales="showAllSales = !showAllSales"
            @toggle-dividends="showAllDividends = !showAllDividends" @toggle-splits="showAllSplits = !showAllSplits"
            @remove-note="removeNote" />
          <div v-if="showPopup" class="popup">
            <div class="popup-content">
              <div class="toggle-button-container">
                <button @click="toggleFinancials" class="toggle-button">
                  {{ isAnnualFinancials ? 'Switch to Quarterly Reports' : 'Switch to Annual Reports' }}
                </button>
                <button class="toggle-button" @click="showPopup = false">Close</button>
              </div>
              <br>
              <div class="financials-header">
                <div class="attribute-name">Attribute</div>
                <div v-for="financial in currentFinancials" :key="financial.fiscalDateEnding" class="fiscal-year">
                  {{ getQuarterAndYear(financial.fiscalDateEnding) }}
                </div>
              </div>
              <div
                v-for="(attribute, index) in Object.keys(currentFinancials[0]).filter(attr => attr !== 'fiscalDateEnding')"
                :key="index" class='financials-row'>
                <div class="attribute-name" style="display: grid; grid-template-columns: 1fr auto;">
                  {{ attributeMap[attribute] || attribute }}
                  <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                    @mouseover="handleMouseOver($event, { attribute })" @mouseout="handleMouseOut">
                    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                    <g id="SVGRepo_iconCarrier">
                      <path
                        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                        stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round">
                      </path>
                      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)"
                        stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
                      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088"
                        stroke-linecap="round" stroke-linejoin="round"></path>
                    </g>
                  </svg>
                </div>
                <div v-for="financial in currentFinancials" :key="financial.fiscalDateEnding" class="financial-value">
                  {{ isNaN(parseInt(financial[attribute])) ? '-' : parseInt(financial[attribute]).toLocaleString() }}
                  <div class="percentage-box"
                    :class="!isNaN(parseFloat(getPercentageDifference(financial, attribute))) && parseFloat(getPercentageDifference(financial, attribute)) > 0 ? 'positive' : 'negative'">
                    {{ isNaN(parseFloat(getPercentageDifference(financial, attribute))) ? '-' :
                      getPercentageDifference(financial, attribute) }}
                    <span
                      v-if="!isNaN(parseFloat(getPercentageDifference(financial, attribute))) && parseFloat(getPercentageDifference(financial, attribute)) > 0"
                      class="arrow-up"></span>
                    <span v-else-if="!isNaN(parseFloat(getPercentageDifference(financial, attribute)))"
                      class="arrow-down"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="results"></div>
        </div>
      </div>
      <div id="center" :class="{ 'hidden-mobile': selected !== 'chart' }">
        <div id="chart-container">
          <div id="legend"></div>
          <div id="legend2">
            <button class="navbtng" v-b-tooltip.hover title="Change Chart View" @click="toggleChartView">{{ chartView
            }}</button>
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
          </div>
          <div id="chartdiv" ref="mainchart" :class="{ 'chart-loading': isChartLoading }"></div>
          <div class="loading-container" v-if="isChartLoading">
            <Loader />
          </div>
          <div class="loading-container" v-if="isLoading">
            <Loader />
          </div>

        </div>
        <div id="chartdiv2">
          <img src="@/assets/images/logos/tiingo.png" alt="Image"
            style="height: 15px; margin-right: 10px; margin-bottom: 7px;">
          <p style="margin: 0; font-size: 10px;">Core financial data provided by Tiingo.com as of {{ currentDate }} -
            Any metrics or calculations not directly provided by Tiingo are derived internally using their core data.
            End-of-day (EOD) data updates occur daily, Monday through Friday, between 6:00 PM and 6:30 PM ET, subject
            to Tiingo's data availability.</p>
        </div>
      </div>
      <div id="sidebar-right" :class="{ 'hidden-mobile': selected !== 'watchlists' }">
        <div style="position: sticky; top: 0; z-index: 1000;">
          <div id="chartdiv-mobile" ref="mainchartMobile" class="mobile-chart" v-show="isMobile"></div>
          <div class="loading-container2" v-if="isChartLoading">
            <Loader />
          </div>
          <div class="loading-container2" v-if="isLoading">
            <Loader />
          </div>
          <div id="searchtable">
            <input type="text" id="searchbar" name="search" placeholder="Search Ticker / ISIN" v-model="searchQuery"
              @input="toUpperCase" @keydown.enter="searchTicker()">
            <button class="wlbtn2" id="searchBtn" @click="searchTicker()" v-b-tooltip.hover title="Search Symbol">
              <svg class="img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                    d="M14.9536 14.9458L21 21M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
                    stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                </g>
              </svg></button>
          </div>
          <div id="wlnav">
            <div id="realwatchlist" class="select-container" @mouseover="showDropdown = true"
              @mouseout="showDropdown = false">
              <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                :class="{ 'dropdown-icon-hover': showDropdown }" v-if="!showDropdown">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M12.7071 14.7071C12.3166 15.0976 11.6834 15.0976 11.2929 14.7071L6.29289 9.70711C5.90237 9.31658 5.90237 8.68342 6.29289 8.29289C6.68342 7.90237 7.31658 7.90237 7.70711 8.29289L12 12.5858L16.2929 8.29289C16.6834 7.90237 17.3166 7.90237 17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711L12.7071 14.7071Z"
                    fill="var(--text1)"></path>
                </g>
              </svg>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                :class="{ 'dropdown-icon': showDropdown }" v-else transform="matrix(1, 0, 0, 1, 0, 0)rotate(180)">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M12.7071 14.7071C12.3166 15.0976 11.6834 15.0976 11.2929 14.7071L6.29289 9.70711C5.90237 9.31658 5.90237 8.68342 6.29289 8.29289C6.68342 7.90237 7.31658 7.90237 7.70711 8.29289L12 12.5858L16.2929 8.29289C16.6834 7.90237 17.3166 7.90237 17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711L12.7071 14.7071Z"
                    fill="var(--text1)"></path>
                </g>
              </svg>
              <p style="font-weight: bold;" class="selected-value" @click.stop="">{{ selectedWatchlist ?
                selectedWatchlist.Name : (watchlist && watchlist.tickers && watchlist.tickers.length > 0 ?
                  'Select a watch' : 'No Watchlists') }}</p>
              <div class="dropdown-container" v-if="watchlist && watchlist.tickers && watchlist.tickers.length > 0">
                <div class="watchlist-dropdown-menu">
                  <div class="watchlist-item" v-for="watch in watchlist.tickers" :key="watch.Name"
                    :class="{ 'selected': selectedWatchlist && selectedWatchlist.Name === watch.Name }"
                    @click="filterWatchlist(watch)">
                    {{ watch.Name }}
                    <span class="badge">{{ watch.List.length }}</span>
                    <button class="icondlt" id="watchlistDelete" @click.stop="DeleteWatchlist(watch)" v-b-tooltip.hover
                      title="Delete Watchlist">
                      <svg class="imgm" viewBox="0 0 16 16" xmlns:dc="http://purl.org/dc/elements/1.1/"
                        xmlns:cc="http://creativecommons.org/ns#"
                        xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg"
                        version="1.1" id="svg8" fill="var(--text1)">
                        <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                        <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                        <g id="SVGRepo_iconCarrier">
                          <metadata id="metadata5">
                            <rdf:rdf>
                              <cc:work>
                                <dc:format>image/svg+xml</dc:format>
                                <dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"></dc:type>
                                <dc:title></dc:title>
                                <dc:date>2021</dc:date>
                                <dc:creator>
                                  <cc:agent>
                                    <dc:title>Timothée Giet</dc:title>
                                  </cc:agent>
                                </dc:creator>
                                <cc:license rdf:resource="http://creativecommons.org/licenses/by-sa/4.0/"></cc:license>
                              </cc:work>
                              <cc:license rdf:about="http://creativecommons.org/licenses/by-sa/4.0/">
                                <cc:permits rdf:resource="http://creativecommons.org/ns#Reproduction"></cc:permits>
                                <cc:permits rdf:resource="http://creativecommons.org/ns#Distribution"></cc:permits>
                                <cc:requires rdf:resource="http://creativecommons.org/ns#Notice"></cc:requires>
                                <cc:requires rdf:resource="http://creativecommons.org/ns#Attribution"></cc:requires>
                                <cc:permits rdf:resource="http://creativecommons.org/ns#DerivativeWorks"></cc:permits>
                                <cc:requires rdf:resource="http://creativecommons.org/ns#ShareAlike"></cc:requires>
                              </cc:license>
                            </rdf:rdf>
                          </metadata>
                          <rect transform="rotate(45)" ry="0" y="-1" x="4.3137083" height="2" width="14" id="rect1006"
                            style="opacity:1;vector-effect:none;fill:var(--text1);fill-opacity:1;stroke:none;stroke-width:4;stroke-linecap:square;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:3.20000005;stroke-opacity:1">
                          </rect>
                          <rect transform="rotate(-45)" ry="0" y="10.313708" x="-7" height="2" width="14"
                            id="rect1006-5"
                            style="opacity:1;vector-effect:none;fill:var(--text1);fill-opacity:1;stroke:none;stroke-width:4;stroke-linecap:square;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:3.20000005;stroke-opacity:1">
                          </rect>
                        </g>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <button class="navbtn" @click="addWatchlist()" v-b-tooltip.hover title="Add ticker to watchlist">
              <svg class="img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path d="M4 12H20M12 4V20" stroke="var(--text1)" stroke-width="1.9440000000000002"
                    stroke-linecap="round" stroke-linejoin="round"></path>
                </g>
              </svg>
              <span>Add Symbol</span>
            </button>
            <div class="wlnav-dropdown">
              <button class="dropdown-toggle wlbtn" v-b-tooltip.hover title="More Options">
                <svg class="img" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                  <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                  <g id="SVGRepo_iconCarrier">
                    <path
                      d="M8 12C9.10457 12 10 12.8954 10 14C10 15.1046 9.10457 16 8 16C6.89543 16 6 15.1046 6 14C6 12.8954 6.89543 12 8 12Z"
                      fill="var(--text1)"></path>
                    <path
                      d="M8 6C9.10457 6 10 6.89543 10 8C10 9.10457 9.10457 10 8 10C6.89543 10 6 9.10457 6 8C6 6.89543 6.89543 6 8 6Z"
                      fill="var(--text1)"></path>
                    <path
                      d="M10 2C10 0.89543 9.10457 -4.82823e-08 8 0C6.89543 4.82823e-08 6 0.895431 6 2C6 3.10457 6.89543 4 8 4C9.10457 4 10 3.10457 10 2Z"
                      fill="var(--text1)"></path>
                  </g>
                </svg>
              </button>
              <div class="dropdown-vnav">
                <div class="watchlist-dropdown-menu2">
                  <button class="dropdown-item" @click="AutoPlay()" v-b-tooltip.hover title="Autoplay Watchlist">
                    <svg class="img4" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="var(--text1)">
                      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                      <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                      <g id="SVGRepo_iconCarrier">
                        <path fill="var(--text1)" fill-rule="evenodd"
                          d="M5.23331,0.493645 C6.8801,-0.113331 8.6808,-0.161915 10.3579,0.355379 C11.4019,0.6773972 12.361984,1.20757325 13.1838415,1.90671757 L13.4526,2.14597 L14.2929,1.30564 C14.8955087,0.703065739 15.9071843,1.0850774 15.994017,1.89911843 L16,2.01275 L16,6.00002 L12.0127,6.00002 C11.1605348,6.00002 10.7153321,5.01450817 11.2294893,4.37749065 L11.3056,4.29291 L12.0372,3.56137 C11.389,2.97184 10.6156,2.52782 9.76845,2.26653 C8.5106,1.87856 7.16008,1.915 5.92498,2.37023 C4.68989,2.82547 3.63877,3.67423 2.93361,4.78573 C2.22844,5.89723 1.90836,7.20978 2.02268,8.52112 C2.13701,9.83246 2.6794,11.0698 3.56627,12.0425 C4.45315,13.0152 5.63528,13.6693 6.93052,13.9039 C8.22576,14.1385 9.56221,13.9407 10.7339,13.3409 C11.9057,12.7412 12.8476,11.7727 13.4147,10.5848 C13.6526,10.0864 14.2495,9.8752 14.748,10.1131 C15.2464,10.351 15.4575,10.948 15.2196,11.4464 C14.4635,13.0302 13.2076,14.3215 11.6453,15.1213 C10.0829,15.921 8.30101,16.1847 6.57402,15.8719 C4.84704,15.559 3.27086,14.687 2.08836,13.39 C0.905861,12.0931 0.182675,10.4433 0.0302394,8.69483 C-0.122195,6.94637 0.304581,5.1963 1.2448,3.7143 C2.18503,2.2323 3.58652,1.10062 5.23331,0.493645 Z M6,5.46077 C6,5.09472714 6.37499031,4.86235811 6.69509872,5.0000726 L6.7678,5.03853 L10.7714,7.57776 C11.0528545,7.75626909 11.0784413,8.14585256 10.8481603,8.36273881 L10.7714,8.42224 L6.7678,10.9615 C6.45867857,11.1575214 6.06160816,10.965274 6.00646097,10.6211914 L6,10.5392 L6,5.46077 Z">
                        </path>
                      </g>
                    </svg> Autoplay
                  </button>
                 <button class="dropdown-item" @click="showCreateNoteModal = true" v-b-tooltip.hover title="Create a Note">
                    <svg class="img4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                      <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                      <g id="SVGRepo_iconCarrier">
                        <g id="File / Note_Edit">
                          <path id="Vector"
                            d="M10.0002 4H7.2002C6.08009 4 5.51962 4 5.0918 4.21799C4.71547 4.40973 4.40973 4.71547 4.21799 5.0918C4 5.51962 4 6.08009 4 7.2002V16.8002C4 17.9203 4 18.4801 4.21799 18.9079C4.40973 19.2842 4.71547 19.5905 5.0918 19.7822C5.5192 20 6.07899 20 7.19691 20H16.8031C17.921 20 18.48 20 18.9074 19.7822C19.2837 19.5905 19.5905 19.2839 19.7822 18.9076C20 18.4802 20 17.921 20 16.8031V14M16 5L10 11V14H13L19 8M16 5L19 2L22 5L19 8M16 5L19 8"
                            stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          </path>
                        </g>
                      </g>
                    </svg> Create Note
                  </button>
                  <button class="dropdown-item" @click="showCreateWatchlistModal = true" v-b-tooltip.hover
                    title="Create New Watchlist">
                    <svg class="img4" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg"
                      xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 32.219 32.219" xml:space="preserve"
                      fill="var(--text1)">
                      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                      <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                      <g id="SVGRepo_iconCarrier">
                        <g>
                          <path style="fill:var(--text1);"
                            d="M32.144,12.402c-0.493-1.545-3.213-1.898-6.09-2.277c-1.578-0.209-3.373-0.445-3.914-0.844 c-0.543-0.398-1.304-2.035-1.978-3.482C18.94,3.17,17.786,0.686,16.166,0.68l-0.03-0.003c-1.604,0.027-2.773,2.479-4.016,5.082 c-0.684,1.439-1.463,3.07-2.005,3.463c-0.551,0.394-2.342,0.613-3.927,0.803c-2.877,0.352-5.598,0.68-6.108,2.217 c-0.507,1.539,1.48,3.424,3.587,5.424c1.156,1.094,2.465,2.34,2.67,2.98c0.205,0.639-0.143,2.414-0.448,3.977 c-0.557,2.844-1.084,5.535,0.219,6.5c0.312,0.225,0.704,0.338,1.167,0.328c1.331-0.023,3.247-1.059,5.096-2.062 c1.387-0.758,2.961-1.611,3.661-1.621c0.675,0.002,2.255,0.881,3.647,1.654c1.891,1.051,3.852,2.139,5.185,2.119 c0.414-0.01,0.771-0.117,1.06-0.322c1.312-0.947,0.814-3.639,0.285-6.494c-0.289-1.564-0.615-3.344-0.409-3.982 c0.213-0.639,1.537-1.867,2.702-2.955C30.628,15.808,32.634,13.945,32.144,12.402z M21.473,19.355h-3.722v3.797h-3.237v-3.797 h-3.768v-3.238h3.768v-3.691h3.237v3.691h3.722V19.355z">
                          </path>
                        </g>
                      </g>
                    </svg> New Watchlist
                  </button>
                  <button class="dropdown-item" @click="() =>  showRenameWatchlistModal = true " v-b-tooltip.hover
                    title="Rename Watchlist">
                    <svg class="img4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                      <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                      <g id="SVGRepo_iconCarrier">
                        <path d="M9 5H14M14 5H19M14 5V19M9 19H14M14 19H19" stroke="var(--text1)" stroke-width="2">
                        </path>
                        <path d="M11 9H4C2.89543 9 2 9.89543 2 11V15H11" stroke="var(--text1)" stroke-width="2"></path>
                        <path d="M17 15H20C21.1046 15 22 14.1046 22 13V9H17" stroke="var(--text1)" stroke-width="2">
                        </path>
                      </g>
                    </svg> Rename Watchlist
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div id="watch-container">
            <div class="ntbl" style="flex: 0.5"></div>
            <div class="ntbl" style="flex: 1"></div>
            <div class="tbl" style="flex: 1" @click="sortTable('ticker')">
              <svg class="img2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M16 5.25C16.2029 5.25 16.3972 5.33222 16.5384 5.47789L20.5384 9.60289C20.8268 9.90025 20.8195 10.3751 20.5221 10.6634C20.2247 10.9518 19.7499 10.9445 19.4616 10.6471L16.75 7.8508L16.75 18C16.75 18.4142 16.4142 18.75 16 18.75C15.5858 18.75 15.25 18.4142 15.25 18L15.25 7.8508L12.5384 10.6471C12.2501 10.9445 11.7753 10.9518 11.4779 10.6634C11.1805 10.3751 11.1732 9.90025 11.4616 9.60289L15.4616 5.47789C15.6028 5.33222 15.7971 5.25 16 5.25ZM8 5.25C8.41421 5.25 8.75 5.58579 8.75 6L8.75 16.1492L11.4616 13.3529C11.7499 13.0555 12.2247 13.0482 12.5221 13.3366C12.8195 13.6249 12.8268 14.0997 12.5384 14.3971L8.53843 18.5221C8.39717 18.6678 8.20291 18.75 8 18.75C7.79709 18.75 7.60283 18.6678 7.46158 18.5221L3.46158 14.3971C3.17322 14.0997 3.18053 13.6249 3.47789 13.3366C3.77526 13.0482 4.25007 13.0555 4.53843 13.3529L7.25 16.1492L7.25 6C7.25 5.58579 7.58579 5.25 8 5.25Z"
                    fill="var(--text1)"></path>
                </g>
              </svg> Ticker
            </div>
            <div class="tbl" style="flex: 1" @click="sortTable('last')">
              <svg class="img2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M16 5.25C16.2029 5.25 16.3972 5.33222 16.5384 5.47789L20.5384 9.60289C20.8268 9.90025 20.8195 10.3751 20.5221 10.6634C20.2247 10.9518 19.7499 10.9445 19.4616 10.6471L16.75 7.8508L16.75 18C16.75 18.4142 16.4142 18.75 16 18.75C15.5858 18.75 15.25 18.4142 15.25 18L15.25 7.8508L12.5384 10.6471C12.2501 10.9445 11.7753 10.9518 11.4779 10.6634C11.1805 10.3751 11.1732 9.90025 11.4616 9.60289L15.4616 5.47789C15.6028 5.33222 15.7971 5.25 16 5.25ZM8 5.25C8.41421 5.25 8.75 5.58579 8.75 6L8.75 16.1492L11.4616 13.3529C11.7499 13.0555 12.2247 13.0482 12.5221 13.3366C12.8195 13.6249 12.8268 14.0997 12.5384 14.3971L8.53843 18.5221C8.39717 18.6678 8.20291 18.75 8 18.75C7.79709 18.75 7.60283 18.6678 7.46158 18.5221L3.46158 14.3971C3.17322 14.0997 3.18053 13.6249 3.47789 13.3366C3.77526 13.0482 4.25007 13.0555 4.53843 13.3529L7.25 16.1492L7.25 6C7.25 5.58579 7.58579 5.25 8 5.25Z"
                    fill="var(--text1)"></path>
                </g>
              </svg>Last
            </div>
            <div class="tbl" style="flex: 1" @click="sortTable('chg')">
              <svg class="img2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M16 5.25C16.2029 5.25 16.3972 5.33222 16.5384 5.47789L20.5384 9.60289C20.8268 9.90025 20.8195 10.3751 20.5221 10.6634C20.2247 10.9518 19.7499 10.9445 19.4616 10.6471L16.75 7.8508L16.75 18C16.75 18.4142 16.4142 18.75 16 18.75C15.5858 18.75 15.25 18.4142 15.25 18L15.25 7.8508L12.5384 10.6471C12.2501 10.9445 11.7753 10.9518 11.4779 10.6634C11.1805 10.3751 11.1732 9.90025 11.4616 9.60289L15.4616 5.47789C15.6028 5.33222 15.7971 5.25 16 5.25ZM8 5.25C8.41421 5.25 8.75 5.58579 8.75 6L8.75 16.1492L11.4616 13.3529C11.7499 13.0555 12.2247 13.0482 12.5221 13.3366C12.8195 13.6249 12.8268 14.0997 12.5384 14.3971L8.53843 18.5221C8.39717 18.6678 8.20291 18.75 8 18.75C7.79709 18.75 7.60283 18.6678 7.46158 18.5221L3.46158 14.3971C3.17322 14.0997 3.18053 13.6249 3.47789 13.3366C3.77526 13.0482 4.25007 13.0555 4.53843 13.3529L7.25 16.1492L7.25 6C7.25 5.58579 7.58579 5.25 8 5.25Z"
                    fill="var(--text1)"></path>
                </g>
              </svg>Chg
            </div>
            <div class="tbl" style="flex: 1" @click="sortTable('perc')">
              <svg class="img2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M16 5.25C16.2029 5.25 16.3972 5.33222 16.5384 5.47789L20.5384 9.60289C20.8268 9.90025 20.8195 10.3751 20.5221 10.6634C20.2247 10.9518 19.7499 10.9445 19.4616 10.6471L16.75 7.8508L16.75 18C16.75 18.4142 16.4142 18.75 16 18.75C15.5858 18.75 15.25 18.4142 15.25 18L15.25 7.8508L12.5384 10.6471C12.2501 10.9445 11.7753 10.9518 11.4779 10.6634C11.1805 10.3751 11.1732 9.90025 11.4616 9.60289L15.4616 5.47789C15.6028 5.33222 15.7971 5.25 16 5.25ZM8 5.25C8.41421 5.25 8.75 5.58579 8.75 6L8.75 16.1492L11.4616 13.3529C11.7499 13.0555 12.2247 13.0482 12.5221 13.3366C12.8195 13.6249 12.8268 14.0997 12.5384 14.3971L8.53843 18.5221C8.39717 18.6678 8.20291 18.75 8 18.75C7.79709 18.75 7.60283 18.6678 7.46158 18.5221L3.46158 14.3971C3.17322 14.0997 3.18053 13.6249 3.47789 13.3366C3.77526 13.0482 4.25007 13.0555 4.53843 13.3529L7.25 16.1492L7.25 6C7.25 5.58579 7.58579 5.25 8 5.25Z"
                    fill="var(--text1)"></path>
                </g>
              </svg>%
            </div>
          </div>
        </div>
        <div v-if="isLoading2" style="position: relative; height: 100%;">
          <div style="position: absolute; top: 45%; left: 43%;">
            <Loader />
          </div>
        </div>
        <div v-else>
          <div id="list" ref="watchlistContainer" tabindex="0" @keydown="handleKeydown" @click="handleClick">
            <div v-if="watchlist2.tickers && watchlist2.tickers.length > 0">
              <div ref="sortable">
                <div v-for="item in watchlist2.tickers" :key="item"
                  :class="{ 'selected': selectedItem === item, 'wlist': true }" @click="selectRow(item)">
                  <div style="flex: 0.5; position: relative;">
                    <button class="dropdown-btn">
                      <svg class="imgm" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                        <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                        <g id="SVGRepo_iconCarrier">
                          <path
                            d="M8 12C9.10457 12 10 12.8954 10 14C10 15.1046 9.10457 16 8 16C6.89543 16 6 15.1046 6 14C6 12.8954 6.89543 12 8 12Z"
                            fill="var(--text1)"></path>
                          <path
                            d="M8 6C9.10457 6 10 6.89543 10 8C10 9.10457 9.10457 10 8 10C6.89543 10 6 9.10457 6 8C6 6.89543 6.89543 6 8 6Z"
                            fill="var(--text1)"></path>
                          <path
                            d="M10 2C10 0.89543 9.10457 -4.82823e-08 8 0C6.89543 4.82823e-08 6 0.895431 6 2C6 3.10457 6.89543 4 8 4C9.10457 4 10 3.10457 10 2Z"
                            fill="var(--text1)"></path>
                        </g>
                      </svg>
                    </button>
                    <div class="dropdown-menu3">
                      <div class="watchlist-dropdown-menu3">
                        <div v-for="(ticker, index) in watchlist.tickers" :key="index" class="watchlist-item">
                          <label :for="'watchlist-' + index" class="checkbox-label">
                            <div @click.stop="toggleWatchlist(ticker, item)" style="cursor: pointer;">
                              <svg width="24" height="24" v-if="isAssetInWatchlist(ticker.Name, item)"
                                viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                                <g id="SVGRepo_iconCarrier">
                                  <g id="Interface / Checkbox_Check">
                                    <path id="Vector"
                                      d="M8 12L11 15L16 9M4 16.8002V7.2002C4 6.08009 4 5.51962 4.21799 5.0918C4.40973 4.71547 4.71547 4.40973 5.0918 4.21799C5.51962 4 6.08009 4 7.2002 4H16.8002C17.9203 4 18.4796 4 18.9074 4.21799C19.2837 4.40973 19.5905 4.71547 19.7822 5.0918C20 5.5192 20 6.07899 20 7.19691V16.8036C20 17.9215 20 18.4805 19.7822 18.9079C19.5905 19.2842 19.2837 19.5905 18.9074 19.7822C18.48 20 17.921 20 16.8031 20H7.19691C6.07899 20 5.5192 20 5.0918 19.7822C4.71547 19.5905 4.40973 19.2842 4.21799 18.9079C4 18.4801 4 17.9203 4 16.8002Z"
                                      stroke="var(--text1)" stroke-width="2" stroke-linecap="round"
                                      stroke-linejoin="round">
                                    </path>
                                  </g>
                                </g>
                              </svg>
                              <svg width="24" height="24" v-else viewBox="0 0 24 24" fill="none"
                                xmlns="http://www.w3.org/2000/svg">
                                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                                <g id="SVGRepo_iconCarrier">
                                  <g id="Interface / Checkbox_Unchecked">
                                    <path id="Vector"
                                      d="M4 7.2002V16.8002C4 17.9203 4 18.4801 4.21799 18.9079C4.40973 19.2842 4.71547 19.5905 5.0918 19.7822C5.5192 20 6.07899 20 7.19691 20H16.8031C17.921 20 18.48 20 18.9074 19.7822C19.2837 19.5905 19.5905 19.2842 19.7822 18.9079C20 18.4805 20 17.9215 20 16.8036V7.19691C20 6.07899 20 5.5192 19.7822 5.0918C19.5905 4.71547 19.2837 4.40973 18.9074 4.21799C18.4796 4 17.9203 4 16.8002 4H7.2002C6.08009 4 5.51962 4 5.0918 4.21799C4.71547 4.40973 4.40973 4.71547 4.21799 5.0918C4 5.51962 4 6.08009 4 7.2002Z"
                                      stroke="var(--text1)" stroke-width="2" stroke-linecap="round"
                                      stroke-linejoin="round">
                                    </path>
                                  </g>
                                </g>
                              </svg>
                            </div>
                            <span class="checkmark"></span>
                            {{ ticker.Name }}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style="flex: 1; text-align: center;">
                    <img class="cmp-logo" :src="getImagePath(item)" alt="" />
                  </div>
                  <div style="flex: 1; text-align: center;" class="btsymbol">{{ item }}</div>
                  <div style="flex: 1; text-align: center;">{{ quotes[item] }}</div>
                  <div style="flex: 1; text-align: center;" :class="changes[item] > 0 ? 'positive' : 'negative'">{{
                    changes[item] }}</div>
                  <div style="flex: 1; text-align: center;" :class="perc[item] > 0 ? 'positive' : 'negative'">{{
                    perc[item] }}%</div>
                  <div class="delete-cell" style="position: relative;">
                    <button class="dbtn" @click="deleteTicker(item)" style="position: absolute; right: 0;" @click.stop>
                      <svg class="imgm" viewBox="0 0 16 16" xmlns:dc="http://purl.org/dc/elements/1.1/"
                        xmlns:cc="http://creativecommons.org/ns#"
                        xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg"
                        version="1.1" id="svg8" fill="var(--text1)">
                        <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                        <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                        <g id="SVGRepo_iconCarrier">
                          <metadata id="metadata5">
                            <rdf:rdf>
                              <cc:work>
                                <dc:format>image/svg+xml</dc:format>
                                <dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"></dc:type>
                                <dc:title></dc:title>
                                <dc:date>2021</dc:date>
                                <dc:creator>
                                  <cc:agent>
                                    <dc:title>Timothée Giet</dc:title>
                                  </cc:agent>
                                </dc:creator>
                                <cc:license rdf:resource="http://creativecommons.org/licenses/by-sa/4.0/"></cc:license>
                              </cc:work>
                              <cc:license rdf:about="http://creativecommons.org/licenses/by-sa/4.0/">
                                <cc:permits rdf:resource="http://creativecommons.org/ns#Reproduction"></cc:permits>
                                <cc:permits rdf:resource="http://creativecommons.org/ns#Distribution"></cc:permits>
                                <cc:requires rdf:resource="http://creativecommons.org/ns#Notice"></cc:requires>
                                <cc:requires rdf:resource="http://creativecommons.org/ns#Attribution"></cc:requires>
                                <cc:permits rdf:resource="http://creativecommons.org/ns#DerivativeWorks"></cc:permits>
                                <cc:requires rdf:resource="http://creativecommons.org/ns#ShareAlike"></cc:requires>
                              </cc:license>
                            </rdf:rdf>
                          </metadata>
                          <rect transform="rotate(45)" ry="0" y="-1" x="4.3137083" height="2" width="14" id="rect1006"
                            style="opacity:1;vector-effect:none;fill:var(--text1);fill-opacity:1;stroke:none;stroke-width:4;stroke-linecap:square;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:3.20000005;stroke-opacity:1">
                          </rect>
                          <rect transform="rotate(-45)" ry="0" y="10.313708" x="-7" height="2" width="14"
                            id="rect1006-5"
                            style="opacity:1;vector-effect:none;fill:var(--text1);fill-opacity:1;stroke:none;stroke-width:4;stroke-linecap:square;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:3.20000005;stroke-opacity:1">
                          </rect>
                        </g>
                      </svg></button>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="empty-list-message">
              <svg fill="var(--text1)" height="20px" width="20px" version="1.1" id="Layer_1"
                xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512"
                xml:space="preserve">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <g>
                    <g>
                      <path
                        d="M493.297,159.693c-12.477-30.878-31.231-59.828-56.199-84.792c-24.964-24.967-53.914-43.722-84.793-56.199 C321.426,6.222,288.617,0,255.823,0c-32.748,0-65.497,6.249-96.315,18.743c-30.814,12.491-59.695,31.244-84.607,56.159 c-24.915,24.912-43.668,53.793-56.158,84.607C6.25,190.325,0.001,223.073,0.001,255.823c0,32.794,6.222,65.602,18.701,96.484 c12.477,30.878,31.231,59.828,56.199,84.793c24.964,24.967,53.914,43.722,84.792,56.199c30.882,12.48,63.69,18.701,96.484,18.701 c32.748,0,65.497-6.249,96.314-18.743c30.814-12.49,59.695-31.242,84.607-56.158c24.917-24.913,43.67-53.794,56.16-84.608 c12.493-30.817,18.743-63.566,18.743-96.315C511.999,223.383,505.778,190.575,493.297,159.693z M461.611,339.661 c-10.821,26.683-27.019,51.648-48.659,73.291c-21.643,21.64-46.608,37.837-73.292,48.657 c-26.679,10.818-55.078,16.241-83.484,16.241c-28.477,0-56.947-5.405-83.688-16.213c-26.744-10.813-51.76-27.007-73.441-48.685 c-21.678-21.682-37.873-46.697-48.685-73.441C39.554,312.77,34.149,284.3,34.149,255.823c0-28.406,5.423-56.804,16.241-83.484 c10.821-26.683,27.018-51.648,48.659-73.291c21.643-21.64,46.608-37.837,73.291-48.659c26.679-10.818,55.078-16.241,83.484-16.241 c28.477,0,56.947,5.405,83.688,16.214c26.744,10.813,51.76,27.008,73.441,48.685c21.677,21.681,37.873,46.697,48.685,73.441 c10.808,26.741,16.214,55.211,16.214,83.688C477.852,284.583,472.429,312.981,461.611,339.661z">
                      </path>
                    </g>
                  </g>
                  <g>
                    <g>
                      <path
                        d="M385.946,126.055c-6.524-6.525-17.102-6.525-23.626,0l-36.278,36.278c-7.82-5.861-16.298-10.691-25.249-14.389 c-14.036-5.803-29.225-8.832-44.792-8.83c-15.572-0.002-30.761,3.027-44.797,8.83c-14.037,5.799-26.917,14.372-37.901,25.36 c-11.376,11.375-19.956,24.598-25.656,38.689c-5.704,14.094-8.547,29.054-8.548,44.007c0,14.954,2.843,29.914,8.548,44.007 c3.693,9.131,8.603,17.892,14.691,26.027l-36.285,36.285c-6.524,6.524-6.524,17.102,0,23.627c6.525,6.524,17.102,6.524,23.627,0 l36.278-36.278c7.82,5.861,16.298,10.691,25.249,14.389c14.036,5.803,29.225,8.832,44.792,8.83 c15.572,0.002,30.761-3.027,44.797-8.83c14.037-5.799,26.917-14.372,37.901-25.359c11.376-11.375,19.955-24.599,25.656-38.689 c5.704-14.094,8.547-29.054,8.548-44.007c0-14.954-2.843-29.914-8.548-44.008c-3.693-9.131-8.603-17.892-14.691-26.027 l36.285-36.285C392.47,143.157,392.47,132.579,385.946,126.055z M178.621,287.472c-4.066-10.044-6.108-20.754-6.107-31.471 c0-10.717,2.042-21.428,6.107-31.472c4.07-10.047,10.146-19.431,18.31-27.599c7.908-7.906,17.06-13.98,27.036-18.106 c9.978-4.122,20.783-6.295,32.033-6.296c11.245,0.002,22.051,2.174,32.03,6.297c4.897,2.025,9.593,4.525,14.044,7.476 L186.305,302.069C183.229,297.418,180.669,292.53,178.621,287.472z M333.38,287.472c-4.07,10.047-10.146,19.431-18.31,27.599 c-7.908,7.906-17.06,13.98-27.036,18.106c-9.978,4.122-20.783,6.295-32.033,6.296c-11.245-0.002-22.05-2.174-32.03-6.297 c-4.897-2.025-9.593-4.526-14.044-7.476l115.769-115.769c3.076,4.651,5.636,9.539,7.684,14.597 c4.066,10.044,6.108,20.754,6.107,31.472C339.488,266.717,337.446,277.427,333.38,287.472z">
                      </path>
                    </g>
                  </g>
                </g>
              </svg>
              <p>This list is empty</p>
            </div>
          </div>
        </div>
        <div class="results2"></div>
      </div>
    </div>
    <NotificationPopup ref="notification" />
  </body>
</template>

<script setup>
// @ is an alias to /src
import Header from '@/components/Header.vue'
import Panel from '@/components/panel.vue'
import Summary from '@/components/sidebar/summary.vue'
import EpsTable from '@/components/sidebar/eps.vue'
import EarnTable from '@/components/sidebar/earn.vue'
import SalesTable from '@/components/sidebar/sales.vue'
import DividendsTable from '@/components/sidebar/dividends.vue'
import SplitsTable from '@/components/sidebar/splits.vue'
import Financials from '@/components/sidebar/financialbtn.vue'
import Notes from '@/components/notes.vue'
import News from '@/components/news.vue'
import WatchPanelEditor from '@/components/WatchPanelEditor.vue';
import CreateNote from '@/components/charts/CreateNote.vue'
import CreateWatchlist from '@/components/charts/CreateWatchlist.vue'
import RenameWatchlist from '@/components/charts/RenameWatchlist.vue'
import { reactive, onMounted, onBeforeUnmount, ref, watch, computed, nextTick } from 'vue';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import Loader from '@/components/loader.vue';
import Sortable from 'sortablejs';
import barsIcon from '@/assets/icons/bars.png';
import candlesIcon from '@/assets/icons/candles.png';
import NotificationPopup from '@/components/NotificationPopup.vue';
import { useStore } from 'vuex';

// access user from store 
const store = useStore();
let user = store.getters.getUser;
const apiKey = import.meta.env.VITE_EREUNA_KEY;

// status for loading bars 
const isLoading2 = ref(true);
const isLoading3 = ref(true);
let isChartLoading = ref(false);

const summaryRefreshKey = ref(0);

function handlePanelUpdated() {
  summaryRefreshKey.value++; // This will trigger a prop change
  fetchPanel(); // Also refresh the panel sections if needed
}

// for popup notifications
const notification = ref(null);
const showNotification = () => {
  notification.value.show('This is a custom notification message!');
};

const showDropdown = ref(false);
const showPopup = ref(false) // div for financial statements
const showCreateNoteModal = ref(false)
const showCreateWatchlistModal = ref(false)
const showRenameWatchlistModal = ref(false)

// activates sorting of watchlist elements / drag and drop 
const sortable = ref(null);

function initializeSortable() {
  if (sortable.value) {
    new Sortable(sortable.value, {
      animation: 150,
      onEnd: async function () {
        await UpdateWatchlistOrder();
      }
    });
  }
}

// fetches initial item data (elements of watchlists)
async function fetchItemData(item) {
  await Promise.all([
    getData(item),
    getImagePath(item)
  ]);
}

// function that initializes all components inside watchlist page when you first login 
async function initializeComponent() {
  try {
    isLoading2.value = true;
    isLoading3.value = true;
    await nextTick();

    await Promise.all([
      getWatchlists(),
      filterWatchlist(),
      fetchSymbolsAndExchanges(),
      fetchWatchPanel(),
    ]);

    if (watchlist2.tickers && watchlist2.tickers.length > 0) {
      await Promise.all(watchlist2.tickers.map(fetchItemData));
    }

    await nextTick();
    await Promise.all([
      await searchTicker(),
      await searchNotes(),
      await fetchNews(),
      await fetchHiddenList(),
      await fetchPanel(),
      await fetchTier(),
    ]);

    isLoading2.value = false;
    isLoading3.value = false;

    await nextTick(() => {
      initializeWatchlistNavigation();
      initializeSortable();
    });
  } catch (error) {
    console.error('Initialization error:', error);
    isLoading2.value = false;
  }
}

onMounted(() => {
  initializeComponent();
  nextTick(() => {
    initializeSortable();
  });
});

onMounted(async () => {
  await getWatchlists(),
    await filterWatchlist()
});

// retirves and updates the default symbol for the user 
let defaultSymbol = localStorage.getItem('defaultSymbol');
let selectedItem = defaultSymbol;

const searchQuery = ref('');
const toUpperCase = () => {
  searchQuery.value = searchQuery.value.toUpperCase();
};

async function fetchUserDefaultSymbol() {
  try {
    if (!user) return null;

    const response = await fetch(`/api/${user}/default-symbol`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch default symbol');

    const data = await response.json();
    return data.defaultSymbol;
  } catch (error) {
    error.value = error.message;
    return null;
  }
}

async function updateUserDefaultSymbol(symbol) {
  try {
    if (!user) return;

    const response = await fetch(`/api/${user}/update-default-symbol`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ defaultSymbol: symbol })
    });
  } catch (error) {
    error.value = error.message;
  }
}

// related to summary tables 
const showAllEPS = ref(false);
const showAllEarnings = ref(false);
const showAllSales = ref(false);
const showAllDescription = ref(false);
const minHeight = '50px';

const displayedEPSItems = computed(() => {
  const earnings = assetInfo?.quarterlyEarnings || [];
  if (earnings.length === 0) return [];
  if (earnings.length <= 4) return earnings;
  return showAllEPS.value ? earnings : earnings.slice(0, 4);
});

const displayedEarningsItems = computed(() => {
  const income = assetInfo?.quarterlyFinancials || [];
  if (income.length === 0) return [];
  if (income.length <= 4) return income;
  return showAllEarnings.value ? income : income.slice(0, 4);
});

const displayedSalesItems = computed(() => {
  const income = assetInfo?.quarterlyFinancials || [];
  if (income.length === 0) return [];
  if (income.length <= 4) return income;
  return showAllSales.value ? income : income.slice(0, 4);
});

const showEPSButton = computed(() => {
  return (assetInfo?.quarterlyEarnings?.length || 0) > 4;
});

const showEarningsButton = computed(() => {
  return (assetInfo?.quarterlyFinancials?.length || 0) > 4;
});

const showSalesButton = computed(() => {
  return (assetInfo?.quarterlyFinancials?.length || 0) > 4;
});

const displayedDividendsItems = computed(() => {
  const dividends = DividendsDate.value || [];
  if (dividends.length === 0) return [];
  if (dividends.length <= 4) return dividends;
  return showAllDividends.value ? dividends : dividends.slice(0, 4);
});

const showDividendsButton = computed(() => {
  return (DividendsDate.value?.length || 0) > 4;
});

const showAllDividends = ref(false);

const displayedSplitsItems = computed(() => {
  const splits = SplitsDate.value || [];
  if (splits.length === 0) return [];
  if (splits.length <= 4) return splits;
  return showAllSplits.value ? splits : splits.slice(0, 4);
});

const showSplitsButton = computed(() => {
  return (SplitsDate.value?.length || 0) > 4;
});

const showAllSplits = ref(false);

const isInitializing = ref(true);

// function that searches for tickers
async function searchTicker(providedSymbol) {
  let response;
  activeIndex.value = -1;
  try {
    isChartLoading.value = true;
    const searchbar = document.getElementById('searchbar');
    let symbol = (searchbar.value || defaultSymbol).toUpperCase();

    response = await fetch(`/api/chart/${symbol}`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (response.status === 404) {
      notification.value.show('Ticker not Found');
      isChartLoading.value = false;
      return;
    }

    const data = await response.json();

    searchbar.value = data.Symbol;
    localStorage.setItem('defaultSymbol', data.Symbol);
    defaultSymbol = data.Symbol;
    selectedItem = data.Symbol;
    await updateUserDefaultSymbol(data.Symbol);

    // Set assetInfo fields, using '-' or [] for missing values
    Object.keys(assetInfo).forEach(key => {
      if (Array.isArray(assetInfo[key])) {
        assetInfo[key] = Array.isArray(data[key]) ? data[key] : [];
      } else if (
        data[key] === undefined ||
        data[key] === null ||
        data[key] === 0 ||
        (typeof data[key] === 'number' && Number.isNaN(data[key])) ||
        (typeof data[key] === 'string' && data[key].toLowerCase() === 'NaN')
      ) {
        assetInfo[key] = '-';
      } else {
        assetInfo[key] = data[key];
      }
    });

  } catch (err) {
    isChartLoading.value = false;
    error.value = err.message;
  } finally {
    if (response && response.status !== 404) {
      await searchNotes();
      await fetchNews();
      await fetchData();
      await fetchData3();
      await fetchData7();
      await fetchData9();
      await fetchSplitsDate();
      await fetchDividendsDate();
      await fetchFinancials();
      console.log(data4.value);
    }
    isChartLoading.value = false;
  }
}

const assetInfo = reactive({
  Name: '-',
  ISIN: '-',
  AssetType: '-',
  Sector: '-',
  Exchange: '-',
  Industry: '-',
  MarketCap: '-',
  SharesOutstanding: '-',
  PEGRatio: '-',
  PERatio: '-',
  ForwardPE: '-',
  PriceToBookRatio: '-',
  TrailingPE: '-',
  WeekHigh: '-',
  WeekLow: '-',
  Country: '-',
  Address: '-',
  Beta: '-',
  BookValue: '-',
  DividendYield: '-',
  DividendDate: '-',
  quarterlyEarnings: [],
  annualEarnings: [],
  quarterlyFinancials: [],
  annualFinancials: [],
  Symbol: '-',
  RSScore1W: '-',
  RSScore1M: '-',
  RSScore4M: '-',
  IPO: '-',
  Description: '-',
  RSI: '-',
  Gap: '-',
  ADV1W: '-',
  ADV1M: '-',
  ADV4M: '-',
  ADV1Y: '-',
  PriceToSalesRatio: '-',
  AlltimeLow: '-',
  AlltimeHigh: '-',
  percoff52WeekLow: '-',
  percoff52WeekHigh: '-',
  fiftytwoWeekLow: '-',
  fiftytwoWeekHigh: '-',
  RelVolume6M: '-',
  RelVolume1Y: '-',
  RelVolume1M: '-',
  RelVolume1W: '-',
  AvgVolume6M: '-',
  AvgVolume1Y: '-',
  AvgVolume1M: '-',
  AvgVolume1W: '-',
});

//takes date strings inside database and converts them into actual date, in italian format
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'numeric', day: 'numeric' };
  return date.toLocaleDateString('it-IT', options);
}

//converts floats to percentage (%) for info box
function calculatePercentageChange(currentValue, previousValue) {
  const change = currentValue - previousValue;
  let percentageChange;
  if (previousValue < 0) {
    // If previousValue is negative, flip the sign of the change
    percentageChange = (change / Math.abs(previousValue)) * 100;
  } else {
    percentageChange = (change / previousValue) * 100;
  }
  return percentageChange.toFixed(2);
}

function calculateQoQ1(reportedEPS) {
  if (!reportedEPS) return null;
  const quarterlyEarnings = assetInfo.quarterlyEarnings;
  if (!quarterlyEarnings) return null;
  const index = quarterlyEarnings.findIndex(earnings => earnings.reportedEPS === reportedEPS);
  if (index === -1) return null;
  const previousQuarterlyEarnings = quarterlyEarnings[index + 1];
  if (!previousQuarterlyEarnings) return null;
  const previousReportedEPS = previousQuarterlyEarnings.reportedEPS;
  if (previousReportedEPS === undefined) return null;
  let percentageChange;
  if (previousReportedEPS < 0) {
    percentageChange = ((reportedEPS - previousReportedEPS) / Math.abs(previousReportedEPS)) * 100;
  } else {
    percentageChange = ((reportedEPS - previousReportedEPS) / previousReportedEPS) * 100;
  }
  return percentageChange.toFixed(2);
}

function calculateYoY1(reportedEPS) {
  if (!reportedEPS) return null;
  const earnings = assetInfo.quarterlyEarnings;
  if (!earnings) return null;
  const index = earnings.findIndex(earnings => earnings.reportedEPS === reportedEPS);
  if (index === -1) return null;
  const previousEarnings = earnings[index + 4];
  if (!previousEarnings) return null;
  const previousReportedEPS = previousEarnings.reportedEPS;
  if (previousReportedEPS === undefined) return null;
  let percentageChange;
  if (previousReportedEPS < 0) {
    percentageChange = ((reportedEPS - previousReportedEPS) / Math.abs(previousReportedEPS)) * 100;
  } else {
    percentageChange = ((reportedEPS - previousReportedEPS) / previousReportedEPS) * 100;
  }
  return percentageChange.toFixed(2);
}

function getQoQClass(percentageChange) {
  return percentageChange > 20 ? 'green' : 'red';
}

function getYoYClass(percentageChange) {
  return percentageChange > 20 ? 'green' : 'red';
}

function calculateQoQ2(netIncome) {
  if (!netIncome) return null;
  const quarterlyIncome = assetInfo.quarterlyFinancials;
  if (!quarterlyIncome) return null;
  const index = quarterlyIncome.findIndex(quarterlyReport => quarterlyReport.netIncome === netIncome);
  if (index === -1) return null;
  const previousQuarterlyIncome = quarterlyIncome[index + 1];
  if (!previousQuarterlyIncome) return null;
  const previousReportedIncome = previousQuarterlyIncome.netIncome;
  if (previousReportedIncome === undefined) return null;
  let percentageChange;
  if (previousReportedIncome < 0) {
    percentageChange = ((netIncome - previousReportedIncome) / Math.abs(previousReportedIncome)) * 100;
  } else {
    percentageChange = ((netIncome - previousReportedIncome) / previousReportedIncome) * 100;
  }
  return percentageChange.toFixed(2);
}

function calculateYoY2(netIncome) {
  if (!netIncome) return null;
  const quarterlyIncome = assetInfo.quarterlyFinancials;
  if (!quarterlyIncome) return null;
  const index = quarterlyIncome.findIndex(quarterlyReport => quarterlyReport.netIncome === netIncome);
  if (index === -1) return null;
  const previousQuarterlyIncome = quarterlyIncome[index + 4];
  if (!previousQuarterlyIncome) return null;
  const previousReportedIncome = previousQuarterlyIncome.netIncome;
  if (previousReportedIncome === undefined) return null;
  let percentageChange;
  if (previousReportedIncome < 0) {
    percentageChange = ((netIncome - previousReportedIncome) / Math.abs(previousReportedIncome)) * 100;
  } else {
    percentageChange = ((netIncome - previousReportedIncome) / previousReportedIncome) * 100;
  }
  return percentageChange.toFixed(2);
}

function calculateQoQ3(totalRevenue) {
  if (!totalRevenue) return null;
  const quarterlyIncome = assetInfo.quarterlyFinancials;
  if (!quarterlyIncome) return null;
  const index = quarterlyIncome.findIndex(quarterlyReport => quarterlyReport.totalRevenue === totalRevenue);
  if (index === -1) return null;
  const previousQuarterlyIncome = quarterlyIncome[index + 1];
  if (!previousQuarterlyIncome) return null;
  const previousReportedRevenue = previousQuarterlyIncome.totalRevenue;
  if (previousReportedRevenue === undefined) return null;
  let percentageChange;
  if (previousReportedRevenue < 0) {
    percentageChange = ((totalRevenue - previousReportedRevenue) / Math.abs(previousReportedRevenue)) * 100;
  } else {
    percentageChange = ((totalRevenue - previousReportedRevenue) / previousReportedRevenue) * 100;
  }
  return percentageChange.toFixed(2);
}

function calculateYoY3(totalRevenue) {
  if (!totalRevenue) return null;
  const quarterlyIncome = assetInfo.quarterlyFinancials;
  if (!quarterlyIncome) return null;
  const index = quarterlyIncome.findIndex(quarterlyReport => quarterlyReport.totalRevenue === totalRevenue);
  if (index === -1) return null;
  const previousQuarterlyIncome = quarterlyIncome[index + 4];
  if (!previousQuarterlyIncome) return null;
  const previousReportedRevenue = previousQuarterlyIncome.totalRevenue;
  if (previousReportedRevenue === undefined) return null;
  let percentageChange;
  if (previousReportedRevenue < 0) {
    percentageChange = ((totalRevenue - previousReportedRevenue) / Math.abs(previousReportedRevenue)) * 100;
  } else {
    percentageChange = ((totalRevenue - previousReportedRevenue) / previousReportedRevenue) * 100;
  }
  return percentageChange.toFixed(2);
}

function calculateNet(netIncome) {
  if (!netIncome) return null;
  const quarterlyIncome = assetInfo.quarterlyFinancials;
  if (!quarterlyIncome) return null;
  const index = quarterlyIncome.findIndex(quarterlyReport => quarterlyReport.netIncome === netIncome);
  if (index === -1) return null;
  const previousQuarterlyIncome = quarterlyIncome[index + 1];
  if (!previousQuarterlyIncome) return null;
  const previousReportedIncome = previousQuarterlyIncome.netIncome;
  if (previousReportedIncome === undefined) return null;
  let percentageChange;
  if (previousReportedIncome < 0) {
    percentageChange = ((netIncome - previousReportedIncome) / Math.abs(previousReportedIncome)) * 100;
  } else {
    percentageChange = ((netIncome - previousReportedIncome) / previousReportedIncome) * 100;
  }
  return percentageChange.toFixed(2);
}

function calculateRev(totalRevenue) {
  if (!totalRevenue) return null;
  const quarterlyIncome = assetInfo.quarterlyFinancials;
  if (!quarterlyIncome) return null;
  const index = quarterlyIncome.findIndex(quarterlyReport => quarterlyReport.totalRevenue === totalRevenue);
  if (index === -1) return null;
  const previousQuarterlyIncome = quarterlyIncome[index + 1];
  if (!previousQuarterlyIncome) return null;
  const previousReportedRevenue = previousQuarterlyIncome.totalRevenue;
  if (previousReportedRevenue === undefined) return null;
  let percentageChange;
  if (previousReportedRevenue < 0) {
    percentageChange = ((totalRevenue - previousReportedRevenue) / Math.abs(previousReportedRevenue)) * 100;
  } else {
    percentageChange = ((totalRevenue - previousReportedRevenue) / previousReportedRevenue) * 100;
  }
  return percentageChange.toFixed(2);
}

// related to notes 
const BeautifulNotes = ref([]);
const BeautifulNews = ref([]);
const loading = ref(false);
const error = ref(null);

async function searchNotes() {
  try {
    const Username = user;
    const searchbar = document.getElementById('searchbar');
    const symbol = searchbar.value || defaultSymbol;
    const response = await fetch(`/api/${Username}/${symbol}/notes`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    const data = await response.json();
    BeautifulNotes.value = data;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function fetchNews() {
  try {
    const searchbar = document.getElementById('searchbar');
    const symbol = searchbar.value || defaultSymbol;
    const response = await fetch(`/api/${symbol}/news`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    const data = await response.json();
    BeautifulNews.value = data;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function removeNote(_id, note) {
  const Username = user;
  const symbol = document.getElementById('searchbar').value || defaultSymbol;
  const noteId = _id;

  try {
    const response = await fetch(`/api/${symbol}/notes/${noteId}?user=${Username}`, {
      method: 'DELETE',
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    if (response.ok) {
      BeautifulNotes.value = BeautifulNotes.value.filter((n) => n._id !== noteId);
    } else {
    }
  } catch (err) {
    error.value = err.message;
  }
  await searchNotes();
}

async function showTicker() {
  try {
    let symbol;
    {
      symbol = defaultSymbol;
      const response = await fetch(`/api/chart/${symbol}`, {
        headers: {
          'X-API-KEY': apiKey,
        },
      });
      const data = await response.json();

      assetInfo.Name = data.Name;
      assetInfo.ISIN = data.ISIN;
      assetInfo.Symbol = data.Symbol;
      assetInfo.Sector = data.Sector;
      assetInfo.Industry = data.Industry;
      assetInfo.MarketCapitalization = data.MarketCapitalization;
      assetInfo.SharesOutstanding = data.SharesOutstanding;
      assetInfo.Country = data.Country;
      assetInfo.AssetType = data.AssetType;
      assetInfo.Address = data.Address;
      assetInfo.Description = data.Description
      assetInfo.Currency = data.Currency;
      assetInfo.Beta = data.Beta;
      assetInfo.BookValue = data.BookValue;
      assetInfo.DividendYield = data.DividendYield;
      assetInfo.DividendDate = data.DividendDate;
      assetInfo.Exchange = data.Exchange;
      assetInfo.PEGRatio = data.PEGRatio;
      assetInfo.PERatio = data.PERatio;
      assetInfo.Exchange = data.Exchange;
      assetInfo.ForwardPE = data.ForwardPE;
      assetInfo.PriceToBookRatio = data.PriceToBookRatio;
      assetInfo.TrailingPE = data.TrailingPE;
      assetInfo.WeekHigh = data.WeekHigh;
      assetInfo.WeekLow = data.WeekLow;
      assetInfo.quarterlyEarnings = data.quarterlyEarnings;
      assetInfo.annualEarnings = data.annualEarnings;
      assetInfo.quarterlyFinancials = data.quarterlyFinancials;
      assetInfo.annualFinancials = data.annualFinancials;
      assetInfo.RSScore1W = data.RSScore1W;
      assetInfo.RSScore1M = data.RSScore1M;
      assetInfo.RSScore4M = data.RSScore4M;
      assetInfo.IPO = data.IPO;
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    await searchNotes();
    await fetchNews();
    await fetchData();
    await fetchData3();
    await fetchData7();
    await fetchData9();
  }
}

async function fetchSplitsDate() {
  try {
    let ticker = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${ticker}/splitsdate`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const newSplitsDate = await response.json();
    SplitsDate.value = newSplitsDate;

  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    error.value = error.message;
  }
}

async function fetchDividendsDate() {
  try {
    let ticker = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${ticker}/dividendsdate`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const newDividendsDate = await response.json();
    DividendsDate.value = newDividendsDate;

  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    error.value = error.message;
  }
}

const data = ref([]); // Daily OHCL Data
const data2 = ref([]); // Daily Volume Data
const data3 = ref([]); // daily 10MA
const data4 = ref([]); // daily 20MA
const data5 = ref([]); // daily 50MA
const data6 = ref([]); // daily 200MA
const data7 = ref([]); // Weekly OHCL Data
const data8 = ref([]); // Weekly Volume Data
const data9 = ref([]); // weekly 10MA
const data10 = ref([]); // weekly 20MA
const data11 = ref([]); // weekly 50MA
const data12 = ref([]); // weekly 200MA
const SplitsDate = ref([]); // Splits Data - just date
const DividendsDate = ref([]); // Dividends Data 

async function fetchData() {
  try {
    let symbol = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${symbol}/data`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const chartData = await response.json();
    // Directly assign the arrays from the backend to your refs
    data.value = chartData.ohlc || [];
    data2.value = chartData.volume || [];
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    error.value = error.message;
  }
}

async function fetchData3() {
  try {
    let symbol = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${symbol}/data3`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      data3.value = null;
      data4.value = null;
      data5.value = null;
      data6.value = null;
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const maData = await response.json();

    // Assign each MA to the correct variable
    data3.value = maData.MA10 && maData.MA10.length ? maData.MA10 : null;
    data4.value = maData.MA20 && maData.MA20.length ? maData.MA20 : null;
    data5.value = maData.MA50 && maData.MA50.length ? maData.MA50 : null;
    data6.value = maData.MA200 && maData.MA200.length ? maData.MA200 : null;

  } catch (error) {
    if (error.name === 'AbortError') return;
    data3.value = null;
    data4.value = null;
    data5.value = null;
    data6.value = null;
    error.value = error.message;
  }
}

async function fetchData7() {
  try {
    let symbol = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${symbol}/data7`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const chartData = await response.json();
    data7.value = chartData.ohlc2 || [];
    data8.value = chartData.volume2 || [];
  } catch (error) {
    if (error.name === 'AbortError') return;
    error.value = error.message;
  }
}

async function fetchData9() {
  try {
    let symbol = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${symbol}/data9`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      data9.value = null;
      data10.value = null;
      data11.value = null;
      data12.value = null;
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const maData = await response.json();

    // Assign each MA to the correct variable
    data9.value = maData.MA10 && maData.MA10.length ? maData.MA10 : null;
    data10.value = maData.MA20 && maData.MA20.length ? maData.MA20 : null;
    data11.value = maData.MA50 && maData.MA50.length ? maData.MA50 : null;
    data12.value = maData.MA200 && maData.MA200.length ? maData.MA200 : null;

  } catch (error) {
    if (error.name === 'AbortError') return;
    data9.value = null;
    data10.value = null;
    data11.value = null;
    data12.value = null;
    error.value = error.message;
  }
}

let chartView = ref('Daily Chart');
let useAlternateData = false;
const isLoading = ref(true)
const charttype = ref('Candlestick')
const isBarChart = ref(false);

const chartTypeIcon = computed(() => {
  return isBarChart.value ? candlesIcon : barsIcon;
});

function toggleChartType() {
  isBarChart.value = !isBarChart.value;
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

const mainchart = ref(null);
const chartInstance = ref(null);
const mainchartMobile = ref(null);
const isMobile = ref(window.innerWidth <= 1150);
const showMA1 = ref(true);
const showMA2 = ref(true);
const showMA3 = ref(true);
const showMA4 = ref(true);

function getChartDimensions() {
  return isMobile.value
    ? { width: mainchartMobile.value?.offsetWidth || 400, height: 200 }
    : { width: mainchart.value?.offsetWidth || 500, height: mainchart.value?.offsetHeight || 550 };
}

function resizeChart() {
  if (chartInstance.value) {
    const { width, height } = getChartDimensions();
    chartInstance.value.applyOptions({ width, height });
  }
}

// mounts chart (including volume)
onMounted(async () => {
  try {
    isInitializing.value = true;
    localStorage.removeItem('defaultSymbol');

    selectedItem = await fetchUserDefaultSymbol();
    if (selectedItem) {
      defaultSymbol = selectedItem;
      localStorage.setItem('defaultSymbol', selectedItem);
    }
    await showTicker();
    await nextTick()
    const chartDiv = isMobile.value ? mainchartMobile.value : mainchart.value;
    const { width, height } = getChartDimensions();
    const chart = createChart(chartDiv, {
      height,
      width,
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
          color: theme.accent1,
          labelBackgroundColor: theme.accent1,
        },
        horzLine: {
          color: theme.accent1,
          labelBackgroundColor: theme.accent1,
        },
      },
      timeScale: {
        barSpacing: 2.5,
        minBarSpacing: 0.1,
        rightOffset: 20,
      },
    });
    chartInstance.value = chart;

    let barSeries = chart.addCandlestickSeries({
      downColor: theme.negative,
      upColor: theme.positive,
      borderDownColor: theme.negative,
      borderUpColor: theme.positive,
      wickDownColor: theme.negative,
      wickUpColor: theme.positive,
      priceLineVisible: true,
    });

    function toggleChartType() {
      // Remove the existing series
      chart.removeSeries(barSeries);

      if (isBarChart.value) {
        // Create a bar series
        barSeries = chart.addBarSeries({
          downColor: theme.negative,
          upColor: theme.positive,
          priceLineVisible: true,
        });
      } else {
        // Create a candlestick series
        barSeries = chart.addCandlestickSeries({
          downColor: theme.negative,
          upColor: theme.positive,
          borderDownColor: theme.negative,
          borderUpColor: theme.positive,
          wickDownColor: theme.negative,
          wickUpColor: theme.positive,
          priceLineVisible: true,
        });
      }

      // Update the data for the new series
      const currentData = useAlternateData ? data7.value : data.value;
      const changes = calculateChanges(currentData);
      barSeries.setData(changes);
    }

    // Watch for changes in the chart type
    watch(isBarChart, () => {
      toggleChartType();
    });

    // Update the existing watchers (keep these as they were)
    watch(data, (newData) => {
      const changes = calculateChanges(newData);
      if (!useAlternateData) {
        barSeries.setData(changes);
        updateLastRecordedValue(changes);
      }
    });

    watch(data7, (newData7) => {
      const changes = calculateChanges(newData7);
      if (useAlternateData) {
        barSeries.setData(changes);
        updateLastRecordedValue(changes);
      }
    });

    // Modified toggleChartTypeUI function
    function toggleChartTypeUI() {
      isBarChart.value = !isBarChart.value;
      toggleChartType();
    }

    const Histogram = chart.addHistogramSeries({
      color: theme.volume,
      priceLineVisible: true,
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    const MaSeries1 = chart.addLineSeries({
      color: theme.ma1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      lineWidth: 1,
    });

    const MaSeries2 = chart.addLineSeries({
      color: theme.ma2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      lineWidth: 1,
    });

    const MaSeries3 = chart.addLineSeries({
      color: theme.ma3,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      lineWidth: 1,
    });

    const MaSeries4 = chart.addLineSeries({
      color: theme.ma4,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      lineWidth: 1,
    });

    Histogram.priceScale().applyOptions({
      scaleMargins: {
        top: 0.9,
        bottom: 0,
      }
    });

    let lastRecordedValue = null;

    function updateLastRecordedValue(changes) {
      if (chartView.value === 'Daily Chart') {
        lastRecordedValue = changes[changes.length - 1];
      } else if (chartView.value === 'Weekly Chart') {
        lastRecordedValue = changes[changes.length - 1];
      }
      updateFirstRow(lastRecordedValue);
    }

    watch(data, (newData) => {
      const changes = calculateChanges(newData);
      if (!useAlternateData) {
        barSeries.setData(changes);
        updateLastRecordedValue(changes);
      }
    });

    watch(data7, (newData7) => {
      const changes = calculateChanges(newData7);
      if (useAlternateData) {
        barSeries.setData(changes);
        updateLastRecordedValue(changes);
      }
    });

    watch(data2, (newData2) => {
      if (!useAlternateData) {
        Histogram.setData(newData2);
      }
    });

    watch(data8, (newData8) => {
      if (useAlternateData) {
        Histogram.setData(newData8);
      }
    });

    watch(data3, (newData3) => {
      if (newData3 === null) {
        MaSeries1.setData([]); // Clear the series data
      } else if (!useAlternateData) {
        MaSeries1.setData(newData3);
      }
    });

    watch(data4, (newData4) => {
      if (newData4 === null) {
        MaSeries2.setData([]); // Clear the series data
      } else if (!useAlternateData) {
        MaSeries2.setData(newData4);
      }
    });

    watch(data5, (newData5) => {
      if (newData5 === null) {
        MaSeries3.setData([]); // Clear the series data
      } else if (!useAlternateData) {
        MaSeries3.setData(newData5);
      }
    });

    watch(data6, (newData6) => {
      if (newData6 === null) {
        MaSeries4.setData([]); // Clear the series data
      } else if (!useAlternateData) {
        MaSeries4.setData(newData6);
      }
    });

    watch(data9, (newData9) => {
      if (newData9 === null) {
        MaSeries1.setData([]); // Clear the series data
      } else if (useAlternateData) {
        MaSeries1.setData(newData9);
      }
    });

    watch(data10, (newData10) => {
      if (newData10 === null) {
        MaSeries2.setData([]); // Clear the series data
      } else if (useAlternateData) {
        MaSeries2.setData(newData10);
      }
    });

    watch(data11, (newData11) => {
      if (newData11 === null) {
        MaSeries3.setData([]); // Clear the series data
      } else if (useAlternateData) {
        MaSeries3.setData(newData11);
      }
    });

    watch(data12, (newData12) => {
      if (newData12 === null) {
        MaSeries4.setData([]); // Clear the series data
      } else if (useAlternateData) {
        MaSeries4.setData(newData12);
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

    // Watch for visibility changes and set series visibility
    watch(showMA1, (visible) => {
      MaSeries1.applyOptions({ visible });
    });
    watch(showMA2, (visible) => {
      MaSeries2.applyOptions({ visible });
    });
    watch(showMA3, (visible) => {
      MaSeries3.applyOptions({ visible });
    });
    watch(showMA4, (visible) => {
      MaSeries4.applyOptions({ visible });
    });

    // Set initial visibility
    MaSeries1.applyOptions({ visible: showMA1.value });
    MaSeries2.applyOptions({ visible: showMA2.value });
    MaSeries3.applyOptions({ visible: showMA3.value });
    MaSeries4.applyOptions({ visible: showMA4.value });


    function calculateChanges(dataPoints) {
      const changes = [];
      for (let i = 0; i < dataPoints.length; i++) {
        const currentPoint = dataPoints[i];
        const previousPoint = i > 0 ? dataPoints[i - 1] : null;
        let change = 0;
        let percentageChange = 0;

        if (previousPoint) {
          change = currentPoint.close - previousPoint.close;
          percentageChange = (change / previousPoint.close) * 100;
        }

        changes.push({
          time: currentPoint.time,
          open: currentPoint.open,
          high: currentPoint.high,
          low: currentPoint.low,
          close: currentPoint.close,
          change: change.toFixed(2),
          percentageChange: percentageChange.toFixed(2) + '%',
        });
      }
      return changes;
    }

    watch(data, (newData) => {
      const changes = calculateChanges(newData);
      barSeries.setData(changes);
    });

    function calculateAverageVolume(data, index) {
      const windowSize = 365; // adjust this value to change the window size for calculating average volume
      const start = Math.max(0, index - windowSize + 1);
      const end = index + 1;
      const sum = data.slice(start, end).reduce((acc, current) => acc + current.value, 0);
      return sum / (end - start);
    }

    const container = document.getElementById('legend');
    const firstRow = document.createElement('div');
    container.appendChild(firstRow);

    function updateFirstRow(value) {
      if (value) {
        const priceOpen = value.open.toFixed(2);
        const priceHigh = value.high.toFixed(2);
        const priceLow = value.low.toFixed(2);
        const priceClose = value.close.toFixed(2);
        const priceChange = value.change;
        const changePerc = value.percentageChange;

        // Check if the current candle is up or down
        const isUp = priceClose > priceOpen;
        const className = isUp ? 'positive' : 'negative';

        firstRow.innerHTML = `
      <strong class="${className}"><span style="color: var(--text1)">Open:</span> ${priceOpen}</strong>
      <strong class="${className}"><span style="color: var(--text1)">High:</span> ${priceHigh}</strong>
      <strong class="${className}"><span style="color: var(--text1)">Low:</span> ${priceLow}</strong>
      <strong class="${className}"><span style="color: var(--text1)">Close:</span> ${priceClose}</strong>
      <strong class="${className}">${priceChange}</strong>
      <strong class="${className}">${changePerc}</strong>
    `;
      }
    }

    chart.subscribeCrosshairMove(param => {
      if (param.time) {
        let changes;
        if (chartView.value === 'Daily Chart') {
          changes = calculateChanges(data.value);
        } else if (chartView.value === 'Weekly Chart') {
          changes = calculateChanges(data7.value); // Use weekly data for weekly chart view
        }

        const currentChange = changes.find(change => change.time === param.time);
        if (currentChange) {
          const priceOpen = currentChange.open.toFixed(2);
          const priceHigh = currentChange.high.toFixed(2);
          const priceLow = currentChange.low.toFixed(2);
          const priceClose = currentChange.close.toFixed(2);
          const priceChange = currentChange.change;
          const changePerc = currentChange.percentageChange;

          // Check if the current candle is up or down
          const isUp = priceClose > priceOpen;
          const className = isUp ? 'positive' : 'negative';

          firstRow.innerHTML = `
        <strong class="${className}"><span style="color: ${theme.text1}">Open:</span> ${priceOpen}</strong>
        <strong class="${className}"><span style="color: ${theme.text1}">High:</span> ${priceHigh}</strong>
        <strong class="${className}"><span style="color:${theme.text1}">Low:</span> ${priceLow}</strong>
        <strong class="${className}"><span style="color: ${theme.text1}">Close:</span> ${priceClose}</strong>
        <strong class="${className}">${priceChange}</strong>
        <strong class="${className}">${changePerc}</strong>
      `;
        }
      }

    });

    function calculateReturns(data) {
      const returns = {};
      const periods = ['1W', '1M', '3M', '6M', '1Y', '3Y', '5Y'];

      periods.forEach((period) => {
        let initialValue;
        let finalValue;

        // Get the last (most recent) closing price
        finalValue = data[data.length - 1]?.close || 0;

        switch (period) {
          case '1W':
            // 5 trading days
            initialValue = data[data.length - 5]?.close || 0;
            break;
          case '1M':
            // ~21 trading days
            initialValue = data[data.length - 21]?.close || 0;
            break;
          case '3M':
            // ~63 trading days
            initialValue = data[data.length - 63]?.close || 0;
            break;
          case '6M':
            // ~126 trading days
            initialValue = data[data.length - 126]?.close || 0;
            break;
          case '1Y':
            // ~252 trading days
            initialValue = data[data.length - 252]?.close || 0;
            break;
          case '3Y':
            // ~756 trading days
            initialValue = data[data.length - 756]?.close || 0;
            break;
          case '5Y':
            // ~1260 trading days
            initialValue = data[data.length - 1260]?.close || 0;
            break;
          default:
            break;
        }

        if (initialValue > 0) {
          const returnPercentage = ((finalValue - initialValue) / initialValue * 100).toFixed(2) + '%';
          returns[period] = returnPercentage;
        } else {
          returns[period] = '-';
        }
      });

      return returns;
    }

    const legend3 = document.getElementById('legend3');

    function updateLegend3(data) {
      const returns = calculateReturns(data);
      let html = '';

      Object.keys(returns).forEach((period) => {
        const isUp = parseFloat(returns[period].replace('%', '')) > 0;
        const className = isUp ? 'positive' : 'negative';

        html += `
      <strong style="color: ${theme.text1}">${period}: <span class="${className}">${returns[period]}</span></strong>
    `;
      });

      legend3.innerHTML = html;
    }

    await fetchData();
    await fetchData3();
    await fetchData7();
    await fetchData9();
    updateLegend3(data.value);
    isLoading.value = false

    watch(data, (newData) => {
      updateLegend3(newData);
    });

  } catch (error) {
  } finally {
    isInitializing.value = false;
  }

  window.addEventListener('resize', resizeChart);

});

async function toggleChartView() {
  isLoading.value = true;
  chartView.value = chartView.value === 'Daily Chart' ? 'Weekly Chart' : 'Daily Chart';
  useAlternateData = !useAlternateData;
  await fetchData();
  await fetchData3();
  await fetchData7();
  await fetchData9();
  isLoading.value = false;
}

const watchlist = reactive([]); // dynamic list containing watchlist names for every user 
const watchlist2 = reactive([]); // dynamic list containing content of watchlists
const quotes = reactive({}); // dynamic list containing quotes for elements of watchlist
const changes = reactive({}); // dynamic list containing price changes for elements of watchlist
const perc = reactive({}); // dynamic list containing % changes for elements of watchlist
const selectedWatchlist = ref(JSON.parse(localStorage.getItem('selectedWatchlist')) || null);

function updateSelectedWatchlist(watch) {
  selectedWatchlist.value = watch;
  localStorage.setItem('selectedWatchlist', JSON.stringify(watch));
}

const showCreateWatchlist = ref(false)
const showRenameWatchlist = ref(false)
const showCreateNote = ref(false)

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart);
});

// generates all watchlist names 
async function getWatchlists() {
  try {
    user = store.getters.getUser;
    if (!user) {
      return;
    }
    try {
      const response = await fetch(`/api/${user}/watchlists`, {
        headers: {
          'X-API-KEY': apiKey,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      watchlist.tickers = data;

      // If no watchlist is selected, select the first one
      if (!selectedWatchlist.value && data.length > 0) {
        updateSelectedWatchlist(data[0]);
      } else if (selectedWatchlist.value) {
        // Find the current selectedWatchlist in the new data
        const updatedSelectedWatchlist = data.find(w => w.Name === selectedWatchlist.value.Name);
        if (updatedSelectedWatchlist) {
          updateSelectedWatchlist(updatedSelectedWatchlist);
        } else if (data.length > 0) {
          // If the previously selected watchlist is not found, select the first one
          updateSelectedWatchlist(data[0]);
        }
      }
    } catch (error) {
      watchlist.tickers = [];
      error.value = error.message;
    }
  } catch (error) {
  }
}

// generates the current watchlist tickers 
async function filterWatchlist(watch) {
  if (watch) {
    updateSelectedWatchlist(watch);
  }

  try {
    const response = await fetch(`/api/${user}/watchlists/${selectedWatchlist.value.Name}`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    const data = await response.json();
    watchlist2.tickers = data;
    isLoading2.value = true;
    // Fetch data for each ticker in the updated watchlist
    await Promise.all(watchlist2.tickers.map(ticker => fetchItemData(ticker)));
    isLoading2.value = false;
    await nextTick(() => {
      initializeWatchlistNavigation();
      initializeSortable(); // Reinitialize Sortable after data updates
    });
  } catch (error) {
    isLoading2.value = false;
    error.value = error.message;
  }
}

const ImagePaths = ref([]);

// Async function to fetch symbols and exchanges and fills ImagePaths 
async function fetchSymbolsAndExchanges() {
  try {
    const response = await fetch(`/api/symbols-exchanges`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Map the data to the required format for ImagePaths
    ImagePaths.value = data.map(item => ({
      symbol: item.Symbol,
      exchange: item.Exchange,
    }));
  } catch (error) {
    error.value = error.message;
  }
}

// Helper function to get image path based on symbol
function getImagePath(item) {
  // Find the matching object in ImagePaths
  const matchedImageObject = ImagePaths.value.find(image =>
    image.symbol === item
  );

  // If a matching object is found and the symbol exists
  if (matchedImageObject) {
    let finalUrl = new URL(`/src/assets/images/${matchedImageObject.exchange}/${matchedImageObject.symbol}.svg`, import.meta.url).href;
    return finalUrl;
  }
}

async function getData(item) {
  try {
    const response = await fetch(`/api/${item}/data-values`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Assign the values to the reactive objects
    quotes[item] = parseFloat(data.close).toFixed(2);
    changes[item] = parseFloat(data.closeDiff);
    perc[item] = parseFloat(data.percentChange);

  } catch (error) {
    error.value = error.message;
  }
}

async function DeleteWatchlist(watch) {
  const currentWatchlistName = watch.Name;

  // Set up the API request
  const apiUrl = `/api/${user}/delete/watchlists/${currentWatchlistName}`;
  const requestOptions = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({ currentWatchlistName })
  };

  try {
    // Send the request
    const response = await fetch(apiUrl, requestOptions);
    const data = await response.json();

  } catch (error) {
    error.value = error.message;
  }
  await getWatchlists();
  await filterWatchlist();
}

async function deleteTicker(item) {
  const realwatchlist = document.getElementById('realwatchlist');
  let selectedWatchlistName;

  // Get the selected watchlist name from the DOM
  const selectedWatchlistElement = document.getElementById('realwatchlist').querySelector('div.selected');
  if (selectedWatchlistElement) {
    const watchlistNameElement = selectedWatchlistElement.querySelector('span.badge').previousSibling;
    selectedWatchlistName = watchlistNameElement.textContent.trim();
  } else {
    return;
  }

  const ticker = item; // The ticker to delete

  const patchData = {
    watchlist: selectedWatchlistName,
    ticker: ticker
  };

  try {
    const response = await fetch(`/api/${user}/deleteticker/watchlists/${patchData.watchlist}/${patchData.ticker}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(patchData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete ticker: ${response.status}`);
    }

    const data = await response.json();
  } catch (error) {
    error.value = error.message;
  }

  // Refresh the watchlists after deletion
  await getWatchlists();
  await filterWatchlist();
  await getFullWatchlists(user);
}

async function addWatchlist() {
  try {
    const searchbar = document.getElementById('searchbar');
    const realwatchlist = document.getElementById('realwatchlist');
    let symbol;
    let selectedWatchlistName;

    {
      symbol = searchbar.value.toUpperCase() || defaultSymbol; // Use defaultSymbol if searchbar value is empty

      // Get the selected watchlist name without the length
      const selectedWatchlistElement = realwatchlist.querySelector('div.selected');
      if (selectedWatchlistElement) {
        const watchlistNameElement = selectedWatchlistElement.querySelector('span.badge').previousSibling;
        selectedWatchlistName = watchlistNameElement.textContent.trim();
      } else {
        notification.value.show('No watchlist selected');
        return;
      }

      // Check if the symbol already exists in the watchlist
      if (watchlist2.includes(symbol)) {
        return;
      }

      // Check if the symbol is valid by making a request to the API
      const response = await fetch(`/api/chart/${symbol}`, {
        headers: {
          'X-API-KEY': apiKey,
        },
      });
      if (response.status === 404) {
        // Ticker not found
        notification.value.show('Ticker not found');
        return;
      }

      const assetData = await response.json();
      if (!assetData.Symbol) {
        notification.value.show('Invalid data, symbol doesn\'t exist');
        return;
      }

      const patchData = { Name: selectedWatchlistName, symbol }; // Use the selected watchlist name
      const patchResponse = await fetch(`/api/${user}/watchlists/${patchData.Name}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify(patchData)
      });

      // Check for 400 response from the PATCH request
      if (patchResponse.status === 400) {
        const errorResponse = await patchResponse.json();
        if (errorResponse.message === 'Maximum number of watchlists (20) has been reached') {
          notification.value.show('You have reached the maximum number of watchlists (20). Please delete a watchlist before adding a new one.');
        } else if (errorResponse.message === 'Limit reached, cannot add more than 100 symbols per watchlist') {
          notification.value.show('Limit reached, cannot add more than 100 symbols per watchlist');
        } else {
          notification.value.show('Failed to add ticker to watchlist');
        }
        return;
      }

      const data = await patchResponse.json();
      await fetchItemData(symbol);
      await filterWatchlist();
    }
  } catch (err) {
    error.value = err.message;
  }

  await getWatchlists();
  await getFullWatchlists(user);
}

let rowCount = ref(0);
let selectedIndex = ref(0);
const watchlistContainer = ref(null);

watch(() => watchlist2.tickers, async () => {
  await nextTick();
  if (watchlistContainer.value) {
    watchlistContainer.value.focus();
  }
});

function handleClick() {
  if (watchlistContainer.value) {
    watchlistContainer.value.focus();
  }
}

function updateSelectedIndex() {
  if (watchlist2.tickers && watchlist2.tickers.length > 0) {
    selectedIndex.value = watchlist2.tickers.findIndex((item) => item === selectedItem);
    if (selectedIndex.value === -1) {
      selectedIndex.value = 0;
    }
  }
}

function handleKeydown(event) {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    const direction = event.key === 'ArrowUp' ? -1 : 1;
    const newRowIndex = selectedIndex.value + direction;

    if (newRowIndex >= 0 && newRowIndex < rowCount.value) {
      const newSelectedItem = watchlist2.tickers[newRowIndex];
      selectRow(newSelectedItem);
      selectedIndex.value = newRowIndex;
    }
  }
}


function initializeWatchlistNavigation() {
  if (watchlist2.tickers) {
    rowCount.value = watchlist2.tickers.length;
    updateSelectedIndex();
  }
}

onMounted(() => {
  initializeWatchlistNavigation();
});

// same effect input 
async function selectRow(item) {
  isChartLoading.value = true;
  localStorage.setItem('defaultSymbol', item);
  defaultSymbol = item;
  selectedItem = item;
  updateSelectedIndex();
  await updateUserDefaultSymbol(item);
  try {
    const searchbar = document.getElementById('searchbar');
    if (searchbar) {
      searchbar.value = item;
      await searchTicker(item);
      isChartLoading.value = false;
    } else {
      console.error('Searchbar element not found');
      isChartLoading.value = false;
    }
  } catch (err) {
    console.log(err);
    isChartLoading.value = false;
  }
}

let sortKey = '';
let sortOrder = 1;

function sortTable(key) {
  if (sortKey === key) {
    sortOrder = sortOrder === 1 ? -1 : 1;
  } else {
    sortKey = key;
    sortOrder = 1;
  }

  watchlist2.tickers.sort((a, b) => {
    let valueA, valueB;

    switch (sortKey) {
      case 'ticker':
        valueA = a;
        valueB = b;
        break;
      case 'last':
        valueA = parseFloat(quotes[a]);
        valueB = parseFloat(quotes[b]);
        break;
      case 'chg':
        valueA = changes[a];
        valueB = changes[b];
        break;
      case 'perc':
        valueA = perc[a];
        valueB = perc[b];
        break;
    }

    if (valueA < valueB) {
      return -sortOrder;
    } else if (valueA > valueB) {
      return sortOrder;
    } else {
      return 0;
    }
  });
}

let autoplayRunning = false;
let autoplayIndex = 0;
let autoplayTimeoutId = null;

function AutoPlay() {
  if (autoplayRunning) {
    clearTimeout(autoplayTimeoutId);
    autoplayRunning = false;
  } else {
    autoplayRunning = true;
    autoplayIndex = 0;
    logElement();
  }
}

function logElement() {
  const rows = document.querySelectorAll('div.wlist');

  if (autoplayIndex >= rows.length) {
    autoplayIndex = 0;
  }

  rows[autoplayIndex].click();

  const symbolElement = rows[autoplayIndex].querySelector('.btsymbol');

  if (symbolElement) {
    const symbolValue = symbolElement.textContent;
  } else {
  }

  autoplayIndex++;
  autoplayTimeoutId = setTimeout(logElement, 5000); // 5 seconds
}

// updates the order of the watchlist, triggered by drag and drop 
async function UpdateWatchlistOrder() {
  try {
    if (!sortable.value) {
      return;
    }

    const selectedOption = selectedWatchlist.value.Name; // Use the reactive reference
    const newListOrder = [...sortable.value.children]
      .map(item => item.querySelector('.btsymbol')?.textContent)
      .filter(Boolean); // Filter out any undefined values

    const requestBody = {
      user: user,
      Name: selectedOption,
      newListOrder,
    };

    const response = await fetch(`/api/watchlists/update-order/${user}/${selectedOption}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Error updating watchlist order: ${response.status}`);
    }
    await filterWatchlist(); // Refresh the watchlists after updating order

  } catch (error) {
    error.value = error.message;
  }
}

const toggleWatchlist = async (ticker, symbol) => {
  const isCurrentlyInWatchlist = isAssetInWatchlist(ticker.Name, symbol);
  const simulatedEvent = {
    target: {
      checked: !isCurrentlyInWatchlist
    }
  };
  await addtoWatchlist(ticker, symbol, simulatedEvent);
  updateCheckbox(ticker, symbol, simulatedEvent);
  await getFullWatchlists(user);
  await filterWatchlist();
  await getWatchlists();
};

async function addtoWatchlist(ticker, symbol, $event) {
  const isChecked = $event.target.checked;
  user = user;
  const isAdding = isChecked;
  try {
    const response = await fetch(`/api/watchlist/addticker/${isAdding ? 'true' : 'false'}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        watchlistName: ticker.Name,
        symbol: symbol,
        user: user
      }),
    })

    // Check for 400 response from the server
    if (response.status === 400) {
      const errorResponse = await response.json();
      notification.value.show(errorResponse.message || 'Limit reached, cannot add more than 100 symbols per watchlist');
      return; // Exit the function if there's a 400 error
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
  } catch (error) {
    error.value = error.message;
  }
}

const checkedWatchlists = ref({});

watch(() => watchlist.tickers, (newTickers) => {
  newTickers.forEach((ticker) => {
    checkedWatchlists.value[ticker.Name] = [];
  });
});

const updateCheckbox = (ticker, symbol, $event) => {
  const isChecked = $event.target.checked;
  if (isChecked) {
    checkedWatchlists.value[ticker.Name].push(symbol);
  } else {
    checkedWatchlists.value[ticker.Name] = checkedWatchlists.value[ticker.Name].filter((s) => s !== symbol);
  }
  addtoWatchlist(ticker, symbol, $event);
  getFullWatchlists(user);
  isAssetInWatchlist(ticker, symbol);
};

const FullWatchlists = ref([]);

async function getFullWatchlists(user) {
  try {
    const response = await fetch(`/api/${user}/full-watchlists`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    FullWatchlists.value = await response.json();
  } catch (err) {
    error.value = err.message;
  }
};
getFullWatchlists(user);


const isAssetInWatchlist = (ticker, symbol) => {
  const watchlist = FullWatchlists.value.find(w => w.Name === ticker);
  if (watchlist) {
    return watchlist.List.includes(symbol);
  }
  return false;
};

const noteContent = ref('');
const characterCount = ref(0);

const updateCharacterCount = () => {
  characterCount.value = noteContent.value.length;
};

const watchlistName = ref('');

const hiddenList = ref([]);

async function fetchHiddenList() {
  try {
    const response = await fetch(`/api/${user}/hidden`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    hiddenList.value = data.Hidden; // Assuming the response structure is { Hidden: [...] }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

const isInHiddenList = (item) => {
  return hiddenList.value.includes(item);
};

const currentDate = ref('');

async function getLastUpdate() {
  try {
    const response = await fetch('/api/getlastupdate', {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    currentDate.value = data.date;
  } catch (error) {
    console.error('Error fetching last update:', error);
  }
}

onMounted(() => {
  getLastUpdate();
});


const attributeMap = {
  rps: 'Revenue Per Share',
  roa: 'Return on Assets ROA',
  assetTurnover: 'Asset Turnover',
  bookVal: 'Book Value',
  bvps: 'Book Value Per Share',
  totalRevenue: 'Revenue',
  epsDil: 'Earnings Per Share Diluted',
  netIncome: 'Net Income',
  profitMargin: 'Profit Margin',
  revenueQoQ: 'Revenue QoQ Growth',
  debtEquity: 'Debt to Equity Ratio',
  grossMargin: 'Gross Margin',
  roe: 'Return on Equity ROE',
  currentRatio: 'Current Ratio',
  fxRate: 'FX Rate',
  sharesBasic: 'Shares Outstanding',
  piotroskiFScore: 'Piotroski F-Score',
  longTermDebtEquity: 'Long-term Debt to Equity',
  opMargin: 'Operating Margin',
  epsQoQ: 'Earnings Per Share QoQ Growth',
  peRatio: 'Price to Earnings Ratio',
  shareswaDil: 'Weighted Average Shares Diluted',
  eps: 'Earnings Per Share',
  ppeq: 'Property, Plant & Equipment',
  ebitda: 'EBITDA',
  freeCashFlow: 'Free Cash Flow',
  issrepayDebt: 'Issuance or Repayment of Debt Securities',
  capex: 'Capital Expenditure',
  rnd: 'Research & Development',
  sga: 'Selling, General & Administrative',
  investmentsCurrent: 'Current Investments',
  payDiv: 'Payment of Dividends & Other Cash Distributions',
  investmentsAcqDisposals: 'Investment Acquisitions & Disposals',
  taxLiabilities: 'Tax Liabilities',
  ncff: 'Net Cash Flow from Financing',
  opinc: 'Operating Income',
  nonControllingInterests: 'Net Income to Non-Controlling Interests',
  assetsNonCurrent: 'Other Assets',
  taxAssets: 'Tax Assets',
  issrepayEquity: 'Issuance or Repayment of Equity',
  ncfx: 'Effect of Exchange Rate Changes on Cash',
  ncfo: 'Net Cash Flow from Operations',
  grossProfit: 'Gross Profit',
  debtCurrent: 'Current Debt',
  retainedEarnings: 'Accumulated Retained Earnings or Deficit',
  liabilitiesNonCurrent: 'Other Liabilities',
  sbcomp: 'Shared-based Compensation',
  businessAcqDisposals: 'Business Acquisitions & Disposals',
  liabilitiesCurrent: 'Current Liabilities',
  acctRec: 'Accounts Receivable',
  cashAndEq: 'Cash and Equivalents',
  accoci: 'Accumulated Other Comprehensive Income',
  depamor: 'Depreciation, Amortization & Accretion',
  assetsCurrent: 'Current Assets',
  shareswa: 'Weighted Average Shares',
  investments: 'Investments',
  prefDVDs: 'Preferred Dividends Income Statement Impact',
  intangibles: 'Intangible Assets',
  opex: 'Operating Expenses',
  inventory: 'Inventory',
  deposits: 'Deposits',
  ebt: 'Earnings before tax',
  netMargin: 'Net Margin',
  investmentsNonCurrent: 'Non-Current Investments',
  totalAssets: 'Total Assets',
  deferredRev: 'Deferred Revenue',
  taxExp: 'Tax Expense',
  debt: 'Total Debt',
  costRev: 'Cost of Revenue',
  acctPay: 'Accounts Payable',
  ncf: 'Net Cash Flow to Change in Cash & Cash Equivalents',
  netIncDiscOps: 'Net Income from Discontinued Operations',
  totalLiabilities: 'Total Liabilities',
  ncfi: 'Net Cash Flow from Investing',
  debtNonCurrent: 'Non-Current Debt',
  ebit: 'Earning Before Interest & Taxes EBIT',
  netIncComStock: 'Net Income Common Stock',
  intexp: 'Interest Expense',
  consolidatedIncome: 'Consolidated Income',
  equity: 'Shareholders Equity',
  marketCap: 'Market Capitalization',
  enterpriseVal: 'Enterprise Value',
  shareFactor: 'Share Factor',
  trailingPEG1Y: 'PEG Ratio',
  pbRatio: 'Price to Book Ratio',
};

const AnnualFinancials = ref([]);
const QuarterlyFinancials = ref([]);

async function fetchFinancials() {
  try {
    let ticker = (defaultSymbol || selectedItem).toUpperCase();
    const headers = {
      'x-api-key': apiKey
    };
    const response = await fetch(`/api/${ticker}/financials`, {
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const newFinancials = await response.json();
    AnnualFinancials.value = newFinancials.annualFinancials;
    QuarterlyFinancials.value = newFinancials.quarterlyFinancials;

  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
  }
}

const isAnnualFinancials = ref(true);
const currentFinancials = computed(() => {
  return isAnnualFinancials.value ? AnnualFinancials.value : QuarterlyFinancials.value;
});

function toggleFinancials() {
  isAnnualFinancials.value = !isAnnualFinancials.value;
}

function getQuarterAndYear(dateString) {
  const date = new Date(dateString);
  if (isAnnualFinancials.value) {
    return date.getFullYear();
  } else {
    const quarter = Math.floor((date.getMonth() + 3) / 3);
    return `Q${quarter} ${date.getFullYear()}`;
  }
}

const activeIndex = ref(-1);

//central price panel for tickers
const watchPanel = ref([]);

// Function to fetch user's WatchPanel data
async function fetchWatchPanel() {
  try {
    const headers = {
      'x-api-key': apiKey
    };
    const response = await fetch(`/api/watchpanel/${user}`, {
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const newWatchPanel = await response.json();
    watchPanel.value = newWatchPanel;

  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    // Optionally handle other errors
  }
}

const getPercentageDifference = (financial, attribute) => {
  const currentIndex = currentFinancials.value.indexOf(financial);
  if (currentIndex < currentFinancials.value.length - 1) {
    const nextFinancial = currentFinancials.value[currentIndex + 1];
    const change = financial[attribute] - nextFinancial[attribute];
    let percentageDifference;
    if (nextFinancial[attribute] < 0) {
      percentageDifference = (change / Math.abs(nextFinancial[attribute])) * 100;
    } else {
      percentageDifference = (change / nextFinancial[attribute]) * 100;
    }
    if (isNaN(percentageDifference) || !isFinite(percentageDifference)) {
      return '-';
    } else {
      return percentageDifference.toFixed(2) + '%';
    }
  } else {
    return '-';
  }
}

const showTooltip = ref(false)
let tooltipText = ref('');
let tooltipLeft = ref();
let tooltipTop = ref();

function handleMouseOver(event, id) {
  showTooltip.value = true
  const element = event.target
  const rect = element.getBoundingClientRect()
  const svgRect = element.parentNode.getBoundingClientRect()
  tooltipTop.value = svgRect.top + window.scrollY + svgRect.height - 25;
  tooltipLeft.value = svgRect.left + window.scrollX + svgRect.width + 10;
  tooltipText.value = getTooltipText(id)
}

const attributeTooltips = {
  rps: 'Revenue Per Share is a measure of a company\'s revenue divided by the number of outstanding shares.',
  roa: 'Return on Assets (ROA) is a measure of a company\'s profitability, calculated by dividing its net income by its total assets.',
  assetTurnover: 'Asset Turnover is a measure of a company\'s efficiency in using its assets to generate revenue.',
  bookVal: 'Book Value is a company\'s total assets minus its total liabilities, which represents the company\'s net worth.',
  bvps: 'Book Value Per Share is a measure of a company\'s book value divided by the number of outstanding shares.',
  totalRevenue: 'Revenue is the total amount of money earned by a company from its sales of goods or services.',
  epsDil: 'Earnings Per Share Diluted is a measure of a company\'s profitability, calculated by dividing its net income by the number of outstanding shares, including dilutive securities.',
  netIncome: 'Net Income is a company\'s total earnings, calculated by subtracting its total expenses from its total revenue.',
  profitMargin: 'Profit Margin is a measure of a company\'s profitability, calculated by dividing its net income by its total revenue.',
  revenueQoQ: 'Revenue QoQ Growth is a measure of a company\'s revenue growth from one quarter to the next.',
  debtEquity: 'Debt to Equity Ratio is a measure of a company\'s leverage, calculated by dividing its total debt by its total shareholder equity.',
  grossMargin: 'Gross Margin is a measure of a company\'s profitability, calculated by dividing its gross profit by its total revenue.',
  roe: 'Return on Equity (ROE) is a measure of a company\'s profitability, calculated by dividing its net income by its total shareholder equity.',
  currentRatio: 'Current Ratio is a measure of a company\'s liquidity, calculated by dividing its current assets by its current liabilities.',
  fxRate: 'FX Rate is the exchange rate between two currencies.',
  sharesBasic: 'Shares Outstanding is the total number of shares of a company\'s stock that are currently owned by investors.',
  piotroskiFScore: 'Piotroski F-Score is a measure of a company\'s financial health, calculated by evaluating its profitability, leverage, liquidity, and efficiency.',
  longTermDebtEquity: 'Long-term Debt to Equity is a measure of a company\'s leverage, calculated by dividing its long-term debt by its total shareholder equity.',
  opMargin: 'Operating Margin is a measure of a company\'s profitability, calculated by dividing its operating income by its total revenue.',
  epsQoQ: 'Earnings Per Share QoQ Growth is a measure of a company\'s earnings growth from one quarter to the next.',
  peRatio: 'Price to Earnings Ratio is a measure of a company\'s valuation, calculated by dividing its current stock price by its earnings per share.',
  shareswaDil: 'Weighted Average Shares Diluted is a measure of a company\'s average number of outstanding shares, including dilutive securities.',
  eps: 'Earnings Per Share is a measure of a company\'s profitability, calculated by dividing its net income by the number of outstanding shares.',
  ppeq: 'Property, Plant & Equipment is a company\'s tangible assets, such as buildings, machinery, and equipment.',
  ebitda: 'EBITDA is a measure of a company\'s profitability, calculated by adding its net income, interest expense, taxes, depreciation, and amortization.',
  freeCashFlow: 'Free Cash Flow is a measure of a company\'s ability to generate cash from its operations, calculated by subtracting its capital expenditures from its operating cash flow.',
  issrepayDebt: 'Issuance or Repayment of Debt Securities is a company\'s issuance or repayment of debt securities, such as bonds or loans.',
  capex: 'Capital Expenditure is a company\'s investment in new assets, such as property, plant, and equipment.',
  rnd: 'Research & Development is a company\'s investment in research and development activities.',
  sga: 'Selling, General & Administrative is a company\'s expenses related to selling, general, and administrative activities.',
  investmentsCurrent: 'Current Investments is a company\'s investments in current assets, such as cash, accounts receivable, and inventory.',
  payDiv: 'Payment of Dividends & Other Cash Distributions is a company\'s payment of dividends and other cash distributions to its shareholders.',
  investmentsAcqDisposals: 'Investment Acquisitions & Disposals is a company\'s acquisition or disposal of investments, such as stocks, bonds, or real estate.',
  taxLiabilities: 'Tax Liabilities is a company\'s tax obligations, including income taxes, payroll taxes, and other taxes.',
  ncff: 'Net Cash Flow from Financing is a company\'s net cash flow from financing activities, such as issuing debt or equity.',
  opinc: 'Operating Income is a company\'s income from its core business operations.',
  nonControllingInterests: 'Net Income to Non-Controlling Interests is a company\'s net income attributable to non-controlling interests.',
  assetsNonCurrent: 'Other Assets is a company\'s non-current assets, such as investments, intangible assets, and other assets.',
  taxAssets: 'Tax Assets is a company\'s tax assets, including deferred tax assets and other tax assets.',
  issrepayEquity: 'Issuance or Repayment of Equity is a company\'s issuance or repayment of equity, such as common stock or preferred stock.',
  ncfx: 'Effect of Exchange Rate Changes on Cash is a company\'s gain or loss from changes in exchange rates.',
  ncfo: 'Net Cash Flow from Operations is a company\'s net cash flow from its core business operations.',
  grossProfit: 'Gross Profit is a company\'s revenue minus its cost of goods sold.',
  debtCurrent: 'Current Debt is a company\'s short-term debt obligations, such as accounts payable and short-term loans.',
  retainedEarnings: 'Accumulated Retained Earnings or Deficit is a company\'s accumulated earnings or losses over time.',
  liabilitiesNonCurrent: 'Other Liabilities is a company\'s non-current liabilities, such as long-term debt and other liabilities.',
  sbcomp: 'Shared-based Compensation is a company\'s compensation expenses related to stock options and other equity-based compensation.',
  businessAcqDisposals: 'Business Acquisitions & Disposals is a company\'s acquisition or disposal of businesses, including mergers and acquisitions.',
  liabilitiesCurrent: 'Current Liabilities is a company\'s short-term liabilities, such as accounts payable and short-term loans.',
  acctRec: 'Accounts Receivable is a company\'s outstanding invoices and other amounts owed to it by customers.',
  cashAndEq: 'Cash and Equivalents is a company\'s cash and other liquid assets, such as commercial paper and treasury bills.',
  accoci: 'Accumulated Other Comprehensive Income is a company\'s accumulated other comprehensive income, including gains and losses from foreign currency translation and other items.',
  depamor: 'Depreciation, Amortization & Accretion is a company\'s depreciation, amortization, and accretion expenses related to its assets.',
  assetsCurrent: 'Current Assets is a company\'s short-term assets, such as cash, accounts receivable, and inventory.',
  shareswa: 'Weighted Average Shares is a company\'s average number of outstanding shares, weighted by the number of shares outstanding during each period.',
  investments: 'Investments is a company\'s investments in other companies, including stocks, bonds, and other securities.',
  prefDVDs: 'Preferred Dividends Income Statement Impact is a company\'s preferred dividends expense, which is subtracted from its net income.',
  intangibles: 'Intangible Assets is a company\'s intangible assets, such as patents, trademarks, and copyrights.',
  opex: 'Operating Expenses is a company\'s expenses related to its core business operations, including salaries, rent, and other expenses.',
  inventory: 'Inventory is a company\'s goods or materials that are held for sale or in production.',
  deposits: 'Deposits is a company\'s deposits, including customer deposits and other deposits.',
  ebt: 'Earnings before tax is a company\'s earnings before income taxes.',
  netMargin: 'Net Margin is a company\'s net income divided by its total revenue.',
  investmentsNonCurrent: 'Non-Current Investments is a company\'s non-current investments, including investments in other companies and other non-current assets.',
  totalAssets: 'Total Assets is a company\'s total assets, including current and non-current assets.',
  deferredRev: 'Deferred Revenue is a company\'s deferred revenue, which is revenue that has been earned but not yet recognized.',
  taxExp: 'Tax Expense is a company\'s tax expense, including income taxes and other taxes.',
  debt: 'Total Debt is a company\'s total debt, including current and non-current debt.',
  costRev: 'Cost of Revenue is a company\'s cost of goods sold and other costs related to its revenue.',
  acctPay: 'Accounts Payable is a company\'s outstanding invoices and other amounts owed to its suppliers.',
  ncf: 'Net Cash Flow to Change in Cash & Cash Equivalents is a company\'s net cash flow from its core business operations, investing activities, and financing activities.',
  netIncDiscOps: 'Net Income from Discontinued Operations is a company\'s net income from discontinued operations, including gains and losses from the sale of discontinued operations.',
  totalLiabilities: 'Total Liabilities is a company\'s total liabilities, including current and non-current liabilities.',
  ncfi: 'Net Cash Flow from Investing is a company\'s net cash flow from its investing activities, including purchases and sales of assets.',
  debtNonCurrent: 'Non-Current Debt is a company\'s non-current debt, including long-term debt and other non-current debt.',
  ebit: 'Earning Before Interest & Taxes EBIT is a company\'s earnings before interest and taxes.',
  netIncComStock: 'Net Income Common Stock is a company\'s net income attributable to common stockholders.',
  intexp: 'Interest Expense is a company\'s interest expense, including interest on debt and other interest expenses.',
  consolidatedIncome: 'Consolidated Income is a company\'s consolidated income, including income from its subsidiaries and other consolidated entities.',
  equity: 'Shareholders Equity is a company\'s shareholders\' equity, including common stock, preferred stock, and retained earnings.',
  marketCap: 'Market Capitalization is a company\'s market capitalization, which is the total value of its outstanding shares.',
  enterpriseVal: 'Enterprise Value is a company\'s enterprise value, which is its market capitalization plus its total debt minus its cash and cash equivalents.',
  shareFactor: 'Share Factor is a company\'s share factor, which is used to calculate its earnings per share.',
  trailingPEG1Y: 'PEG Ratio is a company\'s price-to-earnings growth ratio, which is used to evaluate its valuation.',
  pbRatio: 'Price to Book Ratio is a company\'s price-to-book ratio, which is used to evaluate its valuation.',
};

function getTooltipText(id) {
  const attribute = id.attribute;
  return attributeTooltips[attribute] || `This is the ${attributeMap[attribute] || attribute} attribute.`;
}

function handleMouseOut() {
  showTooltip.value = false
}

const selected = ref('info')
function select(option) {
  selected.value = option
}

const showPanel = ref(false);


const themes = ['default', 'ihatemyeyes', 'colorblind', 'catpuccin'];
const currentTheme = ref('default');

const themeDisplayNames = {
  default: 'Default Theme (Dark)',
  ihatemyeyes: 'I Hate My Eyes (light-mode)',
  colorblind: "I'm Colorblind",
  catpuccin: 'Catpuccin',
};

async function setTheme(newTheme) {
  const root = document.documentElement;
  root.classList.remove(...themes);
  root.classList.add(newTheme);
  localStorage.setItem('user-theme', newTheme);
  try {
    const response = await fetch('/api/theme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ theme: newTheme, username: user }),
    });
    const data = await response.json();
    if (data.message === 'Theme updated') {
      currentTheme.value = newTheme;
    } else {
      error.value = data.message;
    }
  } catch (error) {
    error.value = error.message;
  }
}

async function loadTheme() {
  try {
    const response = await fetch('/api/load-theme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ username: user }),
    });
    const data = await response.json();
    if (data.theme) {
      setTheme(data.theme);
    } else {
      setTheme('default');
    }
  } catch (error) {
    setTheme('default');
  }
}

loadTheme()

defineExpose({
  loadTheme,
});


let panelData = ref([]); // Left Panel section 

// function to retrieve the panel data for each user
async function fetchPanel() {
  try {
    const headers = {
      'x-api-key': apiKey
    };

    const response = await fetch(`/api/panel?username=${user}`, {
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const newPanel = await response.json();
    panelData.value = newPanel.panel || []; // Assign the panel array

  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    console.error('Error fetching panel data:', error);
  }
}

let Tier = ref(); // user tier

// function to retrieve the tier for each user
async function fetchTier() {
  try {
    const headers = {
      'x-api-key': apiKey
    };

    const response = await fetch(`/api/tier?username=${user}`, {
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const newTier = await response.json();
    Tier.value = newTier.Tier;

  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    console.error('Error fetching tier:', error);
  }
}

const sidebarComponentMap = {
  Summary,
  EpsTable,
  EarnTable,
  SalesTable,
  DividendsTable,
  SplitsTable,
  Financials,
  Notes,
  News,
};

function getSidebarProps(tag) {
  switch (tag) {
    case 'Summary':
      return {
        assetInfo,
        formatDate,
        showAllDescription: showAllDescription.value,
      };
    case 'EpsTable':
      return {
        displayedEPSItems: displayedEPSItems.value,
        formatDate,
        showAllEPS: showAllEPS.value,
        showEPSButton: showEPSButton.value,
        assetInfo,
        calculatePercentageChange,
        calculateQoQ1,
        calculateYoY1,
        getQoQClass,
        getYoYClass,
      };
    case 'EarnTable':
      return {
        displayedEarningsItems: displayedEarningsItems.value,
        formatDate,
        showAllEarnings: showAllEarnings.value,
        showEarningsButton: showEarningsButton.value,
        calculateNet,
        calculateQoQ2,
        calculateYoY2,
        getQoQClass,
        getYoYClass,
      };
    case 'SalesTable':
      return {
        displayedSalesItems: displayedSalesItems.value,
        formatDate,
        showAllSales: showAllSales.value,
        showSalesButton: showSalesButton.value,
        calculateRev,
        calculateQoQ3,
        calculateYoY3,
        getQoQClass,
        getYoYClass,
      };
    case 'DividendsTable':
      return {
        displayedDividendsItems: displayedDividendsItems.value,
        formatDate,
        showAllDividends: showAllDividends.value,
        showDividendsButton: showDividendsButton.value,
      };
    case 'SplitsTable':
      return {
        displayedSplitsItems: displayedSplitsItems.value,
        formatDate,
        showAllSplits: showAllSplits.value,
        showSplitsButton: showSplitsButton.value,
      };
    case 'Financials':
      return {};
    case 'Notes':
      return {
        BeautifulNotes: BeautifulNotes.value,
        formatDate,
      };
    case 'News':
      return {
        BeautifulNews: BeautifulNews.value,
        formatDate,
      };
    default:
      return {};
  }
}

const editWatchPanel = ref(false);

function openEditor() {
  editWatchPanel.value = true;
}
function closeEditor() {
  editWatchPanel.value = false;
}

</script>

<style lang="scss">
@use '../style.scss' as *;

#main {
  display: flex;
  height: 100%;
  //max-height: 760px;
}

#sidebar-left {
  flex: 1;
  flex-direction: column;
  background-color: var(--base4);
  overflow-y: scroll;
  overflow-x: hidden;
  min-width: 300px;
}

#chart-container {
  display: flex;
  flex-direction: column;
  position: relative;
  background-repeat: no-repeat;
}

#chartdiv {
  flex: 1 1 auto;
  border: none;
  min-height: 500px; // ensures it shrinks properly
}

#chartdiv2 {
  flex: 1 1 0%;
  padding: 15px 10px 10px 10px;
  border: none;
  background-color: var(--base2);
  color: var(--text2);
  z-index: 10;
  margin: 2px;
  box-sizing: border-box;
  height: 200px;
}

#sidebar-right {
  display: flex;
  flex-direction: column;
  background-color: var(--base4);
  overflow-y: scroll;
  min-width: 300px;
}

#wlnav {
  border-top: var(--base1) solid 1px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--base2);
}

#realwatchlist {
  height: 20px;
  outline: none;
  border: none;
  color: var(--text2);
  text-align: center;
  flex-grow: 1;
  background-color: transparent;
}

.wlbtn {
  flex-shrink: 0;
  color: var(--text1);
  background-color: transparent;
  border: none;
  padding: 5px;
  outline: none;
  cursor: pointer;
  height: 22px;
  opacity: 0.60;
}

.wlbtn:hover {
  opacity: 1;
  cursor: pointer;
}

#realwatchlist:hover {
  cursor: pointer;
}

/* div that contains input and button for searching symbols */
#searchtable {
  display: flex;
  align-items: center;
  background-color: var(--base2);
  position: relative;
}

/* input for searching symbols */
#searchbar {
  border-radius: 5px;
  padding: 10px 10px 10px 15px;
  margin: 7px;
  width: calc(100% - 30px);
  /* Make space for the button */
  outline: none;
  color: var(--base3);
  /* Dark text color */
  transition: border-color 0.3s, box-shadow 0.3s;
  /* Smooth transition for focus effects */
  border: solid 1px var(--base1);
  background-color: var(--base4);
}

#searchbar:focus {
  border-color: var(--accent1);
  /* Change border color on focus */
  //box-shadow: 0 0 5px rgba(140, 141, 254, 0.5);
  /* Subtle shadow effect */
  outline: none;
  /* Remove default outline */
}

/* button for searching symbols, inside searchbar */
.wlbtn2 {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  flex-shrink: 0;
  color: var(--text1);
  background-color: var(--accent1);
  border: none;
  padding: 0;
  outline: none;
  cursor: pointer;
  height: 32px;
  width: 32px;
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.2s ease-in-out;
}

.wlbtn2:hover {
  background-color: var(--accent2);
  box-shadow: 0 0 5px rgba(140, 141, 254, 0.5);
  outline: none;
}

/* Hide chart elements while loading */
.tv-lightweight-charts {
  visibility: hidden;
  transition: visibility 0.2s;
}

/* Show chart elements when loaded */
:not(.isChartLoading) .tv-lightweight-charts {
  visibility: visible;
}


#notes-container {
  background-color: var(--base4);
  color: var(--text1);
  width: 300px;
  height: 80px;
  padding-left: 5px;
  padding-top: 5px;
  margin: 5px;
  border: 1px solid var(--base4);
  border-radius: 5px;
  outline: none;
  resize: none;
}

#idSummary {
  color: var(--text1);
}

.description {
  border: none;
  text-align: center;
  overflow: hidden;
  /* Hide overflow when not expanded */
  transition: height 0.3s ease;
  /* Smooth transition for height */
  /* Set a fixed height when not expanded */
  height: 20px;
  /* This should match your minHeight */
}

.description.expanded {
  height: auto;
  /* Allow full height when expanded */
}

.category {
  color: var(--text1);
}

.response {
  text-align: right;
  border: none;
}

/* note section */
.title {
  background-color: var(--base1);
  color: var(--text1);
  text-align: center;
  padding: 3.5px;
  border: none;
  margin: 0;
}

.note {
  background-color: var(--accent4);
  color: var(--base4);
  padding: 10px;
  border: none;
  box-sizing: border-box;
  width: 100%;
  margin-bottom: 1px;
  position: relative;
}

.notebtn {
  background-color: transparent;
  border: none;
  color: var(--text2);
  cursor: pointer;
  position: absolute;
  top: 5px;
  right: 5px;
  padding: 5px;
  z-index: 1;
}

.img {
  width: 15px;
  height: 15px;
  float: left;
  border: none;
}

.img2 {
  width: 15px;
  height: 15px;
  border: none;
}

.img4 {
  width: 15px;
  height: 15px;
  float: left;
  margin-right: 1rem;
  border: none;
}

.inline-note {
  opacity: 0.50;
  border: none;
}

.note-msg {
  color: var(--text1);
  border: none;
  margin-top: 0;
  padding-top: 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
  width: 100%;
  display: block;
}

.note-msg-date {
  color: var(--text1);
  border: none;
  bottom: 11.5px;
  left: 14px;
  position: relative;
}

.tbl {
  text-align: center;
  display: flex;
  flex-direction: row;
  background-color: var(--base1);
  border: none;
  color: var(--text1);
  cursor: pointer;
  align-items: center;
  align-content: center;
  justify-content: center;
}

.tbl:hover {
  background-color: var(--base2);
}

.ntbl {
  text-align: center;
  background-color: var(--base1);
  border: none;
  color: var(--text2);
}

#title2 {
  color: var(--text2);
  text-align: center;
  padding: 3.5px;
  border: none;
  margin: 0px;
  background-color: var(--base4);
}

.btn {
  background-color: transparent;
  border: none;
}

.btn:hover {
  cursor: pointer;
}

.imgdlt {
  width: 10px;
  height: 10px;
  border: none;
  text-align: center;
}

.img {
  width: 10px;
  height: 10px;
  border: none;
  text-align: center;
}

.cmp-logo {
  width: 20px;
  height: 20px;
  border: none;
  text-align: center;
  border-radius: 25px;
}

#legend {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
  background-color: transparent;
  color: var(--text2);
  border: none;
  margin-top: 10px;
  margin-left: 12px;
}

#legend3 {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
  background-color: transparent;
  color: var(--text2);
  border: none;
  margin-top: 25px;
  margin-left: 12px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 2px;
}

#legend4 {
  position: absolute;
  top: 0;
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

#legend5 {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
  background-color: transparent;
  color: var(--text2);
  border: none;
  margin-top: 70px;
  margin-left: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: left;
  gap: 2px;
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


.delete-cell {
  text-align: center;
  top: -30%;
}

.dbtn {
  background-color: transparent;
  border: none;
  color: var(--text2);
  cursor: pointer;
}

.RenameWatchlist,
.CreateWatchlist {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: var(--base2);
  width: 300px;
  height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  z-index: 1000;
  padding: 10px;
  border: 2px solid var(--accent3);
}

.CreateNote {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: var(--base2);
  width: 350px;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  z-index: 1000;
  padding: 10px;
  border: 2px solid var(--accent3);
}

.RenameWatchlist h3,
.CreateWatchlist h3,
.CreateNote h3 {
  background-color: transparent;
  color: rgba(var(--text1), 0.50);
  border: none;
  margin-top: 10px;
}

.RenameWatchlist input,
.CreateWatchlist input {
  border-radius: 5px;
  padding: 5px 5px 5px 15px;
  margin: 7px;
  width: 160px;
  outline: none;
  color: var(--base3);
  /* Dark text color */
  transition: border-color 0.3s, box-shadow 0.3s;
  /* Smooth transition for focus effects */
  border: solid 1px var(--base4);
  background-color: var(--base4);
}

.RenameWatchlist input:focus,
.CreateWatchlist input:focus {
  border-color: var(--accent1);
  box-shadow: 0 0 5px rgba(var(--accent3), 0.5);
  outline: none;
}

.inner {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  border: none;
}

.inner button {
  background-color: transparent;
  padding: 5px;
  outline: none;
  margin: 2px;
  border: none;
  opacity: 0.60;
}

.inner button:hover {
  cursor: pointer;
  opacity: 1;
}

.inner-logo {
  opacity: 0.30;
  width: 30px;
  height: 30px;
  border: none;
}

/* icons for tables in left column */
.green {
  background-image: url('@/assets/icons/green.png');
  width: 10px;
  height: 10px;
  border: none;
  text-align: center;
}

.red {
  background-image: url('@/assets/icons/red.png');
  width: 10px;
  height: 10px;
  border: none;
  text-align: center;
}

/* */
.btnnav {
  display: flex;
  float: inline-end;
}

/* button for adding tickers to watchlists */
.navbtn {
  background-color: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.80;
  color: var(--text1);
  transition: opacity 0.2s ease;
  padding: 5px;
  margin: 5px;
}

.navbtn:hover {
  background-color: var(--base1);
  border-radius: 5px;
}

.navbtn svg {
  transition: all 0.3s ease;
  margin-right: 3px;
}

.navbtn:hover svg {
  animation: hoverAnim 0.3s ease;
}

@keyframes hoverAnim {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.navbtn:hover {
  opacity: 1;
}


.wlist {
  background-color: var(--base2);
  height: 30px;
  margin-top: 2px;
  border-left: var(--base4) solid 1px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text1);
}

.wlist:hover {
  cursor: pointer;
  background-color: rgba(var(--base2), 0.80);
}

.wlist .dbtn {
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
}

.wlist:hover .dbtn {
  opacity: 1;
}

.wlist.selected {
  background-color: var(--accent4);
  background-size: 400% 100%;
  color: var(--text1);
}

.results {
  background-color: var(--base4);
  text-align: center;
  align-items: center;
  padding: 10px;
  height: 50px;
  border: none;
}

.results2 {
  background-color: var(--base4);
  text-align: center;
  align-items: center;
  padding: 100px;
  height: 50px;
  border: none;
}

.loading-container {
  position: absolute;
  top: 0%;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  background-color: var(--base1);
  opacity: 1;
  border: none;
}

.loading-container2 {
  display: none;
}


/* watchlist selector dropdow menu */
.select-container {
  position: relative;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.select-container .dropdown-container {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
}

.select-container .dropdown-container div {
  display: none;
  background-color: var(--base4);
  max-height: 200px;
  overflow-y: scroll;
  border: none;
}

.select-container:hover .dropdown-container div {
  display: block;
  padding: 5px;
  cursor: pointer;
}

.watchlist-dropdown-menu {
  background-color: var(--base4);
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
}

.select-container .watchlist-dropdown-menu div:hover {
  background-color: var(--accent2);
  border-radius: 5px;
}

.icondlt {
  background-color: transparent;
  border: none;
  padding: 0;
  float: right;
  opacity: 0.60;
}

.icondlt:hover {
  cursor: pointer;
  opacity: 1;
}

/* */

.editbtn {
  background-color: var(--base4);
  border: none;
  cursor: pointer;
  width: 100%;
  padding: 5px;
  color: var(--text1);
  transition: background-color 0.5s ease-in-out;
  align-items: center;
  justify-content: center;
  display: flex;
  flex-direction: row;
  gap: 5px;
}

.editbtn:hover {
  background-color: var(--base2);
}

.financialbtn {
  background-color: var(--accent1);
  border: none;
  cursor: pointer;
  width: 100%;
  padding: 10px;
  color: var(--text1);
  transition: background-color 0.5s ease-in-out;
}

.financialbtn:hover {
  background-color: var(--accent2);
}

.toggle-btn {
  background-color: var(--base2);
  border: none;
  cursor: pointer;
  width: 100%;
  color: var(--text1);
  padding: 5px;
  transition: background-color 0.5s ease-in-out;
}

.toggle-btn:hover {
  background-color: var(--base4);
}

.no-data {
  padding: 20px;
  text-align: center;
  background-color: var(--base2);
  color: rgba(var(--text2), 0.40);
}

/* buttons inside chart, top right */
.navbtng {
  background-color: transparent;
  color: var(--text1);
  text-align: center;
  justify-content: center;
  cursor: pointer;
  border: solid var(--text2) 1px;
  border-radius: 5px;
  padding: 15px;
  opacity: 0.60;
  width: 95px;
  height: 25px;
  align-items: center;
  margin: 2px;
  display: flex;
}

.navbtng:hover {
  opacity: 1;
}

.chart-type-icon {
  width: 20px;
  height: 20px;
}

/* */

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

.imgm {
  width: 20px;
  height: 20px;
  border: none;
}

/* popup divs section */
.imgbtn {
  width: 15px;
  height: 15px;
}

/* dropdown inside watchlist elements */
.dropdown-btn {
  background-color: transparent;
  border: none;
  margin: 0;
  padding: 0;
}

.watchlist-icon {
  width: 20px;
  height: 20px;
  margin-right: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
}

.dropdown-menu3 {
  display: none;
  cursor: pointer;
  width: 200px;
  max-height: 190px;
  overflow-y: scroll;
  position: absolute;
  z-index: 1000;
  top: -10px;
  left: 20px;
}

.watchlist-dropdown-menu3 {
  background-color: var(--base4);
  padding: 7px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
  border-radius: 5px;
}

.watchlist-dropdown-menu3>div {
  background-color: var(--base4);
  padding: 1px;
  height: 28px;
  display: flex;
  align-items: center;
}

.watchlist-dropdown-menu3>div:hover {
  background-color: var(--accent2);
  border-radius: 5px;
}

.dropdown-btn:hover+.dropdown-menu3,
.dropdown-menu3:hover {
  display: block;
}

.nested-dropdown {
  position: relative;
}

/* nav menu dropdown on right */
.dropdown-vnav {
  display: none;
  position: absolute;
  right: 0;
  min-width: 180px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  z-index: 10000;
}

.wlnav-dropdown:hover .dropdown-vnav {
  display: block;
}

.dropdown-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 10px;
  background-color: var(--base4);
  border: none;
  color: var(--text1);
  text-align: left;
  cursor: pointer;
}

.watchlist-dropdown-menu2 {
  background-color: var(--base4);
  padding: 5px;
  border-radius: 5px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
}

.dropdown-item:hover {
  background-color: var(--accent2);
  border-radius: 5px;
}

.dropdown-item img {
  margin-right: 10px;
}


/*  */

#notes-container.error {
  border-color: red;
}

.RenameWatchlist input.input-error,
.CreateWatchlist input.input-error {
  border: solid 1px red !important;
  /* Use !important to ensure it takes precedence */
}

.summary-container {
  display: flex;
  flex-direction: column;
  color: var(--text2);
  border: none;
}

/* summary rows main */
.summary-row {
  display: flex;
  height: fit-content;
  padding-left: 5px;
  padding-right: 5px;
  padding-top: 5px;
  padding-bottom: 5px;
  align-items: center;
  justify-content: center;
  background-color: var(--base2);
  letter-spacing: 0.3px;
}

/* description tab */
.summary-row2 {
  display: flex;
  height: fit-content;
  padding-left: 5px;
  padding-right: 5px;
  padding-top: 5px;
  padding-bottom: 5px;
  align-items: center;
  justify-content: center;
  background-color: var(--base4);
}

.summary-row:last-child {
  border-bottom: none;
}

.summary-row .category {
  flex: 0 0 50%;
  font-weight: 400;
}

.summary-row .response {
  flex: 0 0 50%;
}

.dividends-header,
.eps-header,
.earn-header,
.sales-header,
.splits-header {
  display: flex;
  font-weight: bold;
  background-color: var(--base1);
  text-align: center;
  color: var(--text1);
  height: 20px;
  justify-content: center;
  align-items: center;
}

.dividends-body,
.eps-body,
.earn-body,
.sales-body,
.splits-body {
  display: flex;
  flex-direction: column;
  text-align: center;
  color: var(--text2);
}

.dividends-row,
.eps-row,
.earn-row,
.sales-row,
.splits-row {
  display: flex;
  height: 20px;
  text-align: center;
  margin-bottom: 1px;
  justify-content: center;
  align-items: center;
  background-color: var(--base2);
  font-weight: bold;
}

#watch-container {
  display: flex;
  flex-direction: row;
  width: 100%;
}

.tbl {
  padding-top: 4px;
  padding-bottom: 4px;
}

.arrow-up {
  font-size: 1em;
  line-height: 0.8em;
  display: inline-block;
  vertical-align: middle;
  position: relative;
  color: var(--positive);
  margin-left: 7px;
}

.arrow-up::after {
  content: "\25B2";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--positive);
}

.arrow-down {
  font-size: 1em;
  line-height: 0.1em;
  display: inline-block;
  vertical-align: middle;
  position: relative;
  color: var(--negative);
  margin-left: 7px;
}

.arrow-down::after {
  content: "\25BC";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--negative);
}


.chart-img {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin-right: 5px;
}

.chart-img2 {
  width: 15px;
  margin-right: 5px;
}

.hidden-message {
  display: inline-block;
  background-color: transparent;
  color: var(--text1);
  border: solid 1px var(--text1);
  border-radius: 2.5px;
  margin-left: 5px;
  opacity: 0.85;
  user-select: none;
  text-align: center;
  padding: 0px 4px;
  /* minimal padding */
  font-size: 0.175rem;
  /* extremely small font size */
  line-height: 0.5;
}

/* the sphere thingy neat watchlist, counts how many elements are inside it */
.badge {
  display: inline-block;
  padding: 2px 5px;
  font-weight: bold;
  color: var(--base4);
  text-align: center;
  vertical-align: baseline;
  border-radius: 25px;
  background-color: var(--text1);
}

/* related to dropdown menu for watchlist */
.select-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  position: relative;
}

.dropdown-icon {
  width: 20px;
  position: absolute;
  left: 0;
  margin: 3%;
}

#list:focus {
  outline: none;
}

.popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--base1);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.popup-content {
  background-color: var(--base2);
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  width: 70%;
  height: 60%;
  overflow: scroll;
  color: rgba(var(--text1), 0.70);
}

.financials-header {
  display: flex;
  align-items: center;
  padding: 10px;
  color: var(--text1);
  border-radius: 5px;
  min-width: 100px;
}

.attribute-name {
  text-align: left;
  min-width: 270px;
  background-color: var(--base1);
  padding: 10px 5px;
  border-radius: 5px;
  margin-right: 5px;
  color: var(--text1);
}

.fiscal-year {
  text-align: center;
  min-width: 100px;
  background-color: var(--base1);
  padding: 10px 0;
  border-radius: 5px;
  margin-right: 5px;
}

.financials-row {
  display: flex;
  align-items: center;
  padding: 10px;
}

.financial-value {
  text-align: center;
  min-width: 100px;
  border-bottom: 1px solid var(--base1);
  padding-bottom: 10px;
  padding-top: 10px;
  color: var(--text1);
  border-radius: 5px;
  margin-right: 5px;
  background-color: rgba(var(--base3), 0.15);
  position: relative;
}

.toggle-button {
  margin: 3px;
  padding: 5px;
  border: none;
  border-radius: 5px;
  background-color: var(--accent1);
  color: var(--text1);
  transition: background-color 0.5s ease-in-out;
}

.toggle-button:hover {
  cursor: pointer;
  background-color: var(--accent2);
}

.watch-panel-container {
  display: flex;
  align-items: center;
  width: 100%;
  background-color: var(--base2);
  border-bottom: 1px solid var(--base4);
}

.watch-panel {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  width: 100%;
  /* Remove or adjust padding if needed */
}

.edit-watch-panel-btn {
  flex: 0 1 5%;
  margin-right: 2rem;
  background-color: var(--base2);
  color: var(--text1);
  border: 1px solid var(--base4);
  border-radius: 5px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.edit-watch-panel-btn:hover {
  background-color: var(--base4);
  color: var(--text1);
}

.no-symbols {
  color: var(--text3);
  font-style: italic;
  padding: 1rem 1rem;
}

.watch-panel-track {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  width: max-content;
  white-space: nowrap;
}

.watch-panel-track.scrolling {
  animation: scroll-ticker 30s linear infinite;
  will-change: transform;
}

@keyframes scroll-ticker {
  0% {
    transform: translateX(0%);
  }

  100% {
    transform: translateX(-50%);
  }
}

.index-btn {
  background-color: var(--base2);
  color: var(--text1);
  border-radius: 5px;
  border-color: transparent;
  letter-spacing: 0.2px;
  cursor: pointer;
  margin: 0.3rem;
  padding: 0.5rem;
}

.index-btn:hover {
  background-color: var(--base4);
  color: var(--text1);
}

.index-btn.active {
  background-color: var(--base1);
  color: var(--text1);
}

.percentage-box {
  position: absolute;
  top: -7px;
  right: -5px;
  background-color: transparent;
}

.tooltip {
  position: absolute;
  background-color: var(--base1);
  border: 1px solid var(--accent3);
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  z-index: 10000000000;
  width: 200px;
}

.tooltip-text {
  color: var(--text1);
}

.question-img {
  width: 15px;
  cursor: pointer;
  margin-left: 5px;
}

.empty-list-message {
  text-align: center;
  padding: 20px;
  color: var(--text1);
  opacity: 0.70;
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-left: 40px;
}

.empty-list-message p {
  font-size: 18px;
  margin-left: 10px;
}

.sphere {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  vertical-align: middle;
  margin-left: 4px;
  border: none;
}

.green-sphere {
  background-color: var(--positive);
  /* default green */
}

.red-sphere {
  background-color: var(--negative);
  /* default red */
}

.mobilenav {
  display: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

#chartdiv-mobile.mobile-chart {
  display: none;
}

@media (min-width: 1151px) {

  #sidebar-left,
  #chart-container,
  #sidebar-right {
    display: block !important;
  }
}

/* Mobile version */
@media (max-width: 1150px) {
  #main {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .watch-panel-container {
    display: none;
  }

  /* Hide sections that have the 'hidden-mobile' class */
  .hidden-mobile {
    display: none !important;
  }

  #sidebar-left {
    flex-direction: column;
    background-color: var(--base4);
    height: 100%;
  }

  #sidebar-right {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--base4);
  }

  #chart-container {
    display: none;
  }

  .indexes {
    display: none;
  }

  .mobilenav {
    display: flex;
    flex-direction: row;
    gap: 12px;
    /* space between buttons */
    padding: 8px 12px;
    background-color: rgba(var(--base4), 0.1);
    /* subtle transparent background */
    border-radius: 10px;
    justify-content: center;
    align-items: center;
  }

  .mnavbtn {
    margin-top: 5px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--base2);
    padding: 10px 30px;
    color: var(--text1);
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    cursor: pointer;
    border-radius: 5px;
    transition: background-color 0.3s ease, opacity 0.3s ease, transform 0.2s ease;
    opacity: 0.85;
    height: 3rem;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    user-select: none;
    border: transparent;
  }

  .mnavbtn:hover {
    background-color: var(--accent1);
    opacity: 1;
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .mnavbtn.selected {
    background-color: var(--accent1);
    opacity: 1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .empty-list-message {
    position: absolute;
    top: 50%;
    left: 40%;
    transform: translate(-50%, -50%);
  }

  .editbtn {
    background-color: var(--base4);
    border: none;
    cursor: pointer;
    width: 100%;
    padding: 15px;
    color: var(--text1);
    transition: background-color 0.5s ease-in-out;
    align-items: center;
    justify-content: center;
    display: flex;
    flex-direction: row;
    gap: 5px;
  }

  .financialbtn {
    background-color: var(--accent1);
    border: none;
    cursor: pointer;
    width: 100%;
    padding: 15px;
    color: var(--text1);
    transition: background-color 0.5s ease-in-out;
    font-size: 2rem;
  }

  .summary-row .category {
    flex: 0 0 50%;
    font-weight: 400;
    font-size: 1.5rem;
  }

  .summary-row .response {
    flex: 0 0 50%;
    font-size: 1.5rem;
  }

  .summary-row2 {
    display: flex;
    height: fit-content;
    padding-left: 5px;
    padding-right: 5px;
    padding-top: 5px;
    padding-bottom: 5px;
    align-items: center;
    justify-content: center;
    background-color: var(--base4);
  }

  .description {
    border: none;
    text-align: center;
    overflow: hidden;
    /* Hide overflow when not expanded */
    transition: height 0.3s ease;
    /* Smooth transition for height */
    /* Set a fixed height when not expanded */
    height: 50px;
    font-size: 1.5rem;
    /* This should match your minHeight */
  }

  .toggle-btn {
    background-color: var(--base2);
    border: none;
    cursor: pointer;
    width: 100%;
    color: var(--text1);
    padding: 10px;
    font-size: 1.5rem;
    transition: background-color 0.5s ease-in-out;
  }

  .toggle-btn:hover {
    background-color: var(--base4);
  }

  .dividends-header,
  .eps-header,
  .earn-header,
  .sales-header,
  .splits-header {
    display: flex;
    font-weight: bold;
    background-color: var(--base1);
    text-align: center;
    color: var(--text1);
    height: 40px;
    justify-content: center;
    align-items: center;
    font-size: 2rem;
  }

  .dividends-row,
  .eps-row,
  .earn-row,
  .sales-row,
  .splits-row {
    display: flex;
    height: 40px;
    text-align: center;
    margin-bottom: 1px;
    justify-content: center;
    align-items: center;
    background-color: var(--base2);
    font-weight: bold;
    font-size: 2rem;
  }

  .title {
    background-color: var(--base1);
    color: var(--text1);
    text-align: center;
    padding: 15px;
    font-size: 1.5rem;
    border: none;
    margin: 0;
  }

  #chartdiv {
    border: none;
  }

  #legend {
    display: none;
  }

  #legend2 {
    display: none;
  }

  #legend3 {
    display: none;
  }

  #legend4 {
    display: none;
  }

  #chartdiv-mobile.mobile-chart {
    display: block;
    width: 100% !important;
    height: 200px !important;
    margin: 0 auto;
  }

  #chartdiv {
    display: none !important;
  }

  /* input for searching symbols */
  #searchbar {
    border-radius: 5px;
    padding: 15px 15px 15px 15px;
    margin: 7px;
    width: calc(100% - 30px);
    /* Make space for the button */
    outline: none;
    color: var(--base3);
    /* Dark text color */
    transition: border-color 0.3s, box-shadow 0.3s;
    /* Smooth transition for focus effects */
    border: solid 1px var(--base1);
    background-color: var(--base4);
  }

  #searchbar:focus {
    border-color: var(--accent1);
    /* Change border color on focus */
    //box-shadow: 0 0 5px rgba(140, 141, 254, 0.5);
    /* Subtle shadow effect */
    outline: none;
    /* Remove default outline */
  }

  /* button for searching symbols, inside searchbar */
  .wlbtn2 {
    position: absolute;
    top: 50%;
    right: 8px;
    transform: translateY(-50%);
    flex-shrink: 0;
    color: var(--text1);
    background-color: var(--accent1);
    border: none;
    padding: 0;
    outline: none;
    cursor: pointer;
    height: 41px;
    width: 41px;
    border-top-right-radius: 5px;
    border-bottom-right-radius: 5px;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: background-color 0.2s ease-in-out;
  }

  .wlbtn2:hover {
    background-color: var(--accent2);
    box-shadow: 0 0 5px rgba(140, 141, 254, 0.5);
    outline: none;
  }

  .img {
    width: 20px;
    height: 20px;
    border: none;
  }

  .wlist {
    background-color: var(--base2);
    height: 35px;
    margin-top: 2px;
    border-left: var(--base4) solid 1px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--text1);
  }

  .img2 {
    width: 20px;
    height: 20px;
    border: none;
  }

  .tbl {
    font-size: 1.3rem;
  }

  .navbtn {
    background-color: transparent;
    border: none;
    cursor: pointer;
    opacity: 0.80;
    color: var(--text1);
    transition: opacity 0.2s ease;
    padding: 5px;
    margin: 5px;
    align-items: center;
    display: flex;
    flex-direction: row;
    justify-content: center;
  }

  .navbtn span {
    margin-left: 5px;
    font-size: 1.2rem;
  }

  .loading-container2 {
    position: absolute;
    bottom: 25%;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    border: none;
  }

  .dbtn {
    opacity: 1;
  }



}
</style>
