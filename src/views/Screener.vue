<template>
  <body>
    <Header />
    <Assistant />
    <div class="mobilenav">
      <button class="mnavbtn" :class="{ selected: selected === 'filters' }" @click="select('filters')">
        Filters
      </button>
      <button class="mnavbtn" :class="{ selected: selected === 'list' }" @click="select('list')">
        List
      </button>
      <button class="mnavbtn" :class="{ selected: selected === 'charts' }" @click="select('charts')">
        Charts
      </button>
    </div>
   <div style="display: flex;">
<Selector
          :ScreenersName="ScreenersName"
          :selectedScreener="selectedScreener"
          :isScreenerError="isScreenerError"
          :showDropdown="showDropdown"
          @selectScreener="selectScreener"
          @excludeScreener="ExcludeScreener"
          @deleteScreener="DeleteScreener"
          :getScreenerImage="getScreenerImage"
        />
         <div class="navmenu" style="margin-left: 2px;">
         <button class="edit-watch-panel-btn" :class="{ 'edit-watch-panel-btn2': showEditColumn }"
            @click="showEditColumn = !showEditColumn">Edit Table</button>
          <button class="snavbtn" id="watchlistCreate" :class="{ 'snavbtnslct': showCreateScreener }"
            @click="showCreateScreener = !showCreateScreener" v-b-tooltip.hover title="Create New Screener">
           <svg class="img2" viewBox="0 0 512 512" fill="var(--text1)" xmlns="http://www.w3.org/2000/svg">
  <g fill="var(--text1)" transform="translate(85.333333, 85.333333)">
    <path d="M170.67,0C264.92,0,341.33,76.41,341.33,170.67S264.92,341.33,170.67,341.33S0,264.92,0,170.67S76.41,0,170.67,0ZM170.67,42.67c-70.69,0-128,57.31-128,128s57.31,128,128,128s128-57.31,128-128S241.36,42.67,170.67,42.67ZM192,85.33v64h64v42.67h-64v64h-42.67v-64h-64v-42.67h64v-64H192Z"/>
  </g>
</svg>
            <label class=btnlabel>Create</label></button>
          <button class="snavbtn" id="screenerModify" :class="{ 'snavbtnslct': showRenameScreener }"
            @click="showRenameScreener = !showRenameScreener" v-b-tooltip.hover title="Rename Current Screener">
          <svg class="img2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M9 5H14M14 5H19M14 5V19M9 19H14M14 19H19" stroke="var(--text1)" stroke-width="2"></path>
  <path d="M11 9H4C2.89543 9 2 9.89543 2 11V15H11" stroke="var(--text1)" stroke-width="2"></path>
  <path d="M17 15H20C21.1046 15 22 14.1046 22 13V9H17" stroke="var(--text1)" stroke-width="2"></path>
</svg>
            <label class=btnlabel>Rename</label></button>
         <!-- Replace your current Reset button with this: -->
<button class="snavbtn" v-b-tooltip.hover title="Reset Screener" @click="showResetDialog = true">
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
          <button id="watchlistAutoplay" class="snavbtn" :class="{ 'snavbtnslct': autoplayRunning === true }"
            @click="AutoPlay()" v-b-tooltip.hover title="Autoplay Results">
            <svg class="img2" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="var(--text1)">
  <path fill="var(--text1)" fill-rule="evenodd"
    d="M5.23331,0.493645 C6.8801,-0.113331 8.6808,-0.161915 10.3579,0.355379 C11.4019,0.6773972 12.361984,1.20757325 13.1838415,1.90671757 L13.4526,2.14597 L14.2929,1.30564 C14.8955087,0.703065739 15.9071843,1.0850774 15.994017,1.89911843 L16,2.01275 L16,6.00002 L12.0127,6.00002 C11.1605348,6.00002 10.7153321,5.01450817 11.2294893,4.37749065 L11.3056,4.29291 L12.0372,3.56137 C11.389,2.97184 10.6156,2.52782 9.76845,2.26653 C8.5106,1.87856 7.16008,1.915 5.92498,2.37023 C4.68989,2.82547 3.63877,3.67423 2.93361,4.78573 C2.22844,5.89723 1.90836,7.20978 2.02268,8.52112 C2.13701,9.83246 2.6794,11.0698 3.56627,12.0425 C4.45315,13.0152 5.63528,13.6693 6.93052,13.9039 C8.22576,14.1385 9.56221,13.9407 10.7339,13.3409 C11.9057,12.7412 12.8476,11.7727 13.4147,10.5848 C13.6526,10.0864 14.2495,9.8752 14.748,10.1131 C15.2464,10.351 15.4575,10.948 15.2196,11.4464 C14.4635,13.0302 13.2076,14.3215 11.6453,15.1213 C10.0829,15.921 8.30101,16.1847 6.57402,15.8719 C4.84704,15.559 3.27086,14.687 2.08836,13.39 C0.905861,12.0931 0.182675,10.4433 0.0302394,8.69483 C-0.122195,6.94637 0.304581,5.1963 1.2448,3.7143 C2.18503,2.2323 3.58652,1.10062 5.23331,0.493645 Z M6,5.46077 C6,5.09472714 6.37499031,4.86235811 6.69509872,5.0000726 L6.7678,5.03853 L10.7714,7.57776 C11.0528545,7.75626909 11.0784413,8.14585256 10.8481603,8.36273881 L10.7714,8.42224 L6.7678,10.9615 C6.45867857,11.1575214 6.06160816,10.965274 6.00646097,10.6211914 L6,10.5392 L6,5.46077 Z">
  </path>
</svg>
            <label class=btnlabel>Autoplay</label></button>
          <button class="snavbtn" :class="{ 'snavbtnslct': listMode === 'hidden' }" v-b-tooltip.hover
            title="Hidden List" @click="showHiddenResults()">
          <svg class="img2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M3.99989 4L19.9999 20M16.4999 16.7559C15.1473 17.4845 13.6185 17.9999 11.9999 17.9999C8.46924 17.9999 5.36624 15.5478 3.5868 13.7788C3.1171 13.3119 2.88229 13.0784 2.7328 12.6201C2.62619 12.2933 2.62616 11.7066 2.7328 11.3797C2.88233 10.9215 3.11763 10.6875 3.58827 10.2197C4.48515 9.32821 5.71801 8.26359 7.17219 7.42676M19.4999 14.6335C19.8329 14.3405 20.138 14.0523 20.4117 13.7803L20.4146 13.7772C20.8832 13.3114 21.1182 13.0779 21.2674 12.6206C21.374 12.2938 21.3738 11.7068 21.2672 11.38C21.1178 10.9219 20.8827 10.6877 20.4133 10.2211C18.6338 8.45208 15.5305 6 11.9999 6C11.6624 6 11.3288 6.02241 10.9999 6.06448M13.3228 13.5C12.9702 13.8112 12.5071 14 11.9999 14C10.8953 14 9.99989 13.1046 9.99989 12C9.99989 11.4605 10.2135 10.9711 10.5608 10.6113"
    stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
            <label class=btnlabel>Hidden Assets</label></button>
          <button class="snavbtn" :class="{ 'snavbtnslct': listMode === 'combined' }" v-b-tooltip.hover
            title="Show Combined Screener Results" @click="showCombinedResults()">
          <svg class="img2" fill="var(--text1)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M8,8 L8,4.5 C8,3.11928813 9.11928813,2 10.5,2 L19.5,2 C20.8807119,2 22,3.11928813 22,4.5 L22,13.5 C22,14.8807119 20.8807119,16 19.5,16 L16,16 L16,19.5 C16,20.8807119 14.8807119,22 13.5,22 L4.5,22 C3.11928813,22 2,20.8807119 2,19.5 L2,10.5 C2,9.11928813 3.11928813,8 4.5,8 L8,8 Z M9,8.5 C9,8.77614237 8.77614237,9 8.5,9 L4.5,9 C3.67157288,9 3,9.67157288 3,10.5 L3,19.5 C3,20.3284271 3.67157288,21 4.5,21 L13.5,21 C14.3284271,21 15,20.3284271 15,19.5 L15,15.5 C15,15.2238576 15.2238576,15 15.5,15 L19.5,15 C20.3284271,15 21,14.3284271 21,13.5 L21,4.5 C21,3.67157288 20.3284271,3 19.5,3 L10.5,3 C9.67157288,3 9,3.67157288 9,4.5 L9,8.5 Z M13.5,9 C13.2238576,9 13,8.77614237 13,8.5 C13,8.22385763 13.2238576,8 13.5,8 C14.8807119,8 16,9.11928813 16,10.5 C16,10.7761424 15.7761424,11 15.5,11 C15.2238576,11 15,10.7761424 15,10.5 C15,9.67157288 14.3284271,9 13.5,9 Z M8,13.5 C8,13.2238576 8.22385763,13 8.5,13 C8.77614237,13 9,13.2238576 9,13.5 C9,14.3284271 9.67157288,15 10.5,15 C10.7761424,15 11,15.2238576 11,15.5 C11,15.7761424 10.7761424,16 10.5,16 C9.11928813,16 8,14.8807119 8,13.5 Z M12.5,16 C12.2238576,16 12,15.7761424 12,15.5 C12,15.2238576 12.2238576,15 12.5,15 L13.5,15 C13.7761424,15 14,15.2238576 14,15.5 C14,15.7761424 13.7761424,16 13.5,16 L12.5,16 Z M10.5,9 C10.2238576,9 10,8.77614237 10,8.5 C10,8.22385763 10.2238576,8 10.5,8 L11.5,8 C11.7761424,8 12,8.22385763 12,8.5 C12,8.77614237 11.7761424,9 11.5,9 L10.5,9 Z M8,10.5 C8,10.2238576 8.22385763,10 8.5,10 C8.77614237,10 9,10.2238576 9,10.5 L9,11.5 C9,11.7761424 8.77614237,12 8.5,12 C8.22385763,12 8,11.7761424 8,11.5 L8,10.5 Z M15,12.5 C15,12.2238576 15.2238576,12 15.5,12 C15.7761424,12 16,12.2238576 16,12.5 L16,13.5 C16,13.7761424 15.7761424,14 15.5,14 C15.2238576,14 15,13.7761424 15,13.5 L15,12.5 Z"/>
</svg>
            <label class=btnlabel>Multi-Screener</label>
          </button>
          <button @click="DownloadResults" class="snavbtn" :class="{ 'snavbtnslct': showSearch }" v-b-tooltip.hover
            title="Download Results">
           <svg class="img2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M3 15C3 17.8284 3 19.2426 3.87868 20.1213C4.75736 21 6.17157 21 9 21H15C17.8284 21 19.2426 21 20.1213 20.1213C21 19.2426 21 17.8284 21 15"
    stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path
    d="M12 3V16M12 16L16 11.625M12 16L8 11.625"
    stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
            <label class=btnlabel>Download Results</label></button>
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
  :user="user"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('price')"
/>
     <MarketCap
       :user="user"
  :apiKey="apiKey"
  :notification="notification"
  :selectedScreener="selectedScreener"
  @fetchScreeners="handleFetchScreeners"
  @handleMouseOver="handleMouseOver"
  @handleMouseOut="handleMouseOut"
  :isScreenerError="isScreenerError"
  @reset="Reset('Marketcap')"
  />
       <IPO 
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('IPO')"
       />
       <AssetType 
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('AssetType')"
       />
       <Sector 
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('Sector')"
       />
       <Exchange
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('Exchange')"
       />
       <Country
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('Country')"
       />
       <PE
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('PE')"
       />
        <PS
        :user="user"
        :apiKey="apiKey"
        :notification="notification"
        :selectedScreener="selectedScreener"
        @fetchScreeners="handleFetchScreeners"
        @handleMouseOver="handleMouseOver"
        @handleMouseOut="handleMouseOut"
        :isScreenerError="isScreenerError"
        @reset="Reset('PS')"
        />
       <PEG
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('PEG')"
       />
       <EPS
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('EPS')"
       />
       <PB
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('PB')"
       />
        <DivYield
        :user="user"
        :apiKey="apiKey"
        :notification="notification"
        :selectedScreener="selectedScreener"
        @fetchScreeners="handleFetchScreeners"
        @handleMouseOver="handleMouseOver"
        @handleMouseOut="handleMouseOut"
        :isScreenerError="isScreenerError"
        @reset="Reset('DivYield')"
        />
       <ShowFundYoYQoQ
        :user="user"
        :apiKey="apiKey"
        :notification="notification"
        :selectedScreener="selectedScreener"
        @fetchScreeners="handleFetchScreeners"
        @handleMouseOver="handleMouseOver"
        @handleMouseOut="handleMouseOut"
        :isScreenerError="isScreenerError"
        @reset="Reset('FundGrowth')"
       />
       <PricePerf
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('PricePerformance')"
       />
       <RSscore
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('RSscore')"
       />
       <Volume
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('Volume')"
       />
       <ADV
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('ADV')"
       />
       <ROE
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('ROE')"
       />
       <ROA
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('ROA')"
       />
       <CurrentRatio
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('CurrentRatio')"
       />
       <CurrentAsset
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('CurrentAssets')"
       />
     <CurrentLiability
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('CurrentLiabilities')"
     />
       <CurrentDebt
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('CurrentDebt')"
       />
       <CashEquivalents
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('CashEquivalents')"
       />
       <FCF
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('FCF')"
       />
       <ProfitMargin
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('ProfitMargin')"
       />
       <GrossMargin
       :user="user"
       :apiKey="apiKey"
       :notification="notification"
       :selectedScreener="selectedScreener"
       @fetchScreeners="handleFetchScreeners"
       @handleMouseOver="handleMouseOver"
       @handleMouseOut="handleMouseOut"
       :isScreenerError="isScreenerError"
       @reset="Reset('GrossMargin')"
       />
        <DebtEquity
          :user="user"
          :apiKey="apiKey"
          :notification="notification"
          :selectedScreener="selectedScreener"
          @fetchScreeners="handleFetchScreeners"
          @handleMouseOver="handleMouseOver"
          @handleMouseOut="handleMouseOut"
          :isScreenerError="isScreenerError"
          @reset="Reset('DebtEquity')"
        />
       <BookValue
         :user="user"
         :apiKey="apiKey"
         :notification="notification"
         :selectedScreener="selectedScreener"
         @fetchScreeners="handleFetchScreeners"
         @handleMouseOver="handleMouseOver"
         @handleMouseOut="handleMouseOut"
         :isScreenerError="isScreenerError"
         @reset="Reset('BookValue')"
       />
       <EV
         :user="user"
         :apiKey="apiKey"
         :notification="notification"
         :selectedScreener="selectedScreener"
         @fetchScreeners="handleFetchScreeners"
         @handleMouseOver="handleMouseOver"
         @handleMouseOut="handleMouseOut"
         :isScreenerError="isScreenerError"
         @reset="Reset('EV')"
       />
        <RSI
          :user="user"
          :apiKey="apiKey"
          :notification="notification"
          :selectedScreener="selectedScreener"
          @fetchScreeners="handleFetchScreeners"
          @handleMouseOver="handleMouseOver"
          @handleMouseOut="handleMouseOut"
          :isScreenerError="isScreenerError"
          @reset="Reset('RSI')"
        />
        <Gap
          :user="user"
          :apiKey="apiKey"
          :notification="notification"
          :selectedScreener="selectedScreener"
          @fetchScreeners="handleFetchScreeners"
          @handleMouseOver="handleMouseOver"
          @handleMouseOut="handleMouseOut"
          :isScreenerError="isScreenerError"
          @reset="Reset('Gap')"
        />
        <IntrinsicValue 
          :user="user"
          :apiKey="apiKey"
          :notification="notification"
          :selectedScreener="selectedScreener"
          @fetchScreeners="handleFetchScreeners"
          @handleMouseOver="handleMouseOver"
          @handleMouseOut="handleMouseOut"
          :isScreenerError="isScreenerError"
          @reset="Reset('IV')"
        />
        <div class="results"></div>
      </div>
      <div id="resultsDiv" :class="{ 'hidden-mobile': selected !== 'list' }">
        <CreateScreener
  v-if="showCreateScreener"
  :user="user"
  :apiKey="apiKey"
  :notification="notification"
  :GetScreeners="GetScreeners"
  :GetCompoundedResults="GetCompoundedResults"
  :showCreateScreener="showCreateScreener"
  :error="error"
  @close="handleCreateScreenerClose"
/>
      <RenameScreener
  v-if="showRenameScreener"
  :user="user"
  :apiKey="apiKey"
  :notification="notification"
  :currentName="selectedScreener"
  :GetScreeners="GetScreeners"
  :error="error"
  @close="handleRenameScreenerClose"
/>
<EditColumn
  v-if="showEditColumn"
  :user="user"
  :apiKey="apiKey"
  :notification="notification"
  :showEditColumn="showEditColumn"
  :selectedAttributes="selectedAttributes"
  @update-columns="handleUpdateColumns"
  @reload-columns="loadColumns"
  @close="showEditColumn = false"
/>
        <div class="navmenu-mobile">
          <button class="snavbtn" id="watchlistCreate" :class="{ 'snavbtnslct': showCreateScreener }"
            @click="showCreateScreener = !showCreateScreener" v-b-tooltip.hover title="Create New Screener">
            <svg class="img2" viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink" fill="var(--text1)">
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <title>new-indicator</title>
                <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                  <g id="scheduler" fill="var(--text1)" transform="translate(85.333333, 85.333333)">
                    <path
                      d="M170.666667,1.42108547e-14 C264.923264,-3.10380131e-15 341.333333,76.4100694 341.333333,170.666667 C341.333333,264.923264 264.923264,341.333333 170.666667,341.333333 C76.4100694,341.333333 2.57539587e-14,264.923264 1.42108547e-14,170.666667 C2.6677507e-15,76.4100694 76.4100694,3.15255107e-14 170.666667,1.42108547e-14 Z M170.666667,42.6666667 C99.9742187,42.6666667 42.6666667,99.9742187 42.6666667,170.666667 C42.6666667,241.359115 99.9742187,298.666667 170.666667,298.666667 C241.359115,298.666667 298.666667,241.359115 298.666667,170.666667 C298.666667,99.9742187 241.359115,42.6666667 170.666667,42.6666667 Z M192,85.3333333 L191.999333,149.333333 L256,149.333333 L256,192 L191.999333,191.999333 L192,256 L149.333333,256 L149.333333,191.999333 L85.3333333,192 L85.3333333,149.333333 L149.333333,149.333333 L149.333333,85.3333333 L192,85.3333333 Z"
                      id="Combined-Shape"> </path>
                  </g>
                </g>
              </g>
            </svg></button>
          <button class="snavbtn" id="screenerModify" :class="{ 'snavbtnslct': showRenameScreener }"
            @click="showRenameScreener = !showRenameScreener" v-b-tooltip.hover title="Rename Current Screener">
            <svg class="img2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <path d="M9 5H14M14 5H19M14 5V19M9 19H14M14 19H19" stroke="var(--text1)" stroke-width="2"></path>
                <path d="M11 9H4C2.89543 9 2 9.89543 2 11V15H11" stroke="var(--text1)" stroke-width="2"></path>
                <path d="M17 15H20C21.1046 15 22 14.1046 22 13V9H17" stroke="var(--text1)" stroke-width="2"></path>
              </g>
            </svg>
          </button>
          <button class="snavbtn" v-b-tooltip.hover title="Reset Screener"
            @click="async () => { await ResetScreener(); await CurrentScreener(); }">
            <svg class="img2" fill="var(--text1)" viewBox="0 0 512 512" data-name="Layer 1" id="Layer_1"
              xmlns="http://www.w3.org/2000/svg" stroke="var(--text1)" stroke-width="20.48">
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <path
                  d="M64,256H34A222,222,0,0,1,430,118.15V85h30V190H355V160h67.27A192.21,192.21,0,0,0,256,64C150.13,64,64,150.13,64,256Zm384,0c0,105.87-86.13,192-192,192A192.21,192.21,0,0,1,89.73,352H157V322H52V427H82V393.85A222,222,0,0,0,478,256Z">
                </path>
              </g>
            </svg>
          </button>
          <button class="snavbtn" :class="{ 'snavbtnslct': listMode === 'hidden' }" v-b-tooltip.hover
            title="Hidden List" @click="showHiddenResults()">
            <svg class="img2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <g id="Edit / Hide">
                  <path id="Vector"
                    d="M3.99989 4L19.9999 20M16.4999 16.7559C15.1473 17.4845 13.6185 17.9999 11.9999 17.9999C8.46924 17.9999 5.36624 15.5478 3.5868 13.7788C3.1171 13.3119 2.88229 13.0784 2.7328 12.6201C2.62619 12.2933 2.62616 11.7066 2.7328 11.3797C2.88233 10.9215 3.11763 10.6875 3.58827 10.2197C4.48515 9.32821 5.71801 8.26359 7.17219 7.42676M19.4999 14.6335C19.8329 14.3405 20.138 14.0523 20.4117 13.7803L20.4146 13.7772C20.8832 13.3114 21.1182 13.0779 21.2674 12.6206C21.374 12.2938 21.3738 11.7068 21.2672 11.38C21.1178 10.9219 20.8827 10.6877 20.4133 10.2211C18.6338 8.45208 15.5305 6 11.9999 6C11.6624 6 11.3288 6.02241 10.9999 6.06448M13.3228 13.5C12.9702 13.8112 12.5071 14 11.9999 14C10.8953 14 9.99989 13.1046 9.99989 12C9.99989 11.4605 10.2135 10.9711 10.5608 10.6113"
                    stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                </g>
              </g>
            </svg>
          </button>
          <button class="snavbtn" :class="{ 'snavbtnslct': listMode === 'combined' }" v-b-tooltip.hover
            title="Show Combined Screener Results" @click="showCombinedResults()">
            <svg class="img2" fill="var(--text1)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <path
                  d="M8,8 L8,4.5 C8,3.11928813 9.11928813,2 10.5,2 L19.5,2 C20.8807119,2 22,3.11928813 22,4.5 L22,13.5 C22,14.8807119 20.8807119,16 19.5,16 L16,16 L16,19.5 C16,20.8807119 14.8807119,22 13.5,22 L4.5,22 C3.11928813,22 2,20.8807119 2,19.5 L2,10.5 C2,9.11928813 3.11928813,8 4.5,8 L8,8 Z M9,8.5 C9,8.77614237 8.77614237,9 8.5,9 L4.5,9 C3.67157288,9 3,9.67157288 3,10.5 L3,19.5 C3,20.3284271 3.67157288,21 4.5,21 L13.5,21 C14.3284271,21 15,20.3284271 15,19.5 L15,15.5 C15,15.2238576 15.2238576,15 15.5,15 L19.5,15 C20.3284271,15 21,14.3284271 21,13.5 L21,4.5 C21,3.67157288 20.3284271,3 19.5,3 L10.5,3 C9.67157288,3 9,3.67157288 9,4.5 L9,8.5 Z M13.5,9 C13.2238576,9 13,8.77614237 13,8.5 C13,8.22385763 13.2238576,8 13.5,8 C14.8807119,8 16,9.11928813 16,10.5 C16,10.7761424 15.7761424,11 15.5,11 C15.2238576,11 15,10.7761424 15,10.5 C15,9.67157288 14.3284271,9 13.5,9 Z M8,13.5 C8,13.2238576 8.22385763,13 8.5,13 C8.77614237,13 9,13.2238576 9,13.5 C9,14.3284271 9.67157288,15 10.5,15 C10.7761424,15 11,15.2238576 11,15.5 C11,15.7761424 10.7761424,16 10.5,16 C9.11928813,16 8,14.8807119 8,13.5 Z M12.5,16 C12.2238576,16 12,15.7761424 12,15.5 C12,15.2238576 12.2238576,15 12.5,15 L13.5,15 C13.7761424,15 14,15.2238576 14,15.5 C14,15.7761424 13.7761424,16 13.5,16 L12.5,16 Z M10.5,9 C10.2238576,9 10,8.77614237 10,8.5 C10,8.22385763 10.2238576,8 10.5,8 L11.5,8 C11.7761424,8 12,8.22385763 12,8.5 C12,8.77614237 11.7761424,9 11.5,9 L10.5,9 Z M8,10.5 C8,10.2238576 8.22385763,10 8.5,10 C8.77614237,10 9,10.2238576 9,10.5 L9,11.5 C9,11.7761424 8.77614237,12 8.5,12 C8.22385763,12 8,11.7761424 8,11.5 L8,10.5 Z M15,12.5 C15,12.2238576 15.2238576,12 15.5,12 C15.7761424,12 16,12.2238576 16,12.5 L16,13.5 C16,13.7761424 15.7761424,14 15.5,14 C15.2238576,14 15,13.7761424 15,13.5 L15,12.5 Z">
                </path>
              </g>
            </svg>

          </button>
        </div>
        <div v-if="listMode === 'main'">
<MainList
  :resultListLength="resultListLength"
  :currentResults="currentResults"
  :selectedItem="selectedItem"
  :watchlist="watchlist"
  :getImagePath="getImagePath"
  :getWatchlistIcon="getWatchlistIcon"
  :selectedAttributes="selectedAttributes"
  @scroll="handleScroll1"
  @keydown="handleKeydown"
  @select-row="selectRow"
  @hide-stock="hideStock"
  @toggle-watchlist="({ ticker, symbol }) => toggleWatchlist(ticker, symbol)"
/>
              </div>
              <div v-else-if="listMode === 'filter'">
                  <FilterList
    :currentResults="currentResults"
    :resultListLength="resultListLength"
    :selectedItem="selectedItem"
    :watchlist="watchlist"
    :getImagePath="getImagePath"
    :getWatchlistIcon="getWatchlistIcon"
    :selectedAttributes="selectedAttributes"
    @scroll="handleScroll2"
    @keydown="handleKeydown"
    @select-row="selectRow"
    @hide-stock="hideStock"
    @toggle-watchlist="({ ticker, symbol }) => toggleWatchlist(ticker, symbol)"
  />
                    </div>
                    <div v-else-if="listMode === 'hidden'">
                      <HiddenList
                        :currentResults="currentResults"
                        :resultListLength="resultListLength"
                        :selectedItem="selectedItem"
                        :watchlist="watchlist"
                        :getImagePath="getImagePath"
                        :getWatchlistIcon="getWatchlistIcon"
                        :selectedAttributes="selectedAttributes"
                        @scroll="handleScroll3"
                        @keydown="handleKeydown"
                        @select-row="selectRow"
                        @show-stock="ShowStock"
                        @toggle-watchlist="({ ticker, symbol }) => toggleWatchlist(ticker, symbol)"
                      />
                          </div>
                          <div v-else-if="listMode === 'combined'">
                            <CombinedList
                              :resultListLength="resultListLength"
                              :currentResults="currentResults"
                              :selectedItem="selectedItem"
                              :watchlist="watchlist"
                              :getImagePath="getImagePath"
                              :getWatchlistIcon="getWatchlistIcon"
                              :selectedAttributes="selectedAttributes"
                              @scroll="handleScroll4"
                              @keydown="handleKeydown"
                              @select-row="selectRow"
                              @hide-stock="hideStock"
                              @toggle-watchlist="({ ticker, symbol }) => toggleWatchlist(ticker, symbol)"
                            />
                          </div>
                              </div>
                              <div id="sidebar-r" :class="{ 'hidden-mobile': selected !== 'charts' }">
                                <h1 style="margin-top: 2px;" class="title3">WEEKLY CHART</h1>
                                <div class="chart-container">
                                  <div class="loading-container1" v-if="isChartLoading1 || isLoading1">
                                    <Loader />
                                  </div>
                                  <div id="wk-chart" ref="wkchart" style="width: 100%; height: 250px;"
                                    :class="{ 'hidden': isChartLoading1 || isLoading1 }"></div>
                                </div>

                                <h1 class="title3">DAILY CHART</h1>
                                <div class="chart-container">
                                  <div class="loading-container2" v-if="isChartLoading2 || isLoading2">
                                    <Loader />
                                  </div>
                                  <div id="dl-chart" ref="dlchart" style="width: 100%; height: 250px;"
                                    :class="{ 'hidden': isChartLoading2 || isLoading2 }"></div>
                                </div>
                                <h1 class="title3">SUMMARY</h1>
                                <div style="padding-top: 5px; border:none" id="summary">
                                  <div style="color: whitesmoke; text-align: center; border: none; overflow: scroll">
                                    <div style="color: var(--text1)" v-for="(item, index) in screenerSummary"
                                      :key="index">
                                      <div style="padding: 5px;" v-if="item">
                                        <span style="font-weight: bold;">{{ item.attribute }}</span> :
                                        <span>
                                          {{ formatValue(item) }}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div style="height: 30px; border: none"></div>
                                </div>
                              </div>
                            </div>
                            <NotificationPopup ref="notification" />
  </body>
</template>

<script setup>
// @ is an alias to /src
import Header from '@/components/Header.vue'
import Assistant from '@/components/assistant.vue';
import Selector from '@/components/Screener/Selector.vue';
import Loader from '@/components/loader.vue'
import CreateScreener from '@/components/Screener/CreateScreener.vue';
import RenameScreener from '@/components/Screener/RenameScreener.vue';
import EditColumn from '@/components/Screener/EditColumn.vue';
import { computed, onMounted, ref, watch, nextTick, reactive, toRef } from 'vue';
import { createChart, ColorType } from 'lightweight-charts';
import { useStore } from 'vuex';
import NotificationPopup from '@/components/NotificationPopup.vue';
import MainList from '@/components/Screener/Tables/MainList.vue';
import FilterList from '@/components/Screener/Tables/FilterList.vue';
import HiddenList from '@/components/Screener/Tables/HiddenList.vue';
import CombinedList from '@/components/Screener/Tables/CombinedList.vue';

//filter components
import Price from '@/components/Screener/Parameters/Price.vue';
import MarketCap from '@/components/Screener/Parameters/MarketCap.vue';
import IPO from '@/components/Screener/Parameters/IPO.vue';
import AssetType from '@/components/Screener/Parameters/AssetType.vue';
import Sector from '@/components/Screener/Parameters/Sector.vue';
import Exchange from '@/components/Screener/Parameters/Exchange.vue';
import Country from '@/components/Screener/Parameters/Country.vue';
import PE from '@/components/Screener/Parameters/PE.vue';
import PS from '@/components/Screener/Parameters/PS.vue';
import PEG from '@/components/Screener/Parameters/PEG.vue';
import EPS from '@/components/Screener/Parameters/EPS.vue';
import PB from '@/components/Screener/Parameters/PB.vue';
import DivYield from '@/components/Screener/Parameters/DivYield.vue';
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

const apiKey = import.meta.env.VITE_EREUNA_KEY;
//user import - user session 
const store = useStore();
let user = store.getters.getUser;

// for popup notifications
const notification = ref(null);
const showNotification = (message) => {
  notification.value.show(message);
};
const isScreenerError = ref(false);
const showDropdown = ref(false);

function getWatchlistIcon(ticker, item) {
  return isAssetInWatchlist(ticker.Name, item)
    ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><g id="Interface / Checkbox_Check"><path id="Vector" d="M8 12L11 15L16 9M4 16.8002V7.2002C4 6.08009 4 5.51962 4.21799 5.0918C4.40973 4.71547 4.71547 4.40973 5.0918 4.21799C5.51962 4 6.08009 4 7.2002 4H16.8002C17.9203 4 18.4796 4 18.9074 4.21799C19.2837 4.40973 19.5905 4.71547 19.7822 5.0918C20 5.5192 20 6.07899 20 7.19691V16.8036C20 17.9215 20 18.4805 19.7822 18.9079C19.5905 19.2842 19.2837 19.5905 18.9074 19.7822C18.48 20 17.921 20 16.8031 20H7.19691C6.07899 20 5.5192 20 5.0918 19.7822C4.71547 19.5905 4.40973 19.2842 4.21799 18.9079C4 18.4801 4 17.9203 4 16.8002Z" stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></g></svg>'
    : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><g id="Interface / Checkbox_Unchecked"><path id="Vector" d="M4 7.2002V16.8002C4 17.9203 4 18.4801 4.21799 18.9079C4.40973 19.2842 4.71547 19.5905 5.0918 19.7822C5.5192 20 6.07899 20 7.19691 20H16.8031C17.921 20 18.48 20 18.9074 19.7822C19.2837 19.5905 19.5905 19.2842 19.7822 18.9079C20 18.4805 20 17.9215 20 16.8036V7.19691C20 6.07899 20 5.5192 19.7822 5.0918C19.5905 4.71547 19.2837 4.40973 18.9074 4.21799C18.4796 4 17.9203 4 16.8002 4H7.2002C6.08009 4 5.51962 4 5.0918 4.21799C4.71547 4.40973 4.40973 4.71547 4.21799 5.0918C4 5.51962 4 6.08009 4 7.2002Z" stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></g></svg>';
}

// for handling dropdown menu
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
};

// consts for infinite scrolling
const limit = ref(200)
const offset = ref(0)

//pair to handling infinite scrolling in main list 
const paginatedResults1 = computed(() => {
  return screenerResults.value.slice(0, offset.value + limit.value);
});

const handleScroll1 = (event) => {
  const { scrollTop, clientHeight, scrollHeight } = event.target;
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    // Check if we can load more results
    if (offset.value + limit.value < screenerResults.value.length) {
      offset.value += limit.value; // Increment the offset
    }
  }
};

//pair to handling infinite scrolling in filter list 
const paginatedResults2 = computed(() => {
  return filterResults.value.slice(0, offset.value + limit.value);
});

const handleScroll2 = (event) => {
  const { scrollTop, clientHeight, scrollHeight } = event.target;
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    // Check if we can load more results
    if (offset.value + limit.value < filterResults.value.length) {
      offset.value += limit.value; // Increment the offset
    }
  }
};

//pair to handling infinite scrolling in hidden list 
const paginatedResults3 = computed(() => {
  return HiddenResults.value.slice(0, offset.value + limit.value);
});

const handleScroll3 = (event) => {
  const { scrollTop, clientHeight, scrollHeight } = event.target;
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    // Check if we can load more results
    if (offset.value + limit.value < HiddenResults.value.length) {
      offset.value += limit.value; // Increment the offset
    }
  }
};

//pair to handling infinite scrolling in combined list 
const paginatedResults4 = computed(() => {
  return compoundedResults.value.slice(0, offset.value + limit.value);
});

const handleScroll4 = (event) => {
  const { scrollTop, clientHeight, scrollHeight } = event.target;
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    // Check if we can load more results
    if (offset.value + limit.value < compoundedResults.value.length) {
      offset.value += limit.value; // Increment the offset
    }
  }
};

// related to retrieving user default symbol and updating it 
let defaultSymbol = localStorage.getItem('defaultSymbol');

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

    if (!response.ok) throw new Error('Failed to update default symbol');
  } catch (error) {
    error.value = error.message;
  }
}

onMounted(async () => {
  await fetchPerformanceResults(defaultSymbol);
  selectedSymbol.value = defaultSymbol;
  selectedItem.value = defaultSymbol;
});

// these 4 are related to the loading animations of the two charts 
let isChartLoading1 = ref(false);
let isChartLoading2 = ref(false);
const isLoading1 = ref(true)
const isLoading2 = ref(true)

const showCreateScreener = ref(false) // shows menu for creating new watchlist 
const showRenameScreener = ref(false) // shows menu for renaming selected watchlist 
const showEditColumn = ref(false) // shows menu for editing columns in screener
const showSearch = ref(false) // shows searchbar 
const selectedScreener = ref('') // selectes current screener 
const selectedSymbol = ref(''); // similar to selectedItem 
const listMode = ref('main');
const ImagePaths = ref([]);

// Async function to fetch symbols and exchanges
async function fetchSymbolsAndExchanges() {
  try {
    const response = await fetch('/api/symbols-exchanges', {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Map the data to the required format for ImagePaths
    ImagePaths.value = data.map(item => {
      // Construct the image path using the URL constructor
      const imagePath = new URL(`/src/assets/images/${item.Exchange}/${item.Symbol}.svg`, import.meta.url).href;

      return {
        symbol: item.Symbol,
        exchange: item.Exchange,
        path: imagePath
      };
    });
  } catch (error) {
    error.value = error.message;
  }
}

function getImagePath(item) {
  // If item is an object, use its Symbol
  const symbol = typeof item === 'object' ? item.Symbol : item;

  const imageObject = ImagePaths.value.find(image => image.symbol === symbol);

  if (imageObject) {
    return imageObject.path;
  }

  return new URL('/src/assets/images/Blank.svg', import.meta.url).href; // Default to Blank.svg
}

// Call the function when component is mounted
onMounted(() => {
  fetchSymbolsAndExchanges();
});

//selected item a displays charts 
async function setCharts(symbol) {
  isChartLoading1.value = true;
  isChartLoading2.value = true;
  defaultSymbol = symbol;
  selectedSymbol.value = symbol;
  selectedItem.value = symbol;
  await fetchChartData();
  await updateUserDefaultSymbol(symbol);
  isChartLoading1.value = false;
  isChartLoading2.value = false;
}

//functionality for keydown 
const selectedItem = ref(null);
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

function selectRow(symbol) {
  if (!symbol) return;

  selectedItem.value = symbol;
  setCharts(symbol);
  updateSelectedIndex();
}

function updateSelectedIndex() {
  if (currentResults.value && currentResults.value.length > 0) {
    const index = currentResults.value.findIndex((asset) => asset.Symbol === selectedItem.value);
    selectedIndex.value = index !== -1 ? index : 0;
  }
}

function handleKeydown(event) {
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

// CHARTS SECTION
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

async function fetchChartData() {
  try {
    let symbol = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${symbol}/chartdata`, { headers: { 'X-API-KEY': apiKey } });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    // Daily
    data.value = result.daily.ohlc || [];
    data2.value = result.daily.volume || [];
    data3.value = result.daily.MA10 || null;
    data4.value = result.daily.MA20 || null;
    data5.value = result.daily.MA50 || null;
    data6.value = result.daily.MA200 || null;
    // Weekly
    data7.value = result.weekly.ohlc || [];
    data8.value = result.weekly.volume || [];
    data9.value = result.weekly.MA10 || null;
    data10.value = result.weekly.MA20 || null;
    data11.value = result.weekly.MA50 || null;
    data12.value = result.weekly.MA200 || null;
  } catch (error) {
    error.value = error.message;
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
const wkchart = ref(null);

// mounts daily chart (including volume)
onMounted(async () => {

  await fetchUserDefaultSymbol();

  nextTick();

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

  isLoading1.value = false

});

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

  watch(data7, (newData7) => {
    barSeries.setData(newData7);
  });

  watch(data8, (newData8) => {
    Histogram.setData(newData8);
  });

  watch(data9, (newData9) => {
    if (newData9 === null) {
      MaSeries1.setData([]); // Clear the series data when null
    } else {
      MaSeries1.setData(newData9);
    }
  });

  watch(data10, (newData10) => {
    if (newData10 === null) {
      MaSeries2.setData([]); // Clear the series data when null
    } else {
      MaSeries2.setData(newData10);
    }
  });

  watch(data11, (newData11) => {
    if (newData11 === null) {
      MaSeries3.setData([]); // Clear the series data when null
    } else {
      MaSeries3.setData(newData11);
    }
  });

  watch(data12, (newData12) => {
    if (newData12 === null) {
      MaSeries4.setData([]); // Clear the series data when null
    } else {
      MaSeries4.setData(newData12);
    }
  });

  watch(data8, (newData8) => {
    const relativeVolumeData = newData8.map((dataPoint, index) => {
      const averageVolume = calculateAverageVolume(newData8, index);
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

let autoplayRunning = false;
let autoplayIndex = 0;
let autoplayTimeoutId = null;
const screenerResults = ref([]); // stores all database results
const filterResults = ref([]); // stores database filtered results
const HiddenResults = ref([]); // stores hidden results list
const PerformanceResults = ref([]); // stores performance resutls for a stock
const compoundedResults = ref([]) // it will store all compounded screener results, minus duplicates and hidden
const hideList = ref([]); // stores hidden list of users
const ScreenersName = ref([]); // stores all user's screeners
const currentList = ref([]); // Initialize currentList as an empty array
const screenerSummary = ref([]); // stores all params for a screener, summary bottom right below charts 

//related to lists / toggle
watch(screenerResults, (newValue) => {
  currentList.value = newValue;
});

const resultListLength = computed(() => currentList.value.length);

// displays hidden results 
function showHiddenResults() {
  if (listMode.value === 'main') {
    listMode.value = 'hidden';
    currentList.value = HiddenResults.value;
  }
  else if (listMode.value === 'combined') {
    listMode.value = 'hidden';
    currentList.value = HiddenResults.value;
  }
  else if (listMode.value === 'filter') {
    listMode.value = 'hidden';
    currentList.value = HiddenResults.value;
  }
  else {
    listMode.value = 'main';
    currentList.value = screenerResults.value;
  }
  nextTick(() => {
  });
}

// displays compounded results 
function showCombinedResults() {
  if (listMode.value === 'main') {
    listMode.value = 'combined';
    currentList.value = compoundedResults.value;
  }
  else if (listMode.value === 'hidden') {
    listMode.value = 'combined';
    currentList.value = compoundedResults.value;
  }
  else if (listMode.value === 'filter') {
    listMode.value = 'combined';
    currentList.value = compoundedResults.value;
  }
  else {
    listMode.value = 'main';
    currentList.value = screenerResults.value;
  }
  nextTick(() => {
  });
}

// displays filter results 
async function showFilterResults() {
  listMode.value = 'filter';
  currentList.value = filterResults.value;
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

// gets full screener results list (unfiltered)
async function GetScreenerResultsAll() {
  try {
    const response = await fetch(`/api/${user}/screener/results/all`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    screenerResults.value = data;
  } catch (error) {
    error.value = error.message;
  }
}
GetScreenerResultsAll();

// shows hidden results, it switch values between screeners, i think, there's a similar function below
async function GetHiddenResults() {
  try {
    const response = await fetch(`/api/${user}/screener/results/hidden`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    HiddenResults.value = data;
  } catch (error) {
    error.value = error.message;
  }
}
GetHiddenResults();

// gets all screener values for user 
async function GetScreeners() {
  try {
    const response = await fetch(`/api/screener/${user}/names`, {
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
    error.value = error.message;
  }
}
GetScreeners();

// hides a stock in screener and puts in in hidden list 
async function hideStock(asset) {
  try {
    const symbol = asset.Symbol;
    const url = `/api/screener/${user}/hidden/${symbol}`;

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
      console.log('Stock hidden successfully');
    } else {
      throw new Error('Error hiding stock');
    }
  } catch (error) {
    error.value = error.message;
  } finally {
    await GetHiddenResults();
    await GetCompoundedResults();
    await fetchScreenerResults(selectedScreener);

    if (listMode.value === 'filter') {
      await fetchScreenerResults(selectedScreener.value);
      await showFilterResults();
    } else if (listMode.value === 'combined') {
      await show1CombinedResults();
      showCombinedResults()
    } else {
      await GetScreenerResultsAll();
      await showMainResults();
    }
  }
}

// shows elements of hide list in screener
async function getHideList() {
  try {
    const response = await fetch(`/api/screener/results/${user}/hidden`, {
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
    error.value = error.message;
  }
  await GetScreenerResultsAll();
  await GetHiddenResults();
}
getHideList();

// autoplays results 
function AutoPlay() {
  const button = document.getElementById('watchlistAutoplay');
  if (button.classList.contains('snavbtnslct')) {
    button.classList.remove('snavbtnslct');
    autoplayRunning = false;
    clearTimeout(autoplayTimeoutId);
  } else {
    button.classList.add('snavbtnslct');
    autoplayRunning = true;
    autoplayIndex = 0;
    logElement();
  }
}

function logElement() {
  if (!autoplayRunning) return;
  const rows = currentResults.value; // Use your reactive array
  if (autoplayIndex >= rows.length) {
    autoplayIndex = 0;
  }
  // Select the row by updating selectedItem or calling selectRow
  selectedItem.value = rows[autoplayIndex].Symbol;
  selectRow(rows[autoplayIndex].Symbol); // If you have a method for row selection
  console.log(rows[autoplayIndex].Symbol);
  autoplayIndex++;
  autoplayTimeoutId = setTimeout(logElement, 7000);
}

// unhides stocks from hidden list
async function ShowStock(asset) {
  try {
    const symbol = asset.Symbol;
    const url = `/api/screener/${user}/show/${symbol}`;

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
    error.value = error.message;
  } finally {
    await GetScreenerResultsAll();
    await fetchScreenerResults();
    await GetCompoundedResults();
    await GetHiddenResults();
    await show1HiddenResults(); // important that it stays last!!! updates the counter dynamically
  }
}

// deletes screeners 
async function DeleteScreener(screenerName) {
  const apiUrl = `/api/${user}/delete/screener/${screenerName}`;
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
    error.value = error.message;
  }

  await GetScreeners();
  await GetCompoundedResults();
}

// get filtered screener results by screener name
async function fetchScreenerResults(screenerName) {
  try {
    const response = await fetch(`/api/screener/${user}/results/filtered/${screenerName}`, {
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
    filterResults.value = data;
    currentList.value = [...data]; // Update currentList with the new data
    await SummaryScreener();
  } catch (error) {
    error.value = error.message;
  }
}

async function fetchPerformanceResults(symbol) {
  try {
    const response = await fetch(`/api/screener/performance/${symbol}`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    const performanceData = await response.json();
    PerformanceResults.value.push(performanceData);
  } catch (error) {
    error.value = error.message;
  }
}

// function that updates screener parameters graphically 
async function CurrentScreener() {
  const Name = selectedScreener.value;

  try {
    const response = await fetch(`/api/screener/datavalues/${user}/${Name}`, {
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
    let currentRatio = screenerSettings.currentRatio
    let assetsCurrent = screenerSettings.assetsCurrent
    let liabilitiesCurrent = screenerSettings.liabilitiesCurrent
    let debtCurrent = screenerSettings.debtCurrent
    let cashAndEq = screenerSettings.cashAndEq
    let freeCashFlow = screenerSettings.freeCashFlow
    let profitMargin = screenerSettings.profitMargin
    let grossMargin = screenerResults.grossMargin
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
    showPEInputs.value = screenerSettings?.PE?.length > 0;
    showPEForwInputs.value = screenerSettings?.ForwardPE?.length > 0;
    showPEGInputs.value = screenerSettings?.PEG?.length > 0;
    showEPSInputs.value = screenerSettings?.EPS?.length > 0;
    showPSInputs.value = screenerSettings?.PS?.length > 0;
    showPBInputs.value = screenerSettings?.PB?.length > 0;
    showBetaInputs.value = screenerSettings?.Beta?.length > 0;
    showDivYieldInputs.value = screenerSettings?.DivYield?.length > 0;
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

    document.getElementById('left-p').value = priceList[0];
    document.getElementById('right-p').value = priceList[1];
    document.getElementById('left-mc').value = marketCapList[0];
    document.getElementById('right-mc').value = marketCapList[1];
    document.getElementById('left-ipo').value = IPO[0];
    document.getElementById('right-ipo').value = IPO[1];
    document.getElementById('left-pe').value = PEList[0];
    document.getElementById('right-pe').value = PEList[1];
    document.getElementById('left-pef').value = FPEList[0];
    document.getElementById('right-pef').value = FPEList[1];
    document.getElementById('left-peg').value = PEGList[0];
    document.getElementById('right-peg').value = PEGList[1];
    document.getElementById('left-eps').value = EPSList[0];
    document.getElementById('right-eps').value = EPSList[1];
    document.getElementById('left-ps').value = PSList[0];
    document.getElementById('right-ps').value = PSList[1];
    document.getElementById('left-pb').value = PBList[0];
    document.getElementById('right-pb').value = PBList[1];
    document.getElementById('left-beta').value = BetaList[0];
    document.getElementById('right-beta').value = BetaList[1];
    document.getElementById('left-divyield').value = DivYieldList[0];
    document.getElementById('right-divyield').value = DivYieldList[1];
    document.getElementById('left-RevYoY').value = RevYoY[0];
    document.getElementById('right-RevYoY').value = RevYoY[1];
    document.getElementById('left-RevQoQ').value = RevQoQ[0];
    document.getElementById('right-RevQoQ').value = RevQoQ[1];
    document.getElementById('left-EarningsYoY').value = EarningsYoY[0];
    document.getElementById('right-EarningsYoY').value = EarningsYoY[1];
    document.getElementById('left-EarningsQoQ').value = EarningsQoQ[0];
    document.getElementById('right-EarningsQoQ').value = EarningsQoQ[1];
    document.getElementById('left-EPSYoY').value = EPSYoYList[0];
    document.getElementById('right-EPSYoY').value = EPSYoYList[1];
    document.getElementById('left-EPSQoQ').value = EPSQoQList[0];
    document.getElementById('right-EPSQoQ').value = EPSQoQList[1];
    document.getElementById('RSscore1Winput1').value = RSscore1W[0];
    document.getElementById('RSscore1Winput2').value = RSscore1W[1];
    document.getElementById('RSscore1Minput1').value = RSScore1M[0];
    document.getElementById('RSscore1Minput2').value = RSScore1M[1];
    document.getElementById('RSscore4Minput1').value = RSScore4M[0];
    document.getElementById('RSscore4Minput2').value = RSScore4M[1];
    document.getElementById('ADV1Winput1').value = ADV1W[0];
    document.getElementById('ADV1Winput2').value = ADV1W[1];
    document.getElementById('ADV1Minput1').value = ADV1M[0];
    document.getElementById('ADV1Minput2').value = ADV1M[1];
    document.getElementById('ADV4Minput1').value = ADV4M[0];
    document.getElementById('ADV4Minput2').value = ADV4M[1];
    document.getElementById('ADV1Yinput1').value = ADV1Y[0];
    document.getElementById('ADV1Yinput2').value = ADV1Y[1];
    document.getElementById('left-roe').value = ROE[0];
    document.getElementById('right-roe').value = ROE[1];
    document.getElementById('left-roa').value = ROA[0];
    document.getElementById('right-roa').value = ROA[1];
    document.getElementById('left-current-ratio').value = currentRatio[0];
    document.getElementById('right-current-ratio').value = currentRatio[1];
    document.getElementById('left-ca').value = assetsCurrent[0];
    document.getElementById('right-ca').value = assetsCurrent[1];
    document.getElementById('left-cl').value = liabilitiesCurrent[0];
    document.getElementById('right-cl').value = liabilitiesCurrent[1];
    document.getElementById('left-cd').value = debtCurrent[0];
    document.getElementById('right-cd').value = debtCurrent[1];
    document.getElementById('left-ce').value = cashAndEq[0];
    document.getElementById('right-ce').value = cashAndEq[1];
    document.getElementById('left-fcf').value = freeCashFlow[0];
    document.getElementById('right-fcf').value = freeCashFlow[1];
    document.getElementById('left-pm').value = profitMargin[0];
    document.getElementById('right-pm').value = profitMargin[1];
    document.getElementById('left-gm').value = grossMargin[0];
    document.getElementById('right-gm').value = grossMargin[1];
    document.getElementById('left-der').value = debtEquity[0];
    document.getElementById('right-der').value = debtEquity[1];
    document.getElementById('left-bv').value = bookVal[0];
    document.getElementById('right-bv').value = bookVal[1];
    document.getElementById('left-ev').value = EV[0];
    document.getElementById('right-ev').value = EV[1];
    document.getElementById('left-rsi').value = RSI[0];
    document.getElementById('right-rsi').value = RSI[1];
    document.getElementById('left-gap').value = Gap[0];
    document.getElementById('right-gap').value = Gap[1];

    const sectorCheckboxes = document.querySelectorAll('.check input[type="checkbox"]');

    // Uncheck all checkboxes before re-checking them
    sectorCheckboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });

    sectorCheckboxes.forEach((checkbox) => {
      const value = checkbox.value;
      if (sectorsList.includes(value) || exchangesList.includes(value) || AssetTypesList.includes(value) || countriesList.includes(value)) {
        checkbox.checked = true;
      }

    });
  } catch (error) {
    error.value = error.message;
  }
}

// function that resets screener values (all of them)
async function ResetScreener() {
  const Name = selectedScreener.value;

  try {
    const response = await fetch(`/api/screener/reset/${user}/${Name}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        user,
        Name
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonData = await response.json();
    await fetchScreenerResults(selectedScreener.value);
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

const valueMap = {
  'Marketcap': 'marketCap',
  'Sector': 'Sector',
  'Exchange': 'Exchange',
  'Country': 'Country',
  'PE': 'PE',
  'ForwardPE': 'ForwardPE',
  'PEG': 'PEG',
  'EPS': 'EPS',
  'PS': 'PS',
  'PB': 'PB',
  'Beta': 'Beta',
  'DivYield': 'DivYield',
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
};

// function that resets indivudal values for screeners 
async function Reset(value) {
  const stringValue = valueMap[value];
  try {
    const Name = selectedScreener.value;

    const requestBody = {
      stringValue,
      user,
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
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

// function that updates screener summary graphically 
async function SummaryScreener() {
  const Name = selectedScreener.value;

  try {
    const response = await fetch(`/api/screener/summary/${user}/${Name}`, {
      headers: {
        'X-API-KEY': apiKey,
      }
    });
    const screenerSettings = await response.json();

    const attributes = [
      'Price', 'MarketCap', 'Sectors', 'Exchanges', 'Countries', 'PE', 'PS', 'ForwardPE', 'PEG', 'EPS', 'PB', 'DivYield',
      'EPSQoQ', 'EPSYoY', 'EarningsQoQ', 'EarningsYoY', 'RevQoQ', 'RevYoY', 'AvgVolume1W', 'AvgVolume1M', 'AvgVolume6M', 'AvgVolume1Y',
      'RelVolume1W', 'RelVolume1M', 'RelVolume6M', 'RelVolume1Y', 'RSScore1W', 'RSScore1M', 'RSScore4M', 'MA10', 'MA20', 'MA50', 'MA200', 'CurrentPrice', 'NewHigh',
      'NewLow', 'PercOffWeekHigh', 'PercOffWeekLow', 'changePerc', 'IPO', 'ADV1W', 'ADV1M', 'ADV4M', 'ADV1Y', 'ROE', 'ROA', 'currentRatio',
      'assetsCurrent', 'liabilitiesCurrent', 'debtCurrent', 'cashAndEq', 'freeCashFlow', 'profitMargin', 'grossMargin', 'debtEquity', 'bookVal', 'EV',
      'RSI', 'Gap', 'AssetTypes', 'IV'
    ];

    const attributeMapping = {
      'MarketCap': 'Market Cap',
      'PE': 'PE Ratio',
      'PB': 'PB Ratio',
      'PS': 'PS Ratio',
      'DivYield': 'Dividend Yield (%)',
      'EPSQoQ': 'EPS Growth QoQ (%)',
      'EPSYoY': 'EPS Growth YoY (%)',
      'EarningsQoQ': 'Earnings Growth QoQ (%)',
      'EarningsYoY': 'Earnings Growth YoY (%)',
      'RevQoQ': 'Revenue Growth QoQ (%)',
      'RevYoY': 'Revenue Growth YoY (%)',
      'AvgVolume1W': 'Average Volume (1W)',
      'AvgVolume1M': 'Average Volume (1M)',
      'AvgVolume6M': 'Average Volume (6M)',
      'AvgVolume1Y': 'Average Volume (1Y)',
      'RelVolume1W': 'Relative Volume (1W)',
      'RelVolume1M': 'Relative Volume (1M)',
      'RelVolume6M': 'Relative Volume (6M)',
      'RelVolume1Y': 'Relative Volume (1Y)',
      'RSScore1W': 'RS Score (1W)',
      'RSScore1M': 'RS Score (1M)',
      'RSScore4M': 'RS Score (4M)',
      'NewHigh': 'New High',
      'NewLow': 'New Low',
      'PercOffWeekHigh': '% Off 52WeekHigh',
      'PercOffWeekLow': '% Off 52WeekLow',
      'changePerc': 'Change (%)',
      'IPO': 'IPO',
      'ADV1W': 'ADV (1W)',
      'ADV1M': 'ADV (1M)',
      'ADV4M': 'ADV (4M)',
      'ADV1Y': 'ADV (1Y)',
      'ROE': 'ROE',
      'ROA': 'ROA',
      'currentRatio': 'Current Ratio',
      'assetsCurrent': 'Current Assets',
      'liabilitiesCurrent': 'Current Liabilities',
      'debtCurrent': 'Current Debt',
      'cashAndEq': 'Cash and Equivalents',
      'freeCashFlow': 'Free Cash Flow',
      'profitMargin': 'Profit Margin',
      'grossMargin': 'Gross Margin',
      'debtEquity': 'Debt/Equity',
      'bookVal': 'Book Value',
      'EV': 'Enterprise Value',
      'RSI': 'RSI',
      'Gap': 'Gap %',
      'AssetTypes': 'Asset Types',
      'IV': 'IV'
    };

    const valueMapping = {
      'abv200': 'Above 200MA',
      'abv50': 'Above 50MA',
      'abv20': 'Above 20MA',
      'abv10': 'Above 10MA',
      'blw200': 'Below 200MA',
      'blw50': 'Below 50MA',
      'blw20': 'Below 20MA',
      'blw10': 'Below 20MA',
    };

    const newScreenerSummary = [];
    attributes.forEach((attribute) => {
      if (screenerSettings[attribute]) {
        const attributeName = attributeMapping[attribute] || attribute;
        const attributeValue = screenerSettings[attribute];
        const mappedValue = valueMapping[attributeValue] || attributeValue;
        newScreenerSummary.push({
          attribute: attributeName,
          value: mappedValue
        });
      }
    });
    screenerSummary.value = newScreenerSummary; // Replace the entire array
  } catch (error) {
    error.value = error.message;
  }
}

// fetches data for cumulative screener results 
async function GetCompoundedResults() {
  try {
    const response = await fetch(`/api/screener/${user}/all`, {
      headers: {
        'X-API-KEY': apiKey,
      }
    });
    const data = await response.json();
    compoundedResults.value = data;
  } catch (error) {
    error.value = error.message;
  }
}
GetCompoundedResults();

const emit = defineEmits(['update:modelValue']);

function selectScreener(screener) {
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
async function getWatchlists() {
  try {
    const response = await fetch(`/api/${user}/watchlists`, {
      headers: {
        'X-API-KEY': apiKey,
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    watchlist.tickers = data;
  } catch (error) {
    error.value = error.message;
  }
}

onMounted(() => {
  getWatchlists();
});

async function addtoWatchlist(ticker, symbol, $event) {
  const isChecked = $event.target.checked;
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

    if (response.status === 400) {
      const errorResponse = await response.json();
      showNotification(errorResponse.message || 'An error occurred while updating the watchlist.');
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
  const response = await fetch(`/api/${user}/full-watchlists`, {
    headers: {
      'X-API-KEY': apiKey,
    }
  })
  FullWatchlists.value = await response.json()
};
getFullWatchlists(user);


const isAssetInWatchlist = (ticker, symbol) => {
  const watchlist = FullWatchlists.value.find(w => w.Name === ticker);
  if (watchlist) {
    return watchlist.List.includes(symbol);
  }

  return false;
};

async function ExcludeScreener(screener) {
  const apiUrl = `/api/${user}/toggle/screener/${screener}`;
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
  } catch (error) {
    error.value = error.message;
  }

  await GetScreeners(); // Refresh the list of screeners
  await GetCompoundedResults(); // Refresh the compounded results
  currentList.value = compoundedResults.value;
}

const screenerName = ref('');

const showTooltip = ref(false)
let tooltipText = ref('');
let tooltipLeft = ref();
let tooltipTop = ref();

function handleMouseOver(event, id) {
  showTooltip.value = true
  const element = event.target
  const svgRect = element.parentNode.getBoundingClientRect()
  tooltipTop.value = svgRect.top + window.scrollY + svgRect.height - 100;
  tooltipLeft.value = svgRect.left + window.scrollX + svgRect.width + 10;
  tooltipText.value = getTooltipText(id)
}

function getTooltipText(id) {
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
      return 'Category of the asset, in this case we support Stocks and ETFs.';
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

function formatDate(date) {
  let d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

const percentageAttributes = [
  'ADV (1W)',
  'ADV (1M)',
  'ADV (4M)',
  'ADV (1Y)',
  'Gap %',
  '% Off 52WeekHigh',
  '% Off 52WeekLow'
];

const growthAttributes = [
  'Dividend Yield (%)',
  'EPS Growth QoQ (%)',
  'EPS Growth YoY (%)',
  'Earnings Growth QoQ (%)',
  'Earnings Growth YoY (%)',
  'Revenue Growth QoQ (%)',
  'Revenue Growth YoY (%)'
];

function formatValue(item) {
  if (!item.value && item.value !== 0) return '';

  const attribute = item.attribute;
  let value = item.value;

  if (attribute === 'IPO') {
    if (Array.isArray(value)) {
      return value.map(d => formatDate(d)).filter(d => d !== '').join(' - ');
    } else {
      return formatDate(value);
    }
  }

  if (attribute === 'Change (%)') {
    if (Array.isArray(value) && value.length === 3) {
      // Process first two elements with growthAttributes logic (multiply by 100 + format)
      const processed = value.slice(0, 2).map(v => {
        let num = parseFloat(v);
        return isNaN(num) ? v : (num * 100).toFixed(2) + '%';
      });
      // Append third element as is (string, untouched)
      processed.push(String(value[2]));
      return processed.join(' - ');
    } else {
      // Fallback to string representation if not array or length != 3
      return Array.isArray(value) ? value.join(' - ') : String(value);
    }
  }

  if (percentageAttributes.includes(attribute)) {
    if (Array.isArray(value)) {
      return value.map(v => {
        let num = parseFloat(v);
        return isNaN(num) ? v : num.toFixed(2) + '%';
      }).join(' - ');
    } else {
      let num = parseFloat(value);
      return isNaN(num) ? value : num.toFixed(2) + '%';
    }
  }

  if (growthAttributes.includes(attribute)) {
    if (Array.isArray(value)) {
      return value.map(v => {
        let num = parseFloat(v);
        return isNaN(num) ? v : (num * 100).toFixed(2) + '%';
      }).join(' - ');
    } else {
      let num = parseFloat(value);
      return isNaN(num) ? value : (num * 100).toFixed(2) + '%';
    }
  }

  if (Array.isArray(value)) {
    let cleaned = value.map(v => String(v).replace(/'/g, '').replace(/,/g, '-'));
    return cleaned.join(' - ');
  } else if (typeof value === 'string') {
    return value.replace(/'/g, '').replace(/,/g, '-');
  } else {
    return String(value);
  }
}

const selected = ref('filters')
function select(option) {
  selected.value = option
}

const themes = ['default', 'ihatemyeyes', 'colorblind', 'catpuccin'];
const currentTheme = ref('default');

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

let Tier = ref(); // user tier

// function to retrieve tier for each user
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

fetchTier()

function arrayToCSV(data) {
  if (!data.length) return '';
  const keys = Object.keys(data[0]);
  const csvRows = [
    keys.join(','), // header row
    ...data.map(row => keys.map(k => `"${(row[k] ?? '').toString().replace(/"/g, '""')}"`).join(','))
  ];
  return csvRows.join('\n');
}

function DownloadResults() {
  let data = [];
  let filename = 'results.csv';

  switch (listMode.value) {
    case 'main':
      data = screenerResults.value;
      filename = 'main_results.csv';
      break;
    case 'filter':
      data = filterResults.value;
      filename = 'filter_results.csv';
      break;
    case 'hidden':
      data = HiddenResults.value;
      filename = 'hidden_results.csv';
      break;
    case 'combined':
      data = compoundedResults.value;
      filename = 'combined_results.csv';
      break;
      return;
  }

  const csv = arrayToCSV(data);

  // Create a blob and trigger download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function handleCreateScreenerClose() {
  await GetScreeners();
  await GetCompoundedResults();
  showCreateScreener.value = false;
}

async function handleRenameScreenerClose() {
  selectedScreener.value = screenerName.value;
      await GetScreeners();
      await GetCompoundedResults();
      showRenameScreener.value = false;
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
    resetError.value = 'Error resetting screener: ' + (error.message || error);
  }
}

const selectedAttributes = ref([]);

async function loadColumns() {
  try {
    const response = await fetch(`/api/get/columns?user=${encodeURIComponent(user)}`,
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
      'price','market_cap','volume','ipo','assettype','sector','exchange','country','pe_ratio','ps_ratio','fcf','cash','current_debt','current_assets','current_liabilities','current_ratio','roe','roa','peg','eps','pb_ratio','dividend_yield','name','currency','industry','book_value','shares','rs_score1w','rs_score1m','rs_score4m','all_time_high','all_time_low','high_52w','low_52w','perc_change','isin','gap','ev','adv1w','adv1m','adv4m','adv1y','rsi','intrinsic_value'
    ];
    selectedAttributes.value = (Array.isArray(data.columns) ? data.columns : []).filter(v => validValues.includes(v));
  } catch (err) {
    selectedAttributes.value = [];
    notification.value.show('Failed to load columns');
  }
}

function handleUpdateColumns(newColumns) {
  selectedAttributes.value = [...newColumns];
  loadColumns();
  GetScreenerResultsAll();
  GetCompoundedResults();
  GetHiddenResults();
}

onMounted(() => {
  loadColumns();
});


async function handleFetchScreeners(val) {
  await fetchScreenerResults(val);
}
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

#sidebar-r {
  position: absolute;
  top: 0;
  right: 0;
  width: 30%;
  background-color: var(--base4);
  z-index: 1000;
}

#filters {
  background-color: var(--base4);
  display: flexbox;
  color: var(--text1);
  height: 100%;
  text-align: center;
}

.param-s {
  margin: 3px;
  padding: 5px;
  color: var(--text2);
  background-color: var(--base2);
  border: none;
  height: 80px;
  position: relative;
}

.param-s1 {
  margin: 3px;
  padding: 5px;
  color: var(--text2);
  background-color: var(--base2);
  border: none;
  height: 20px;
  position: relative;
}

/* 

.param-s1-expanded {
  margin: 3px;
  padding: 5px;
  color: var(--text2);
  background-color: var(--base2);
  border: none;
  height: 120px;
  position: relative;
}
*/


.param-s2 {
  margin: 3px;
  padding: 5px;
  color: var(--text2);
  background-color: var(--base2);
  border: none;
  height: 20px;
  position: relative;
}

.param-s2-expanded {
  margin: 3px;
  padding: 5px;
  color: var(--text2);
  background-color: var(--base2);
  border: none;
  height: 170px;
  position: relative;
}

.param-s3 {
  margin: 3px;
  padding: 5px;
  color: var(--text2);
  background-color: var(--base2);
  border: none;
  height: 20px;
  position: relative;
}

.param-s3-expanded {
  margin: 3px;
  padding: 5px;
  color: var(--text2);
  background-color: var(--base2);
  border: none;
  height: 120px;
  position: relative;
}

.param-s5-expanded {
  margin: 3px;
  padding: 5px;
  color: var(--text2);
  background-color: var(--base2);
  border: none;
  height: 500px;
  position: relative;
}

.param-s6-expanded {
  margin: 3px;
  padding: 5px;
  color: var(--text2);
  background-color: var(--base2);
  border: none;
  height: 450px;
  position: relative;
}

.param-s7-expanded {
  margin: 3px;
  padding: 5px;
  color: var(--text2);
  background-color: var(--base2);
  border: none;
  height: 200px;
  position: relative;
}

.param-s8-expanded {
  margin: 3px;
  padding: 5px;
  color: var(--text2);
  background-color: var(--base2);
  border: none;
  height: 400px;
  position: relative;
}

.param-s9 {
  margin: 3px;
  padding: 5px;
  color: var(--text2);
  background-color: var(--base2);
  border: none;
  height: 20px;
  position: relative;
}

.param-s9-expanded {
  margin: 3px;
  padding: 5px;
  color: var(--text2);
  background-color: var(--base2);
  border: none;
  height: 450px;
  position: relative;
}

.param-s10-expanded {
  margin: 3px;
  padding: 5px;
  color: var(--text2);
  background-color: var(--base2);
  border: none;
  height: 500px;
  position: relative;
}

.DataInputs2 {
  position: absolute;
  left: 25%;
  top: 10%;
  border: none;
}

.DataInputs4 {
  position: absolute;
  left: 5%;
  top: 15%;
  border: none;
}

.DataInputs4 input {
  width: 50px;
  margin-right: 5px;
}

.DataInputs4 p {
  font-weight: bold;
}

.DataInputs10 {
  position: absolute;
  left: 0%;
  top: 10%;
  border: none;
}

.DataInputs10 input {
  margin-right: 5px;
}

.DataInputs10 p {
  font-weight: bold;
}

.DataInputs11 {
  position: absolute;
  left: 10%;
  top: 10%;
  border: none;
}

.DataInputs11 p {
  font-weight: bold;
}

.DataInputs input {
  width: 50px;
  margin-right: 10px;
}

.DataInputs p {
  font-weight: bold;
}

.param-s2 input {
  border: none;
  text-align: center;
  align-items: center;
  justify-content: center;
}

.param-s3 input {
  border: none;
  text-align: center;
  align-items: center;
  justify-content: center;
}

.param-s .row {
  clear: both;
  justify-content: space-between;
  padding: none;
  margin: none;
}

.param-s button {
  background-color: var(--base2);
  border: none;
  color: var(--text1);
  padding: 5px;
  position: absolute;
  top: 70%;
  left: 87%;
}

.param-s button:hover {
  background-color: var(--accent1);
}

.param-s1 .row {
  clear: both;
  justify-content: space-between;
  padding: none;
  margin: none;
}

.btns {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  bottom: 0%;
  left: 89%;
}

.btnsr {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  bottom: 0%;
  left: 80%;
}

.btns2 {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  bottom: 0%;
  left: 89%;
}

.btns2r {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  bottom: 0%;
  left: 80%;
}

.btns3 {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  bottom: 0%;
  left: 89%;
}

.btns3r {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  bottom: 0%;
  left: 80%;
}

.btns5 {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  bottom: 0%;
  left: 89%;
}

.btns5r {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  bottom: 0%;
  left: 80%;
}

.btns6 {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  bottom: 0%;
  left: 89%;
}

.btns6r {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  bottom: 0%;
  left: 80%;
}

.btns7 {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  bottom: 0%;
  left: 89%;
}

.btns7r {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  bottom: 0%;
  left: 80%;
}

.btns8 {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  bottom: 0%;
  left: 89%;
}

.btns8r {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  bottom: 0%;
  left: 80%;
}

.param-s2 button {
  background-color: var(--base2);
  border: none;
  color: var(--text1);
  padding: 5px;
  position: absolute;
  top: 80%;
  left: 87%;
}

.param-s2 button:hover {
  background-color: var(--accent1);
}

.param-s3 button {
  background-color: var(--base2);
  border: none;
  color: var(--text1);
  padding: 5px;
  position: absolute;
  top: 65%;
  left: 87%;
}

.param-s3 button:hover {
  background-color: var(--accent1);
}

.left {
  border: none;
  outline: none;
  display: inline-flex;
  width: 100px;
  height: 15px;
  margin: 5px;
  position: absolute;
  top: 35%;
  left: 2%;
}

.right {
  border: none;
  outline: none;
  display: inline-flex;
  width: 100px;
  height: 15px;
  margin: 5px;
  position: absolute;
  top: 60%;
  left: 2%;
}

.param-s p {
  font-weight: bold;
  margin: none;
  padding: none;
  position: absolute;
  top: 0%;
  left: 2%;
}

.param-s2 p {
  font-weight: bold;
  margin: none;
  padding: none;
  position: absolute;
  top: 0%;
  left: 2%;
}

.param-s3 p {
  font-weight: bold;
  margin: none;
  padding: none;
  position: absolute;
  top: 0%;
  left: 2%;
}

.row {
  border: none;
  margin: none;
  padding: none;
}

.row2 {
  border: none;
  margin: none;
  padding: none;
  position: absolute;
  left: 2%;
  top: 40px;
  float: left;
}

.row3 {
  border: none;
  margin: none;
  padding: none;
  position: absolute;
  top: 35%;
  left: 2%;
  float: left;
}

.check {
  float: left;
}

h1 {
  background-color: var(--base2);
  color: var(--text2);
  text-align: center;
  padding: 3.5px;
  margin: 0;
}

label,
input,
p {
  border: none;
}

.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
  margin: none;
  padding: none;
}

/* Hide default HTML checkbox */
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
  margin: none;
  padding: none;
}

/* The slider */
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--base3);
  -webkit-transition: .3s;
  transition: .3s;
  margin: none;
  padding: none;
}

.slider:before {
  position: absolute;
  content: "";
  height: 13px;
  width: 13px;
  left: 2px;
  bottom: 3.5px;
  background-color: var(--text3);
  -webkit-transition: .3s;
  transition: .3s;
  margin: none;
  padding: none;
}

input:checked+.slider {
  background-color: var(--accent1);
}

input:focus+.slider {
  box-shadow: 0 0 1px var(--accent1);
}

input:checked+.slider:before {
  -webkit-transform: translateX(13px);
  -ms-transform: translateX(13px);
  transform: translateX(22px);
}

/* Rounded sliders */
.slider.round {
  border-radius: 17px;
}

.slider.round:before {
  border-radius: 50%;
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

#wk-chart,
#dl-chart {
  background-repeat: no-repeat;
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
  /* Dark text color */
  transition: border-color 0.3s, box-shadow 0.3s;
  /* Smooth transition for focus effects */
  border: solid 1px var(--base4);
  background-color: var(--base4);
}

.RenameScreener input:focus,
.CreateScreener input:focus {
  border-color: var(--accent1);
  /* Change border color on focus */
  box-shadow: 0 0 5px rgba(var(--accent3), 0.5);
  /* Subtle shadow effect */
  outline: none;
  /* Remove default outline */
}

.CreateScreener input.input-error,
.RenameScreener input.input-error {
  border: solid 1px red !important;
  /* Use !important to ensure it takes precedence */
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

#summary {
  background-color: var(--base1);
  border: none;
  min-height: 250px;
}

.no-border {
  border: none;
  border-style: none;
}

.loading-container1 {
  position: absolute;
  top: 0%;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  border: none;
}

.loading-container2 {
  position: absolute;
  top: -32%;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  border: none;
}

.searchDiv {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: var(--base2);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  z-index: 1000;
}

.searchDiv input {
  outline: none;
  height: 20px;
  border-radius: 5px;
  padding-left: 5px;
}

.searchDiv button {
  height: 21px;
  background-color: var(--accent1);
  outline: none;
  border: none;
  border-radius: 5px;
  position: absolute;
  right: 0.3px;
}

.searchDiv button:hover {
  height: 21px;
  background-color: var(--accent2);
  outline: none;
  border: none;
  cursor: pointer;
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
  /* Change text color when checked */
  opacity: 1;
}

.checkmark {
  width: 8px;
  /* Smaller width */
  height: 8px;
  /* Smaller height */
  background-color: var(--text1);
  border-radius: 50%;
  /* Make it circular */
  margin-right: 5px;
  display: inline-block;
  transition: background-color 0.3s, border-color 0.3s;
  /* Add transition for border color */
}

.custom-checkbox.checked .checkmark {
  background-color: var(--accent1);
  /* Change to your desired color */
  border-color: var(--accent1);
  /* Change to your desired border color */
}

.custom-checkbox.checked {
  color: var(--text1);
  /* Change text color when checked */
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
  /* Dark text color */
  transition: border-color 0.3s, box-shadow 0.3s;
  /* Smooth transition for focus effects */
  border: solid 1px var(--base4);
  background-color: var(--base4);
}

.input:focus {
  border-color: var(--accent1);
  /* Change border color on focus */
  outline: none;
  /* Remove default outline */
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
  color: var(--text1);
}
.reset-modal .trade-btn:hover {
  background: var(--accent2);
  color: #fff;
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
  z-index: 1000;
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

.chart-container {
  position: relative;
  width: 100%;
  height: 250px;
}

.loading-container1,
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
    background-color: var(--accent1);
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
    /* Dark text color */
    transition: border-color 0.3s, box-shadow 0.3s;
    /* Smooth transition for focus effects */
    border: solid 1px var(--base4);
    background-color: var(--base4);
    text-align: left;
  }

}
</style>