<template>
  <div class="summary-container">
            <div class="summary-row">
              <div class="category">Exchange</div>
              <div class="response">
                {{ assetInfo.Exchange }}
              </div>
            </div>
            <div class="summary-row">
              <div class="category">ISIN</div>
              <div class="response">{{ assetInfo.ISIN }}</div>
            </div>
            <div class="summary-row">
              <div class="category">IPO Date</div>
              <div class="response">{{ formatDate(assetInfo.IPO) }}</div>
            </div>
            <div class="summary-row">
              <div class="category">Sector</div>
              <div class="response">
                {{ assetInfo.Sector.charAt(0).toUpperCase() + assetInfo.Sector.slice(1).toLowerCase() }}
              </div>
            </div>
            <div class="summary-row">
              <div class="category">Industry</div>
              <div class="response">
                {{ assetInfo.Industry.charAt(0).toUpperCase() + assetInfo.Industry.slice(1).toLowerCase() }}
              </div>
            </div>
            <div class="summary-row">
              <div class="category">Reported Currency</div>
              <div class="response">{{ assetInfo.Currency.toUpperCase() }}</div>
            </div>
            <div class="summary-row">
              <div class="category">Technical Score (1W)</div>
              <div class="response">{{ assetInfo.RSScore1W }}</div>
            </div>
            <div class="summary-row">
              <div class="category">Technical Score (1M)</div>
              <div class="response">{{ assetInfo.RSScore1M }}</div>
            </div>
            <div class="summary-row">
              <div class="category">Technical Score (4M)</div>
              <div class="response">{{ assetInfo.RSScore4M }}</div>
            </div>
            <div class="summary-row">
              <div class="category">Market Cap</div>
              <div class="response">{{ parseInt(assetInfo.MarketCapitalization).toLocaleString() }}</div>
            </div>
            <div class="summary-row">
              <div class="category">Shares Outstanding</div>
              <div class="response">{{ parseInt(assetInfo.SharesOutstanding).toLocaleString() }}</div>
            </div>
            <div class="summary-row">
              <div class="category">Location</div>
              <div class="response">{{ assetInfo.Address }}</div>
            </div>
            <div class="summary-row">
              <div class="category">Dividend Date</div>
              <div class="response">
                {{
                  (assetInfo.DividendDate !== 'Invalid Date' && assetInfo.DividendDate != null &&
                    !isNaN(Date.parse(assetInfo.DividendDate)))
                    ? formatDate(assetInfo.DividendDate)
                    : '-'
                }}
              </div>
            </div>
            <div class="summary-row">
              <div class="category">Dividend Yield</div>
              <div class="response">
                {{ (assetInfo.DividendYield != null && !isNaN(assetInfo.DividendYield)) ?
                  (parseFloat(assetInfo.DividendYield) * 100).toFixed(2) + '%' : '-' }}
              </div>
            </div>
            <div class="summary-row">
              <div class="category">Book Value</div>
              <div class="response">
                {{ (assetInfo.BookValue != null && !isNaN(assetInfo.BookValue)) ? parseFloat(assetInfo.BookValue) : '-'
                }}
              </div>
            </div>
            <div class="summary-row">
              <div class="category">PEG Ratio</div>
              <div class="response">
                {{ (assetInfo.PEGRatio != null && !isNaN(assetInfo.PEGRatio) && assetInfo.PEGRatio >= 0) ?
                  parseInt(assetInfo.PEGRatio) : '-' }}
              </div>
            </div>
            <div class="summary-row">
              <div class="category">PE Ratio</div>
              <div class="response">
                {{ (assetInfo.PERatio != null && !isNaN(assetInfo.PERatio) && assetInfo.PERatio >= 0) ?
                  parseInt(assetInfo.PERatio) : '-' }}
              </div>
            </div>
            <div class="summary-row2">
              <div :class="['description', { 'expanded': showAllDescription }]"
                :style="{ height: showAllDescription ? 'auto' : minHeight }">
                {{ assetInfo.Description }}
              </div>
            </div>
           <button @click="$emit('toggle-description')" class="toggle-btn">
      {{ showAllDescription ? 'Show Less' : 'Show All' }}
    </button>
          </div>
</template>

<script setup>
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);
</script>

<style lang="scss">

</style>