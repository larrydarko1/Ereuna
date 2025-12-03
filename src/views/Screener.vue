<template>
  <body>
    <Header />
    <div class="mobilenav">
      <button class="mnavbtn" :class="{ selected: selected === 'filters' }" @click="select('filters')" aria-label="Show filters panel">
        Filters
      </button>
      <button class="mnavbtn" :class="{ selected: selected === 'list' }" @click="select('list')" aria-label="Show results list panel">
        List
      </button>
      <button class="mnavbtn" :class="{ selected: selected === 'charts' }" @click="select('charts')" aria-label="Show charts panel">
        Charts
      </button>
    </div>
   <div style="display: flex;">
     <div class="selector-container"
       v-show="showSelector"
       style="flex-shrink:0;"
     >
       <Selector
         :ScreenersName="ScreenersName"
         :selectedScreener="selectedScreener"
         :isScreenerError="isScreenerError"
         :showDropdown="showDropdown"
         @selectScreener="selectScreener"
         @excludeScreener="ExcludeScreener"
         @deleteScreener="DeleteScreener"
         :getScreenerImage="getScreenerImage"
         @notify="showNotification($event)"
       />
     </div>
         <div class="navmenu" style="margin-left: 2px;">
          <h1 class="results-count" :key="resultListLength">
            RESULTS: {{ resultListLength }}
            <span v-if="isLoadingResults" class="results-loader">
              <svg class="results-spinner" viewBox="0 0 50 50">
                <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5" />
              </svg>
            </span>
          </h1>
      <button class="edit-watch-panel-btn" :class="{ 'edit-watch-panel-btn2': showEditColumn }"
        @click="showEditColumn = !showEditColumn" aria-label="Edit table columns">Edit Table</button>
          <button class="snavbtn" id="watchlistCreate" :class="{ 'snavbtnslct': showCreateScreener }"
            @click="showCreateScreener = !showCreateScreener" v-b-tooltip.hover title="Create New Screener" aria-label="Create new screener">
           <svg class="img2" viewBox="0 0 512 512" fill="var(--text1)" xmlns="http://www.w3.org/2000/svg">
  <g fill="var(--text1)" transform="translate(85.333333, 85.333333)">
    <path d="M170.67,0C264.92,0,341.33,76.41,341.33,170.67S264.92,341.33,170.67,341.33S0,264.92,0,170.67S76.41,0,170.67,0ZM170.67,42.67c-70.69,0-128,57.31-128,128s57.31,128,128,128s128-57.31,128-128S241.36,42.67,170.67,42.67ZM192,85.33v64h64v42.67h-64v64h-42.67v-64h-64v-42.67h64v-64H192Z"/>
  </g>
</svg>
            <label class=btnlabel>Create</label></button>
          <button class="snavbtn" id="screenerModify" :class="{ 'snavbtnslct': showRenameScreener }"
            @click="showRenameScreener = !showRenameScreener" v-b-tooltip.hover title="Rename Current Screener" aria-label="Rename current screener">
          <svg class="img2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M9 5H14M14 5H19M14 5V19M9 19H14M14 19H19" stroke="var(--text1)" stroke-width="2"></path>
  <path d="M11 9H4C2.89543 9 2 9.89543 2 11V15H11" stroke="var(--text1)" stroke-width="2"></path>
  <path d="M17 15H20C21.1046 15 22 14.1046 22 13V9H17" stroke="var(--text1)" stroke-width="2"></path>
</svg>
            <label class=btnlabel>Rename</label></button>
         <!-- Replace your current Reset button with this: -->
<button class="snavbtn" v-b-tooltip.hover title="Reset Screener" @click="showResetDialog = true" aria-label="Reset current screener">
  <svg class="img2" fill="var(--text1)" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" stroke="var(--text1)" stroke-width="20.48">
    <path d="M64,256H34A222,222,0,0,1,430,118.15V85h30V190H355V160h67.27A192.21,192.21,0,0,0,256,64C150.13,64,64,150.13,64,256Zm384,0c0,105.87-86.13,192-192,192A192.21,192.21,0,0,1,89.73,352H157V322H52V427H82V393.85A222,222,0,0,0,478,256Z"/>
  </svg>
  <label class="btnlabel">Reset</label>
</button>
<div v-if="showResetDialog" class="reset-modal-overlay">
  <div class="reset-modal">
    <h3>Reset Screener</h3>
    <p>Are you sure you want to reset the current screener? <br>This cannot be undone.</p>
    <div style="margin-top: 16px;">
      <button class="trade-btn" @click="confirmResetScreener">Yes, Reset</button>
      <button class="trade-btn" style="margin-left: 12px; background: var(--base3); color: #fff;" @click="showResetDialog = false">Cancel</button>
    </div>
    <div v-if="resetError" style="color: var(--negative); margin-top: 12px;">{{ resetError }}</div>
  </div>
</div>
          <button id="watchlistAutoplay" class="snavbtn" :class="{ 'snavbtnslct': autoplayRunning }"
            @click="AutoPlay()" v-b-tooltip.hover title="Autoplay Results" aria-label="Autoplay results">
            <svg class="img2" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="var(--text1)">
  <path fill="var(--text1)" fill-rule="evenodd"
    d="M5.23331,0.493645 C6.8801,-0.113331 8.6808,-0.161915 10.3579,0.355379 C11.4019,0.6773972 12.361984,1.20757325 13.1838415,1.90671757 L13.4526,2.14597 L14.2929,1.30564 C14.8955087,0.703065739 15.9071843,1.0850774 15.994017,1.89911843 L16,2.01275 L16,6.00002 L12.0127,6.00002 C11.1605348,6.00002 10.7153321,5.01450817 11.2294893,4.37749065 L11.3056,4.29291 L12.0372,3.56137 C11.389,2.97184 10.6156,2.52782 9.76845,2.26653 C8.5106,1.87856 7.16008,1.915 5.92498,2.37023 C4.68989,2.82547 3.63877,3.67423 2.93361,4.78573 C2.22844,5.89723 1.90836,7.20978 2.02268,8.52112 C2.13701,9.83246 2.6794,11.0698 3.56627,12.0425 C4.45315,13.0152 5.63528,13.6693 6.93052,13.9039 C8.22576,14.1385 9.56221,13.9407 10.7339,13.3409 C11.9057,12.7412 12.8476,11.7727 13.4147,10.5848 C13.6526,10.0864 14.2495,9.8752 14.748,10.1131 C15.2464,10.351 15.4575,10.948 15.2196,11.4464 C14.4635,13.0302 13.2076,14.3215 11.6453,15.1213 C10.0829,15.921 8.30101,16.1847 6.57402,15.8719 C4.84704,15.559 3.27086,14.687 2.08836,13.39 C0.905861,12.0931 0.182675,10.4433 0.0302394,8.69483 C-0.122195,6.94637 0.304581,5.1963 1.2448,3.7143 C2.18503,2.2323 3.58652,1.10062 5.23331,0.493645 Z M6,5.46077 C6,5.09472714 6.37499031,4.86235811 6.69509872,5.0000726 L6.7678,5.03853 L10.7714,7.57776 C11.0528545,7.75626909 11.0784413,8.14585256 10.8481603,8.36273881 L10.7714,8.42224 L6.7678,10.9615 C6.45867857,11.1575214 6.06160816,10.965274 6.00646097,10.6211914 L6,10.5392 L6,5.46077 Z">
  </path>
</svg>
            <label class=btnlabel>Autoplay</label></button>
          <button class="snavbtn" :class="{ 'snavbtnslct': listMode === 'hidden' }" v-b-tooltip.hover
            title="Hidden List" @click="showHiddenResults()" aria-label="Show hidden assets list">
          <svg class="img2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M3.99989 4L19.9999 20M16.4999 16.7559C15.1473 17.4845 13.6185 17.9999 11.9999 17.9999C8.46924 17.9999 5.36624 15.5478 3.5868 13.7788C3.1171 13.3119 2.88229 13.0784 2.7328 12.6201C2.62619 12.2933 2.62616 11.7066 2.7328 11.3797C2.88233 10.9215 3.11763 10.6875 3.58827 10.2197C4.48515 9.32821 5.71801 8.26359 7.17219 7.42676M19.4999 14.6335C19.8329 14.3405 20.138 14.0523 20.4117 13.7803L20.4146 13.7772C20.8832 13.3114 21.1182 13.0779 21.2674 12.6206C21.374 12.2938 21.3738 11.7068 21.2672 11.38C21.1178 10.9219 20.8827 10.6877 20.4133 10.2211C18.6338 8.45208 15.5305 6 11.9999 6C11.6624 6 11.3288 6.02241 10.9999 6.06448M13.3228 13.5C12.9702 13.8112 12.5071 14 11.9999 14C10.8953 14 9.99989 13.1046 9.99989 12C9.99989 11.4605 10.2135 10.9711 10.5608 10.6113"
    stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
            <label class=btnlabel>Hidden Assets</label></button>
          <button class="snavbtn" :class="{ 'snavbtnslct': listMode === 'combined' }" v-b-tooltip.hover
            title="Show Combined Screener Results" @click="showCombinedResults()" aria-label="Show combined screener results">
          <svg class="img2" fill="var(--text1)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M8,8 L8,4.5 C8,3.11928813 9.11928813,2 10.5,2 L19.5,2 C20.8807119,2 22,3.11928813 22,4.5 L22,13.5 C22,14.8807119 20.8807119,16 19.5,16 L16,16 L16,19.5 C16,20.8807119 14.8807119,22 13.5,22 L4.5,22 C3.11928813,22 2,20.8807119 2,19.5 L2,10.5 C2,9.11928813 3.11928813,8 4.5,8 L8,8 Z M9,8.5 C9,8.77614237 8.77614237,9 8.5,9 L4.5,9 C3.67157288,9 3,9.67157288 3,10.5 L3,19.5 C3,20.3284271 3.67157288,21 4.5,21 L13.5,21 C14.3284271,21 15,20.3284271 15,19.5 L15,15.5 C15,15.2238576 15.2238576,15 15.5,15 L19.5,15 C20.3284271,15 21,14.3284271 21,13.5 L21,4.5 C21,3.67157288 20.3284271,3 19.5,3 L10.5,3 C9.67157288,3 9,3.67157288 9,4.5 L9,8.5 Z M13.5,9 C13.2238576,9 13,8.77614237 13,8.5 C13,8.22385763 13.2238576,8 13.5,8 C14.8807119,8 16,9.11928813 16,10.5 C16,10.7761424 15.7761424,11 15.5,11 C15.2238576,11 15,10.7761424 15,10.5 C15,9.67157288 14.3284271,9 13.5,9 Z M8,13.5 C8,13.2238576 8.22385763,13 8.5,13 C8.77614237,13 9,13.2238576 9,13.5 C9,14.3284271 9.67157288,15 10.5,15 C10.7761424,15 11,15.2238576 11,15.5 C11,15.7761424 10.7761424,16 10.5,16 C9.11928813,16 8,14.8807119 8,13.5 Z M12.5,16 C12.2238576,16 12,15.7761424 12,15.5 C12,15.2238576 12.2238576,15 12.5,15 L13.5,15 C13.7761424,15 14,15.2238576 14,15.5 C14,15.7761424 13.7761424,16 13.5,16 L12.5,16 Z M10.5,9 C10.2238576,9 10,8.77614237 10,8.5 C10,8.22385763 10.2238576,8 10.5,8 L11.5,8 C11.7761424,8 12,8.22385763 12,8.5 C12,8.77614237 11.7761424,9 11.5,9 L10.5,9 Z M8,10.5 C8,10.2238576 8.22385763,10 8.5,10 C8.77614237,10 9,10.2238576 9,10.5 L9,11.5 C9,11.7761424 8.77614237,12 8.5,12 C8.22385763,12 8,11.7761424 8,11.5 L8,10.5 Z M15,12.5 C15,12.2238576 15.2238576,12 15.5,12 C15.7761424,12 16,12.2238576 16,12.5 L16,13.5 C16,13.7761424 15.7761424,14 15.5,14 C15.2238576,14 15,13.7761424 15,13.5 L15,12.5 Z"/>
</svg>
            <label class=btnlabel>Multi-Screener</label>
          </button>
         <button @click="DownloadResults" class="snavbtn" style="cursor: pointer;" v-b-tooltip.hover
  title="Download Results" aria-label="Download results"
  :disabled="downloadLoading">
  <label v-if="downloadLoading" class="loader4">
    <svg class="spinner" viewBox="0 0 50 50">
      <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5" />
    </svg>
  </label>
  <svg v-else class="img2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 15C3 17.8284 3 19.2426 3.87868 20.1213C4.75736 21 6.17157 21 9 21H15C17.8284 21 19.2426 21 20.1213 20.1213C21 19.2426 21 17.8284 21 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 3V16M12 16L16 11.625M12 16L8 11.625" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  <label class=btnlabel>{{ downloadLoading ? 'Downloading...' : 'Download Results' }}</label>
</button>
        </div>
   </div>
    <div id="main2">
      <div class="tooltip-container" style="position: relative;">
        <div class="tooltip" v-if="showTooltip" :style="{ top: tooltipTop + 'px', left: tooltipLeft + 'px' }">
          <span class="tooltip-text">{{ tooltipText }}</span>
        </div>
      </div>
      <div id="filters" :class="{ 'hidden-mobile': selected !== 'filters' }">
       <Price
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('price')"
  @notify="showNotification($event)"
  v-model:showPriceInputs="showPriceInputs"
/>
     <MarketCap
      :user="user?.Username ?? ''"
    :apiKey="apiKey"
    :notification="notification"
    :selectedScreener="selectedScreener"
    @fetchScreeners="handleFetchScreeners"
    @handleMouseOver="handleMouseOver"
    @handleMouseOut="handleMouseOut"
    :isScreenerError="isScreenerError"
    @reset="Reset('Marketcap')"
    @notify="showNotification($event)"
    v-model:showMarketCapInputs="showMarketCapInputs"
  />
       <IPO 
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('IPO')"
  @notify="showNotification($event)"
  v-model:showIPOInputs="showIPOInputs"
       />
       <AssetType 
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('AssetType')"
  @notify="showNotification($event)"
  v-model:ShowAssetType="ShowAssetType"
  :initialSelected="initialAssetTypes"
       />
       <Sector 
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('Sector')"
  @notify="showNotification($event)"
  v-model:ShowSector="ShowSector"
    :initialSelected="initialSectors"
       />
       <Exchange
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('Exchange')"
  @notify="showNotification($event)"
  v-model:ShowExchange="ShowExchange"
    :initialSelected="initialExchanges"
       />
       <Country
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('Country')"
  @notify="showNotification($event)"
  v-model:ShowCountry="ShowCountry"
    :initialSelected="initialCountries"
       />
       <AIRecommendation
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('AIRecommendation')"
  @notify="showNotification($event)"
  v-model:ShowAIRecommendation="ShowAIRecommendation"
    :initialSelected="initialAIRecommendations"
       />
       <PE
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('PE')"
  @notify="showNotification($event)"
  v-model:showPEInputs="showPEInputs"
       />
        <PS
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('PS')"
  @notify="showNotification($event)"
  v-model:showPSInputs="showPSInputs"
        />
       <PEG
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('PEG')"
  @notify="showNotification($event)"
  v-model:showPEGInputs="showPEGInputs"
       />
       <EPS
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('EPS')"
  @notify="showNotification($event)"
  v-model:showEPSInputs="showEPSInputs"
       />
       <PB
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('PB')"
  @notify="showNotification($event)"
  v-model:showPBInputs="showPBInputs"
       />
        <DivYield
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('DivYield')"
  @notify="showNotification($event)"
  v-model:showDivYieldInputs="showDivYieldInputs"
        />
       <ShowFundYoYQoQ
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('FundGrowth')"
  @notify="showNotification($event)"
  v-model:showFundYoYQoQ="showFundYoYQoQ"
       />
       <PricePerf
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('PricePerformance')"
  @notify="showNotification($event)"
  v-model:showPricePerf="showPricePerf"
    :initialSettings="initialPricePerfSettings"
       />
       <RSscore
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('RSscore')"
  @notify="showNotification($event)"
  v-model:showRSscore="showRSscore"
       />
       <Volume
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('Volume')"
  @notify="showNotification($event)"
  v-model:showVolume="showVolume"
       />
       <ADV
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('ADV')"
  @notify="showNotification($event)"
  v-model:showADV="showADV"
       />
       <ROE
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('ROE')"
  @notify="showNotification($event)"
  v-model:showROE="showROE"
       />
       <ROA
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('ROA')"
  @notify="showNotification($event)"
  v-model:showROA="showROA"
       />
       <CurrentRatio
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('CurrentRatio')"
  @notify="showNotification($event)"
  v-model:showCurrentRatio="showCurrentRatio"
       />
       <CurrentAsset
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('CurrentAssets')"
  @notify="showNotification($event)"
  v-model:showCurrentAssets="showCurrentAssets"
       />
     <CurrentLiability
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('CurrentLiabilities')"
  @notify="showNotification($event)"
  v-model:showCurrentLiabilities="showCurrentLiabilities"
     />
       <CurrentDebt
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('CurrentDebt')"
  @notify="showNotification($event)"
  v-model:showCurrentDebt="showCurrentDebt"
       />
       <CashEquivalents
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('CashEquivalents')"
  @notify="showNotification($event)"
  v-model:showCashEquivalents="showCashEquivalents"
       />
       <FCF
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('FCF')"
  @notify="showNotification($event)"
  v-model:showFreeCashFlow="showFreeCashFlow"
       />
       <ProfitMargin
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('ProfitMargin')"
  @notify="showNotification($event)"
  v-model:showProfitMargin="showProfitMargin"
       />
       <GrossMargin
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('GrossMargin')"
  @notify="showNotification($event)"
  v-model:showGrossMargin="showGrossMargin"
       />
        <DebtEquity
          :user="user?.Username ?? ''"
          :apiKey="apiKey"
          :notification="notification"
          :selectedScreener="selectedScreener"
          @fetchScreeners="handleFetchScreeners"
          @handleMouseOver="handleMouseOver"
          @handleMouseOut="handleMouseOut"
          :isScreenerError="isScreenerError"
          @reset="Reset('DebtEquity')"
          @notify="showNotification($event)"
          v-model:showDebtToEquityRatio="showDebtToEquityRatio"
        />
       <BookValue
         :user="user?.Username ?? ''"
         :apiKey="apiKey"
         :notification="notification"
         :selectedScreener="selectedScreener"
         @fetchScreeners="handleFetchScreeners"
         @handleMouseOver="handleMouseOver"
         @handleMouseOut="handleMouseOut"
         :isScreenerError="isScreenerError"
         @reset="Reset('BookValue')"
         @notify="showNotification($event)"
         v-model:showBookValue="showBookValue"
       />
       <EV
         :user="user?.Username ?? ''"
         :apiKey="apiKey"
         :notification="notification"
         :selectedScreener="selectedScreener"
         @fetchScreeners="handleFetchScreeners"
         @handleMouseOver="handleMouseOver"
         @handleMouseOut="handleMouseOut"
         :isScreenerError="isScreenerError"
         @reset="Reset('EV')"
         @notify="showNotification($event)"
         v-model:showEV="showEV"
       />
        <RSI
          :user="user?.Username ?? ''"
          :apiKey="apiKey"
          :notification="notification"
          :selectedScreener="selectedScreener"
          @fetchScreeners="handleFetchScreeners"
          @handleMouseOver="handleMouseOver"
          @handleMouseOut="handleMouseOut"
          :isScreenerError="isScreenerError"
          @reset="Reset('RSI')"
          @notify="showNotification($event)"
          v-model:showRSI="showRSI"
        />
        <Gap
          :user="user?.Username ?? ''"
          :apiKey="apiKey"
          :notification="notification"
          :selectedScreener="selectedScreener"
          @fetchScreeners="handleFetchScreeners"
          @handleMouseOver="handleMouseOver"
          @handleMouseOut="handleMouseOut"
          :isScreenerError="isScreenerError"
          @reset="Reset('Gap')"
          @notify="showNotification($event)"
          v-model:showGap="showGap"
        />
        <IntrinsicValue 
          :user="user?.Username ?? ''"
          :apiKey="apiKey"
          :notification="notification"
          :selectedScreener="selectedScreener"
          @fetchScreeners="handleFetchScreeners"
          @handleMouseOver="handleMouseOver"
          @handleMouseOut="handleMouseOut"
          :isScreenerError="isScreenerError"
          @reset="Reset('IV')"
          @notify="showNotification($event)"
          v-model:showIntrinsicValue="showIntrinsicValue"
        />
        <CAGR
          :user="user?.Username ?? ''"
          :apiKey="apiKey"
          :notification="notification"
          :selectedScreener="selectedScreener"
          @fetchScreeners="handleFetchScreeners"
          @handleMouseOver="handleMouseOver"
          @handleMouseOut="handleMouseOut"
          :isScreenerError="isScreenerError"
          @reset="Reset('CAGR')"
          @notify="showNotification($event)"
          v-model:showCAGR="showCAGRModel"
        />
               <FundFamily
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('FundFamily')"
  @notify="showNotification($event)"
  v-model:ShowFundFamily="ShowFundFamily"
    :initialSelected="initialFundFamilies"
       />
       <FundCategory
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('FundCategory')"
  @notify="showNotification($event)"
  v-model:ShowFundCategory="ShowFundCategory"
    :initialSelected="initialFundCategories"
       />
       <NetExpenseRatio
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('NetExpenseRatio')"
  @notify="showNotification($event)"
  v-model:showNetExpenseRatioInputs="showNetExpenseRatioInputs"
        />
        <div class="results"></div>
      </div>
      <div id="resultsDiv" :class="{ 'hidden-mobile': selected !== 'list' }">
<CreateScreener
  v-if="showCreateScreener"
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :GetScreeners="GetScreeners"
  :GetCompoundedResults="GetCompoundedResults"
  :showCreateScreener="showCreateScreener"
  @close=" GetScreeners(); GetCompoundedResults(true); showCreateScreener = false;"
  @notify="showNotification($event)"
/>
      <RenameScreener
  v-if="showRenameScreener"
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :currentName="selectedScreener"
  :GetScreeners="GetScreeners"
  @close="selectedScreener = screenerName; GetScreeners(); GetCompoundedResults(true); showRenameScreener = false;"
  @notify="showNotification($event)"
/>
<EditColumn
  v-if="showEditColumn"
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :notification="notification"
  :selectedAttributes="selectedAttributes"
  @update-columns="handleUpdateColumns"
  @reload-columns="loadColumns"
  :showEditColumn="{ value: showEditColumn }"
  @close="showEditColumn = false"
  @notify="showNotification($event)"
/>
        <div class="navmenu-mobile">
           <h1 class="results-count" :key="resultListLength">RESULTS: {{ resultListLength }}</h1>
          <button class="snavbtn" id="watchlistCreate" :class="{ 'snavbtnslct': showCreateScreener }"
            @click="showCreateScreener = !showCreateScreener" v-b-tooltip.hover title="Create New Screener">
           <svg class="img2" viewBox="0 0 512 512" fill="var(--text1)" xmlns="http://www.w3.org/2000/svg">
  <g fill="var(--text1)" transform="translate(85.333333, 85.333333)">
    <path d="M170.67,0C264.92,0,341.33,76.41,341.33,170.67S264.92,341.33,170.67,341.33S0,264.92,0,170.67S76.41,0,170.67,0ZM170.67,42.67c-70.69,0-128,57.31-128,128s57.31,128,128,128s128-57.31,128-128S241.36,42.67,170.67,42.67ZM192,85.33v64h64v42.67h-64v64h-42.67v-64h-64v-42.67h64v-64H192Z"/>
  </g>
</svg></button>
          <button class="snavbtn" id="screenerModify" :class="{ 'snavbtnslct': showRenameScreener }"
            @click="showRenameScreener = !showRenameScreener" v-b-tooltip.hover title="Rename Current Screener">
          <svg class="img2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M9 5H14M14 5H19M14 5V19M9 19H14M14 19H19" stroke="var(--text1)" stroke-width="2"></path>
  <path d="M11 9H4C2.89543 9 2 9.89543 2 11V15H11" stroke="var(--text1)" stroke-width="2"></path>
  <path d="M17 15H20C21.1046 15 22 14.1046 22 13V9H17" stroke="var(--text1)" stroke-width="2"></path>
</svg></button>
         <!-- Replace your current Reset button with this: -->
<button class="snavbtn" v-b-tooltip.hover title="Reset Screener" @click="showResetDialog = true">
  <svg class="img2" fill="var(--text1)" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" stroke="var(--text1)" stroke-width="5">
    <path d="M64,256H34A222,222,0,0,1,430,118.15V85h30V190H355V160h67.27A192.21,192.21,0,0,0,256,64C150.13,64,64,150.13,64,256Zm384,0c0,105.87-86.13,192-192,192A192.21,192.21,0,0,1,89.73,352H157V322H52V427H82V393.85A222,222,0,0,0,478,256Z"/>
  </svg>
</button>
<div v-if="showResetDialog" class="reset-modal-overlay">
  <div class="reset-modal">
    <h3>Reset Screener</h3>
    <p>Are you sure you want to reset the current screener? <br>This cannot be undone.</p>
    <div style="margin-top: 16px;">
      <button class="trade-btn" @click="confirmResetScreener">Yes, Reset</button>
      <button class="trade-btn" style="margin-left: 12px; background: var(--base3); color: #fff;" @click="showResetDialog = false">Cancel</button>
    </div>
    <div v-if="resetError" style="color: var(--negative); margin-top: 12px;">{{ resetError }}</div>
  </div>
</div>
          <button id="watchlistAutoplay" class="snavbtn" :class="{ 'snavbtnslct': autoplayRunning }"
            @click="AutoPlay()" v-b-tooltip.hover title="Autoplay Results">
            <svg class="img2" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="var(--text1)">
  <path fill="var(--text1)" fill-rule="evenodd"
    d="M5.23331,0.493645 C6.8801,-0.113331 8.6808,-0.161915 10.3579,0.355379 C11.4019,0.6773972 12.361984,1.20757325 13.1838415,1.90671757 L13.4526,2.14597 L14.2929,1.30564 C14.8955087,0.703065739 15.9071843,1.0850774 15.994017,1.89911843 L16,2.01275 L16,6.00002 L12.0127,6.00002 C11.1605348,6.00002 10.7153321,5.01450817 11.2294893,4.37749065 L11.3056,4.29291 L12.0372,3.56137 C11.389,2.97184 10.6156,2.52782 9.76845,2.26653 C8.5106,1.87856 7.16008,1.915 5.92498,2.37023 C4.68989,2.82547 3.63877,3.67423 2.93361,4.78573 C2.22844,5.89723 1.90836,7.20978 2.02268,8.52112 C2.13701,9.83246 2.6794,11.0698 3.56627,12.0425 C4.45315,13.0152 5.63528,13.6693 6.93052,13.9039 C8.22576,14.1385 9.56221,13.9407 10.7339,13.3409 C11.9057,12.7412 12.8476,11.7727 13.4147,10.5848 C13.6526,10.0864 14.2495,9.8752 14.748,10.1131 C15.2464,10.351 15.4575,10.948 15.2196,11.4464 C14.4635,13.0302 13.2076,14.3215 11.6453,15.1213 C10.0829,15.921 8.30101,16.1847 6.57402,15.8719 C4.84704,15.559 3.27086,14.687 2.08836,13.39 C0.905861,12.0931 0.182675,10.4433 0.0302394,8.69483 C-0.122195,6.94637 0.304581,5.1963 1.2448,3.7143 C2.18503,2.2323 3.58652,1.10062 5.23331,0.493645 Z M6,5.46077 C6,5.09472714 6.37499031,4.86235811 6.69509872,5.0000726 L6.7678,5.03853 L10.7714,7.57776 C11.0528545,7.75626909 11.0784413,8.14585256 10.8481603,8.36273881 L10.7714,8.42224 L6.7678,10.9615 C6.45867857,11.1575214 6.06160816,10.965274 6.00646097,10.6211914 L6,10.5392 L6,5.46077 Z">
  </path>
</svg></button>
          <button class="snavbtn" :class="{ 'snavbtnslct': listMode === 'hidden' }" v-b-tooltip.hover
            title="Hidden List" @click="showHiddenResults()">
          <svg class="img2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M3.99989 4L19.9999 20M16.4999 16.7559C15.1473 17.4845 13.6185 17.9999 11.9999 17.9999C8.46924 17.9999 5.36624 15.5478 3.5868 13.7788C3.1171 13.3119 2.88229 13.0784 2.7328 12.6201C2.62619 12.2933 2.62616 11.7066 2.7328 11.3797C2.88233 10.9215 3.11763 10.6875 3.58827 10.2197C4.48515 9.32821 5.71801 8.26359 7.17219 7.42676M19.4999 14.6335C19.8329 14.3405 20.138 14.0523 20.4117 13.7803L20.4146 13.7772C20.8832 13.3114 21.1182 13.0779 21.2674 12.6206C21.374 12.2938 21.3738 11.7068 21.2672 11.38C21.1178 10.9219 20.8827 10.6877 20.4133 10.2211C18.6338 8.45208 15.5305 6 11.9999 6C11.6624 6 11.3288 6.02241 10.9999 6.06448M13.3228 13.5C12.9702 13.8112 12.5071 14 11.9999 14C10.8953 14 9.99989 13.1046 9.99989 12C9.99989 11.4605 10.2135 10.9711 10.5608 10.6113"
    stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg></button>
          <button class="snavbtn" :class="{ 'snavbtnslct': listMode === 'combined' }" v-b-tooltip.hover
            title="Show Combined Screener Results" @click="showCombinedResults()">
          <svg class="img2" fill="var(--text1)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M8,8 L8,4.5 C8,3.11928813 9.11928813,2 10.5,2 L19.5,2 C20.8807119,2 22,3.11928813 22,4.5 L22,13.5 C22,14.8807119 20.8807119,16 19.5,16 L16,16 L16,19.5 C16,20.8807119 14.8807119,22 13.5,22 L4.5,22 C3.11928813,22 2,20.8807119 2,19.5 L2,10.5 C2,9.11928813 3.11928813,8 4.5,8 L8,8 Z M9,8.5 C9,8.77614237 8.77614237,9 8.5,9 L4.5,9 C3.67157288,9 3,9.67157288 3,10.5 L3,19.5 C3,20.3284271 3.67157288,21 4.5,21 L13.5,21 C14.3284271,21 15,20.3284271 15,19.5 L15,15.5 C15,15.2238576 15.2238576,15 15.5,15 L19.5,15 C20.3284271,15 21,14.3284271 21,13.5 L21,4.5 C21,3.67157288 20.3284271,3 19.5,3 L10.5,3 C9.67157288,3 9,3.67157288 9,4.5 L9,8.5 Z M13.5,9 C13.2238576,9 13,8.77614237 13,8.5 C13,8.22385763 13.2238576,8 13.5,8 C14.8807119,8 16,9.11928813 16,10.5 C16,10.7761424 15.7761424,11 15.5,11 C15.2238576,11 15,10.7761424 15,10.5 C15,9.67157288 14.3284271,9 13.5,9 Z M8,13.5 C8,13.2238576 8.22385763,13 8.5,13 C8.77614237,13 9,13.2238576 9,13.5 C9,14.3284271 9.67157288,15 10.5,15 C10.7761424,15 11,15.2238576 11,15.5 C11,15.7761424 10.7761424,16 10.5,16 C9.11928813,16 8,14.8807119 8,13.5 Z M12.5,16 C12.2238576,16 12,15.7761424 12,15.5 C12,15.2238576 12.2238576,15 12.5,15 L13.5,15 C13.7761424,15 14,15.2238576 14,15.5 C14,15.7761424 13.7761424,16 13.5,16 L12.5,16 Z M10.5,9 C10.2238576,9 10,8.77614237 10,8.5 C10,8.22385763 10.2238576,8 10.5,8 L11.5,8 C11.7761424,8 12,8.22385763 12,8.5 C12,8.77614237 11.7761424,9 11.5,9 L10.5,9 Z M8,10.5 C8,10.2238576 8.22385763,10 8.5,10 C8.77614237,10 9,10.2238576 9,10.5 L9,11.5 C9,11.7761424 8.77614237,12 8.5,12 C8.22385763,12 8,11.7761424 8,11.5 L8,10.5 Z M15,12.5 C15,12.2238576 15.2238576,12 15.5,12 C15.7761424,12 16,12.2238576 16,12.5 L16,13.5 C16,13.7761424 15.7761424,14 15.5,14 C15.2238576,14 15,13.7761424 15,13.5 L15,12.5 Z"/>
</svg>
          </button>
        </div>
        <div v-if="listMode === 'main'">
          <div v-if="initialLoading" class="simple-loader" aria-live="polite"><span class="simple-spinner" aria-hidden="true"></span>Fetching List</div>
          <MainList
            v-else
            :currentResults="currentResults"
            :selectedItem="selectedItem ?? ''"
            :watchlist="watchlist"
            :getWatchlistIcon="getWatchlistIcon"
            :selectedAttributes="selectedAttributes"
            @scroll="handleScroll1"
            @keydown="handleKeydown"
            @select-row="selectRow"
            @hide-stock="hideStock"
            @toggle-watchlist="({ tickerName, symbol }) => toggleWatchlist(tickerName, symbol)"
          />
        </div>
        <div v-else-if="listMode === 'filter'">
          <div v-if="filterInitialLoading" class="simple-loader" aria-live="polite"><span class="simple-spinner" aria-hidden="true"></span>Fetching List</div>
          <FilterList
            v-else
            :currentResults="currentResults"
            :selectedItem="selectedItem ?? ''"
            :watchlist="watchlist"
            :getWatchlistIcon="getWatchlistIcon"
            :selectedAttributes="selectedAttributes"
            @scroll="handleScroll2"
            @keydown="handleKeydown"
            @select-row="selectRow"
            @hide-stock="hideStock"
            @toggle-watchlist="({ tickerName, symbol }) => toggleWatchlist(tickerName, symbol)"
          />
        </div>
        <div v-else-if="listMode === 'hidden'">
          <div v-if="hiddenInitialLoading" class="simple-loader" aria-live="polite"><span class="simple-spinner" aria-hidden="true"></span>Fetching List</div>
          <HiddenList
            v-else
            :currentResults="currentResults"
            :selectedItem="selectedItem ?? ''"
            :watchlist="watchlist"
            :getWatchlistIcon="getWatchlistIcon"
            :selectedAttributes="selectedAttributes"
            @scroll="handleScroll3"
            @keydown="handleKeydown"
            @select-row="selectRow"
            @show-stock="ShowStock"
            @toggle-watchlist="({ tickerName, symbol }) => toggleWatchlist(tickerName, symbol)"
          />
        </div>
        <div v-else-if="listMode === 'combined'">
          <div v-if="compoundedInitialLoading" class="simple-loader" aria-live="polite"><span class="simple-spinner" aria-hidden="true"></span>Fetching List</div>
          <CombinedList
            v-else
            :currentResults="currentResults"
            :selectedItem="selectedItem ?? ''"
            :watchlist="watchlist"
            :getWatchlistIcon="getWatchlistIcon"
            :selectedAttributes="selectedAttributes"
            @scroll="handleScroll4"
            @keydown="handleKeydown"
            @select-row="selectRow"
            @hide-stock="hideStock"
            @toggle-watchlist="({ tickerName, symbol }) => toggleWatchlist(tickerName, symbol)"
          />
        </div>
                              </div>
                              <div id="sidebar-r" :class="{ 'hidden-mobile': selected !== 'charts' }">
                            <Chart1
                              :apiKey="apiKey"
                              :defaultSymbol="defaultSymbol ?? ''"
                              :selectedItem="selectedItem ?? ''"
                              :selectedSymbol="selectedSymbol"
                              :updateUserDefaultSymbol="updateUserDefaultSymbol"
                              @symbol-selected="setCharts"
                            />
                             <Chart2
                              :apiKey="apiKey"
                              :defaultSymbol="defaultSymbol ?? ''"
                              :selectedItem="selectedItem ?? ''"
                              :selectedSymbol="selectedSymbol"
                              :updateUserDefaultSymbol="updateUserDefaultSymbol"
                              @symbol-selected="setCharts"
                            />

                            <Summary
                              :apiKey="apiKey"
                              :username="user?.Username ?? ''"
                              :selectedScreener="selectedScreener"
                              ref="summaryRef"
                            />
                              </div>
                            </div>
                            <NotificationPopup ref="notification" />
  </body>
</template>

<script setup lang="ts">
// @ is an alias to /src
import Header from '@/components/Header.vue'
import Selector from '@/components/Screener/Selector.vue';
import { computed, onMounted, ref, watch, nextTick, reactive, toRef } from 'vue';
import { useUserStore } from '@/store/store';
import NotificationPopup from '@/components/NotificationPopup.vue';

// popups 
import CreateScreener from '@/components/Screener/CreateScreener.vue';
import RenameScreener from '@/components/Screener/RenameScreener.vue';
import EditColumn from '@/components/Screener/EditColumn.vue';

// list components
import MainList from '@/components/Screener/Tables/MainList.vue';
import FilterList from '@/components/Screener/Tables/FilterList.vue';
import HiddenList from '@/components/Screener/Tables/HiddenList.vue';
import CombinedList from '@/components/Screener/Tables/CombinedList.vue';

// charts components
import Chart1 from '@/components/Screener/Chart1.vue'; // weekly chart
import Chart2 from '@/components/Screener/Chart2.vue'; // daily chart
import Summary from '@/components/Screener/Summary.vue'; // summary component

//filter components
import Price from '@/components/Screener/Parameters/Price.vue';
import MarketCap from '@/components/Screener/Parameters/MarketCap.vue';
import IPO from '@/components/Screener/Parameters/IPO.vue';
import AssetType from '@/components/Screener/Parameters/AssetType.vue';
import Sector from '@/components/Screener/Parameters/Sector.vue';
import Exchange from '@/components/Screener/Parameters/Exchange.vue';
import Country from '@/components/Screener/Parameters/Country.vue';
import AIRecommendation from '@/components/Screener/Parameters/AIRecommendation.vue';
import PE from '@/components/Screener/Parameters/PE.vue';
import PS from '@/components/Screener/Parameters/PS.vue';
import PEG from '@/components/Screener/Parameters/PEG.vue';
import EPS from '@/components/Screener/Parameters/EPS.vue';
import PB from '@/components/Screener/Parameters/PB.vue';
import DivYield from '@/components/Screener/Parameters/DivYield.vue';
import FundFamily from '@/components/Screener/Parameters/FundFamily.vue';
import FundCategory from '@/components/Screener/Parameters/FundCategory.vue';
import NetExpenseRatio from '@/components/Screener/Parameters/NetExpenseRatio.vue';
import ShowFundYoYQoQ from '@/components/Screener/Parameters/ShowFundYoYQoQ.vue';
import PricePerf from '@/components/Screener/Parameters/PricePerf.vue';
import RSscore from '@/components/Screener/Parameters/RSscore.vue';
import Volume from '@/components/Screener/Parameters/Volume.vue';
import ADV from '@/components/Screener/Parameters/ADV.vue';
import ROE from '@/components/Screener/Parameters/ROE.vue';
import ROA from '@/components/Screener/Parameters/ROA.vue';
import CurrentRatio from '@/components/Screener/Parameters/CurrentRatio.vue';
import CurrentAsset from '@/components/Screener/Parameters/CurrentAsset.vue';
import CurrentLiability from '@/components/Screener/Parameters/CurrentLiability.vue';
import CurrentDebt from '@/components/Screener/Parameters/CurrentDebt.vue';
import CashEquivalents from '@/components/Screener/Parameters/CashEquivalents.vue';
import FCF from '@/components/Screener/Parameters/FCF.vue';
import ProfitMargin from '@/components/Screener/Parameters/ProfitMargin.vue';
import GrossMargin from '@/components/Screener/Parameters/GrossMargin.vue';
import DebtEquity from '@/components/Screener/Parameters/DebtEquity.vue';
import BookValue from '@/components/Screener/Parameters/BookValue.vue';
import EV from '@/components/Screener/Parameters/EV.vue';
import RSI from '@/components/Screener/Parameters/RSI.vue';
import Gap from '@/components/Screener/Parameters/Gap.vue';
import IntrinsicValue from '@/components/Screener/Parameters/IntrinsicValue.vue';
import CAGR from '@/components/Screener/Parameters/CAGR.vue';

const apiKey = import.meta.env.VITE_EREUNA_KEY;
const userStore = useUserStore();
const user = computed(() => userStore.getUser);

const errorMessage = ref('');
const showPriceInputs = ref(false);
const showMarketCapInputs = ref(false);
const showIPOInputs = ref(false);
const ShowSector = ref(false);
const ShowAssetType = ref(false);
// initial selections coming from loaded screener
const initialAssetTypes = ref<string[]>([]);
const initialSectors = ref<string[]>([]);
const initialExchanges = ref<string[]>([]);
const initialCountries = ref<string[]>([]);
const initialAIRecommendations = ref<string[]>([]);
const initialFundFamilies = ref<string[]>([]);
const initialFundCategories = ref<string[]>([]);
const initialPricePerfSettings = ref<Record<string, any> | undefined>(undefined);
const ShowExchange = ref(false);
const ShowCountry = ref(false);
const ShowAIRecommendation = ref(false);
const ShowFundFamily = ref(false);
const ShowFundCategory = ref(false);
const showPEInputs = ref(false);
const showPEForwInputs = ref(false);
const showPEGInputs = ref(false);
const showEPSInputs = ref(false);
const showPSInputs = ref(false);
const showPBInputs = ref(false);
const showBetaInputs = ref(false);
const showDivYieldInputs = ref(false);
const showNetExpenseRatioInputs = ref(false);
const showFundYoYQoQ = ref(false);
const showVolume = ref(false);
const showRSscore = ref(false);
const showADV = ref(false);
const showPricePerf = ref(false);
const showROE = ref(false);
const showROA = ref(false);
const showCurrentRatio = ref(false);
const showCurrentAssets = ref(false);
const showCurrentLiabilities = ref(false);
const showCurrentDebt = ref(false);
const showCashEquivalents = ref(false);
const showFreeCashFlow = ref(false);
const showProfitMargin = ref(false);
const showGrossMargin = ref(false);
const showDebtToEquityRatio = ref(false);
const showBookValue = ref(false);
const showEV = ref(false);
const showRSI = ref(false);
const showGap = ref(false);
const showIntrinsicValue = ref(false);
const showCAGRModel = ref(false);

// for popup notifications
const notification = ref<Record<string, any>>({});
const summaryRef = ref<any>(null);
const showNotification = (message: string) => {
  notification.value.show(message);
};
const isScreenerError = ref(false);
const showDropdown = ref(false);

// Dummy implementation for getScreenerImage
function getScreenerImage(screenerName: string) {
  // Return a default image URL or logic based on screenerName
  return `/images/screeners/${encodeURIComponent(screenerName)}.png`;
}

function getWatchlistIcon(ticker: any, item: any): string {
  const watchlistName = typeof ticker === 'string' ? ticker : ticker?.Name ?? String(ticker);
  return isAssetInWatchlist(watchlistName, item)
    ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><g id="Interface / Checkbox_Check"><path id="Vector" d="M8 12L11 15L16 9M4 16.8002V7.2002C4 6.08009 4 5.51962 4.21799 5.0918C4.40973 4.71547 4.71547 4.40973 5.0918 4.21799C5.51962 4 6.08009 4 7.2002 4H16.8002C17.9203 4 18.4796 4 18.9074 4.21799C19.2837 4.40973 19.5905 4.71547 19.7822 5.0918C20 5.5192 20 6.07899 20 7.19691V16.8036C20 17.9215 20 18.4805 19.7822 18.9079C19.5905 19.2842 19.2837 19.5905 18.9074 19.7822C18.48 20 17.921 20 16.8031 20H7.19691C6.07899 20 5.5192 20 5.0918 19.7822C4.71547 19.5905 4.40973 19.2842 4.21799 18.9079C4 18.4801 4 17.9203 4 16.8002Z" stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></g></svg>'
    : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><g id="Interface / Checkbox_Unchecked"><path id="Vector" d="M4 7.2002V16.8002C4 17.9203 4 18.4801 4.21799 18.9079C4.40973 19.2842 4.71547 19.5905 5.0918 19.7822C5.5192 20 6.07899 20 7.19691 20H16.8031C17.921 20 18.48 20 18.9074 19.7822C19.2837 19.5905 19.5905 19.2842 19.7822 18.9079C20 18.4805 20 17.9215 20 16.8036V7.19691C20 6.07899 20 5.5192 19.7822 5.0918C19.5905 4.71547 19.2837 4.40973 18.9074 4.21799C18.4796 4 17.9203 4 16.8002 4H7.2002C6.08009 4 5.51962 4 5.0918 4.21799C4.71547 4.40973 4.40973 4.71547 4.21799 5.0918C4 5.51962 4 6.08009 4 7.2002Z" stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></g></svg>';
}

// for handling dropdown menu
type WatchlistType = string | { Name: string };

const toggleWatchlist = async (ticker: WatchlistType, symbol: string) => {
  const watchlistName = typeof ticker === 'string' ? ticker : ticker?.Name ?? String(ticker);
  const isCurrentlyInWatchlist = isAssetInWatchlist(watchlistName, symbol);
  // Simulate a checkbox event with a custom type
  const simulatedEvent: CheckboxEvent = { target: { checked: !isCurrentlyInWatchlist } };
  // Use the unified updateCheckbox which will call addtoWatchlist and refresh the lists.
  await updateCheckbox(ticker, symbol, simulatedEvent);
};


let lastLoadedScreener = ref('');

// consts for infinite scrolling
const limit = ref(100)
const page = ref(1)
const totalPages = ref(1)
const screenerTotalCount = ref(0);
const loading = ref(false)
const initialLoading = ref(true)

//pair to handling infinite scrolling in main list 
const paginatedResults1 = computed(() => screenerResults.value);

async function GetScreenerResultsAll(reset: boolean = false): Promise<void> {
  if (reset) {
    page.value = 1;
    totalPages.value = 1;
    screenerTotalCount.value = 0;
    screenerResults.value = [];
    initialLoading.value = true;
  }
  if (loading.value || page.value > totalPages.value) return;
  loading.value = true;
  try {
    const response = await fetch(`/api/${user.value?.Username ?? ''}/screener/results/all?page=${page.value}&limit=${limit.value}`, {
      headers: { 'X-API-KEY': apiKey },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    if (reset) {
      screenerResults.value = [...data.data];
    } else {
      screenerResults.value.push(...data.data);
    }
    screenerTotalCount.value = data.totalCount;
    totalPages.value = data.totalPages;
    page.value += 1;
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message;
    } else {
      errorMessage.value = String(error);
    }
  } finally {
    loading.value = false;
    initialLoading.value = false;
  }
}
GetScreenerResultsAll();

const handleScroll1 = (event: Event): void => {
  const target = event.target as HTMLElement;
  const { scrollTop, clientHeight, scrollHeight } = target;
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    GetScreenerResultsAll();
  }
};

// --- Infinite scroll and lazy loading for filtered screener results ---
const filterLimit = ref(100);
const filterPage = ref(1);
const filterTotalPages = ref(1);
const filterTotalCount = ref(0);
const filterLoading = ref(false);
const filterInitialLoading = ref(false);

async function fetchScreenerResults(screenerName: string): Promise<void> {
  // Reset only if screener changed
  if (lastLoadedScreener.value !== screenerName) {
    filterPage.value = 1;
    filterTotalPages.value = 1;
    filterTotalCount.value = 0;
    filterResults.value = [];
    lastLoadedScreener.value = screenerName;
    filterInitialLoading.value = true;
  }
  if (filterLoading.value || filterPage.value > filterTotalPages.value) return;
  filterLoading.value = true;
  try {
    const response = await fetch(`/api/screener/${user.value?.Username ?? ''}/results/filtered/${screenerName}?page=${filterPage.value}&limit=${filterLimit.value}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      }
    });
    if (!response.ok) {
      throw new Error(`Error fetching screener results: ${response.status}`);
    }
    const data = await response.json();
    // Append new data for infinite scroll
    filterResults.value.push(...data.data);
    filterTotalPages.value = data.totalPages;
    filterTotalCount.value = data.totalCount;
    filterPage.value += 1;
    currentList.value = [...filterResults.value];
    if (summaryRef.value) {
      await summaryRef.value.loadSummary();
    }
  } catch (error: unknown) {
    // TypeScript: handle error type and fix typo
    if (error instanceof Error) {
      errorMessage.value = error.message ?? '';
    } else {
      errorMessage.value = String(error);
    }
  } finally {
    filterLoading.value = false;
    filterInitialLoading.value = false;
  }
}

const paginatedResults2 = computed(() => filterResults.value);

const handleScroll2 = (event: Event): void => {
  const target = event.target as HTMLElement;
  const { scrollTop, clientHeight, scrollHeight } = target;
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    fetchScreenerResults(selectedScreener.value);
  }
};

//pair to handling infinite scrolling in hidden list 
const hiddenLimit = ref(100);
const hiddenPage = ref(1);
const hiddenTotalPages = ref(1);
const hiddenTotalCount = ref(0);
const hiddenLoading = ref(false);
const hiddenInitialLoading = ref(true);

const paginatedResults3 = computed(() => HiddenResults.value);

async function GetHiddenResults(reset: boolean = false): Promise<void> {
  if (reset) {
    hiddenPage.value = 1;
    hiddenTotalPages.value = 1;
    hiddenTotalCount.value = 0;
    HiddenResults.value = [];
    hiddenInitialLoading.value = true;
  }
  if (hiddenLoading.value || hiddenPage.value > hiddenTotalPages.value) return;
  hiddenLoading.value = true;
  try {
    const response = await fetch(`/api/${user.value?.Username ?? ''}/screener/results/hidden?page=${hiddenPage.value}&limit=${hiddenLimit.value}`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (reset) {
      HiddenResults.value = [...data.data]; // replace for reactivity
    } else {
      HiddenResults.value.push(...data.data); // append for lazy loading
    }
    hiddenTotalPages.value = data.totalPages;
    hiddenTotalCount.value = data.totalCount;
    hiddenPage.value += 1;
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message ?? '';
    } else {
      errorMessage.value = String(error);
    }
  } finally {
    hiddenLoading.value = false;
    hiddenInitialLoading.value = false;
  }
}
GetHiddenResults();

const handleScroll3 = (event: Event): void => {
  const target = event.target as HTMLElement;
  const { scrollTop, clientHeight, scrollHeight } = target;
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    GetHiddenResults();
  }
};

// --- Infinite scroll and lazy loading for cumulative screener results ---
const compoundedLimit = ref(100);
const compoundedPage = ref(1);
const compoundedTotalPages = ref(1);
const compoundedTotalCount = ref(0);
const compoundedLoading = ref(false);
const compoundedInitialLoading = ref(true);

// fetches data for cumulative screener results with pagination
async function GetCompoundedResults(reset: boolean = false): Promise<void> {
  if (reset) {
    compoundedPage.value = 1;
    compoundedTotalPages.value = 1;
    compoundedTotalCount.value = 0;
    compoundedResults.value = [];
    compoundedInitialLoading.value = true;
  }
  if (compoundedLoading.value || compoundedPage.value > compoundedTotalPages.value) return;
  compoundedLoading.value = true;
  try {
    const response = await fetch(`/api/screener/${user.value?.Username ?? ''}/all?page=${compoundedPage.value}&limit=${compoundedLimit.value}`, {
      headers: {
        'X-API-KEY': apiKey,
      }
    });
    if (!response.ok) {
      throw new Error(`Error fetching compounded results: ${response.status}`);
    }
    const data = await response.json();
    if (reset) {
      compoundedResults.value = [...data.data]; // replace for reactivity
    } else {
      compoundedResults.value.push(...data.data); // append for lazy loading
    }
    compoundedTotalPages.value = data.totalPages;
    compoundedTotalCount.value = data.totalCount;
    compoundedPage.value += 1;
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message;
    } else {
      errorMessage.value = String(error);
    }
  } finally {
    compoundedLoading.value = false;
    compoundedInitialLoading.value = false;
  }
}
GetCompoundedResults();

// paginated results for display
const paginatedResults4 = computed(() => compoundedResults.value);

// infinite scroll handler
const handleScroll4 = (event: Event): void => {
  const target = event.target as HTMLElement;
  const { scrollTop, clientHeight, scrollHeight } = target;
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    GetCompoundedResults();
  }
};

// related to retrieving user default symbol and updating it 
let defaultSymbol = ref(localStorage.getItem('defaultSymbol') || '');
const selectedItem = ref(defaultSymbol.value);

async function fetchUserDefaultSymbol() {
  try {
    if (!user.value?.Username) {
      return null;
    }
    const response = await fetch(`/api/${user.value.Username}/default-symbol`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch default symbol');
    const data = await response.json();
    return data.defaultSymbol;
  } catch (error) {
    return null;
  }
}

async function updateUserDefaultSymbol(symbol: string): Promise<void> {
  try {
    if (!user.value?.Username) return;

    const response = await fetch(`/api/${user.value?.Username ?? ''}/update-default-symbol`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ defaultSymbol: symbol })
    });

    if (!response.ok) throw new Error('Failed to update default symbol');
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message;
    } else {
      errorMessage.value = String(error);
    }
  }
}

onMounted(async () => {
  // Try to load user if not present
  if (!user.value || !user.value.Username) {
    if (userStore.loadUserFromToken) {
      userStore.loadUserFromToken();
    }
  }
  // Wait for user to be loaded
  await nextTick();
  if (!user.value || !user.value.Username) {
    return;
  }
  // Remove and fetch default symbol
  localStorage.removeItem('defaultSymbol');
  const symbol = await fetchUserDefaultSymbol();
  if (symbol) {
    defaultSymbol.value = symbol;
    selectedItem.value = symbol;
    localStorage.setItem('defaultSymbol', symbol);
  }
  selectedSymbol.value = defaultSymbol.value || '';
  selectedItem.value = defaultSymbol.value || '';
  getWatchlists();
});

const showCreateScreener = ref(false) // shows menu for creating new watchlist 
const showRenameScreener = ref(false) // shows menu for renaming selected watchlist 
const showEditColumn = ref(false) // shows menu for editing columns in screener
const selectedScreener = ref('') // selectes current screener 
const selectedSymbol = ref(''); // similar to selectedItem 
const listMode = ref('main');

//selected item a displays charts 
async function setCharts(symbol: string): Promise<void> {
  defaultSymbol.value = symbol;
  selectedSymbol.value = symbol ?? '';
  selectedItem.value = symbol ?? '';
  localStorage.setItem('defaultSymbol', symbol);
  await updateUserDefaultSymbol(symbol);
}

//functionality for keydown 
// Already declared at top: const selectedItem = ref<string | null>(null);
const selectedIndex = ref(0);

// Compute the current results based on listMode
const currentResults = computed(() => {
  switch (listMode.value) {
    case 'main':
      return paginatedResults1.value;
    case 'filter':
      return paginatedResults2.value;
    case 'hidden':
      return paginatedResults3.value;
    case 'combined':
      return paginatedResults4.value;
    default:
      return [];
  }
});

// Compute if initial loading is happening for current list mode
const isLoadingResults = computed(() => {
  switch (listMode.value) {
    case 'main':
      return initialLoading.value;
    case 'filter':
      return filterInitialLoading.value;
    case 'hidden':
      return hiddenInitialLoading.value;
    case 'combined':
      return compoundedInitialLoading.value;
    default:
      return false;
  }
});

function selectRow(symbol: string): void {
  if (!symbol) return;
  selectedItem.value = symbol ?? null;
  setCharts(symbol);
  updateSelectedIndex();
}

function updateSelectedIndex(): void {
  if (currentResults.value && currentResults.value.length > 0) {
    const index = currentResults.value.findIndex((asset) => asset.Symbol === selectedItem.value);
    selectedIndex.value = index !== -1 ? index : 0;
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (!currentResults.value || currentResults.value.length === 0) return;

  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    const direction = event.key === 'ArrowUp' ? -1 : 1;
    const newRowIndex = selectedIndex.value + direction;

    if (newRowIndex >= 0 && newRowIndex < currentResults.value.length) {
      const newSelectedSymbol = currentResults.value[newRowIndex].Symbol;
      selectRow(newSelectedSymbol);
      selectedIndex.value = newRowIndex;
    }
  }
}

let autoplayRunning = false;
let autoplayIndex = 0;
let autoplayTimeoutId: ReturnType<typeof setTimeout> | null = null;
const screenerResults = ref<any[]>([]); // stores all database results
const filterResults = ref<any[]>([]); // stores database filtered results
const HiddenResults = ref<any[]>([]); // stores hidden results list
const compoundedResults = ref<any[]>([]); // it will store all compounded screener results, minus duplicates and hidden
const hideList = ref<any[]>([]); // stores hidden list of users
const ScreenersName = ref<any[]>([]); // stores all user's screeners
const currentList = ref<any[]>([]); // Initialize currentList as an empty array 

//related to lists / toggle
watch(screenerResults, (newValue: any[]) => {
  currentList.value = newValue;
});

const resultListLength = computed(() => {
  switch (listMode.value) {
    case 'main':
      return screenerTotalCount.value;
    case 'filter':
      return filterTotalCount.value;
    case 'hidden':
      return hiddenTotalCount.value;
    case 'combined':
      return compoundedTotalCount.value;
    default:
      return 0;
  }
});

const lastFilterMode = ref<string | null>(null);

// displays hidden results 
function showHiddenResults() {
  if (listMode.value === 'hidden') {
    untoggleSpecialList();
  } else {
    listMode.value = 'hidden';
    currentList.value = HiddenResults.value;
  }
  nextTick(() => {});
}
// displays compounded results 
function showCombinedResults() {
  if (listMode.value === 'combined') {
    untoggleSpecialList();
  } else {
    listMode.value = 'combined';
    currentList.value = compoundedResults.value;
  }
  nextTick(() => {});
}

// displays filter results 
async function showFilterResults() {
  listMode.value = 'filter';
  currentList.value = filterResults.value;
  lastFilterMode.value = 'filter';
}

function untoggleSpecialList() {
  if (lastFilterMode.value === 'filter') {
    showFilterResults();
  } else {
    showMainResults();
  }
}

//updates hidden counter after showStock() is called 
async function show1HiddenResults() {
  listMode.value = 'hidden';
  currentList.value = HiddenResults.value;
}

//updates combined counter after function is called 
async function show1CombinedResults() {
  listMode.value = 'filter';
  currentList.value = compoundedResults.value;
}

//updates main counter after function is called 
async function showMainResults() {
  listMode.value = 'main';
  currentList.value = screenerResults.value;
}

// gets all screener values for user 
async function GetScreeners() {
  try {
    const response = await fetch(`/api/screener/${user.value?.Username ?? ''}/names`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      }
    });
    const data = await response.json();
    // Assuming data is now an array of objects with Name and Include properties
    ScreenersName.value = data;
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message;
    } else {
      errorMessage.value = String(error);
    }
  }
}
GetScreeners();

// hides a stock in screener and puts in in hidden list 
async function hideStock(asset: any) {
  try {
    const symbol = asset.Symbol;
    const url = `/api/screener/${user.value?.Username ?? ''}/hidden/${symbol}`;

    if (!symbol) {
      throw new Error('Please provide a valid symbol');
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      }
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message;
    } else {
      errorMessage.value = String(error);
    }
  } finally {
    await GetHiddenResults(true);
    await GetCompoundedResults(true);
    await fetchScreenerResults(selectedScreener.value);

    if (listMode.value === 'filter') {
      await fetchScreenerResults(selectedScreener.value);
      await showFilterResults();
        // Remove hidden asset from filterResults immediately for reactivity
        filterResults.value = filterResults.value.filter(s => !s.hidden && s.Symbol !== asset.Symbol);
        currentList.value = [...filterResults.value];
    } else if (listMode.value === 'combined') {
      await show1CombinedResults();
      showCombinedResults()
    } else {
      await GetScreenerResultsAll(true);
      await showMainResults();
    }
  }
}

// shows elements of hide list in screener
async function getHideList() {
  try {
    const response = await fetch(`/api/screener/results/${user.value?.Username ?? ''}/hidden`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    if (response.ok) {
      const data = await response.json();
      hideList.value = data;
    } else {
      console.error('Error:', response.status);
    }
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message;
    } else {
      errorMessage.value = String(error);
    }
  }
  await GetScreenerResultsAll(true);
  await GetHiddenResults(true);
}
getHideList();

// autoplays results 
function AutoPlay(): void {
  const button = document.getElementById('watchlistAutoplay');
  if (button && button.classList.contains('snavbtnslct')) {
  if (button) button.classList.remove('snavbtnslct');
    autoplayRunning = false;
    if (autoplayTimeoutId !== null) {
      clearTimeout(autoplayTimeoutId as ReturnType<typeof setTimeout>);
    }
  } else {
    if (button) {
      button.classList.add('snavbtnslct');
    }
    autoplayRunning = true;
    autoplayIndex = 0;
    logElement();
  }
}

function logElement(): void {
  if (!autoplayRunning) return;
  const rows = currentResults.value; // Use your reactive array
  if (autoplayIndex >= rows.length) {
    autoplayIndex = 0;
  }
  // Select the row by updating selectedItem or calling selectRow
  selectedItem.value = rows[autoplayIndex].Symbol ?? null;
  selectRow(rows[autoplayIndex].Symbol); // If you have a method for row selection
  console.log(rows[autoplayIndex].Symbol);
  autoplayIndex++;
  autoplayTimeoutId = setTimeout(logElement, 7000);
}

// unhides stocks from hidden list
async function ShowStock(asset: Record<string, any>): Promise<void> {
  try {
    const symbol = asset.Symbol;
    const url = `/api/screener/${user.value?.Username ?? ''}/show/${symbol}`;

    if (!symbol) {
      throw new Error('Please provide a valid symbol');
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      }
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.message === 'Hidden List updated successfully') {
    } else {
      throw new Error('Error showing stock');
    }
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message;
    } else {
      errorMessage.value = String(error);
    }
  } finally {
    await GetScreenerResultsAll(true);
    await fetchScreenerResults(selectedScreener.value);
    await GetCompoundedResults(true);
    await GetHiddenResults(true);
    await show1HiddenResults(); // important that it stays last!!! updates the counter dynamically
  }
}

// deletes screeners 
async function DeleteScreener(screenerName: string): Promise<void> {
  const apiUrl = `/api/${user.value?.Username ?? ''}/delete/screener/${screenerName}`;
  const requestOptions = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({ currentScreenerName: screenerName })
  };

  try {
    const response = await fetch(apiUrl, requestOptions);
    const data = await response.json();
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message;
    } else {
      errorMessage.value = String(error);
    }
  }

  await GetScreeners();
  await GetCompoundedResults(true);
}

// function that updates screener parameters graphically 
async function CurrentScreener(): Promise<void> {
  const Name = selectedScreener.value;

  try {
    const response = await fetch(`/api/screener/datavalues/${user.value?.Username ?? ''}/${Name}`, {
      headers: {
        'X-API-KEY': apiKey,
      }
    });
    const screenerSettings = await response.json();

    let priceList = screenerSettings.Price;
    let marketCapList = screenerSettings.MarketCap;
    let sectorsList = screenerSettings.Sectors;
    let AssetTypesList = screenerSettings.AssetTypes;
    let exchangesList = screenerSettings.Exchanges;
    let countriesList = screenerSettings.Countries;
    let AIRecommendations = screenerSettings.AIRecommendations;
    let FundFamilies = screenerSettings.FundFamilies;
    let FundCategories = screenerSettings.FundCategories;
    let NetExpenseRatio = screenerSettings.NetExpenseRatio;
    let PEList = screenerSettings.PE;
    let FPEList = screenerSettings.ForwardPE;
    let PEGList = screenerSettings.PEG;
    let EPSList = screenerSettings.EPS;
    let PSList = screenerSettings.PS;
    let PBList = screenerSettings.PB;
    let BetaList = screenerSettings.Beta;
    let DivYieldList = screenerSettings.DivYield
    let EPSQoQList = screenerSettings.EPSQoQ
    let EPSYoYList = screenerSettings.EPSYoY
    let EarningsQoQ = screenerSettings.EarningsQoQ
    let EarningsYoY = screenerSettings.EarningsYoY
    let RevQoQ = screenerSettings.RevQoQ
    let RevYoY = screenerSettings.RevYoY
    let AvgVolume1W = screenerSettings.AvgVolume1W
    let AvgVolume1M = screenerSettings.AvgVolume1M
    let AvgVolume6M = screenerSettings.AvgVolume6M
    let AvgVolume1Y = screenerSettings.AvgVolume1Y
    let RelVolume1W = screenerSettings.RelVolume1W
    let RelVolume1M = screenerSettings.RelVolume1M
    let RelVolume6M = screenerSettings.RelVolume6M
    let RelVolume1Y = screenerSettings.RelVolume1Y
    let RSscore1W = screenerSettings.RSScore1W
    let RSScore1M = screenerSettings.RSScore1M
    let RSScore4M = screenerSettings.RSScore4M
    let MA10 = screenerSettings.MA10
    let MA20 = screenerSettings.MA50
    let MA50 = screenerSettings.MA50
    let MA200 = screenerSettings.MA200
    let CurrentPrice = screenerSettings.CurrentPrice
    let NewHigh = screenerSettings.NewHigh
    let NewLow = screenerSettings.NewLow
    let PercOffWeekHigh = screenerSettings.PercOffWeekHigh
    let PercOffWeekLow = screenerSettings.PercOffWeekLow
    let changePerc = screenerSettings.changePerc
    let IPO = screenerSettings.IPO
    let ADV1W = screenerSettings.ADV1W
    let ADV1M = screenerSettings.ADV1M
    let ADV4M = screenerSettings.ADV4M
    let ADV1Y = screenerSettings.ADV1Y
    let ROE = screenerSettings.ROE
    let ROA = screenerSettings.ROA
    let CAGR = screenerSettings.CAGR
    let currentRatio = screenerSettings.currentRatio
    let assetsCurrent = screenerSettings.assetsCurrent
    let liabilitiesCurrent = screenerSettings.liabilitiesCurrent
    let debtCurrent = screenerSettings.debtCurrent
    let cashAndEq = screenerSettings.cashAndEq
    let freeCashFlow = screenerSettings.freeCashFlow
    let profitMargin = screenerSettings.profitMargin
  let grossMargin = Array.isArray(screenerResults.value) && screenerResults.value.length > 0 ? screenerResults.value[0].grossMargin : undefined;
    let debtEquity = screenerSettings.debtEquity
    let bookVal = screenerSettings.bookVal
    let EV = screenerSettings.EV
    let RSI = screenerSettings.RSI
    let Gap = screenerSettings.Gap


  showPriceInputs.value = screenerSettings?.Price?.length > 0;
  showMarketCapInputs.value = screenerSettings?.MarketCap?.length > 0;
  showIPOInputs.value = screenerSettings?.IPO?.length > 0;
  ShowSector.value = screenerSettings?.Sectors?.length > 0;
  ShowAssetType.value = screenerSettings?.AssetTypes?.length > 0;
  ShowExchange.value = screenerSettings?.Exchanges?.length > 0;
  ShowCountry.value = screenerSettings?.Countries?.length > 0;
  ShowAIRecommendation.value = screenerSettings?.AIRecommendations?.length > 0;
  ShowFundFamily.value = screenerSettings?.FundFamilies?.length > 0;
  ShowFundCategory.value = screenerSettings?.FundCategories?.length > 0;
  showPEInputs.value = screenerSettings?.PE?.length > 0;
  showPEForwInputs.value = screenerSettings?.ForwardPE?.length > 0;
  showPEGInputs.value = screenerSettings?.PEG?.length > 0;
  showEPSInputs.value = screenerSettings?.EPS?.length > 0;
  showPSInputs.value = screenerSettings?.PS?.length > 0;
  showPBInputs.value = screenerSettings?.PB?.length > 0;
  // Removed duplicate ref declarations. Use top-level refs only.
    showBetaInputs.value = screenerSettings?.Beta?.length > 0;
    showDivYieldInputs.value = screenerSettings?.DivYield?.length > 0;
    showNetExpenseRatioInputs.value = screenerSettings?.NetExpenseRatio?.length > 0;
    showFundYoYQoQ.value =
      screenerSettings?.EPSQoQ?.length > 0 ||
      screenerSettings?.EPSYoY?.length > 0 ||
      screenerSettings?.EarningsQoQ?.length > 0 ||
      screenerSettings?.EarningsYoY?.length > 0 ||
      screenerSettings?.RevQoQ?.length > 0 ||
      screenerSettings?.RevYoY?.length > 0;
    showVolume.value =
      screenerSettings?.AvgVolume1W?.length > 0 ||
      screenerSettings?.AvgVolume1M?.length > 0 ||
      screenerSettings?.AvgVolume6M?.length > 0 ||
      screenerSettings?.AvgVolume1Y?.length > 0 ||
      screenerSettings?.RelVolume1W?.length > 0 ||
      screenerSettings?.RelVolume1M?.length > 0 ||
      screenerSettings?.RelVolume6M?.length > 0 ||
      screenerSettings?.RelVolume1Y?.length > 0;
    showRSscore.value =
      screenerSettings?.RSScore1W?.length > 0 ||
      screenerSettings?.RSScore1M?.length > 0 ||
      screenerSettings?.RSScore4M?.length > 0;
    showADV.value =
      screenerSettings?.ADV1W?.length > 0 ||
      screenerSettings?.ADV1M?.length > 0 ||
      screenerSettings?.ADV1Y?.length > 0 ||
      screenerSettings?.ADV4M?.length > 0;
    showPricePerf.value =
      screenerSettings?.MA10?.length > 0 ||
      screenerSettings?.MA20?.length > 0 ||
      screenerSettings?.MA50?.length > 0 ||
      screenerSettings?.MA200?.length > 0 ||
      screenerSettings?.CurrentPrice?.length > 0 ||
      screenerSettings?.NewHigh?.length > 0 ||
      screenerSettings?.NewLow?.length > 0 ||
      screenerSettings?.PercOffWeekHigh?.length > 0 ||
      screenerSettings?.PercOffWeekLow?.length > 0 ||
      screenerSettings?.changePerc?.length > 0;
    showROE.value = screenerSettings?.ROE?.length > 0;
    showROA.value = screenerSettings?.ROA?.length > 0;
    showCAGRModel.value = screenerSettings?.CAGR?.length > 0;
    showCurrentRatio.value = screenerSettings?.currentRatio?.length > 0;
    showCurrentAssets.value = screenerSettings?.assetsCurrent?.length > 0;
    showCurrentLiabilities.value = screenerSettings?.liabilitiesCurrent?.length > 0;
    showCurrentDebt.value = screenerSettings?.debtCurrent?.length > 0;
    showCashEquivalents.value = screenerSettings?.cashAndEq?.length > 0;
    showFreeCashFlow.value = screenerSettings?.freeCashFlow?.length > 0;
    showProfitMargin.value = screenerSettings?.profitMargin?.length > 0;
    showGrossMargin.value = screenerSettings?.grossMargin?.length > 0;
    showDebtToEquityRatio.value = screenerSettings?.debtEquity?.length > 0;
    showBookValue.value = screenerSettings?.bookVal?.length > 0;
    showEV.value = screenerSettings?.EV?.length > 0;
    showRSI.value = screenerSettings?.RSI?.length > 0;
    showGap.value = screenerSettings?.Gap?.length > 0;

    const setInputValue = (id: string, value: any) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = value;
    };
    setInputValue('left-p', priceList[0]);
    setInputValue('right-p', priceList[1]);
    setInputValue('left-mc', marketCapList[0]);
    setInputValue('right-mc', marketCapList[1]);
    setInputValue('left-ipo', IPO[0]);
    setInputValue('right-ipo', IPO[1]);
    setInputValue('left-pe', PEList[0]);
    setInputValue('right-pe', PEList[1]);
  setInputValue('left-p', priceList?.[0] ?? '');
  setInputValue('right-p', priceList?.[1] ?? '');
  setInputValue('left-mc', marketCapList?.[0] ?? '');
  setInputValue('right-mc', marketCapList?.[1] ?? '');
  setInputValue('left-ipo', IPO?.[0] ?? '');
  setInputValue('right-ipo', IPO?.[1] ?? '');
  setInputValue('left-pe', PEList?.[0] ?? '');
  setInputValue('right-pe', PEList?.[1] ?? '');
  setInputValue('left-pef', FPEList?.[0] ?? '');
  setInputValue('right-pef', FPEList?.[1] ?? '');
  setInputValue('left-peg', PEGList?.[0] ?? '');
  setInputValue('right-peg', PEGList?.[1] ?? '');
  setInputValue('left-eps', EPSList?.[0] ?? '');
  setInputValue('right-eps', EPSList?.[1] ?? '');
  setInputValue('left-ps', PSList?.[0] ?? '');
  setInputValue('right-ps', PSList?.[1] ?? '');
  setInputValue('left-pb', PBList?.[0] ?? '');
  setInputValue('right-pb', PBList?.[1] ?? '');
  setInputValue('left-beta', BetaList?.[0] ?? '');
  setInputValue('right-beta', BetaList?.[1] ?? '');
  setInputValue('left-divyield', DivYieldList?.[0] ?? '');
  setInputValue('right-divyield', DivYieldList?.[1] ?? '');
  setInputValue('left-net-expense-ratio', NetExpenseRatio?.[0] ?? '');
  setInputValue('right-net-expense-ratio', NetExpenseRatio?.[1] ?? '');
  setInputValue('left-RevYoY', RevYoY?.[0] ?? '');
  setInputValue('right-RevYoY', RevYoY?.[1] ?? '');
  setInputValue('left-RevQoQ', RevQoQ?.[0] ?? '');
  setInputValue('right-RevQoQ', RevQoQ?.[1] ?? '');
  setInputValue('left-EarningsYoY', EarningsYoY?.[0] ?? '');
  setInputValue('right-EarningsYoY', EarningsYoY?.[1] ?? '');
  setInputValue('left-EarningsQoQ', EarningsQoQ?.[0] ?? '');
  setInputValue('right-EarningsQoQ', EarningsQoQ?.[1] ?? '');
  setInputValue('left-EPSYoY', EPSYoYList?.[0] ?? '');
  setInputValue('right-EPSYoY', EPSYoYList?.[1] ?? '');
  setInputValue('left-EPSQoQ', EPSQoQList?.[0] ?? '');
  setInputValue('right-EPSQoQ', EPSQoQList?.[1] ?? '');
  setInputValue('RSscore1Winput1', RSscore1W?.[0] ?? '');
  setInputValue('RSscore1Winput2', RSscore1W?.[1] ?? '');
  setInputValue('RSscore1Minput1', RSScore1M?.[0] ?? '');
  setInputValue('RSscore1Minput2', RSScore1M?.[1] ?? '');
  setInputValue('RSscore4Minput1', RSScore4M?.[0] ?? '');
  setInputValue('RSscore4Minput2', RSScore4M?.[1] ?? '');
  setInputValue('ADV1Winput1', ADV1W?.[0] ?? '');
  setInputValue('ADV1Winput2', ADV1W?.[1] ?? '');
  setInputValue('ADV1Minput1', ADV1M?.[0] ?? '');
  setInputValue('ADV1Minput2', ADV1M?.[1] ?? '');
  setInputValue('ADV4Minput1', ADV4M?.[0] ?? '');
  setInputValue('ADV4Minput2', ADV4M?.[1] ?? '');
  setInputValue('ADV1Yinput1', ADV1Y?.[0] ?? '');
  setInputValue('ADV1Yinput2', ADV1Y?.[1] ?? '');
  setInputValue('left-roe', ROE?.[0] ?? '');
  setInputValue('right-roe', ROE?.[1] ?? '');
  setInputValue('left-roa', ROA?.[0] ?? '');
  setInputValue('right-roa', ROA?.[1] ?? '');
  setInputValue('left-cagr', CAGR?.[0] ?? '');
  setInputValue('right-cagr', CAGR?.[1] ?? '');
  setInputValue('left-current-ratio', currentRatio?.[0] ?? '');
  setInputValue('right-current-ratio', currentRatio?.[1] ?? '');
  setInputValue('left-ca', assetsCurrent?.[0] ?? '');
  setInputValue('right-ca', assetsCurrent?.[1] ?? '');
  setInputValue('left-cl', liabilitiesCurrent?.[0] ?? '');
  setInputValue('right-cl', liabilitiesCurrent?.[1] ?? '');
  setInputValue('left-cd', debtCurrent?.[0] ?? '');
  setInputValue('right-cd', debtCurrent?.[1] ?? '');
  setInputValue('left-ce', cashAndEq?.[0] ?? '');
  setInputValue('right-ce', cashAndEq?.[1] ?? '');
  setInputValue('left-fcf', freeCashFlow?.[0] ?? '');
  setInputValue('right-fcf', freeCashFlow?.[1] ?? '');
  setInputValue('left-pm', profitMargin?.[0] ?? '');
  setInputValue('right-pm', profitMargin?.[1] ?? '');
  setInputValue('left-gm', grossMargin?.[0] ?? '');
  setInputValue('right-gm', grossMargin?.[1] ?? '');
  setInputValue('left-der', debtEquity?.[0] ?? '');
  setInputValue('right-der', debtEquity?.[1] ?? '');
  setInputValue('left-bv', bookVal?.[0] ?? '');
  setInputValue('right-bv', bookVal?.[1] ?? '');
  setInputValue('left-ev', EV?.[0] ?? '');
  setInputValue('right-ev', EV?.[1] ?? '');
  setInputValue('left-rsi', RSI?.[0] ?? '');
  setInputValue('right-rsi', RSI?.[1] ?? '');
  setInputValue('left-gap', Gap?.[0] ?? '');
  setInputValue('right-gap', Gap?.[1] ?? '');
  // provide the child components with the lists of initially selected values so they update reactively
  initialSectors.value = Array.isArray(sectorsList) ? sectorsList : [];
  initialExchanges.value = Array.isArray(exchangesList) ? exchangesList : [];
  initialAssetTypes.value = Array.isArray(AssetTypesList) ? AssetTypesList : [];
  initialCountries.value = Array.isArray(countriesList) ? countriesList : [];
  initialAIRecommendations.value = Array.isArray(AIRecommendations) ? AIRecommendations : [];
  initialFundFamilies.value = Array.isArray(FundFamilies) ? FundFamilies : [];
  initialFundCategories.value = Array.isArray(FundCategories) ? FundCategories : [];
  // Price performance settings object passed to PricePerf to set its internal inputs and toggles
  initialPricePerfSettings.value = screenerSettings;
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message;
    } else {
      errorMessage.value = String(error);
    }
  }
}

// function that resets screener values (all of them)
async function ResetScreener(): Promise<void> {
  const Name = selectedScreener.value;
  try {
    const response = await fetch(`/api/screener/reset/${user.value?.Username ?? ''}/${Name}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        user: user.value?.Username ?? '',
        Name
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    await response.json();
    // Immediately update the UI to show the selected screener, blank/reset
  await CurrentScreener(); // update all UI fields for the selected screener
  await fetchScreenerResults(selectedScreener.value); // update results for the selected screener
  await showMainResults(); // ensure we stay on the main list for the selected screener
  await handleFetchScreeners(selectedScreener.value); // always refresh the filter list too
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message;
    } else {
      errorMessage.value = String(error);
    }
    await CurrentScreener();
    await fetchScreenerResults(selectedScreener.value);
    await showMainResults();
  }
}

const valueMap: { [key: string]: string } = {
  'Marketcap': 'marketCap',
  'Sector': 'Sector',
  'Exchange': 'Exchange',
  'Country': 'Country',
  'AIRecommendation': 'AIRecommendation',
  'PE': 'PE',
  'ForwardPE': 'ForwardPE',
  'PEG': 'PEG',
  'EPS': 'EPS',
  'PS': 'PS',
  'PB': 'PB',
  'Beta': 'Beta',
  'DivYield': 'DivYield',
  'FundFamily': 'FundFamily',
  'FundCategory': 'FundCategory',
  'NetExpenseRatio': 'NetExpenseRatio',
  'FundGrowth': 'FundGrowth',
  'PricePerformance': 'PricePerformance',
  'RSscore': 'RSscore',
  'Volume': 'Volume',
  'price': 'price',
  'IPO': 'IPO',
  'ADV': 'ADV',
  'ROE': 'ROE',
  'ROA': 'ROA',
  'CurrentRatio': 'CurrentRatio',
  'CurrentAssets': 'CurrentAssets',
  'CurrentLiabilities': 'CurrentLiabilities',
  'CurrentDebt': 'CurrentDebt',
  'CashEquivalents': 'CashEquivalents',
  'FCF': 'FCF',
  'ProfitMargin': 'ProfitMargin',
  'GrossMargin': 'GrossMargin',
  'DebtEquity': 'DebtEquity',
  'BookValue': 'BookValue',
  'EV': 'EV',
  'RSI': 'RSI',
  'Gap': 'Gap',
  'AssetType': 'AssetType',
  'IV': 'IV',
  'CAGR': 'CAGR',
};

// function that resets indivudal values for screeners 
async function Reset(value: string): Promise<void> {
  const stringValue = valueMap[value];
  try {
    const Name = selectedScreener.value;

    const requestBody = {
      stringValue,
      user: user.value?.Username ?? '',
      Name
    };

    const options = {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(requestBody)
    };

    const response = await fetch('/api/reset/screener/param', options);

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);

    }
  await fetchScreenerResults(selectedScreener.value);
  await handleFetchScreeners(selectedScreener.value); // always refresh the filter list too
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message;
    } else {
      errorMessage.value = String(error);
    }
    await fetchScreenerResults(selectedScreener.value);
  }
}

const emit = defineEmits(['update:modelValue']);

function selectScreener(screener: string): void {
  selectedScreener.value = screener;
  CurrentScreener();
  fetchScreenerResults(screener);
  showFilterResults();
  isScreenerError.value = false
  // Update the selected screener value
  emit('update:modelValue', screener);
}

const watchlist = reactive({ tickers: [] });
const selectedWatchlist = ref([]);

// generates all watchlist names 
async function getWatchlists(): Promise<void> {
  try {
    const response = await fetch(`/api/${user.value?.Username ?? ''}/watchlists`, {
      headers: {
        'X-API-KEY': apiKey,
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    watchlist.tickers = data;
  } catch (err) {
    errorMessage.value = typeof err === 'object' && err !== null && 'message' in err ? (err as { message?: string }).message ?? String(err) : String(err);
  }
}

type CheckboxEvent = { target: { checked: boolean } };

async function addtoWatchlist(ticker: any, symbol: string, $event: Event | CheckboxEvent): Promise<void> {
  const isChecked = ($event as CheckboxEvent).target.checked;
  const isAdding = isChecked;
  // Accept ticker as object or string
  const watchlistName = typeof ticker === 'string' ? ticker : ticker?.Name ?? String(ticker);

  try {
    const response = await fetch(`/api/watchlist/addticker/${isAdding ? 'true' : 'false'}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        watchlistName: watchlistName,
        symbol: symbol,
        user: user.value?.Username ?? ''
      }),
    });

    if (response.status === 400) {
      const errorResponse = await response.json();
      showNotification(errorResponse.message || 'An error occurred while updating the watchlist.');
      return; // Exit the function if there's a 400 error
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // We don't strictly need the response body here, but await for completeness
    await response.json();

  } catch (error: unknown) {
    if (error instanceof Error) {
      errorMessage.value = error.message;
    } else {
      errorMessage.value = String(error);
    }
  }
}

const checkedWatchlists = ref<Record<string, string[]>>({});

watch(() => watchlist.tickers, (newTickers: Array<{ Name: string }>) => {
  newTickers.forEach((ticker) => {
    const name = typeof ticker === 'string' ? ticker : ticker?.Name ?? String(ticker);
    checkedWatchlists.value[name] = [];
  });
});

const updateCheckbox = async (ticker: any, symbol: string, $event: Event | CheckboxEvent): Promise<void> => {
  const isChecked = ($event as CheckboxEvent).target.checked;
  const name = typeof ticker === 'string' ? ticker : ticker?.Name ?? String(ticker);
  if (!checkedWatchlists.value[name]) checkedWatchlists.value[name] = [];
  if (isChecked) {
    if (!checkedWatchlists.value[name].includes(symbol)) {
      checkedWatchlists.value[name].push(symbol);
    }
  } else {
    checkedWatchlists.value[name] = checkedWatchlists.value[name].filter((s: string) => s !== symbol);
  }
  await addtoWatchlist(ticker, symbol, $event as CheckboxEvent);
  if (user.value && user.value.Username) {
    await getFullWatchlists(user.value.Username);
  }
};

const FullWatchlists = ref([]);

// Fetch full watchlists for a username (username is string)
async function getFullWatchlists(username: string): Promise<void> {
  try {
    if (!username) return;
    const response = await fetch(`/api/${username}/full-watchlists`, {
      headers: {
        'X-API-KEY': apiKey,
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    FullWatchlists.value = await response.json();
  } catch (err) {
    // Keep existing error handling strategy
    if (err instanceof Error) {
      errorMessage.value = err.message;
    } else {
      errorMessage.value = String(err);
    }
  }
};
if (user.value && user.value.Username) {
  getFullWatchlists(user.value.Username);
};

const isAssetInWatchlist = (ticker: string, symbol: string): boolean => {
  const watchlist = FullWatchlists.value.find((w: any) => w && w.Name === ticker);
  if (
    watchlist &&
    typeof watchlist === 'object' &&
    watchlist !== null &&
    'List' in watchlist &&
    Array.isArray((watchlist as any).List)
  ) {
    // Support both legacy (array of strings) and new (array of objects with `ticker` prop) shapes
    return (watchlist as any).List.some((item: any) => {
      if (typeof item === 'string') return item === symbol;
      if (item && typeof item === 'object') return item.ticker === symbol || item.ticker === symbol.toUpperCase();
      return false;
    });
  }
  return false;
};

async function ExcludeScreener(screener: string): Promise<void> {
  const apiUrl = `/api/${user.value?.Username ?? ''}/toggle/screener/${screener}`;
  const requestOptions = {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({ currentScreenerName: screener }) // Sending the current screener name
  };

  try {
    const response = await fetch(apiUrl, requestOptions);
    const data = await response.json();
  } catch (error: unknown) {
    if (error instanceof Error) {
      errorMessage.value = error.message;
    } else {
      errorMessage.value = String(error);
    }
  }

  await GetScreeners(); // Refresh the list of screeners
  await GetCompoundedResults(true); // Refresh the compounded results
  currentList.value = compoundedResults.value;
}

const screenerName = ref('');

const showTooltip = ref(false)
let tooltipText = ref('');
let tooltipLeft = ref();
let tooltipTop = ref();

function handleMouseOver(event: MouseEvent, id: string): void {
  showTooltip.value = true
  const element = event.target as HTMLElement;
  const parent = element.parentNode as HTMLElement;
  const svgRect = parent.getBoundingClientRect();
  tooltipTop.value = svgRect.top + window.scrollY + svgRect.height - 100;
  tooltipLeft.value = svgRect.left + window.scrollX + svgRect.width + 10;
  tooltipText.value = getTooltipText(id)
}

function getTooltipText(id: string): string {
  switch (id) {
    case 'price':
      return 'Price refers to the current market price of a stock, which is the amount of money an investor would need to pay to buy one share of the stock.';
    case 'market-cap':
      return 'Market capitalization (market cap) is the total value of all outstanding shares of a company\'s stock. It is calculated by multiplying the total number of shares outstanding by the current market price of one share. In this context, market cap is displayed in thousands (1000s).';
    case 'ipo':
      return 'IPO (Initial Public Offering) is the first public sale of a company\'s stock, allowing it to raise capital from public investors. IPO Date refers to the date when a company\'s stock first became available for public trading, marking its transition from a private to a publicly traded company.';
    case 'sector':
      return 'The sector refers to the industry or category that a company operates in. This can help investors understand the company\'s business model and potential risks and opportunities.';
    case 'exchange':
      return 'Exchange refers to the stock exchange where a company\'s shares are listed and traded, such as the New York Stock Exchange (NYSE) or NASDAQ.';
    case 'growth':
      return 'This section calculates the growth rate of a company\'s Revenue, Earnings (Net Income), and Earnings Per Share (EPS) over time. The growth rates are calculated as a percentage change from the previous quarter (QoQ) and from the same quarter in the previous year (YoY).';
    case 'country':
      return 'The country refers to the nation where a company is headquartered or primarily operates. This can be an important factor in evaluating a company\'s exposure to local economic and regulatory conditions.';
    case 'pe':
      return 'The price-to-earnings (P/E) ratio is a valuation metric that compares a company\'s current stock price to its earnings per share (EPS). This can help investors evaluate whether a company\'s stock is overvalued or undervalued.';
    case 'ps':
      return 'The price-to-sales (P/S) ratio is a valuation metric that compares a company\'s current stock price to its revenue per share. This can help investors evaluate whether a company\'s stock is overvalued or undervalued.';
    case 'peg':
      return 'The price-to-earnings growth (PEG) ratio is a valuation metric that compares a company\'s current stock price to its earnings per share (EPS) growth rate. This can help investors evaluate whether a company\'s stock is overvalued or undervalued.';
    case 'eps':
      return 'Earnings per share (EPS) is a measure of a company\'s profitability, calculated by dividing its net income by the number of outstanding shares.';
    case 'pb':
      return 'The price-to-book (P/B) ratio is a valuation metric that compares a company\'s current stock price to its book value per share. This can help investors evaluate whether a company\'s stock is overvalued or undervalued.';
    case 'div':
      return 'Dividend Yield TTM (Trailing Twelve Months) is the ratio of the annual dividend payment per share to the stock\'s current price, expressed as a percentage. It represents the return on investment from dividend payments over the past 12 months.';
    case 'fundFamily':
      return 'Fund Family refers to the investment company or financial institution that manages and sponsors the mutual fund or ETF. Examples include Vanguard, Fidelity, BlackRock, etc. Filtering by fund family helps investors find funds managed by specific providers.';
    case 'fundCategory':
      return 'Fund Category classifies the mutual fund or ETF based on its investment strategy and asset allocation. Categories include equity funds, bond funds, balanced funds, sector-specific funds, etc. This helps investors identify funds that match their investment objectives and risk tolerance.';
    case 'netExpenseRatio':
      return 'Net Expense Ratio is the annual fee that a mutual fund or ETF charges its shareholders, expressed as a percentage of the fund\'s average net assets. It represents the total cost of owning the fund, including management fees, administrative costs, and other operational expenses, after any fee waivers or reimbursements. Lower expense ratios generally mean more of your investment returns stay in your pocket.';
    case 'perf':
      return 'Filter stocks by price performance, including: Change %, % off 52-week high/low, New all-time high/low, MA crossovers; Identify trending stocks and potential breakouts.';
    case 'rs':
      return 'A score that ranks a stock\'s technical performance relative to all assets in our database. It\'s based on a weighted average of percentage returns over 1 week, 1 month, and 1 quarter. The score ranges from 1 (worst) to 100 (best).';
    case 'volume':
      return 'Volume metrics include Relative Volume, which measures a stock\'s trading volume compared to its average volume over a given period, and Average Volume (1000s), which represents the average number of shares traded per day, expressed in thousands. These metrics help you understand a stock\'s liquidity and trading activity.';
    case 'adv':
      return 'A measure of a stock\'s price fluctuation over a given period, calculated as the standard deviation of daily returns. It represents the average daily volatility of the stock\'s price, providing insight into the stock\'s risk and potential for price movements. The values are expressed as a percentage, with higher values indicating greater volatility.';
    case 'roe':
      return 'Return on equity (ROE) is a measure of a company\'s profitability, calculated by dividing its net income by its total shareholder equity.';
    case 'roa':
      return 'Return on assets (ROA) is a measure of a company\'s profitability, calculated by dividing its net income by its total assets.';
    case 'cagr':
      return 'Compound Annual Growth Rate (CAGR) represents the annualized rate of return from the stock\'s first available trading price to its current price. It smooths out volatility to show the average yearly growth, making it easy to compare stocks with different IPO dates. For example, a CAGR of 28% means the stock has grown an average of 28% per year since its IPO.';
    case 'current-ratio':
      return 'The current ratio is a liquidity metric that compares a company\'s current assets to its current liabilities.';
    case 'current-assets':
      return 'Current assets are a company\'s assets that are expected to be converted into cash within one year or within the company\'s normal operating cycle.';
    case 'current-liabilities':
      return 'Current liabilities are a company\'s debts or obligations that are due within one year or within the company\'s normal operating cycle.';
    case 'current-debt':
      return 'Current debt refers to a company\'s short-term debt obligations, such as accounts payable, short-term loans, and commercial paper.';
    case 'casheq':
      return 'Cash and equivalents (casheq) refers to a company\'s liquid assets, such as cash, cash equivalents, and short-term investments.';
    case 'fcf':
      return 'Free cash flow (FCF) is a measure of a company\'s ability to generate cash from its operations, calculated by subtracting capital expenditures from operating cash flow.';
    case 'profit-margin':
      return 'Profit margin is a measure of a company\'s profitability, calculated by dividing its net income by its revenue.';
    case 'gross-margin':
      return 'Gross margin is a measure of a company\'s profitability, calculated by dividing its gross profit by its revenue.';
    case 'debt-equity':
      return 'The debt-to-equity ratio is a leverage metric that compares a company\'s total debt to its total shareholder equity.';
    case 'book-value':
      return 'Book value is a company\'s total assets minus its total liabilities, which represents the company\'s net worth.';
    case 'ev':
      return 'Enterprise value (EV) is a measure of a company\'s total value, calculated by adding its market capitalization to its total debt and subtracting its cash and equivalents.';
    case 'rsi':
      return 'The relative strength index (RSI) is a technical indicator that measures a company\'s stock price momentum, ranging from 0 to 100.';
    case 'gap':
      return 'Gap % is a measure of the percentage change in a stock\'s price from the previous day\'s close to the current day\'s open. It is calculated as (Current Open - Previous Close) / Previous Close. A positive gap % indicates an upward price movement, while a negative gap % indicates a downward price movement.';
    case 'assetType':
      return 'Category of the asset, in this case we support Stocks, ETFs and Mutual Funds.';
    case 'iv':
      return `Intrinsic Value (IV) estimates a stock's true worth using a Discounted Cash Flow (DCF) model. We calculate IV by:
      1. Summing the last 20 quarters of Free Cash Flow (FCF) to get annual FCF for the past 5 years.
      2. Calculating the 5-year Compound Annual Growth Rate (CAGR) of FCF.
      3. Projecting FCF for the next 5 years using this CAGR.
      4. Discounting these projected FCFs to present value at a 10% rate.
      5. Adding a terminal value (using the Gordon Growth Model with a 2.5% growth rate) and discounting it.
      6. Adding net cash (cash minus debt) from the latest quarter.
      7. Dividing the total by shares outstanding to get IV per share.
      This approach helps assess if a stock is undervalued or overvalued based on its future cash flow potential.`;
    case 'ai-recommendation':
      return 'This filter displays assets with AI-generated investment recommendations, such as Strong Sell, Sell, Hold, Buy, or Strong Buy. These recommendations are produced by a proprietary algorithm that analyzes company financial statements. Please note that this is an experimental feature and should not be regarded as financial advice or a substitute for professional analysis.';
      default:
      return '';
  }
}

function handleMouseOut() {
  showTooltip.value = false
}

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
});
const item = toRef(props, 'item');

const selected = ref('filters')
function select(option: string) {
  selected.value = option
}

function arrayToCSV(data: Record<string, any>[]) {
  if (!data.length) return '';
  const keys = Object.keys(data[0]);
  const csvRows = [
    keys.join(','), // header row
    ...data.map((row: Record<string, any>) => keys.map(k => `"${(row[k] ?? '').toString().replace(/"/g, '""')}"`).join(','))
  ];
  return csvRows.join('\n');
}

const downloadLoading = ref(false);

async function DownloadResults() {
  downloadLoading.value = true;
  let data = [];
  let filename = 'results.csv';
  let endpoint = '';
  const pageLimit = 500;
  const username = user.value?.Username ?? '';
  let totalPages = 1;
  let page = 1;

  try {
    let allResults: Record<string, any>[] = [];
    switch (listMode.value) {
      case 'main':
        endpoint = `/api/${username}/screener/results/all`;
        filename = 'main_results.csv';
        break;
      case 'filter': {
        const screenerName = selectedScreener.value;
        if (!screenerName) throw new Error('No screener selected for filter download');
        endpoint = `/api/screener/${username}/results/filtered/${screenerName}`;
        filename = 'filter_results.csv';
        break;
      }
      case 'hidden':
        endpoint = `/api/${username}/screener/results/hidden`;
        filename = 'hidden_results.csv';
        break;
      case 'combined':
        endpoint = `/api/screener/${username}/all`;
        filename = 'combined_results.csv';
        break;
      default:
        downloadLoading.value = false;
        return;
    }

    do {
      const params = { page: String(page), limit: String(pageLimit) };
      const url = endpoint + '?' + new URLSearchParams(params).toString();
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        }
      });
      if (!response.ok) throw new Error('Failed to fetch full results');
      const result = await response.json();
      const pageResults = Array.isArray(result) ? result : result.data ?? [];
      allResults = allResults.concat(pageResults);
      totalPages = result.totalPages || (pageResults.length < pageLimit ? page : page + 1);
      page++;
    } while (page <= totalPages);
    data = allResults;
  } catch (error) {
    notification.value.show('Download failed: ' + (typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)));
    downloadLoading.value = false;
    return;
  }

  const csv = arrayToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
  downloadLoading.value = false;
}

const showResetDialog = ref(false);
const resetError = ref('');

async function confirmResetScreener() {
  resetError.value = '';
  try {
    await ResetScreener();
    await CurrentScreener();
    showResetDialog.value = false;
  } catch (error) {
    resetError.value = 'Error resetting screener: ' + (typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : String(error));}
  }

const selectedAttributes = ref<any[]>([]);

async function loadColumns() {
  try {
    const response = await fetch(`/api/get/columns?user=${encodeURIComponent(user.value?.Username ?? '')}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        }
      });
    const data = await response.json();
    // Accept only valid values (should match MainList/EditColumn attributes)
    const validValues = [
      'price','market_cap','volume','ipo','assettype','sector','exchange','country','pe_ratio','ps_ratio','fcf','cash','current_debt','current_assets','current_liabilities','current_ratio','roe','roa','peg','eps','pb_ratio','dividend_yield','name','currency','industry','book_value','shares','rs_score1w','rs_score1m','rs_score4m','all_time_high','all_time_low','high_52w','low_52w','perc_change','isin','gap','ev','adv1w','adv1m','adv4m','adv1y','rsi','intrinsic_value','fund_family','fund_category','net_expense_ratio','cagr','ai_recommendation'
    ];
    selectedAttributes.value = (Array.isArray(data.columns) ? data.columns : []).filter((v: string) => validValues.includes(v));
  } catch (err) {
    selectedAttributes.value = [];
    notification.value.show('Failed to load columns');
  }
}

function handleUpdateColumns(newColumns: string[]) {
  selectedAttributes.value = [...newColumns];
  loadColumns();
  GetScreenerResultsAll(true);
  GetCompoundedResults(true);
  GetHiddenResults(true);
}

onMounted(() => {
  loadColumns();
});

async function handleFetchScreeners(val: string) {
  // Clear previous results
  filterResults.value = [];
  filterPage.value = 1;
  filterTotalPages.value = 1;
  filterTotalCount.value = 0;
  lastLoadedScreener.value = val;
  await fetchScreenerResults(val);
  await showFilterResults();
}

// Show Selector only when not on mobile charts
const showSelector = computed(() => {
  if (typeof window !== 'undefined') {
    return !(selected.value === 'charts' && window.innerWidth <= 1150);
  }
  return true;
});

</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

#main2 {
  position: relative;
  display: flex;
  max-height: 850px;
}

#filters {
  flex: 0 0 20%;
  flex-direction: column;
  background-color: var(--base4);
  overflow-y: scroll;
  min-width: 300px;
}

#resultsDiv {
  flex: 0 0 50%;
  width: 100vw;
  overflow-x: scroll;
  overflow-y: hidden;
  max-height: 850px;
}

.simple-loader {
  padding: 12px 16px;
  text-align: center;
  color: var(--text1);
  background: transparent;
  font-weight: 600;
}

.simple-loader .simple-spinner {
  display: inline-block;
  width: 12px;
  height: 1.5px;
  margin-right: 10px;
  background: var(--text1);
  vertical-align: middle;
  transform-origin: center;
  animation: simple-rotate 0.8s linear infinite;
}

@keyframes simple-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

#sidebar-r {
  position: absolute;
  top: 0;
  right: 0;
  width: 30%;
  background-color: var(--base2);
  z-index: 1000;
}

#filters {
  background-color: var(--base4);
  display: flexbox;
  color: var(--text1);
  height: 100%;
  text-align: center;
}

.check {
  float: left;
}

label,
input,
p {
  border: none;
}

.screens {
  width: 100%;
  outline: none;
  border: none;
  background-color: var(--base2);
  color: var(--text1);
  text-align: center;
  margin: 0 auto;
  display: block;
  padding: 5px;
}

.screens:hover {
  width: 100%;
  outline: none;
  border: none;
  background-color: var(--base3);
  color: var(--text1);
  text-align: center;
  margin: 0 auto;
  display: block;
  padding: 5px;
}

.Header {
  background-color: var(--base1);
  text-align: center;
  color: var(--text1);
  border: none;
  display: flex;
  flex-direction: row;
  width: 100vw;
  height: 30px;
  align-items: center;
  min-width: 2610px;
}

.even {
  background-color: var(--base2);
  text-align: center;
  color: var(--text1);
  border: none;
  word-break: break-all;
  min-width: 2610px;
}

.odd {
  background-color: var(--base2);
  text-align: center;
  color: var(--text1);
  word-break: break-all;
  min-width: 2610px;
}

.even:hover,
.odd:hover {
  background-color: var(--accent4);
  cursor: pointer;
}

.selected {
  background-color: var(--accent4);
  color: var(--text1);
}

.RES {
  border: none;
  width: 100%;
}

.title {
  width: 100%;
}

.img {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 25px;
}

.img2 {
  width: 15px;
  height: 15px;
  float: left;
  border: none;
}

.hidebtn {
  background-color: transparent;
  border: none;
  cursor: pointer;
  margin: none;
}

.navmenu {
  width: 100vw;
  border: none;
  position: relative;
  display: flex;
  flex-direction: row;
  background-color: var(--base2);
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.title2 {
  position: absolute;
  top: 13%;
  left: 20%;
  border: none;
}

.title3 {
  border: none;
  width: 98%;
  margin: none;
  align-self: center;
  justify-content: center;
  padding: 7px 3px;
}

.snavbtn {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 5px;
  padding: 5px 8px;
  cursor: pointer;
  text-decoration: none;
  color: var(--text1);
  border-radius: 4px;
  transition: background-color 0.3s ease;
  background-color: transparent;
  outline: none;
  border: none;
  box-shadow: none;
  appearance: none;
  -webkit-appearance: none;
}

.results-count {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 5px;
  padding: 5px 8px;
  text-decoration: none;
  color: var(--text1);
  border-radius: 4px;
  transition: background-color 0.3s ease;
  background-color: transparent;
  outline: none;
  border: none;
  box-shadow: none;
  appearance: none;
  -webkit-appearance: none;
  min-width: 80px;
}

.results-loader {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  width: 16px;
  height: 16px;
}

.results-spinner {
  animation: rotate 1s linear infinite;
  width: 16px;
  height: 16px;
}

.results-spinner .path {
  stroke: var(--text1, #333);
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
}

.snavbtn span {
  font-size: 14px;
  user-select: none;
  transition: color 0.3s ease;
}

.snavbtn:hover,
.snavbtn.active {
  background-color: var(--base3);
}

.snavbtn.active span,
.activeText {
  color: var(--accent1);
}

.snavbtnslct {
  background-color: var(--base3);
  color: var(--text1);
  padding: 5px 8px;
  outline: none;
  border: none;
  opacity: 1;
  border-radius: 4px;
}

.check {
  border: none;
  font-size: 8px;
  align-items: center;
  text-align: center;
}

.RenameScreener,
.CreateScreener {
  position: absolute;
  top: 40%;
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
  z-index: 10000;
  padding: 10px;
  border: 2px solid var(--accent3);
}

.RenameScreener h3,
.CreateScreener h3 {
  background-color: transparent;
  color: rgba(var(--text1), 0.5);
  border: none;
  margin-top: 10px;
}

.RenameScreener input,
.CreateScreener input {
  border-radius: 5px;
  padding: 5px 5px 5px 15px;
  margin: 7px;
  width: 160px;
  outline: none;
  color: var(--base3);
  transition: border-color 0.3s, box-shadow 0.3s;
  border: solid 1px var(--base4);
  background-color: var(--base4);
}

.RenameScreener input:focus,
.CreateScreener input:focus {
  border-color: var(--accent1);
  box-shadow: 0 0 5px rgba(var(--accent3), 0.5);
  outline: none;
}

.CreateScreener input.input-error,
.RenameScreener input.input-error {
  border: solid 1px red !important;
}

.inner {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  border: none;
}

.inner-logo {
  opacity: 0.30;
  width: 30px;
  height: 30px;
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

.loader4 {
  display: inline-block;
  vertical-align: middle;
  width: 15px;
  height: 15px;
  margin-right: 8px;
}

.spinner {
  animation: rotate 1s linear infinite;
  width: 15px;
  height: 15px;
}

.path {
  stroke: var(--text1, #333);
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}

.inner button:hover {
  cursor: pointer;
  opacity: 1;
}

.results {
  background-color: var(--base4);
  color: var(--text1);
  text-align: center;
  align-items: center;
  padding: 100px;
  border: none;
}

.results2 {
  background-color: var(--base1);
  width: 100vw;
  color: var(--text1);
  border: none;
  height: 200px;
}

.results2v {
  padding: 20px;
  background-color: var(--base4);
}

.rowint {
  position: relative;
  display: flex;
  border: none;
  text-align: center;
  align-items: center;
}

.rowint p {
  font-weight: bold;
  border: none;
  text-align: center;
}

.no-border {
  border: none;
  border-style: none;
}

.img3 {
  height: 10px;
  width: 10px;
}

.dropdown-menu {
  display: none;
  cursor: pointer;
  width: 125px;
  position: absolute;
  z-index: 1000;
  top: -10px;
  left: 20px;
  padding: 5px;
  border-radius: 5px;
  background-color: var(--base4);
}

.dropdown-menu>div {
  background-color: var(--base4);
  padding: 5px;
  height: 14px;
  display: flex;
  align-items: center;
  border-radius: 5px;
}

.dropdown-menu>div:hover {
  background-color: var(--base2);
}

.dropdown-btn:hover+.dropdown-menu,
.dropdown-menu:hover {
  display: block;
}

.nested-dropdown {
  position: relative;
}

.nested-dropdown-menu {
  display: none;
  position: absolute;
  left: 100%;
  top: 0;
  background-color: var(--base4);
  max-height: 185px;
  overflow-y: scroll;
  padding: 5px;
  border-radius: 5px;
  min-width: 150px;
  z-index: 1001;
  align-items: center;
  justify-content: center;
}

.nested-dropdown:hover .nested-dropdown-menu {
  display: block;
}

.watchlist-item {
  padding: 5px;
  display: flex;
  align-items: center;
  height: 24px;
  box-sizing: border-box;
  border-radius: 5px;
}

.watchlist-item:hover {
  background-color: var(--base2);
}

.watchlist-item input[type="checkbox"] {
  margin-right: 5px;
}

/* Remove focus outline */
.dropdown-btn:focus,
.watchlist-item input[type="checkbox"]:focus {
  outline: none;
}

/* Remove hover border */
.dropdown-menu>div:hover,
.watchlist-item:hover {
  border: none;
  outline: none;
}

.iconbtn {
  width: 15px;
  height: 15px;
  opacity: 0.60;
  cursor: pointer;
}

.iconbtn:hover {
  opacity: 1;
}

.img3 {
  width: 8px;
  height: 8px;
  border: none;
  cursor: pointer;
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

.edit-watch-panel-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 5px;
  padding: 5px 8px;
  cursor: pointer;
  text-decoration: none;
  color: var(--text1);
  border-radius: 4px;
  background-color: transparent;
  outline: none;
  border: solid 1px var(--base4);
  box-shadow: none;
  appearance: none;
  -webkit-appearance: none;
  white-space: nowrap;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.edit-watch-panel-btn2 {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 5px;
  padding: 5px 8px;
  cursor: pointer;
  text-decoration: none;
  color: var(--text1);
  border-radius: 4px;
  background-color: transparent;
  outline: none;
  border: solid 1px var(--accent1);
  box-shadow: none;
  appearance: none;
  -webkit-appearance: none;
  white-space: nowrap;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.edit-watch-panel-btn:hover,
.edit-watch-panel-btn:focus {
  background-color: var(--base3);
  color: var(--text1);
}

.edit-watch-panel-btn:active {
  background-color: var(--base4);
}

.imgbtn {
  width: 15px;
  height: 15px;
}

.custom-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 5px;
  opacity: 0.7;
  /* Initial opacity */
  transition: opacity 0.3s;
}

.custom-checkbox.checked {
  color: var(--text1);
  opacity: 1;
}

.checkmark {
  width: 8px;
  height: 8px;
  background-color: var(--text1);
  border-radius: 50%;
  margin-right: 5px;
  display: inline-block;
  transition: background-color 0.3s, border-color 0.3s;
}

.custom-checkbox.checked .checkmark {
  background-color: var(--accent1);
  border-color: var(--accent1);
}

.custom-checkbox.checked {
  color: var(--text1);
}

.select-container__no-screeners {
  text-align: center;
  color: var(--text2);
  font-size: 14px;
}

.input {
  border-radius: 5px;
  padding: 5px 5px 5px 15px;
  margin: 7px;
  width: 160px;
  outline: none;
  color: var(--text1);
  transition: border-color 0.3s, box-shadow 0.3s;
  border: solid 1px var(--base4);
  background-color: var(--base4);
}

.input:focus {
  border-color: var(--accent1);
  outline: none;
}

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

input[type="date"]::-webkit-calendar-picker-indicator {
  display: none;
}

input[type="date"] {
  color: var(--base3);
}

.input[type="number"]::-webkit-inner-spin-button,
.input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.reset-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(30, 32, 48, 0.45); /* subtle dark glass */
  backdrop-filter: blur(4px) saturate(120%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  transition: background 0.3s;
}

.reset-modal {
  background: rgba(34, 37, 54, 0.98);
  border-radius: 16px;
  box-shadow: 0 8px 32px 0 rgba(0,0,0,0.22), 0 1.5px 6px 0 rgba(140,141,254,0.08);
  padding: 36px 32px 28px 32px;
  min-width: 340px;
  max-width: 90vw;
  text-align: center;
  animation: modal-pop 0.22s cubic-bezier(.4,1.4,.6,1) both;
}

@keyframes modal-pop {
  0% { transform: scale(0.95) translateY(20px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

.reset-modal h3 {
  color: var(--accent1);
  font-size: 1.35rem;
  font-weight: 700;
  margin-bottom: 12px;
  letter-spacing: 0.01em;
}

.reset-modal p {
  color: var(--text2);
  font-size: 1.05rem;
  margin-bottom: 18px;
  line-height: 1.6;
}

.reset-modal .trade-btn {
  border-radius: 8px;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  padding: 10px 28px;
  margin: 0 4px;
  transition: background 0.18s, color 0.18s, box-shadow 0.18s;
}

.reset-modal .trade-btn {
  background: var(--accent1);
  color: var(--text3);
  cursor: pointer;
}
.reset-modal .trade-btn:hover {
  background: var(--accent2);
  color: var(--text3);
}

.wlist-container {
  height: 800px;
  width: 100%;
  min-width: 2610px;
  overflow-y: scroll;
  z-index: 1000;
}

#wlist {
  outline: none;
}

.question-mark-wrapper {
  position: relative;
}

.question-mark-wrapper img {
  width: 15px;
  height: 15px;
  cursor: pointer;
  margin-left: 7px;
}

.tooltip {
  position: absolute;
  background-color: var(--base1);
  border: 1px solid var(--accent3);
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  z-index: 10000;
  width: 200px;
}

.tooltip-text {
  color: var(--text1);
}

.question-mark-wrapper:hover .tooltip {
  display: block;
}

.question-mark-wrapper .tooltip {
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.5s;
}

.question-mark-wrapper:hover .tooltip {
  visibility: visible;
  opacity: 1;
}

.error-border {
  border: 1px solid red;
  box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
  animation: pulse 3s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
  }

  50% {
    box-shadow: 0 0 15px rgba(255, 0, 0, 0.7);
  }

  100% {
    box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
  }
}

.question-img {
  width: 15px;
  cursor: pointer;
  margin-left: 5px;
}

.btnlabel {
  margin-left: 3px;
  cursor: inherit;
}

.mobilenav {
  display: none;
}

.navmenu-mobile {
  display: none;
}

.hidden {
  visibility: hidden;
}

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

@media (min-width: 1151px) {

  #filters,
  #resultsDiv,
  #sidebar-r {
    display: block !important;
  }
}

/* Mobile version */
@media (max-width: 1150px) {

  /* Hide sections that have the 'hidden-mobile' class */
  .hidden-mobile {
    display: none !important;
  }

  .navmenu {
    display: none;
  }

  .navmenu-mobile {
    display: flex;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .mobilenav {
    display: flex;
    flex-direction: row;
    gap: 12px;
    padding: 8px 12px;
    background-color: var(--base2);
    justify-content: center;
    align-items: center;
    margin-bottom: 3px;
  }

  .mnavbtn {
    margin-bottom: 3px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--base3);
    padding: 10px 30px;
    color: var(--text1);
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    cursor: pointer;
    border-radius: 3px;
    transition: background-color 0.3s ease, opacity 0.3s ease, transform 0.2s ease;
    opacity: 0.85;
    height: 3rem;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    user-select: none;
    border: transparent;
  }

  .mnavbtn:hover {
    background-color: var(--accent1);
    color: var(--text3);
    opacity: 1;
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .mnavbtn.selected {
    background-color: var(--accent1);
    color: var(--text3);
    opacity: 1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  #main2 {
    position: relative;
    display: flex;
  }

  #filters {
    flex: 0 0 100%;
    flex-direction: column;
    background-color: var(--base4);
  }

  #resultsDiv {
    flex: 0 0 100%;
    width: 100%;
    overflow-x: scroll;
    overflow-y: hidden;
  }

  #sidebar-r {
    width: 100%;
    background-color: var(--base4);
  }

  #filters {
    background-color: var(--base4);
    display: flexbox;
    color: var(--text1);
    height: 100%;
    text-align: center;
  }

  #wk-chart,
  #dl-chart {
    background-repeat: no-repeat;
  }

  .input {
    border-radius: 5px;
    padding: 5px 5px 5px 15px;
    margin: 7px;
    width: 200px;
    outline: none;
    color: var(--text1);
    transition: border-color 0.3s, box-shadow 0.3s;
    border: solid 1px var(--base4);
    background-color: var(--base4);
    text-align: left;
  }

  .selector-container {
    width: 100%;
  }

  .img2 {
    width: 24px;
    height: 24px;
    display: inline-block;
    object-fit: contain;
    vertical-align: middle;
  }
  .img2 svg, .img2 img {
    width: 100%;
    height: 100%;
    display: block;
  }

}
</style>