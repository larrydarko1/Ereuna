<template>
  <body>
    <Header />
  <WatchPanel
  :user="user?.Username ?? ''"
  :apiKey="apiKey"
  :defaultSymbol="defaultSymbol ?? ''"
  @select-symbol="(symbol) => { defaultSymbol = symbol; selectRow(symbol); }"
  @notify="showNotification($event)"
/>
   <div class="mobilenav">
      <button class="mnavbtn" :class="{ selected: selected === 'info' }" @click="select('info')" aria-label="Show info panel">
        Info
      </button>
      <button class="mnavbtn" :class="{ selected: selected === 'chart' }" @click="select('chart')" aria-label="Show chart panel">
        Chart
      </button>
      <button class="mnavbtn" :class="{ selected: selected === 'watchlists' }" @click="select('watchlists')" aria-label="Show watchlist panel">
        Watchlist
      </button>
    </div>
    <div id="main">
      <div id="sidebar-left" :class="{ 'hidden-mobile': selected !== 'info' }">
        <div v-if="isLoading3" style="position: relative; height: 100%;">
          <div style="position: absolute; top: 45%; left: 43%;">
            <Loader />
          </div>
        </div>
        <div v-else style="border:none">
          <div>
            <div class="editbtn" @click="showPanel = !showPanel">
              <svg v-if="!showPanel" class="edit-icon" viewBox="0 0 24 24" height="10" width="10" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" clip-rule="evenodd"
    d="M20.8477 1.87868C19.6761 0.707109 17.7766 0.707105 16.605 1.87868L2.44744 16.0363C2.02864 16.4551 1.74317 16.9885 1.62702 17.5692L1.03995 20.5046C0.760062 21.904 1.9939 23.1379 3.39334 22.858L6.32868 22.2709C6.90945 22.1548 7.44285 21.8693 7.86165 21.4505L22.0192 7.29289C23.1908 6.12132 23.1908 4.22183 22.0192 3.05025L20.8477 1.87868ZM18.0192 3.29289C18.4098 2.90237 19.0429 2.90237 19.4335 3.29289L20.605 4.46447C20.9956 4.85499 20.9956 5.48815 20.605 5.87868L17.9334 8.55027L15.3477 5.96448L18.0192 3.29289ZM13.9334 7.3787L3.86165 17.4505C3.72205 17.5901 3.6269 17.7679 3.58818 17.9615L3.00111 20.8968L5.93645 20.3097C6.13004 20.271 6.30784 20.1759 6.44744 20.0363L16.5192 9.96448L13.9334 7.3787Z"
    fill="var(--text1)"></path>
</svg>
<svg v-else class="edit-icon" viewBox="0 0 24 24" height="10" width="10" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M18 6L6 18" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
    stroke="var(--text1)"></path>
  <path d="M6 6L18 18" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
    stroke="var(--text1)"></path>
</svg>
              {{ showPanel ? 'Close Popup' : 'Edit Panel' }}
            </div>
            <transition name="fade">
              <Panel v-if="showPanel" @close="showPanel = false" @updated="fetchPanel"
                @panel-updated="handlePanelUpdated" />
            </transition>
          </div>
          <component
  v-for="(item, idx) in panelData"
  :key="item.tag === 'Notes' ? 'notes-' + (getSidebarProps(item.tag).refreshKey ?? idx) : idx"
  :is="sidebarComponentMap[item.tag]"
  v-show="!item.hidden"
  v-bind="getSidebarProps(item.tag)"
  :refresh-key="item.tag === 'Summary' ? summaryRefreshKey : undefined"
  @show-popup="showPopup = true"
  @request-full-sales="searchTicker(selectedItem ?? '', { showAllSales: true });"
  @request-full-eps="searchTicker(selectedItem ?? '', { showAllEPS: true });"
  @request-full-earnings="searchTicker(selectedItem ?? '', { showAllEarnings: true });"
/>
<FinancialsPopup
  :showPopup="showPopup"
  :ticker="selectedItem ?? ''"
  :apiKey="apiKey"
  @close="showPopup = false"
/>
          <div class="results"></div>
        </div>
      </div>
      <div id="center" :class="{ 'hidden-mobile': selected !== 'chart' }">
  <MainChart
      :apiKey="apiKey"
      :user="user?.Username ?? ''"
      :defaultSymbol="defaultSymbol ?? ''"
      :selectedSymbol="selectedSymbol"
      :assetInfo="assetInfo"
      :getImagePath="(symbol) => getImagePath(symbol, assetInfo.Exchange)"
        />
       <Notice :apiKey="apiKey"/>
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
         <SearchBar
  v-model="searchQuery"
  @search="searchTicker"
  ref="searchbarRef"
/>
         <Watchlist
           :apiKey="apiKey"
           :user="user?.Username ?? ''"
           :defaultSymbol="defaultSymbol ?? ''"
           :selectedSymbol="selectedSymbol"
           :selectedItem="selectedItem ?? ''"
           :getImagePath="(symbol, exchange) => getImagePath(symbol, exchange)"
           :ImagePaths="[]"
           @select-symbol="(symbol) => { defaultSymbol = symbol; selectRow(symbol); }"
           @refresh-notes="handleRefreshNotes"
           @notify="showNotification($event)"
         />
        </div>
      </div>
    </div>
    <NotificationPopup ref="notification" />
  </body>
</template>

<script setup lang="ts">
// main imports
import { reactive, onMounted, ref, computed, nextTick } from 'vue';
import { useUserStore } from '@/store/store';

// upper components
import Header from '@/components/Header.vue'
import WatchPanel from '@/components/charts/WatchPanel.vue';

// left panel components
import Panel from '@/components/charts/panel.vue'
import Summary from '@/components/sidebar/summary.vue'
import EpsTable from '@/components/sidebar/eps.vue'
import EarnTable from '@/components/sidebar/earn.vue'
import SalesTable from '@/components/sidebar/sales.vue'
import DividendsTable from '@/components/sidebar/dividends.vue'
import SplitsTable from '@/components/sidebar/splits.vue'
import Financials from '@/components/sidebar/financialbtn.vue'
import Notes from '@/components/sidebar/notes.vue'
import News from '@/components/sidebar/news.vue'
import FinancialsPopup from '@/components/charts/FinancialsPopup.vue';

// middle session components
import MainChart from '@/components/charts/MainChart.vue';
import Notice from '@/components/charts/Notice.vue';

// right session components
import SearchBar from '@/components/charts/Search.vue';
import Watchlist from '@/components/charts/Watchlist.vue';

// utility components
import Loader from '@/components/loader.vue';
import NotificationPopup from '@/components/NotificationPopup.vue';

const selectedSymbol = ref<string>('');
const isLoading3 = ref<boolean>(false);
const isMobile = ref<boolean>(false);
const isChartLoading = ref<boolean>(false);
const isLoading = ref<boolean>(false);
const userStore = useUserStore();
const user = computed(() => userStore.getUser);
const apiKey = import.meta.env.VITE_EREUNA_KEY;

// Error handling
const errorMessage = ref('');

// reactive code to refresh summary panel
const summaryRefreshKey = ref(0);
function handlePanelUpdated() {
  summaryRefreshKey.value++;
  fetchPanel();
}

// for popup notifications
const notification = ref<InstanceType<typeof NotificationPopup> | null>(null);
const showNotification = (msg: string) => {
  if (notification.value) notification.value.show(msg);
};
const showPopup = ref(false); // div for financial statements

const searchQuery = ref('');

// Use ref for defaultSymbol for reactivity, but pass .value to children
const defaultSymbol = ref(localStorage.getItem('defaultSymbol') || '');
const selectedItem = ref(defaultSymbol.value);

// Use ref for searchbar
const searchbarRef = ref<HTMLInputElement | null>(null);

async function fetchUserDefaultSymbol() {
  try {
    if (!user.value?.Username) {
      showNotification('User or username missing, not fetching default symbol');
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
    showNotification(error instanceof Error ? error.message : String(error));
    return null;
  }
}

// Combined onMounted logic for clarity
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
    showNotification('User not loaded, skipping API calls in onMounted');
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
  await searchTicker(defaultSymbol.value || '');
  await fetchPanel();
});

async function updateUserDefaultSymbol(symbol: string) {
  try {
    if (!user.value?.Username) {
      showNotification('User or username missing, not updating default symbol');
      return;
    }
    await fetch(`/api/${user.value.Username}/update-default-symbol`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ defaultSymbol: symbol })
    });
  } catch (error) {
    showNotification(error instanceof Error ? error.message : String(error));
  }
}

// function that searches for tickers
async function searchTicker(providedSymbol: string, options: Record<string, any> = {}) {
  let response;
  activeIndex.value = -1;
  try {
    let baseSymbol = searchQuery.value || defaultSymbol.value || '';
    let symbol = baseSymbol.toUpperCase();

    // Build query string from options
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.append(key, String(value));
    });
    const queryString = params.toString() ? `?${params.toString()}` : '';

    response = await fetch(`/api/chart/${symbol}${queryString}`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (response.status === 404) {
      showNotification('Ticker not Found');
      return;
    }

    const data = await response.json();

    searchQuery.value = data.Symbol;
    localStorage.setItem('defaultSymbol', data.Symbol);
    defaultSymbol.value = data.Symbol;
    selectedItem.value = data.Symbol;
    await updateUserDefaultSymbol(data.Symbol);

    // Set assetInfo fields, using '-' or [] for missing values
    Object.keys(assetInfo).forEach(key => {
      const assetInfoAny = assetInfo as Record<string, any>;
      if (Array.isArray(assetInfoAny[key])) {
        assetInfoAny[key] = Array.isArray(data[key]) ? data[key] : [];
      } else if (
        data[key] === undefined ||
        data[key] === null ||
        data[key] === 0 ||
        (typeof data[key] === 'number' && Number.isNaN(data[key])) ||
        (typeof data[key] === 'string' && data[key].toLowerCase() === 'NaN')
      ) {
        assetInfoAny[key] = '-';
      } else {
        assetInfoAny[key] = data[key];
      }
    });

  } catch (err) {
    showNotification(err instanceof Error ? err.message : String(err));
  }
}

// same effect input 
async function selectRow(item: string) {
  localStorage.setItem('defaultSymbol', item);
  defaultSymbol.value = item;
  selectedItem.value = item;
  searchQuery.value = item;
  await updateUserDefaultSymbol(item);
  try {
    await searchTicker(item);
  } catch (err) {
    showNotification(err instanceof Error ? err.message : String(err));
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
  MarketCapitalization: '-',
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
  Currency: '-',
});

//takes date strings inside database and converts them into actual date, in italian format
function formatDate(dateString: string) {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
  return date.toLocaleDateString('it-IT', options);
}

function getQoQClass(percentageChange: number) {
  return percentageChange > 20 ? 'green' : 'red';
}

function getYoYClass(percentageChange: number) {
  return percentageChange > 20 ? 'green' : 'red';
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
    if (err instanceof Error) {
      errorMessage.value = err.message;
    } else {
      errorMessage.value = String(err);
    }
  } 
}

type ImagePathType = { symbol: string; exchange: string };

// Flexible helper function to get static image path for any symbol/exchange
function getImagePath(symbol: string, exchange: string): string {
  const globKey = `${exchange}/${symbol}.svg`;
  if (!(getImagePath as any)._map) {
    const modules = import.meta.glob('/src/assets/images/**/**.svg', { eager: true, as: 'url' }) as Record<string, string>;
    const map: Record<string, string> = {};
    Object.keys(modules).forEach((fullPath) => {
      // fullPath examples: '/src/assets/images/NYSE/AAPL.svg'
      const parts = fullPath.split('/src/assets/images/');
      if (parts.length === 2) {
        const key = parts[1]; // e.g. 'NYSE/AAPL.svg'
        map[key] = (modules as any)[fullPath];
      }
    });
    (getImagePath as any)._map = map;
  }

  const map = (getImagePath as any)._map as Record<string, string>;
  if (map[globKey]) return map[globKey];
  const publicPath = `/assets/images/${exchange}/${symbol}.svg`;
  return publicPath;
}

const selected = ref('info')
function select(option: string) {
  selected.value = option
}

const activeIndex = ref(-1);
const showPanel = ref(false);

const refreshKey = ref(0);
function handleRefreshNotes() {
  refreshKey.value++;
}

type PanelItem = { tag: string; hidden?: boolean; [key: string]: any };
let panelData = ref<PanelItem[]>([]); // Left Panel section 

// function to retrieve the panel data for each user
async function fetchPanel() {
  try {
    const headers = {
      'x-api-key': apiKey
    };

    const response = await fetch(`/api/panel?username=${user.value?.Username ?? ''}`, {
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const newPanel = await response.json();
    panelData.value = newPanel.panel || [];

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }
    showNotification(error instanceof Error ? error.message : String(error));
  }
}

const sidebarComponentMap: Record<string, any> = {
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

function getSidebarProps(tag: string) {
  switch (tag) {
    case 'Summary':
      return {
        assetInfo,
        formatDate,
      };
    case 'EpsTable':
      return {
        formatDate,
        assetInfo,
        getQoQClass,
        getYoYClass,
        symbol: selectedItem.value,
      };
    case 'EarnTable':
      return {
        formatDate,
        assetInfo,
        getQoQClass,
        getYoYClass,
        symbol: selectedItem.value,
      };
    case 'SalesTable':
      return {
        formatDate,
        assetInfo,
        getQoQClass,
        getYoYClass,
        symbol: selectedItem.value,
      };
    case 'DividendsTable':
      return {
        formatDate,
        symbol: selectedItem.value,
        apiKey,
      };
    case 'SplitsTable':
      return {
        formatDate,
        symbol: selectedItem.value,
        apiKey,
      };
    case 'Financials':
      return {};
    case 'Notes':
      return {
        formatDate,
        symbol: selectedItem.value,
        apiKey,
        refreshKey: refreshKey.value,
        user: user.value?.Username,
        defaultSymbol
      };
    case 'News':
  return {
    formatDate,
    symbol: selectedItem.value,
    apiKey,
  };
    default:
      return {};
  }
}

</script>

<style lang="scss">
@use '../style.scss' as *;

#main {
  display: flex;
  height: 100%;
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
  min-height: 500px;
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
  height: 145px;
}

#sidebar-right {
  display: flex;
  flex-direction: column;
  background-color: var(--base4);
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
  outline: none;
  color: var(--text2);
  transition: border-color 0.3s, box-shadow 0.3s;
  border: solid 1px var(--base1);
  background-color: var(--base4);
}

#searchbar:focus {
  border-color: var(--accent1);
  outline: none;
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
  transition: height 0.3s ease;
  height: 20px;
}

.description.expanded {
  height: auto;
}

.category {
  color: var(--text1);
}

.response {
  text-align: right;
  border: none;
}

.title {
  background-color: var(--base1);
  color: var(--text1);
  text-align: center;
  padding: 3.5px;
  border: none;
  margin: 0;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text1);
}

.wlist:hover {
  cursor: pointer;
  background-color: var(--base3);
}

.wlist .dbtn {
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
}

.wlist:hover .dbtn {
  opacity: 1;
}

.wlist.selected {
  background-color: var(--base3);
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
  background-color: var(--base2);
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
  color: var(--text3);
  font-weight: bold;
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
  background-color: var(--base2);
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
  background-color: var(--base2);
  border-radius: 5px;
  cursor: pointer;
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

.chart-img2 {
  width: 15px;
  margin-right: 5px;
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

#watch-container {
  display: flex;
  flex-direction: row;
  width: 100%;
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
  flex-direction: column;
  align-items: center;
  margin-top: 50px;
}

.import-btn {
  margin-top: 12px;
  padding: 8px 18px;
  background-color: var(--base2);
  color: var(--text2);
  border: none;
  border-radius: 5px;
  font-weight: bold;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
}

.import-btn:hover {
  background-color: var(--base3);
  color: var(--text1);
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

@media (max-width: 1150px) {
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

  /* Make Watchlist sidebar fill 100% width on mobile */
  #sidebar-right {
    min-width: 0 !important;
    width: 100vw !important;
    max-width: 100vw !important;
    left: 0;
    right: 0;
    position: relative;
    box-sizing: border-box;
    padding: 0;
  }
  /* Remove extra padding from Watchlist inner containers if needed */
  #sidebar-right > div {
    padding: 0 !important;
  }

  #legend2 {
    margin-top: 55px !important;
    margin-right: 30px !important;
  }

}

</style>
