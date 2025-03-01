<template>
  <body>
    <Header />
    <div id="main">
      <div v-if="showCreateNote" class="CreateNote">
        <img class="inner-logo" src="@/assets/icons/owl.png" alt="">
        <p style="font-size: 9px; padding: 0; color: whitesmoke; opacity: 0.60; margin: 5px;">350 characters max / 10 notes limit for each symbol</p>
  <textarea  id="notes-container" 
      placeholder="write notes here" 
      :class="{ error: characterCount > 350 }" 
      v-model="noteContent" 
      @input="updateCharacterCount"></textarea>
        <div class="inner">
          <button @click="showCreateNote = false"><img class="imgbtn" src="@/assets/icons/back-arrow.png" alt=""></button>
          <button @click="sendNote()"><img class="imgbtn" src="@/assets/icons/submit.png" alt=""></button>
        </div>
      </div>
      <div v-if="showCreateWatchlist" class="CreateWatchlist">
        <img class="inner-logo" src="@/assets/icons/owl.png" alt="">
        <h3 class="title">Create Watchlist</h3>
        <p style="font-size: 7px; color: whitesmoke; opacity: 0.60; margin: 0; padding: 0;" >Max 20 characters / 20 Watchlists for each user</p>
        <input
      id="inputcreate"
      placeholder="Enter Watchlist Name"
      type="text"
      v-model="watchlistName"
      :class="{'input-error': watchlistName.length > 20}"
    />
        <div class="inner">
          <button @click="showCreateWatchlist = false"><img class="imgbtn" src="@/assets/icons/back-arrow.png" alt=""></button>
          <button @click="CreateWatchlist()"><img class="imgbtn" src="@/assets/icons/submit.png" alt=""></button>
        </div>
      </div>
      <div v-if="showRenameWatchlist" class="RenameWatchlist">
        <img class="inner-logo" src="@/assets/icons/owl.png" alt="">
        <h3 class="title">Rename Watchlist</h3>
        <input 
        id="inputrename" 
        placeholder="Enter Watchlist Name" 
        type="text"
        v-model="watchlistName"
      :class="{'input-error': watchlistName.length > 20}"
      />
        <div class="inner">
          <button @click="showRenameWatchlist = false"><img class="imgbtn" src="@/assets/icons/back-arrow.png" alt=""></button>
          <button @click="UpdateWatchlist()"><img class="imgbtn" src="@/assets/icons/submit.png" alt=""></button>
        </div>
      </div>
      <div id="sidebar-left">
        <div v-if="isLoading3" style="position: relative; height: 100%;">
    <div style="position: absolute; top: 45%; left: 43%;">
    <LoadingOverlay :active="true" color="#8c8dfe" opacity="1" loader="bars" size="32" />
  </div>
</div>
<div v-else style="border:none" >
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
        (assetInfo.DividendDate !== 'Invalid Date' && assetInfo.DividendDate != null && !isNaN(Date.parse(assetInfo.DividendDate))) 
          ? formatDate(assetInfo.DividendDate) 
          : '-' 
      }}
    </div>
  </div>
  <div class="summary-row">
    <div class="category">Dividend Yield</div>
    <div class="response">
      {{ (assetInfo.DividendYield != null && !isNaN(assetInfo.DividendYield)) ? (parseFloat(assetInfo.DividendYield) * 100).toFixed(2) + '%' : '-' }}
    </div>
  </div>
  <div class="summary-row">
    <div class="category">Book Value</div>
    <div class="response">
      {{ (assetInfo.BookValue != null && !isNaN(assetInfo.BookValue)) ? parseFloat(assetInfo.BookValue) : '-' }}
    </div>
  </div>
  <div class="summary-row">
    <div class="category">PEG Ratio</div>
    <div class="response">
  {{ (assetInfo.PEGRatio != null && !isNaN(assetInfo.PEGRatio) && assetInfo.PEGRatio >= 0) ? parseInt(assetInfo.PEGRatio) : '-' }}
</div>
  </div>
  <div class="summary-row">
    <div class="category">PE Ratio</div>
<div class="response">
  {{ (assetInfo.PERatio != null && !isNaN(assetInfo.PERatio) && assetInfo.PERatio >= 0) ? parseInt(assetInfo.PERatio) : '-' }}
</div>
  </div>
  <div class="summary-row2">
    <div :class="['description', { 'expanded': showAllDescription }]" :style="{ height: showAllDescription ? 'auto' : minHeight }">
      {{ assetInfo.Description }}
    </div>
  </div>
  <button 
      @click="showAllDescription = !showAllDescription" 
      class="toggle-btn">
      {{ showAllDescription ? 'Show Less' : 'Show All' }}
    </button>
</div>
<div v-if="displayedEPSItems.length > 0" id="EPStable">
  <div class="eps-header">
    <div class="eps-cell" style="flex: 0 0 20%;">Reported</div>
    <div class="eps-cell" style="flex: 0 0 40%;">EPS</div>
    <div class="eps-cell" style="flex: 0 0 20%;">Chg (%)</div>
    <div class="eps-cell" style="flex: 0 0 10%;">QoQ</div>
    <div class="eps-cell" style="flex: 0 0 10%;">YoY</div>
</div>
<div class="eps-body">
  <div v-for="(earnings, index) in displayedEPSItems" :key="earnings.fiscalDateEnding" class="eps-row">
    <div class="eps-cell" style="flex: 0 0 20%;">{{ formatDate(earnings.fiscalDateEnding) }}</div>
    <div class="eps-cell" style="flex: 0 0 40%;">{{ earnings.reportedEPS }}</div>
    
    <!-- Change here: Check if there are fewer than 4 items -->
    <div class="eps-cell" style="flex: 0 0 20%;" v-if="(displayedEPSItems.length < 4 && index === displayedEPSItems.length - 1) || (showAllEPS && index === displayedEPSItems.length - 1)">
      <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
    </div>
    <div class="eps-cell" style="flex: 0 0 20%;" v-else :class="calculatePercentageChange(earnings.reportedEPS, assetInfo.quarterlyEarnings[index + 1]?.reportedEPS || 0) > 0 ? 'positive' : 'negative'">
      {{ calculatePercentageChange(earnings.reportedEPS, assetInfo.quarterlyEarnings[index + 1]?.reportedEPS || 0) }}%
    </div>
    
    <div class="eps-cell" style="flex: 0 0 10%;" v-if="(displayedEPSItems.length < 4 && index === displayedEPSItems.length - 1) || (showAllEPS && index === displayedEPSItems.length - 1)">
      <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
    </div>
    <div class="eps-cell" style="flex: 0 0 10%;" v-else>
      <img v-if="getQoQClass(calculateQoQ1(earnings.reportedEPS)) === 'green'" src="@/assets/icons/green.png" alt="green" width="10" height="10" style="border: none;">
      <img v-else src="@/assets/icons/red.png" alt="red" width="10" height="10" style="border: none;">
    </div>
    
    <div class="eps-cell" style="flex: 0 0 10%;" v-if="(displayedEPSItems.length < 4 && index === displayedEPSItems.length - 1) || (showAllEPS && index === displayedEPSItems.length - 1)">
      <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
    </div>
    <div class="eps-cell" style="flex: 0 0 10%;" v-else>
      <img v-if="getYoYClass(calculateYoY1(earnings.reportedEPS)) === 'green'" src="@/assets/icons/green.png" alt="green" width="10" height="10" style="border: none;">
      <img v-else src="@/assets/icons/red.png" alt="red" width="10" height="10" style="border: none;">
    </div>
  </div>
</div>
</div>
<div v-if="displayedEPSItems.length === 0" class="no-data">No EPS data available</div>
<button 
    v-if="showEPSButton" 
    @click="showAllEPS = !showAllEPS" 
    class="toggle-btn">
    {{ showAllEPS ? 'Show Less' : 'Show All' }}
</button>
<div v-if="displayedEarningsItems.length > 0" id="Earntable">
  <div class="earn-header">
    <div class="earn-cell" style="flex: 0 0 20%;">Reported</div>
    <div class="earn-cell" style="flex: 0 0 40%;">Earnings</div>
    <div class="earn-cell" style="flex: 0 0 20%;">Chg (%)</div>
    <div class="earn-cell" style="flex: 0 0 10%;">QoQ</div>
    <div class="earn-cell" style="flex: 0 0 10%;">YoY</div>
  </div>
  <div class="earn-body">
  <div v-for="(quarterlyReport, index) in displayedEarningsItems" :key="quarterlyReport.fiscalDateEnding" class="earn-row">
    <div class="earn-cell" style="flex: 0 0 20%;">{{ formatDate(quarterlyReport.fiscalDateEnding) }}</div>
    <div class="earn-cell" style="flex: 0 0 40%;">{{ parseInt(quarterlyReport.netIncome).toLocaleString() }}</div>
    
    <!-- Change here: Check if there are fewer than 4 items -->
    <div class="earn-cell" style="flex: 0 0 20%;" v-if="(displayedEarningsItems.length < 4 && index === displayedEarningsItems.length - 1) || (showAllEarnings && quarterlyReport === displayedEarningsItems[displayedEarningsItems.length - 1])">
      <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
    </div>
    <div class="earn-cell" style="flex: 0 0 20%;" v-else :class="calculateNet(quarterlyReport.netIncome) > 0 ? 'positive' : 'negative'">
      {{ calculateNet(quarterlyReport.netIncome) }}%
    </div>
    
    <div class="earn-cell" style="flex: 0 0 10%;" v-if="(displayedEarningsItems.length < 4 && index === displayedEarningsItems.length - 1) || (showAllEarnings && quarterlyReport === displayedEarningsItems[displayedEarningsItems.length - 1])">
      <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
    </div>
    <div class="earn-cell" style="flex: 0 0 10%;" v-else>
      <img v-if="getQoQClass(calculateQoQ2(quarterlyReport.netIncome)) === 'green'" 
           src="@/assets/icons/green.png" alt="green" width="10" height="10" style="border: none;">
      <img v-else 
           src="@/assets/icons/red.png" alt="red" width="10" height="10" style="border: none;">
    </div>
    
    <div class="earn-cell" style="flex: 0 0 10%;" v-if="(displayedEarningsItems.length < 4 && index === displayedEarningsItems.length - 1) || (showAllEarnings && quarterlyReport === displayedEarningsItems[displayedEarningsItems.length - 1])">
      <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
    </div>
    <div class="earn-cell" style="flex: 0 0 10%;" v-else>
      <img v-if="getYoYClass(calculateYoY2(quarterlyReport.netIncome)) === 'green'" 
           src="@/assets/icons/green.png" alt="green" width="10" height="10" style="border: none;">
      <img v-else 
           src="@/assets/icons/red.png" alt="red" width="10" height="10" style="border: none;">
    </div>
  </div>
</div>
</div>
<div v-if="displayedEarningsItems.length === 0" class="no-data">No earnings data available</div>
<button 
    v-if="showEarningsButton" 
    @click="showAllEarnings = !showAllEarnings" 
    class="toggle-btn">
    {{ showAllEarnings ? 'Show Less' : 'Show All' }}
</button>
<div v-if="displayedSalesItems.length > 0" id="Salestable">
  <div class="sales-header">
    <div class="sales-cell" style="flex: 0 0 20%;">Reported</div>
    <div class="sales-cell" style="flex: 0 0 40%;">Sales</div>
    <div class="sales-cell" style="flex: 0 0 20%;">Chg (%)</div>
    <div class="sales-cell" style="flex: 0 0 10%;">QoQ</div>
    <div class="sales-cell" style="flex: 0 0 10%;">YoY</div>
  </div>
  <div class="sales-body">
    <div v-for="(quarterlyReport, index) in displayedSalesItems" :key="quarterlyReport.fiscalDateEnding" class="sales-row">
      <div class="sales-cell" style="flex: 0 0 20%;">{{ formatDate(quarterlyReport.fiscalDateEnding) }}</div>
      <div class="sales-cell" style="flex: 0 0 40%;">{{ parseInt(quarterlyReport.totalRevenue).toLocaleString() }}</div>
      
      <!-- Change here: Check if there are fewer than 4 items -->
      <div class="sales-cell" style="flex: 0 0 20%;" v-if="(displayedSalesItems.length < 4 && index === displayedSalesItems.length - 1) || (showAllSales && quarterlyReport === displayedSalesItems[displayedSalesItems.length - 1])">
        <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
      </div>
      <div class="sales-cell" style="flex: 0 0 20%;" v-else :class="calculateRev(quarterlyReport.totalRevenue) > 0 ? 'positive' : 'negative'">
        {{ calculateRev(quarterlyReport.totalRevenue) }}%
      </div>
      
      <div class="sales-cell" style="flex: 0 0 10%;" v-if="(displayedSalesItems.length < 4 && index === displayedSalesItems.length - 1) || (showAllSales && quarterlyReport === displayedSalesItems[displayedSalesItems.length - 1])">
        <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
      </div>
      <div class="sales-cell" style="flex: 0 0 10%;" v-else>
        <img v-if="getQoQClass(calculateQoQ3(quarterlyReport.totalRevenue)) === 'green'" 
             src="@/assets/icons/green.png" alt="green" width="10" height="10" style="border: none;">
        <img v-else 
             src="@/assets/icons/red.png" alt="red" width="10" height="10" style="border: none;">
      </div>
      
      <div class="sales-cell" style="flex: 0 0 10%;" v-if="(displayedSalesItems.length < 4 && index === displayedSalesItems.length - 1) || (showAllSales && quarterlyReport === displayedSalesItems[displayedSalesItems.length - 1])">
        <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
      </div>
      <div class="sales-cell" style="flex: 0 0 10%;" v-else>
        <img v-if="getYoYClass(calculateYoY3(quarterlyReport.totalRevenue)) === 'green'" 
             src="@/assets/icons/green.png" alt="green" width="10" height="10" style="border: none;">
        <img v-else 
             src="@/assets/icons/red.png" alt="red" width="10" height="10" style="border: none;">
      </div>
    </div>
  </div>
</div>
<div v-if="displayedSalesItems.length === 0" class="no-data">No sales data available</div>
<button 
    v-if="showSalesButton" 
    @click="showAllSales = !showAllSales" 
    class="toggle-btn">
    {{ showAllSales ? 'Show Less' : 'Show All' }}
</button>
        <h3 class="title">Notes Container</h3>
<div v-if="BeautifulNotes.length > 0">
  <div class="note" v-for="note in BeautifulNotes" :key="note.Date">
    <div class="inline-note">
      <img class="img" src="@/assets/icons/note.png" alt="">
    </div>
    <button class="notebtn" @click="removeNote(note._id)">
        <img class="imgdlt" src="@/assets/icons/close.png" alt="">
      </button>
    <p class="note-msg-date" style="color: whitesmoke; opacity: 0.60;">Created: {{ formatDate(note.Date) }}</p>
    <p class="note-msg">{{ note.Message }}</p>
  </div>
</div>
<div v-else>
</div>
<div class="results"></div>
</div>
</div>
<div id="chart-container">
    <div id="legend"></div>
    <div id="legend2">
      <button class="navbtng" v-b-tooltip.hover title="Change Chart View" @click="toggleChartView">{{ chartView }}</button>
      <button 
  class="navbtng" 
  v-b-tooltip.hover 
  title="Change Chart type" 
  @click="toggleChartType"
>
  <img :src="chartTypeIcon" alt="Chart Type" class="chart-type-icon">
</button>
    </div>
    <div id="legend3"></div>
    <div id="legend4">
      <img class="chart-img" :src="getImagePath(assetInfo.Symbol)" alt="">
      <p class="ticker" >{{assetInfo.Symbol}} </p> <p class="name" > - {{assetInfo.Name}}</p>
      <div v-if="isInHiddenList(selectedItem)" class="hidden-message">
        <img class="chart-img2" src="@/assets/icons/hide.png" alt="">
        <p>This Asset Is In Your Hidden List</p>
      </div>
    </div>
    <div id="chartdiv"></div>
    <div class="loading-container" v-if="isChartLoading">
      <LoadingOverlay :active="true" color="#8c8dfe" opacity="1" loader="spinner" size="64" />
    </div>
    <div class="loading-container" v-if="isLoading">
      <LoadingOverlay :active="true" color="#8c8dfe" opacity="1" loader="spinner" size="64" />
    </div>
    <div id="chartdiv2" style="padding: 15px;">
      <img src="@/assets/images/logos/tiingo.png" alt="Image" style="height: 15px; margin-right: 10px; margin-bottom: 7px;">
      <p style="margin: 0; font-size: 10px;">Financial data provided by Tiingo.com as of {{ currentDate }} - All financial data is provided by Tiingo, with the exception of certain calculated metrics such as moving averages and Technical Score, which are derived from Tiingo's data.</p>
</div>
  </div>
      <div id="sidebar-right">
      <div style="position: sticky; top: 0; z-index: 1000;">
        <div id="searchtable">
          <input type="text" id="searchbar" name="search" placeholder="Search Ticker" 
          v-model="searchQuery" @input="toUpperCase" @keydown.enter="searchTicker()">
            <button class="wlbtn2" id="searchBtn" @click="searchTicker()" v-b-tooltip.hover title="Search Symbol"><img class="img" src="@/assets/icons/search.png" alt=""></button>
        </div>
        <div id="wlnav">
          <div id="realwatchlist" class="select-container" @mouseover="showDropdown = true" @mouseout="showDropdown = false">
            <img :src="downIcon" alt="Dropdown Icon" class="dropdown-icon" :class="{ 'dropdown-icon-hover': showDropdown }" />
  <p style="font-weight: bold;" class="selected-value" @click.stop="">{{ selectedWatchlist ? selectedWatchlist.Name : 'Select a watch' }}</p>
  <div class="dropdown-container">
    <div v-for="watch in watchlist.tickers" :key="watch.Name" :class="{'selected': selectedWatchlist && selectedWatchlist.Name === watch.Name}" @click="filterWatchlist(watch)">
      {{ watch.Name }} 
      <span class="badge">{{ watch.List.length }}</span>
      <button class="icondlt" id="watchlistDelete" @click.stop="DeleteWatchlist(watch)" v-b-tooltip.hover title="Delete Watchlist">
        <img class="img" src="@/assets/icons/close.png" alt="delete watchlist">
      </button>
    </div>
  </div>
</div>
<button class="navbtn" @click="addWatchlist()" v-b-tooltip.hover title="Add ticker to watchlist">
        <img class="img" src="@/assets/icons/plus.png" alt="add to watchlist">
      </button>
<div class="wlnav-dropdown">
    <button class="dropdown-toggle wlbtn" v-b-tooltip.hover title="More Options">
      <img class="img" src="@/assets/icons/dots.png" alt="more options">
    </button>
    <div class="dropdown-vnav">
      <button class="dropdown-item" @click="AutoPlay()" v-b-tooltip.hover title="Autoplay Watchlist">
        <img class="img" src="@/assets/icons/play.png" alt="autoplay watchlist"> Autoplay
      </button>
      <button class="dropdown-item" @click="showCreateNote = true" v-b-tooltip.hover title="Create a Note">
        <img class="img" src="@/assets/icons/note.png" alt=""> Create Note
      </button>
      <button class="dropdown-item" @click="showCreateWatchlist = true" v-b-tooltip.hover title="Create New Watchlist">
        <img class="img" src="@/assets/icons/add.png" alt="create new watchlist"> New Watchlist
      </button>
      <button class="dropdown-item" @click="showRenameWatchlist = true" v-b-tooltip.hover title="Rename Watchlist">
        <img class="img" src="@/assets/icons/edit2.png" alt="edit watchlist name"> Rename Watchlist
      </button>
    </div>
  </div>
</div>
<div id="watch-container">
  <div class="ntbl" style="flex: 0.5"></div>
  <div class="ntbl" style="flex: 1"></div>
  <div class="tbl" style="flex: 1" @click="sortTable('ticker')"><img class="img2" src="@/assets/icons/sort.png" alt="sort">Ticker</div>
  <div class="tbl" style="flex: 1" @click="sortTable('last')"><img class="img2" src="@/assets/icons/sort.png" alt="sort">Last</div>
  <div class="tbl" style="flex: 1" @click="sortTable('chg')"><img class="img2" src="@/assets/icons/sort.png" alt="sort">Chg</div>
  <div class="tbl" style="flex: 1" @click="sortTable('perc')"><img class="img2" src="@/assets/icons/sort.png" alt="sort">%</div>
</div>
</div>
  <div v-if="isLoading2" style="position: relative; height: 100%;">
    <div style="position: absolute; top: 45%; left: 43%;">
    <LoadingOverlay :active="true" color="#8c8dfe" opacity="1" loader="bars" size="32" />
  </div>
</div>
  <div v-else>
    <div id="list" 
       ref="watchlistContainer"
       tabindex="0"
       @keydown="handleKeydown"
       @click="handleClick">
      <div ref="sortable">
        <div
          v-for="item in watchlist2.tickers"
          :key="item"
          :class="{ 'selected': selectedItem === item, 'wlist': true }"
          @click="selectRow(item)"
        >
          <div style="flex: 0.5; position: relative;">
            <button class="dropdown-btn">
              <img class="imgm" src="@/assets/icons/dots.png" alt="" style="border: none;">
            </button>
            <div class="dropdown-menu">
              <div v-for="(ticker, index) in watchlist.tickers" :key="index" class="watchlist-item">
                <label :for="'watchlist-' + index" class="checkbox-label">
                  <div @click.stop="toggleWatchlist(ticker, item)" style="cursor: pointer;">
                    <img
  class="watchlist-icon"
  :src="getWatchlistIcon(ticker, item)"
  alt="Toggle Watchlist"
/>
                  </div>
                  <span class="checkmark"></span>
                  {{ ticker.Name }}
                </label>
              </div>
            </div>
          </div>
          <div style="flex: 1; text-align: center;">
            <img 
  class="cmp-logo" 
  :src="getImagePath(item)" 
  alt="" 
/>
          </div>
          <div style="flex: 1; text-align: center;" class="btsymbol">{{ item }}</div>
          <div style="flex: 1; text-align: center;">{{ quotes[item] }}</div>
          <div style="flex: 1; text-align: center;" :class="changes[item] > 0 ? 'positive' : 'negative'">{{ changes[item] }}</div>
          <div style="flex: 1; text-align: center;" :class="perc[item] > 0 ? 'positive' : 'negative'">{{ perc[item] }}%</div>
          <div class="delete-cell" style="position: relative;">
            <button class="dbtn" @click="deleteTicker(item)" style="position: absolute; right: 0;" @click.stop>╳</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="results2"></div>
      </div>
    </div>
    <NotificationPopup ref="notification" />
    <Footer />
  </body>
</template>

<script setup>
// @ is an alias to /src
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
import { reactive, onMounted, ref, watch, computed, nextTick } from 'vue';
import { createChart, ColorType, CrosshairMode} from 'lightweight-charts';
import LoadingOverlay from 'vue-loading-overlay';
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

// for popup notifications
const notification = ref(null);
const showNotification = () => {
  notification.value.show('This is a custom notification message!');
};

// shows icons for toggle watchlist (the thing that adds / removes dropdown menu, the damn checkboxes)
function getWatchlistIcon(ticker, item) {
  return isAssetInWatchlist(ticker.Name, item) 
    ? new URL('@/assets/icons/checked.png', import.meta.url).href
    : new URL('@/assets/icons/unchecked.png', import.meta.url).href;
}

const showDropdown = ref(false);

// activates sorting of watchlist elements / drag and drop 
const sortable = ref(null);

function initializeSortable() {
  if (sortable.value) {
    new Sortable(sortable.value, {
      animation: 150,
      onEnd: async function() {
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
      fetchSymbolsAndExchanges() 
    ]);

    if (watchlist2.tickers && watchlist2.tickers.length > 0) {
      await Promise.all(watchlist2.tickers.map(fetchItemData));
    }

    await nextTick();
    await Promise.all([
    await searchTicker(),
    await searchNotes(),
    await fetchHiddenList()
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

onMounted( async () => {
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

    const response = await fetch(`/api/${user}/default-symbol/${apiKey}`);
    if (!response.ok) throw new Error('Failed to fetch default symbol');

    const data = await response.json();
    return data.defaultSymbol;
  } catch (error) {
    return null;
  }
}

async function updateUserDefaultSymbol(symbol) {
  try {
    if (!user) return;

    const response = await fetch(`/api/${user}/update-default-symbol/${apiKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultSymbol: symbol })
    });
  } catch (error) {
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

// function that searches for tickers
async function searchTicker(providedSymbol) {
  let response; 
  try {
    isChartLoading.value = true;
    const searchbar = document.getElementById('searchbar');
    let symbol;
    {
      symbol = (searchbar.value || defaultSymbol).toUpperCase(); 
      response = await fetch(`/api/chart/${symbol}/${apiKey}`); 

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

      assetInfo.Name = data.Name;
      assetInfo.ISIN = data.ISIN;
      assetInfo.Symbol = data.Symbol;
      assetInfo.Sector = data.Sector;
      assetInfo.Industry = data.Industry;
      assetInfo.MarketCapitalization = data.MarketCapitalization;
      assetInfo.SharesOutstanding = data.SharesOutstanding;
      assetInfo.Country = data.Country;
      assetInfo.Address = data.Address;
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
      assetInfo.Description = data.Description;
    }
  } catch (err) {
    isChartLoading.value = false;
  } finally {
    if (response && response.status !== 404) {
      await searchNotes();
      await fetchData();
      await fetchData2();
      await fetchData3();
      await fetchData4();
      await fetchData5();
      await fetchData6();
      await fetchData7();
      await fetchData8();
      await fetchData9();
      await fetchData10();
      await fetchData11();
      await fetchData12();
      await fetchEarningsDate();
      await fetchSplitsDate();
    }
    isChartLoading.value = false;
  }
}

const isInitializing = ref(true);
const assetInfo = reactive({
  Name: '',
  ISIN: '',
  Sector: '',
  Exchange: '',
  Industry: '',
  MarketCap: '',
  SharesOutstanding: '',
  PEGRatio: '',
  PERatio: '',
  ForwardPE: '',
  PriceToBookRatio: '',
  TrailingPE: '',
  WeekHigh: '',
  WeekLow: '',
  Country: '',
  Address: '',
  Beta: '',
  BookValue: '',
  DividendYield: '',
  DividendDate: '',
  quarterlyEarnings: [],
  annualEarnings: [],
  quarterlyFinancials: [],
  annualFinancials: [],
  Symbol: '',
  RSScore1W: '',
  RSScore1M: '',
  RSScore4M: '',
  IPO: '',
  Description: '',
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
const loading = ref(false);
const error = ref(null);

async function searchNotes() {
  try {
    const Username = user;
    const searchbar = document.getElementById('searchbar');
    const symbol = searchbar.value || defaultSymbol;
    const response = await fetch(`/api/${Username}/${symbol}/notes/${apiKey}`);
    const data = await response.json();
    BeautifulNotes.value = data;
  } catch (err) {
  } finally {
    loading.value = false;
  }
}

async function sendNote() {
  const note = document.getElementById('notes-container').value;
  const symbol = document.getElementById('searchbar').value || defaultSymbol;

  // Check character limit
  if (note.length > 350) {
    notification.value.show('Note exceeds 350 character limit');
    return;
  }

  if (note.trim() !== '') {
    try {
      const response = await fetch(`/api/${symbol}/notes/${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note, Username: user }), 
      });

      const responseData = await response.json();

      if (response.ok) {
        document.getElementById('notes-container').value = '';
        showCreateNote.value = false;
        await searchNotes(symbol);
      } else {
        notification.value.show('Failed to create note');
      }
    } catch (err) {
    }
  } else {
  }
}

async function removeNote(_id, note) {
  const Username = user;
  const symbol = document.getElementById('searchbar').value || defaultSymbol;
  const noteId = _id;

  try {
    const response = await fetch(`/api/${symbol}/notes/${apiKey}/${noteId}?user=${Username}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      BeautifulNotes.value = BeautifulNotes.value.filter((n) => n._id !== noteId);
    } else {
    }
  } catch (err) {
  }
  await searchNotes();
}

async function showTicker() {
  try {
    let symbol;
    {
      symbol = defaultSymbol;
      const response = await fetch(`/api/chart/${symbol}/${apiKey}`);
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
    console.log(err);
  } finally {
    await searchNotes();
    await fetchData();
    await fetchData2();
    await fetchData3();
    await fetchData4();
    await fetchData5();
    await fetchData6();
    await fetchData7();
    await fetchData8();
    await fetchData9();
    await fetchData10();
    await fetchData11();
    await fetchData12();
  }
}

async function fetchEarningsDate() {
  try {
    let ticker = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${ticker}/earningsdate/${apiKey}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newEARNDates = await response.json();
    const ipoDate = data.value[0].time; // extract IPO date from the first document in the data list 
    const ipoDateObject = new Date(ipoDate); // convert ipoDate to a date object
    
    const filteredEARNDates = newEARNDates.filter((date) => {
      const dateObject = new Date(`${date.time.year}-${date.time.month}-${date.time.day}`); // convert date to a date object
      return dateObject >= ipoDateObject;
    });
    
    EARNdates.value = filteredEARNDates.map((date) => {
      return {
        time: date.time,
      };
    });

  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
  }
}

async function fetchSplitsDate() {
  try {
    let ticker = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${ticker}/splitsdate/${apiKey}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newSPLITDates = await response.json();
    SPLITdates.value = newSPLITDates;

  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
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
const EARNdates = ref([]); // Earnings Data - just date
const SPLITdates = ref([]); // Splits Data - just date

async function fetchData() {
  try {
    let symbol = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${symbol}/data/${apiKey}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const newData = await response.json();
    data.value = newData;
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
  }
}

async function fetchData2() {
  try {
    let symbol = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${symbol}/data2/${apiKey}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newData2 = await response.json();
    data2.value = newData2;
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
  }
}

async function fetchData3() {
  try {
    let symbol = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${symbol}/data3/${apiKey}`);
    
    if (!response.ok) {
      data3.value = null; // Explicitly set to null if response is not ok
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newData3 = await response.json();
    
    // Check if newData3 is undefined, null, or empty
    if (!newData3 || newData3.length === 0) {
      data3.value = null;
    } else {
      data3.value = newData3;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    data3.value = null; // Set to null in case of any other error
    console.error('Error fetching data3:', error);
  }
}

async function fetchData4() {
  try {
    let symbol = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${symbol}/data4/${apiKey}`);
    
    if (!response.ok) {
      data4.value = null; // Explicitly set to null if response is not ok
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newData4 = await response.json();
    
    // Check if newData4 is undefined, null, or empty
    if (!newData4 || newData4.length === 0) {
      data4.value = null;
    } else {
      data4.value = newData4;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    data4.value = null; // Set to null in case of any other error
    console.error('Error fetching data4:', error);
  }
}

async function fetchData5() {
  try {
    let symbol = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${symbol}/data5/${apiKey}`);
    
    if (!response.ok) {
      data5.value = null; // Explicitly set to null if response is not ok
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newData5 = await response.json();
    
    // Check if newData5 is undefined, null, or empty
    if (!newData5 || newData5.length === 0) {
      data5.value = null;
    } else {
      data5.value = newData5;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    data5.value = null; // Set to null in case of any other error
    console.error('Error fetching data5:', error);
  }
}

async function fetchData6() {
  try {
    let symbol = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${symbol}/data6/${apiKey}`);
    
    if (!response.ok) {
      data6.value = null; // Explicitly set to null if response is not ok
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newData6 = await response.json();
    
    // Check if newData6 is undefined, null, or empty
    if (!newData6 || newData6.length === 0) {
      data6.value = null;
    } else {
      data6.value = newData6;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    data6.value = null; // Set to null in case of any other error
    console.error('Error fetching data6:', error);
  }
}

async function fetchData7() {
  try {
    let symbol = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${symbol}/data7/${apiKey}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newData7 = await response.json();
    data7.value = newData7;
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
  }
}

async function fetchData8() {
  try {
    let symbol = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${symbol}/data8/${apiKey}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newData8 = await response.json();
    data8.value = newData8;
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
  }
}

async function fetchData9() {
  try {
    let symbol = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${symbol}/data9/${apiKey}`);
    
    if (!response.ok) {
      data9.value = null; // Explicitly set to null if response is not ok
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newData9 = await response.json();
    
    // Check if newData9 is undefined, null, or empty
    if (!newData9 || newData9.length === 0) {
      data9.value = null;
    } else {
      data9.value = newData9;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    data9.value = null; // Set to null in case of any other error
    console.error('Error fetching data9:', error);
  }
}

async function fetchData10() {
  try {
    let symbol = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${symbol}/data10/${apiKey}`);
    
    if (!response.ok) {
      data10.value = null; // Explicitly set to null if response is not ok
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newData10 = await response.json();
    
    // Check if newData10 is undefined, null, or empty
    if (!newData10 || newData10.length === 0) {
      data10.value = null;
    } else {
      data10.value = newData10;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    data10.value = null; // Set to null in case of any other error
    console.error('Error fetching data10:', error);
  }
}

async function fetchData11() {
  try {
    let symbol = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${symbol}/data11/${apiKey}`);
    
    if (!response.ok) {
      data11.value = null; // Explicitly set to null if response is not ok
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newData11 = await response.json();
    
    // Check if newData11 is undefined, null, or empty
    if (!newData11 || newData11.length === 0) {
      data11.value = null;
    } else {
      data11.value = newData11;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    data11.value = null; // Set to null in case of any other error
    console.error('Error fetching data11:', error);
  }
}

async function fetchData12() {
  try {
    let symbol = (defaultSymbol || selectedItem).toUpperCase();
    const response = await fetch(`/api/${symbol}/data12/${apiKey}`);
    
    if (!response.ok) {
      data12.value = null; // Explicitly set to null if response is not ok
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newData12 = await response.json();
    
    // Check if newData12 is undefined, null, or empty
    if (!newData12 || newData12.length === 0) {
      data12.value = null;
    } else {
      data12.value = newData12;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    data12.value = null; // Set to null in case of any other error
    console.error('Error fetching data12:', error);
  }
}

let chartView = ref('D')
let useAlternateData = false;
const isLoading = ref(true)
const charttype = ref('Bar')
const isBarChart = ref(true);

const chartTypeIcon = computed(() => {
  return isBarChart.value ? barsIcon : candlesIcon;
});

const toggleChartType = () => {
  isBarChart.value = !isBarChart.value;
  charttype.value = isBarChart.value ? 'Bar' : 'Candlestick';
};

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
const chartDiv = document.getElementById('chartdiv');
  const chart = createChart(chartDiv, {
    layout: {
      background: {
        type: ColorType.Solid,
        color: '#0f0f1b',
      },
      textColor: '#ffffff',
    },
    grid: {
      vertLines: {
        color: 'transparent',
      },
      horzLines: {
        color: 'transparent',
      }
    }, crosshair: { mode: CrosshairMode.Normal,
      vertLine: {
        color: "#8c8dfe",
        labelBackgroundColor: "#8c8dfe",
      },
      horzLine: {
        color: "#8c8dfe",
        labelBackgroundColor: "#8c8dfe",
      },
    },
    timeScale: {
      barSpacing: 2.5,
      minBarSpacing: 0.1,
      rightOffset: 20,
    },});

let barSeries = chart.addBarSeries({
  downColor: '#90bff9',
  upColor: '#4caf50',
  priceLineVisible: true,
});

function toggleChartType() {
  // Remove the existing series
  chart.removeSeries(barSeries);

  if (isBarChart.value) {
    // Create a bar series
    barSeries = chart.addBarSeries({
      downColor: '#90bff9',
      upColor: '#4caf50',
      priceLineVisible: true,
    });
  } else {
    // Create a candlestick series
    barSeries = chart.addCandlestickSeries({
      downColor: '#90bff9',
      upColor: '#4caf50',
      borderDownColor: '#90bff9',
      borderUpColor: '#4caf50',
      wickDownColor: '#90bff9',
      wickUpColor: '#4caf50',
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
    color: '#4D4D4D',
    priceLineVisible: true,
    priceFormat: {
      type: 'volume',
    },
    priceScaleId: '',
  });

  const MaSeries1 = chart.addLineSeries({
    color: '#00bcd4',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    lineWidth: 1,
  });

  const MaSeries2 = chart.addLineSeries({
    color: '#2862ff',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    lineWidth: 1,
  });

  const MaSeries3 = chart.addLineSeries({
    color: '#ffeb3b',
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    lineWidth: 1,
  });

  const MaSeries4 = chart.addLineSeries({
    color: '#4caf50',
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
  if (chartView.value === 'D') {
    lastRecordedValue = changes[changes.length - 1];
  } else if (chartView.value === 'W') {
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
    const color = relativeVolume > 2 ? '#8c8dfe' : '#4D4D4D'; 
    return {
      time: dataPoint.time, 
      value: dataPoint.value,
      color,
    };
  });
  Histogram.setData(relativeVolumeData);
});

watch(EARNdates, (newEARNdates) => {
  newEARNdates.sort((a, b) => {
    return a.time.year - b.time.year || a.time.month - b.time.month || a.time.day - b.time.day;
  });
  const markers1 = newEARNdates.map((date) => {
    return {
      time: date.time,
      position: 'aboveBar',
      color: '#8c8dfe', 
      shape: 'circle',
      size: 1,
      text: 'E',
      tooltip: 'Earnings Date',
    };
  });
  Histogram.setMarkers(markers1); 
});


watch(SPLITdates, (newSPLITdates) => {
  newSPLITdates.sort((a, b) => {
    return a.time.year - b.time.year || a.time.month - b.time.month || a.time.day - b.time.day;
  });
const markers2 = newSPLITdates.map((date) => {
    return {
      time: date.time,
      position: 'aboveBar',
      color: '#8c8dfe', 
      shape: 'circle',
      size: 1,
      text: 'S',
      tooltip: 'Earnings Date',
    };
  });
  barSeries.setMarkers(markers2);
});

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
      <strong class="${className}"><span style="color: white">Open:</span> ${priceOpen}</strong>
      <strong class="${className}"><span style="color: white">High:</span> ${priceHigh}</strong>
      <strong class="${className}"><span style="color: white">Low:</span> ${priceLow}</strong>
      <strong class="${className}"><span style="color: white">Close:</span> ${priceClose}</strong>
      <strong class="${className}">${priceChange}</strong>
      <strong class="${className}">${changePerc}</strong>
    `;
  }
}

  chart.subscribeCrosshairMove(param => {
  if (param.time) {
    let changes;
    if (chartView.value === 'D') {
      changes = calculateChanges(data.value);
    } else if (chartView.value === 'W') {
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
        <strong class="${className}"><span style="color: white">Open:</span> ${priceOpen}</strong>
        <strong class="${className}"><span style="color: white">High:</span> ${priceHigh}</strong>
        <strong class="${className}"><span style="color: white">Low:</span> ${priceLow}</strong>
        <strong class="${className}"><span style="color: white">Close:</span> ${priceClose}</strong>
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
      <strong style="color: white">${period}: <span class="${className}">${returns[period]}</span></strong>
    `;
  });

  legend3.innerHTML = html;
}

  await fetchData();
  await fetchData2();
  await fetchData3();
  await fetchData4();
  await fetchData5();
  await fetchData6();
  await fetchData7();
  await fetchData8();
  await fetchData9();
  await fetchData10();
  await fetchData11();
  await fetchData12();
  await fetchEarningsDate();
  await fetchSplitsDate();
  updateLegend3(data.value);
  isLoading.value = false

  watch(data, (newData) => {
  updateLegend3(newData);
});

  } catch (error) {
  } finally {
    isInitializing.value = false;
  }

});

async function toggleChartView() {
  chartView.value = chartView.value === 'D' ? 'W' : 'D';
  useAlternateData = !useAlternateData;
    await fetchData();
    await fetchData2();
    await fetchData3();
    await fetchData4();
    await fetchData5();
    await fetchData6();
    await fetchData7();
    await fetchData8();
    await fetchData9();
    await fetchData10();
    await fetchData11();
    await fetchData12();
}

const watchlist = reactive([]); // dynamic list containing watchlist names for every user 
const watchlist2 = reactive([]); // dynamic list containing content of watchlists
const quotes = reactive({}); // dynamic list containing quotes for elements of watchlist
const changes = reactive ({}); // dynamic list containing price changes for elements of watchlist
const perc = reactive({}); // dynamic list containing % changes for elements of watchlist
const selectedWatchlist = ref(JSON.parse(localStorage.getItem('selectedWatchlist')) || null);

function updateSelectedWatchlist(watch) {
  selectedWatchlist.value = watch;
  localStorage.setItem('selectedWatchlist', JSON.stringify(watch));
}

const showCreateWatchlist = ref(false)
const showRenameWatchlist = ref(false)
const showCreateNote = ref(false)

// generates all watchlist names 
async function getWatchlists() {
  try {
    user = store.getters.getUser;
    if (!user) {
      return;
    }
    try {
      const response = await fetch(`/api/${user}/watchlists/${apiKey}`);
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
    const response = await fetch(`/api/${user}/watchlists/${selectedWatchlist.value.Name}/${apiKey}`);
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
  }
}

const ImagePaths = ref([]);

// Async function to fetch symbols and exchanges and fills ImagePaths 
async function fetchSymbolsAndExchanges() {
  try {
    const response = await fetch(`/api/symbols-exchanges/${apiKey}`);
    
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
    const response = await fetch(`/api/${item}/data-values/${apiKey}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Assign the values to the reactive objects
    quotes[item] = parseFloat(data.close).toFixed(2);
    changes[item] = parseFloat(data.closeDiff);
    perc[item] = parseFloat(data.percentChange);

  } catch (error) {
  }
}

async function CreateWatchlist() {
  user = user;
  const watchlistName = document.getElementById('inputcreate').value;
  const existingWatchlists = watchlist.tickers.map(watch => watch.Name);

  // Check for existing watchlist
  if (existingWatchlists.includes(watchlistName)) {
    notification.value.show('Watchlist already exists');
    return;
  }

  // Check for length
  if (watchlistName.length > 20) {
    notification.value.show('Watchlist name cannot exceed 20 characters.');
    return;
  }

  try {
    const response = await fetch(`/api/${user}/create/watchlists/${watchlistName}/${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    // Check if the request was successful
    if (response.ok) {
    } else {
      const errorData = await response.json();
    }
  } catch (error) {
  }
  showCreateWatchlist.value = false;
  await getWatchlists();
  
  // Find the newly created watchlist and select it
  const newWatchlist = watchlist.tickers.find(watch => watch.Name === watchlistName);
  if (newWatchlist) {
    await filterWatchlist(newWatchlist);
  }
}

async function UpdateWatchlist() {
  user = user;
  const watchlistName = document.getElementById('inputrename').value;
  const existingWatchlists = watchlist.tickers.map(watch => watch.Name)

  // Check if watchlist already exists
  if (existingWatchlists.includes(watchlistName)) {
    notification.value.show('Watchlist already exists');
    return
  }

  // Check if watchlist name is empty
  if (!watchlistName) {
    return;
  }

  // Check if watchlist name exceeds 20 characters
  if (watchlistName.length > 20) {
    notification.value.show('Watchlist name cannot exceed 20 characters.');
    return;
  }

  try {
    const response = await fetch(`/api/${user}/rename/watchlists/${selectedWatchlist.value.Name}/${apiKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newname: watchlistName })
    });

    // Check if the request was successful
    if (response.ok) {
    } else {
      const errorData = await response.json();
    }
  } catch (error) {
  }
  
  showRenameWatchlist.value = false;
  await getWatchlists();

  // Find the newly created watchlist and select it
  const newWatchlist = watchlist.tickers.find(watch => watch.Name === watchlistName);
  if (newWatchlist) {
    await filterWatchlist(newWatchlist);
  }
} 

async function DeleteWatchlist(watch) {
  user = user;
  const currentWatchlistName = watch.Name;

  // Set up the API request
  const apiUrl = `/api/${user}/delete/watchlists/${currentWatchlistName}/${apiKey}`; 
  const requestOptions = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ currentWatchlistName })
  };

  try {
    // Send the request
    const response = await fetch(apiUrl, requestOptions);
    const data = await response.json();

  } catch (error) {
  }
  await getWatchlists();
  await filterWatchlist();
}

async function deleteTicker(item) {
  user = user; // Ensure user is defined

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
    const response = await fetch(`/api/${user}/deleteticker/watchlists/${patchData.watchlist}/${patchData.ticker}/${apiKey}`, { 
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(patchData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete ticker: ${response.status}`);
    }

    const data = await response.json();
  } catch (error) {
    console.error('Error in deleteTicker function:', error);
  }

  // Refresh the watchlists after deletion
  await getWatchlists();
  await filterWatchlist();
  await getFullWatchlists(user);
}

async function addWatchlist() {
  user = user;
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
      const response = await fetch(`/api/chart/${symbol}/${apiKey}`);
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
      const patchResponse = await fetch(`/api/${user}/watchlists/${patchData.Name}/${apiKey}`, { // Use the value of the option
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(patchData)
      });

        // Check for 400 response from the PATCH request
        if (patchResponse.status === 400) {
        const errorResponse = await patchResponse.json();
        notification.value.show(errorResponse.message || 'Limit reached, cannot add more than 100 symbols per watchlist');
        return;
      }

      const data = await patchResponse.json();
      await fetchItemData(symbol);
      await filterWatchlist();
    }
  } catch (err) {
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
  autoplayTimeoutId = setTimeout(logElement, 5000); // 7 seconds
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

    const response = await fetch(`/api/watchlists/update-order/${user}/${selectedOption}/${apiKey}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Error updating watchlist order: ${response.status}`);
    }
    await filterWatchlist(); // Refresh the watchlists after updating order

  } catch (error) {
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
    const response = await fetch(`/api/watchlist/addticker/${isAdding ? 'true' : 'false'}/${apiKey}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
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
    // You might want to update your local state here based on the server response
  } catch (error) {
    console.error('Error updating watchlist:', error)
    // You might want to revert the checkbox state here if the API call fails
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

async function getFullWatchlists(user){
  const response = await fetch(`/api/${user}/full-watchlists/${apiKey}`)
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

const noteContent = ref('');
const characterCount = ref(0);

const updateCharacterCount = () => {
  characterCount.value = noteContent.value.length;
};

const watchlistName = ref('');

const hiddenList = ref([]);

async function fetchHiddenList() {
  user=user
  try {
    const response = await fetch(`/api/${user}/hidden/${apiKey}`);

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

</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

#main {
  display: flex;
  height: 100%;
  max-height: 760px;
}

#sidebar-left {
  flex: 1;
  flex-direction: column;
  background-color: $base4; 
  overflow-y: scroll;
  overflow-x: hidden;
  min-width: 300px;
}

#chart-container {
  position: relative;
  flex: 3;
  display: flex;
  height: 100%;
  flex-direction: column;
  background-repeat: no-repeat;
  max-width: 800px;
  max-height: 800px;
}

#chartdiv {
  flex: 1;
  border: none;
}

#chartdiv2 {
  padding: 10px;
  border:none;
  background-color: $base2;
  color: $text2;
}

#sidebar-right {
  display: flex;
  flex-direction: column;
  background-color: $base4;
  overflow-y: scroll;
  min-width: 300px;
}

#wlnav {
  border-top: $base1 solid 1px;
  display: flex;
  align-items: center; 
  justify-content: space-between; 
  background-color: $base2;
}

#realwatchlist {
  height: 20px; 
  outline: none;
  border: none;
  color: $text2;
  text-align: center;
  flex-grow: 1; 
  background-color: transparent;
}

.wlbtn {
  flex-shrink: 0;
  color: $text1;
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
  background-color: $base2;
  position: relative;
}

/* input for searching symbols */
#searchbar {
  border-radius: 25px;
  padding: 5px 5px 5px 15px;
  margin: 7px;
  width: calc(100% - 30px); /* Make space for the button */
  outline: none;
  color: $base3; /* Dark text color */
  transition: border-color 0.3s, box-shadow 0.3s; /* Smooth transition for focus effects */
  border: solid 1px $base1;
  background-color:$base4;
}

#searchbar:focus {
  border-color: $accent1; /* Change border color on focus */
  box-shadow: 0 0 5px rgba(140, 141, 254, 0.5); /* Subtle shadow effect */
  outline: none; /* Remove default outline */
}

/* button for searching symbols, inside searchbar */
.wlbtn2 {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  flex-shrink: 0;
  color: #ffffff;
  background-color: $accent1;
  border: none;
  padding: 0;
  outline: none;
  cursor: pointer;
  height: 22px;
  width: 22px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.2s ease-in-out;
}

.wlbtn2:hover {
  background-color: $accent2;
  box-shadow: 0 0 5px rgba(140, 141, 254, 0.5);
  outline: none;
}


#notes-container {
  background-color: $base4;
  color: aliceblue;
  width: 300px;
  height: 80px;
  padding-left: 5px;
  padding-top: 5px;
  margin: 5px;
  border: 1px solid $base4;
  border-radius: 5px;
  outline: none;
  resize: none;
}

#idSummary {
  color: $text1;
}

.description {
  border: none;
  text-align: center;
  overflow: hidden; /* Hide overflow when not expanded */
  transition: height 0.3s ease; /* Smooth transition for height */
  /* Set a fixed height when not expanded */
  height: 50px; /* This should match your minHeight */
}

.description.expanded {
  height: auto; /* Allow full height when expanded */
}

.response {
  text-align: right;
  border: none;
}

/* note section */
.title {
  background-color: $base1;
  color: $text1;
  text-align: center;
  padding: 3.5px;
  border: none;
  margin: 0;
}

.note {
  background-color: $accent1;
  color: $text2;
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
  color: $text2;
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
  width: 8px;
  height: 8px;
  border: none;
}

.inline-note {
  opacity: 0.50;
  border: none;
}

.note-msg {
  color: $text2;
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
  color: $base2;
  border: none;
  bottom: 11.5px;
  left: 14px;
  position: relative;
}

.tbl{
  text-align: center;
  background-color: $base1;
  border: none;
  color: whitesmoke;
  cursor: pointer;
}

.tbl:hover {
  background-color: $base2;
}

.ntbl{
  text-align: center;
  background-color: $base1;
  border: none;
  color: $text2;
}

#title2 {
  color: $text2;
  text-align: center;
  padding: 3.5px;
  border: none;
  margin: 0px;
  background-color: $base4;
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
  color: $text2;
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
  color: $text2;
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
  color: $text2;
  border: none;
  margin-top: 20px;
  margin-left: 12px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 2px;
}

.ticker{
color: $text1;
font-size: 20px;
font-weight: bold;
opacity: 1;
}

.name{
  color: $text1;
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
  color: $text2;
  cursor: pointer;
}

.RenameWatchlist, .CreateWatchlist {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: $base2;
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
  }

  .CreateNote {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: $base2;
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
  }

  .RenameWatchlist h3, .CreateWatchlist h3, .CreateNote h3 {
    background-color: transparent;
    color: $text1;
    border: none;
    margin-top: 10px;
  }

  .RenameWatchlist input, .CreateWatchlist input  {
    margin-bottom: 3px;
    margin-top: 5px;
    text-align: center;
    background-color: $text1;
  color: $base4;
  padding: 5px;
  outline: none;
  border: solid 1px $base1;
  }

  .RenameWatchlist input:focus , .CreateWatchlist input:focus{
  border-color: $accent1;
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
    margin: 2px ;
    border: none;
    opacity: 0.60;
  }

  .inner button:hover {
    cursor: pointer;
    opacity: 1;
  }

  .inner-logo{
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
.btnnav{
  display: flex;
  float:inline-end;
}

/* button for adding tickers to watchlists */
.navbtn{
  background-color: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.80;
}

.navbtn:hover{
  opacity: 1;
}

.wlist{
  background-color: $base2;
  height: 27px;
  margin-top: 2px;
  border-left: $base4 solid 1px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: $text1;
}

.wlist:hover{
  cursor: pointer;
}

.wlist .dbtn {
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
}

.wlist:hover .dbtn {
  opacity: 1;
}

.wlist.selected {
  background-image: linear-gradient(to right, rgba($accent1, 0.2), rgba($accent2, 0.2), rgba($accent3, 0.2), rgba($accent2, 0.2), rgba($accent1, 0.2)) !important;
  background-size: 400% 100% !important;
  border-left-color: $accent1 !important;
  border-left-width: 2px !important;
  color: $text1;
  animation: gradient 10s ease infinite;
}

@keyframes gradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.results {
  background-color: $base4;
  text-align: center;
  align-items: center;
  padding: 10px;
  height: 50px;
  border:none;
}

.results2 {
  background-color: $base4;
  text-align: center;
  align-items: center;
  padding: 100px;
  height: 50px;
  border:none;
}

.loading-container {
  position: absolute;
  top: -10%;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  border: none ;
}

/* watchlist selector dropdow menu */
.select-container {
  position: relative;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.select-container  .dropdown-container {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
}

.select-container  .dropdown-container div {
  display: none;
  background-color: $base2;
 border: none;
}

.select-container:hover  .dropdown-container div {
  display: block;
  padding: 5px;
  cursor: pointer;
}

.select-container .dropdown-container div:hover {
  background-color: $accent2;
}

.icondlt{
  background-color: transparent;
  border: none;
  padding: 0;
  float: right;
  opacity: 0.60;
}

.icondlt:hover{
  cursor: pointer;
  opacity: 1;
}

/* */ 
.toggle-btn {
  background-color: $base2;
  border: none;
  cursor: pointer;
  width: 100%;
  color: $text1;
  opacity: 0.60;
}

.toggle-btn:hover {
  background-color: $base3;
  opacity: 1;
}

.no-data {
  padding: 20px;
  text-align: center;
  background-color: $base1;
  color: $text2;
}

/* buttons inside chart, top right */
.navbtng{
  background-color: transparent;
  color: $text1;
  text-align: center;
  justify-content: center;
  cursor: pointer;
  border: solid $text2 1px;
  border-radius: 25px;
  padding: 15px;
  opacity: 0.60;
  width: 25px; 
  height: 25px; 
  align-items: center;
  margin: 2px;
  display: flex;
}

.navbtng:hover{
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
  left: 80%;
  z-index: 1000;
  background-color: transparent;
  color: $text1;
  border: none;
  flex-direction: row;
  display: flex;
}

.imgm {
  width: 20px;
  height: 20px;
  border: none;
}

/* popup divs section */
.imgbtn{
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

.dropdown-menu {
  display: none;
  cursor: pointer;
  width: 200px;
  position: absolute; 
  z-index: 1000;
  top: -10px;
  left: 20px;
}

.dropdown-menu > div {
  background-color: $base2;
  padding: 1px;
  height: 28px;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
}

.dropdown-menu > div:hover {
  background-color: $accent2;
}

.dropdown-btn:hover + .dropdown-menu, 
.dropdown-menu:hover {
  display: block;
}

.nested-dropdown {
  position: relative;
}

/* nav menu dropdown on right */
.dropdown-vnav{
  display: none;
  position: absolute;
  right: 0;
  min-width: 180px;
  box-shadow: 0 8px 16px rgba(0,0,0,0.2);
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
  background-color: $base2;
  border: none;
  color: $text1;
  text-align: left;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: $accent2;
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
  border: solid 1px red !important; /* Use !important to ensure it takes precedence */
}

.summary-container{
  display: flex;
  flex-direction: column;
  color: $text2;
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
  margin-top: 2px;
  align-items: center;
  justify-content: center;
  background-color: $base2;
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
  background-color: $base4;
}

.summary-row:last-child {
  border-bottom:none;
}

.summary-row .category {
  flex: 0 0 50%;
  font-weight: 600;
}

.summary-row .response {
  flex: 0 0 50%;
}

.eps-header, .earn-header, .sales-header{
  display: flex; 
  font-weight: bold; 
  background-color: $base1;
  text-align: center;
  color: $text1;
  height: 20px;
  justify-content: center;
  align-items: center;
}

.eps-body, .earn-body, .sales-body{
  display: flex;
  flex-direction: column;
  text-align: center;
  color: $text2;
}

.eps-row, .earn-row, .sales-row {
  display: flex;
  height: 20px;
  text-align: center;
  margin-bottom: 1px;
  justify-content: center;
  align-items: center;
  background-color: $base2;
  font-weight: bold;
}

#watch-container{
  display: flex; 
  flex-direction: row; 
  width: 100%;
}

.tbl{
  padding-top: 4px;
  padding-bottom: 4px;
}

.chart-img{
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin-right: 5px;
}

.chart-img2{
  width: 15px;
  margin-right: 5px;
}

.hidden-message {
  display: flex; /* Use flexbox for alignment */
  align-items: center; /* Center items vertically */
  justify-content: center; 
  margin-left: 10px;
  opacity: 0.60;
}

/* the sphere thingy neat watchlist, counts how many elements are inside it */
.badge {
  display: inline-block;
  padding: 2px 5px;
  font-weight: bold;
  color: $base4;
  text-align: center;
  vertical-align: baseline;
  border-radius: 25px;
  background-color: $text1;
}

/* related to dropdown menu for watchlist */
.select-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  position: relative;
}

.dropdown-icon {
  content: url('@/assets/icons/down.png');
  width: 10px;
  position: absolute;
  left: 0;
  margin: 3%;
}

.dropdown-icon-hover {
  content: url('@/assets/icons/up.png');
  width: 10px;
}

#list:focus {
  outline: none;
}
</style>
