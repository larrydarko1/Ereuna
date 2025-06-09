<template>
   <div class="RES" >
          <div class="Header">
            <div style="min-width: 100px;"> <h1 style="background-color: var(--base1)" :key="resultListLength">RESULTS: {{ resultListLength }}</h1></div>
            <div style="min-width: 0px;"></div>
            <div style="min-width: 70px;">Ticker</div>
            <div style="min-width: 300px;">Name</div>
            <div style="min-width: 100px;">Price</div>
            <div style="min-width: 70px;">Chg%</div>
            <div style="min-width: 120px;">Technical Score (1W)</div>
            <div style="min-width: 120px;">Technical Score (1M)</div>
            <div style="min-width: 120px;">Technical Score (4M)</div>
            <div style="min-width: 100px;">ADV (1W)</div>
            <div style="min-width: 100px;">ADV (1M)</div>
            <div style="min-width: 100px;">ADV (4M)</div>
            <div style="min-width: 100px;">ADV (1Y)</div>
            <div style="min-width: 120px;">Exchange</div>
            <div style="min-width: 120px;">Sector</div>
            <div style="min-width: 200px;">Industry</div>
            <div style="min-width: 120px;">Location</div>
            <div style="min-width: 100px;">ISIN</div>
            <div style="min-width: 150px;">Market Cap</div>
            <div style="min-width: 70px;">PE Ratio</div>
            <div style="min-width: 70px;">PS Ratio</div>
            <div style="min-width: 70px;">PEG Ratio</div>
            <div style="min-width: 100px;">Dividend Yield (TTM)</div>
            <div style="min-width: 70px;">EPS</div>
          </div>
          <div class="wlist-container" @scroll.passive="handleScroll1">
            <div 
  id="wlist" 
  style="display: flex; flex-direction: row; width: 100vw; height: 35px; align-items: center;" 
  tabindex="0" 
  @keydown="handleKeydown" 
  @click="selectRow(asset.Symbol)" 
  v-for="(asset, index) in currentResults"
  :key="asset.Symbol" 
  :class="[
    index % 2 === 0 ? 'even' : 'odd', 
    { 'selected': selectedItem === asset.Symbol }
  ]" 
  :data-symbol="asset.Symbol"
>
            <div style="min-width: 50px;; position: relative;">
                <button class="dropdown-btn">
                   <svg class="img" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M8 12C9.10457 12 10 12.8954 10 14C10 15.1046 9.10457 16 8 16C6.89543 16 6 15.1046 6 14C6 12.8954 6.89543 12 8 12Z" fill="var(--text1)"></path> <path d="M8 6C9.10457 6 10 6.89543 10 8C10 9.10457 9.10457 10 8 10C6.89543 10 6 9.10457 6 8C6 6.89543 6.89543 6 8 6Z" fill="var(--text1)"></path> <path d="M10 2C10 0.89543 9.10457 -4.82823e-08 8 0C6.89543 4.82823e-08 6 0.895431 6 2C6 3.10457 6.89543 4 8 4C9.10457 4 10 3.10457 10 2Z" fill="var(--text1)"></path> </g></svg>
                </button>
                <div class="dropdown-menu">
                  <div @click="hideStock(asset)" @click.stop style="display: flex; flex-direction: row; align-items: center; height: 14px;">
                   <svg style="width: 15px; height: 15px; margin-right: 5px;" class="img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g id="Edit / Hide"> <path id="Vector" d="M3.99989 4L19.9999 20M16.4999 16.7559C15.1473 17.4845 13.6185 17.9999 11.9999 17.9999C8.46924 17.9999 5.36624 15.5478 3.5868 13.7788C3.1171 13.3119 2.88229 13.0784 2.7328 12.6201C2.62619 12.2933 2.62616 11.7066 2.7328 11.3797C2.88233 10.9215 3.11763 10.6875 3.58827 10.2197C4.48515 9.32821 5.71801 8.26359 7.17219 7.42676M19.4999 14.6335C19.8329 14.3405 20.138 14.0523 20.4117 13.7803L20.4146 13.7772C20.8832 13.3114 21.1182 13.0779 21.2674 12.6206C21.374 12.2938 21.3738 11.7068 21.2672 11.38C21.1178 10.9219 20.8827 10.6877 20.4133 10.2211C18.6338 8.45208 15.5305 6 11.9999 6C11.6624 6 11.3288 6.02241 10.9999 6.06448M13.3228 13.5C12.9702 13.8112 12.5071 14 11.9999 14C10.8953 14 9.99989 13.1046 9.99989 12C9.99989 11.4605 10.2135 10.9711 10.5608 10.6113" stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g> </g></svg>
                    <p>Hide Stock</p>
                  </div>
                  <div class="nested-dropdown" style="display: flex; flex-direction: row; align-items: center; height: 14px;">
                   <svg style="width: 15px; height: 15px; margin-right: 5px;" class="img" viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="var(--text1)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>new-indicator</title> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="scheduler" fill="var(--text1)" transform="translate(85.333333, 85.333333)"> <path d="M170.666667,1.42108547e-14 C264.923264,-3.10380131e-15 341.333333,76.4100694 341.333333,170.666667 C341.333333,264.923264 264.923264,341.333333 170.666667,341.333333 C76.4100694,341.333333 2.57539587e-14,264.923264 1.42108547e-14,170.666667 C2.6677507e-15,76.4100694 76.4100694,3.15255107e-14 170.666667,1.42108547e-14 Z M170.666667,42.6666667 C99.9742187,42.6666667 42.6666667,99.9742187 42.6666667,170.666667 C42.6666667,241.359115 99.9742187,298.666667 170.666667,298.666667 C241.359115,298.666667 298.666667,241.359115 298.666667,170.666667 C298.666667,99.9742187 241.359115,42.6666667 170.666667,42.6666667 Z M192,85.3333333 L191.999333,149.333333 L256,149.333333 L256,192 L191.999333,191.999333 L192,256 L149.333333,256 L149.333333,191.999333 L85.3333333,192 L85.3333333,149.333333 L149.333333,149.333333 L149.333333,85.3333333 L192,85.3333333 Z" id="Combined-Shape"> </path> </g> </g> </g></svg>
                    <p>Add to Watchlist</p>
                    <div class="nested-dropdown-menu">
                  <div v-for="(ticker, index) in watchlist.tickers" :key="index" class="watchlist-item">
                    <label :for="'watchlist-' + index" class="checkbox-label">
                    <div @click.stop="toggleWatchlist(ticker, asset.Symbol)" style="cursor: pointer;">
  <div v-html="getWatchlistIcon(ticker, asset.Symbol)"></div>
</div>
                      <span></span>
                      {{ ticker.Name }}
                    </label>
                  </div>
                </div>
                  </div>
                </div>
              </div>
              <div style="min-width: 50px;">
                <img 
  :src="getImagePath(asset)" 
  class="img" 
/>
              </div>
              <div style="min-width: 70px;" class="btsymbol">{{ asset.Symbol }}</div>
              <div style="min-width: 300px;">{{ asset.Name }}</div>
              <div style="min-width: 100px;">{{ asset.Close }}</div>
              <div style="min-width: 70px;" :class="asset.todaychange > 0 ? 'positive ' : 'negative'">{{ (asset.todaychange * 100).toFixed(2) }}%</div>
              <div style="min-width: 120px;">{{ asset.RSScore1W }}</div>
              <div style="min-width: 120px;">{{ asset.RSScore1M }}</div>
              <div style="min-width: 120px;">{{ asset.RSScore4M }}</div>
              <div style="min-width: 100px;">{{ asset.ADV1W !== null && !isNaN(asset.ADV1W) ? asset.ADV1W.toFixed(2) + '%' : '-' }}</div>
              <div style="min-width: 100px;">{{ asset.ADV1M !== null && !isNaN(asset.ADV1M) ? asset.ADV1M.toFixed(2) + '%' : '-' }}</div>
              <div style="min-width: 100px;">{{ asset.ADV4M !== null && !isNaN(asset.ADV4M) ? asset.ADV4M.toFixed(2) + '%' : '-' }}</div>
              <div style="min-width: 100px;">{{ asset.ADV1Y !== null && !isNaN(asset.ADV1Y) ? asset.ADV1Y.toFixed(2) + '%' : '-' }}</div>
              <div style="min-width: 120px;">{{ asset.Exchange }}</div>
              <div style="min-width: 120px;">{{ asset.Sector }}</div>
              <div style="min-width: 200px;">{{ asset.Industry }}</div>
              <div style="min-width: 120px;">{{ asset.Country }}</div>
              <div style="min-width: 100px;">{{ asset.ISIN }}</div>
              <div style="min-width: 150px;">{{ parseInt(asset.MarketCapitalization).toLocaleString() }}</div>
              <div style="min-width: 70px;"> {{ asset.PERatio < 0 ? '-' : Math.floor(asset.PERatio) }}</div>
              <div style="min-width: 70px;"> {{ asset.PriceToSalesRatioTTM < 0 ? '-' : Math.floor(asset.PriceToSalesRatioTTM) }}</div>
              <div style="min-width: 70px;">{{ asset.PEGRatio < 0 ? '-' : Math.floor(asset.PEGRatio) }}</div>
              <div style="min-width: 100px;">{{ asset.DividendYield === null || asset.DividendYield === undefined || asset.DividendYield === 0 || isNaN(asset.DividendYield * 100) ? '-' : ((asset.DividendYield * 100).toFixed(2) + '%') }}</div>
              <div style="min-width: 70px;">{{ parseFloat(asset.EPS).toFixed(2) }}</div>
            </div>
            <div class="results2"> 
            </div>
          </div>
          </div>
</template>

<script setup>
</script>

<style>
</style>