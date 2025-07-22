<template>
      <div class="ml-RES">
                        <div class="ml-Header"
                          style="display: flex; flex-direction: row; width: 100vw; height: 30px; align-items: center;">
                          <div style="min-width: 100px;">
                            <h1 style="background-color: var(--base1)" :key="resultListLength">RESULTS: {{
                              resultListLength }}</h1>
                          </div>
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
                        <div class="ml-wlist-container" @scroll.passive="handleScroll3">
                          <div id="ml-wlist"
                            style="display: flex; flex-direction: row; width: 100vw; height: 35px; align-items: center;"
                            tabindex="0" @keydown="handleKeydown" @click="selectRow(asset.Symbol)"
                            v-for="(asset, index) in currentResults" :key="asset.Symbol" :class="[
                              index % 2 === 0 ? 'ml-even' : 'ml-odd',
                              { 'ml-selected': selectedItem === asset.Symbol }
                            ]" :data-symbol="asset.Symbol">
                            <div style="min-width: 50px;; position: relative;">
                              <button class="ml-dropdown-btn">
                                <svg class="ml-img" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                              <div class="ml-dropdown-menu">
                                <div @click="ShowStock(asset)" @click.stop
                                  style="display: flex; flex-direction: row; align-items: center; height: 14px;">
                                  <svg style="width: 15px; height: 15px; margin-right: 5px;" viewBox="0 0 48 48"
                                    xmlns="http://www.w3.org/2000/svg" fill="var(--text1)">
                                    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                                    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                                    <g id="SVGRepo_iconCarrier">
                                      <path d="M0 0h48v48H0z" fill="none"></path>
                                      <g id="Shopicon">
                                        <circle cx="24" cy="24" r="4"></circle>
                                        <path
                                          d="M24,38c12,0,20-14,20-14s-8-14-20-14S4,24,4,24S12,38,24,38z M24,16c4.418,0,8,3.582,8,8s-3.582,8-8,8s-8-3.582-8-8 S19.582,16,24,16z">
                                        </path>
                                      </g>
                                    </g>
                                  </svg>
                                  <p>Show Asset</p>
                                </div>
                                <div class="ml-nested-dropdown"
                                  style="display: flex; flex-direction: row; align-items: center; height: 14px;">
                                  <svg style="width: 15px; height: 15px; margin-right: 5px;" class="img"
                                    viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg"
                                    xmlns:xlink="http://www.w3.org/1999/xlink" fill="var(--text1)">
                                    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                                    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                                    <g id="SVGRepo_iconCarrier">
                                      <title>new-indicator</title>
                                      <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                                        <g id="scheduler" fill="var(--text1)"
                                          transform="translate(85.333333, 85.333333)">
                                          <path
                                            d="M170.666667,1.42108547e-14 C264.923264,-3.10380131e-15 341.333333,76.4100694 341.333333,170.666667 C341.333333,264.923264 264.923264,341.333333 170.666667,341.333333 C76.4100694,341.333333 2.57539587e-14,264.923264 1.42108547e-14,170.666667 C2.6677507e-15,76.4100694 76.4100694,3.15255107e-14 170.666667,1.42108547e-14 Z M170.666667,42.6666667 C99.9742187,42.6666667 42.6666667,99.9742187 42.6666667,170.666667 C42.6666667,241.359115 99.9742187,298.666667 170.666667,298.666667 C241.359115,298.666667 298.666667,241.359115 298.666667,170.666667 C298.666667,99.9742187 241.359115,42.6666667 170.666667,42.6666667 Z M192,85.3333333 L191.999333,149.333333 L256,149.333333 L256,192 L191.999333,191.999333 L192,256 L149.333333,256 L149.333333,191.999333 L85.3333333,192 L85.3333333,149.333333 L149.333333,149.333333 L149.333333,85.3333333 L192,85.3333333 Z"
                                            id="Combined-Shape"> </path>
                                        </g>
                                      </g>
                                    </g>
                                  </svg>
                                  <p>Add to Watchlist</p>
                                  <div class="ml-nested-dropdown-menu">
                                    <div v-for="(ticker, index) in watchlist.tickers" :key="index"
                                      class="ml-watchlist-item">
                                      <label :for="'watchlist-' + index" class="ml-checkbox-label">
                                        <div @click.stop="toggleWatchlist(ticker, asset.Symbol)"
                                          style="cursor: pointer;">
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
                              <img :src="getImagePath(asset)" class="ml-img" />
                            </div>
                            <div style="min-width: 70px;" class="ml-btsymbol">{{ asset.Symbol }}</div>
                            <div style="min-width: 300px;">{{ asset.Name }}</div>
                            <div style="min-width: 100px;;">{{ asset.Close }}</div>
                            <div style="min-width: 70px;" :class="asset.todaychange > 0 ? 'positive ' : 'negative'">{{
                              (asset.todaychange * 100).toFixed(2) }}%</div>
                            <div style="min-width: 120px;">{{ asset.RSScore1W }}</div>
                            <div style="min-width: 120px;">{{ asset.RSScore1M }}</div>
                            <div style="min-width: 120px;">{{ asset.RSScore4M }}</div>
                            <div style="min-width: 100px;">{{ asset.ADV1W !== null && !isNaN(asset.ADV1W) ?
                              asset.ADV1W.toFixed(2) + '%' : '-' }}</div>
                            <div style="min-width: 100px;">{{ asset.ADV1M !== null && !isNaN(asset.ADV1M) ?
                              asset.ADV1M.toFixed(2) + '%' : '-' }}</div>
                            <div style="min-width: 100px;">{{ asset.ADV4M !== null && !isNaN(asset.ADV4M) ?
                              asset.ADV4M.toFixed(2) + '%' : '-' }}</div>
                            <div style="min-width: 100px;">{{ asset.ADV1Y !== null && !isNaN(asset.ADV1Y) ?
                              asset.ADV1Y.toFixed(2) + '%' : '-' }}</div>
                            <div style="min-width: 120px;">{{ asset.Exchange }}</div>
                            <div style="min-width: 120px;">{{ asset.Sector }}</div>
                            <div style="min-width: 200px;">{{ asset.Industry }}</div>
                            <div style="min-width: 120px;">{{ asset.Country }}</div>
                            <div style="min-width: 100px;">{{ asset.ISIN }}</div>
                            <div style="min-width: 150px;">{{ parseInt(asset.MarketCapitalization).toLocaleString() }}
                            </div>
                            <div style="min-width: 70px;"> {{ asset.PERatio < 0 ? '-' : Math.floor(asset.PERatio)
                                }}</div>
                                <div style="min-width: 70px;"> {{ asset.PriceToSalesRatioTTM < 0 ? '-' :
                                  Math.floor(asset.PriceToSalesRatioTTM) }}</div>
                                    <div style="min-width: 70px;">{{ asset.PEGRatio < 0 ? '-' :
                                        Math.floor(asset.PEGRatio) }}</div>
                                        <div style="min-width: 100px;">{{ asset.DividendYield === null ||
                                          asset.DividendYield === undefined || asset.DividendYield === 0 ||
                                          isNaN(asset.DividendYield * 100) ? '-' : ((asset.DividendYield *
                                          100).toFixed(2) + '%') }}</div>
                                        <div style="min-width: 70px;">{{ parseFloat(asset.EPS).toFixed(2) }}</div>
                                    </div>
                                    <div class="ml-results2">
                                    </div>
                                </div>
                            </div>
</template>

<script setup>

import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  resultListLength: Number,
  currentResults: Array,
  selectedItem: String,
  watchlist: Object,
  getImagePath: Function,
  getWatchlistIcon: Function,
});

const emit = defineEmits(['toggle-watchlist', 'show-stock', 'select-row', 'keydown', 'scroll']);

function toggleWatchlist(ticker, symbol) {
  emit('toggle-watchlist', { ticker, symbol });
}

function ShowStock(asset) {
  emit('show-stock', asset);
}

function selectRow(symbol) {
  emit('select-row', symbol);
}

function handleKeydown(event) {
  emit('keydown', event);
}

function handleScroll3(event) {
  emit('scroll', event);
}
</script>

<style scoped>

.ml-RES {
  border: none;
  width: 100%;
}

.ml-Header {
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

.ml-wlist-container {
  height: 800px;
  width: 100%;
  min-width: 2610px;
  overflow-y: scroll;
  z-index: 1000;
}

#ml-wlist {
  outline: none;
}

.ml-even {
  background-color: var(--base2);
  text-align: center;
  color: var(--text1);
  border: none;
  word-break: break-all;
  min-width: 2610px;
}

.ml-odd {
  background-color: var(--base2);
  text-align: center;
  color: var(--text1);
  word-break: break-all;
  min-width: 2610px;
}

.ml-even:hover,
.ml-odd:hover {
  background-color: var(--accent4);
  cursor: pointer;
}

.ml-selected {
  background-color: var(--accent4);
  color: var(--text1);
}

.ml-dropdown-btn {
  cursor: pointer;
  border: none;
  outline: none;
  background: transparent;
}

.ml-img {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 25px;
}

.ml-dropdown-menu {
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

.ml-dropdown-menu>div {
  background-color: var(--base4);
  padding: 5px;
  height: 14px;
  display: flex;
  align-items: center;
  border-radius: 5px;
}

.ml-dropdown-menu>div:hover {
  background-color: var(--accent2);
}

.ml-dropdown-btn:hover + .ml-dropdown-menu,
.ml-dropdown-menu:hover {
  display: block;
}

.ml-nested-dropdown {
  position: relative;
}

.ml-nested-dropdown-menu {
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

.ml-nested-dropdown:hover .ml-nested-dropdown-menu {
  display: block;
}

.ml-checkbox-label {
  display: flex;
  align-items: center;
}

.ml-watchlist-item {
  padding: 5px;
  display: flex;
  align-items: center;
  height: 24px;
  box-sizing: border-box;
  border-radius: 5px;
}

.ml-watchlist-item:hover {
  background-color: var(--accent2);
}

.ml-watchlist-item input[type="checkbox"] {
  margin-right: 5px;
}

.ml-results2 {
  background-color: var(--base1);
  width: 100vw;
  color: var(--text1);
  border: none;
  height: 200px;
}
</style>