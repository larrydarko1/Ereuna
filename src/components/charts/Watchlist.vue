<template>
  <div id="wlnav">
    <CreateNote
  v-if="showCreateNoteModal"
  :user="user"
  :api-key="apiKey"
  :default-symbol="selectedItem"
  :notification="notification"
  @close="showCreateNoteModal = false"
  @refresh-notes="emit('refresh-notes', $event)"
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
<ImportWatchlist
  v-if="showImportWatchlistModal"
  :user="user"
  :api-key="apiKey"
  :selectedWatchlist="CurrentWatchlistName"
  :notification="notification"
  @close="showImportWatchlistModal = false"
  @refresh="handleImportWatchlistRefresh"
/>
    <div
      id="realwatchlist"
      class="select-container"
      @mouseover="showDropdown = true"
      @mouseout="showDropdown = false"
    >
      <svg
        class="dropdown-icon"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        :class="{ 'dropdown-icon-hover': showDropdown }"
        v-if="!showDropdown"
      >
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M12.7071 14.7071C12.3166 15.0976 11.6834 15.0976 11.2929 14.7071L6.29289 9.70711C5.90237 9.31658 5.90237 8.68342 6.29289 8.29289C6.68342 7.90237 7.31658 7.90237 7.70711 8.29289L12 12.5858L16.2929 8.29289C16.6834 7.90237 17.3166 7.90237 17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711L12.7071 14.7071Z"
          fill="var(--text1)"
        />
      </svg>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        :class="{ 'dropdown-icon': showDropdown }"
        v-else
        style="transform: rotate(180deg);"
      >
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M12.7071 14.7071C12.3166 15.0976 11.6834 15.0976 11.2929 14.7071L6.29289 9.70711C5.90237 9.31658 5.90237 8.68342 6.29289 8.29289C6.68342 7.90237 7.31658 7.90237 7.70711 8.29289L12 12.5858L16.2929 8.29289C16.6834 7.90237 17.3166 7.90237 17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711L12.7071 14.7071Z"
          fill="var(--text1)"
        />
      </svg>
      <p style="font-weight: bold;" class="selected-value" @click.stop="">
        {{ selectedWatchlist
          ? selectedWatchlist.Name
          : watchlist && watchlist.tickers && watchlist.tickers.length > 0
            ? 'Select a watch'
            : 'No Watchlists'
        }}
      </p>
      <div
        class="dropdown-container"
        v-if="watchlist && watchlist.tickers && watchlist.tickers.length > 0"
      >
        <div class="watchlist-dropdown-menu">
          <div
            class="watchlist-item"
            v-for="watch in watchlist.tickers"
            :key="watch.Name"
            :class="{ selected: selectedWatchlist && selectedWatchlist.Name === watch.Name }"
            @click="filterWatchlist(watch)"
          >
            {{ watch.Name }}
            <span class="badge">{{ watch.List.length }}</span>
            <button
              class="icondlt"
              id="watchlistDelete"
              @click.stop="DeleteWatchlist(watch)"
              v-b-tooltip.hover
              title="Delete Watchlist"
            >
              <svg class="imgm" viewBox="0 0 16 16" fill="var(--text1)" xmlns="http://www.w3.org/2000/svg">
                <rect transform="rotate(45)" y="-1" x="4.3137083" height="2" width="14" style="fill:var(--text1);" />
                <rect transform="rotate(-45)" y="10.313708" x="-7" height="2" width="14" style="fill:var(--text1);" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    <button class="navbtn" @click="addWatchlist" v-b-tooltip.hover title="Add ticker to watchlist">
      <svg class="img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 12H20M12 4V20" stroke="var(--text1)" stroke-width="1.944" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span>Add Symbol</span>
    </button>
    <div class="wlnav-dropdown">
      <button class="dropdown-toggle wlbtn" v-b-tooltip.hover title="More Options">
        <svg class="img" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 12C9.10457 12 10 12.8954 10 14C10 15.1046 9.10457 16 8 16C6.89543 16 6 15.1046 6 14C6 12.8954 6.89543 12 8 12Z" fill="var(--text1)"></path>
          <path d="M8 6C9.10457 6 10 6.89543 10 8C10 9.10457 9.10457 10 8 10C6.89543 10 6 9.10457 6 8C6 6.89543 6.89543 6 8 6Z" fill="var(--text1)"></path>
          <path d="M10 2C10 0.89543 9.10457 -4.82823e-08 8 0C6.89543 4.82823e-08 6 0.895431 6 2C6 3.10457 6.89543 4 8 4C9.10457 4 10 3.10457 10 2Z" fill="var(--text1)"></path>
        </svg>
      </button>
      <div class="dropdown-vnav">
        <div class="watchlist-dropdown-menu2">
          <button class="dropdown-item" @click="AutoPlay" v-b-tooltip.hover title="Autoplay Watchlist">
            <svg class="img4" viewBox="0 0 16 16" fill="var(--text1)" xmlns="http://www.w3.org/2000/svg">
              <path fill="var(--text1)" fill-rule="evenodd"
                d="M5.23331,0.493645 C6.8801,-0.113331 8.6808,-0.161915 10.3579,0.355379 C11.4019,0.6773972 12.361984,1.20757325 13.1838415,1.90671757 L13.4526,2.14597 L14.2929,1.30564 C14.8955087,0.703065739 15.9071843,1.0850774 15.994017,1.89911843 L16,2.01275 L16,6.00002 L12.0127,6.00002 C11.1605348,6.00002 10.7153321,5.01450817 11.2294893,4.37749065 L11.3056,4.29291 L12.0372,3.56137 C11.389,2.97184 10.6156,2.52782 9.76845,2.26653 C8.5106,1.87856 7.16008,1.915 5.92498,2.37023 C4.68989,2.82547 3.63877,3.67423 2.93361,4.78573 C2.22844,5.89723 1.90836,7.20978 2.02268,8.52112 C2.13701,9.83246 2.6794,11.0698 3.56627,12.0425 C4.45315,13.0152 5.63528,13.6693 6.93052,13.9039 C8.22576,14.1385 9.56221,13.9407 10.7339,13.3409 C11.9057,12.7412 12.8476,11.7727 13.4147,10.5848 C13.6526,10.0864 14.2495,9.8752 14.748,10.1131 C15.2464,10.351 15.4575,10.948 15.2196,11.4464 C14.4635,13.0302 13.2076,14.3215 11.6453,15.1213 C10.0829,15.921 8.30101,16.1847 6.57402,15.8719 C4.84704,15.559 3.27086,14.687 2.08836,13.39 C0.905861,12.0931 0.182675,10.4433 0.0302394,8.69483 C-0.122195,6.94637 0.304581,5.1963 1.2448,3.7143 C2.18503,2.2323 3.58652,1.10062 5.23331,0.493645 Z M6,5.46077 C6,5.09472714 6.37499031,4.86235811 6.69509872,5.0000726 L6.7678,5.03853 L10.7714,7.57776 C11.0528545,7.75626909 11.0784413,8.14585256 10.8481603,8.36273881 L10.7714,8.42224 L6.7678,10.9615 C6.45867857,11.1575214 6.06160816,10.965274 6.00646097,10.6211914 L6,10.5392 L6,5.46077 Z"/>
            </svg>
            Autoplay
          </button>
          <button class="dropdown-item" @click="showCreateNoteModal = true" v-b-tooltip.hover title="Create a Note">
            <svg class="img4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g id="File / Note_Edit">
                <path id="Vector"
                  d="M10.0002 4H7.2002C6.08009 4 5.51962 4 5.0918 4.21799C4.71547 4.40973 4.40973 4.71547 4.21799 5.0918C4 5.51962 4 6.08009 4 7.2002V16.8002C4 17.9203 4 18.4801 4.21799 18.9079C4.40973 19.2842 4.71547 19.5905 5.0918 19.7822C5.5192 20 6.07899 20 7.19691 20H16.8031C17.921 20 18.48 20 18.9074 19.7822C19.2837 19.5905 19.5905 19.2839 19.7822 18.9076C20 18.4802 20 17.921 20 16.8031V14M16 5L10 11V14H13L19 8M16 5L19 2L22 5L19 8M16 5L19 8"
                  stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                />
              </g>
            </svg>
            Create Note
          </button>
          <button class="dropdown-item" @click="showCreateWatchlistModal = true" v-b-tooltip.hover title="Create New Watchlist">
            <svg class="img4" viewBox="0 0 32.219 32.219" fill="var(--text1)" xmlns="http://www.w3.org/2000/svg">
              <path style="fill:var(--text1);"
                d="M32.144,12.402c-0.493-1.545-3.213-1.898-6.09-2.277c-1.578-0.209-3.373-0.445-3.914-0.844 c-0.543-0.398-1.304-2.035-1.978-3.482C18.94,3.17,17.786,0.686,16.166,0.68l-0.03-0.003c-1.604,0.027-2.773,2.479-4.016,5.082 c-0.684,1.439-1.463,3.07-2.005,3.463c-0.551,0.394-2.342,0.613-3.927,0.803c-2.877,0.352-5.598,0.68-6.108,2.217 c-0.507,1.539,1.48,3.424,3.587,5.424c1.156,1.094,2.465,2.34,2.67,2.98c0.205,0.639-0.143,2.414-0.448,3.977 c-0.557,2.844-1.084,5.535,0.219,6.5c0.312,0.225,0.704,0.338,1.167,0.328c1.331-0.023,3.247-1.059,5.096-2.062 c1.387-0.758,2.961-1.611,3.661-1.621c0.675,0.002,2.255,0.881,3.647,1.654c1.891,1.051,3.852,2.139,5.185,2.119 c0.414-0.01,0.771-0.117,1.06-0.322c1.312-0.947,0.814-3.639,0.285-6.494c-0.289-1.564-0.615-3.344-0.409-3.982 c0.213-0.639,1.537-1.867,2.702-2.955C30.628,15.808,32.634,13.945,32.144,12.402z M21.473,19.355h-3.722v3.797h-3.237v-3.797 h-3.768v-3.238h3.768v-3.691h3.237v3.691h3.722V19.355z"
              />
            </svg>
            New Watchlist
          </button>
          <button class="dropdown-item" @click="showRenameWatchlistModal = true" v-b-tooltip.hover title="Rename Watchlist">
            <svg class="img4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 5H14M14 5H19M14 5V19M9 19H14M14 19H19" stroke="var(--text1)" stroke-width="2"/>
              <path d="M11 9H4C2.89543 9 2 9.89543 2 11V15H11" stroke="var(--text1)" stroke-width="2"/>
              <path d="M17 15H20C21.1046 15 22 14.1046 22 13V9H17" stroke="var(--text1)" stroke-width="2"/>
            </svg>
            Rename Watchlist
          </button>
          <button class="dropdown-item" @click="exportWatchlist" v-b-tooltip.hover title="Export Watchlist">
            <svg class="img4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 16V4M12 16L8 12M12 16L16 12" stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <rect x="4" y="18" width="16" height="2" rx="1" fill="var(--text1)"/>
            </svg>
            Export Watchlist
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
        <div v-if="isLoading2" style="position: relative; height: 100%;">
          <div style="position: absolute; top: 45%; left: 43%;">
            <Loader />
          </div>
        </div>
          <div id="list" ref="watchlistContainer" tabindex="0" @keydown="handleKeydown" @click="handleClick">
            <div v-if="watchlist2.tickers && watchlist2.tickers.length > 0">
              <div ref="sortable">
                <div v-for="(item, index) in watchlist2.tickers" :key="item"
                  :class="{ 'selected': selectedItem === item, 'wlist': true }" @click="selectSymbol(item, index);">
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
                     <svg class="imgm" viewBox="0 0 16 16" fill="var(--text1)" xmlns="http://www.w3.org/2000/svg">
  <rect transform="rotate(45)" y="-1" x="4.3137083" height="2" width="14" style="fill:var(--text1);" />
  <rect transform="rotate(-45)" y="10.313708" x="-7" height="2" width="14" style="fill:var(--text1);" />
</svg></button>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="empty-list-message">
              <svg fill="var(--text1)" height="20px" width="20px" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                <path d="M493.297,159.693c-12.477-30.878-31.231-59.828-56.199-84.792c-24.964-24.967-53.914-43.722-84.793-56.199 C321.426,6.222,288.617,0,255.823,0c-32.748,0-65.497,6.249-96.315,18.743c-30.814,12.491-59.695,31.244-84.607,56.159 c-24.915,24.912-43.668,53.793-56.158,84.607C6.25,190.325,0.001,223.073,0.001,255.823c0,32.794,6.222,65.602,18.701,96.484 c12.477,30.878,31.231,59.828,56.199,84.793c24.964,24.967,53.914,43.722,84.792,56.199c30.882,12.48,63.69,18.701,96.484,18.701 c32.748,0,65.497-6.249,96.314-18.743c30.814-12.49,59.695-31.242,84.607-56.158c24.917-24.913,43.67-53.794,56.16-84.608 c12.493-30.817,18.743-63.566,18.743-96.315C511.999,223.383,505.778,190.575,493.297,159.693z M461.611,339.661 c-10.821,26.683-27.019,51.648-48.659,73.291c-21.643,21.64-46.608,37.837-73.292,48.657 c-26.679,10.818-55.078,16.241-83.484,16.241c-28.477,0-56.947-5.405-83.688-16.213c-26.744-10.813-51.76-27.007-73.441-48.685 c-21.678-21.682-37.873-46.697-48.685-73.441C39.554,312.77,34.149,284.3,34.149,255.823c0-28.406,5.423-56.804,16.241-83.484 c10.821-26.683,27.018-51.648,48.659-73.291c21.643-21.64,46.608-37.837,73.291-48.659c26.679-10.818,55.078-16.241,83.484-16.241 c28.477,0,56.947,5.405,83.688,16.214c26.744,10.813,51.76,27.008,73.441,48.685c21.677,21.681,37.873,46.697,48.685,73.441 c10.808,26.741,16.214,55.211,16.214,83.688C477.852,284.583,472.429,312.981,461.611,339.661z"/>
                <path d="M385.946,126.055c-6.524-6.525-17.102-6.525-23.626,0l-36.278,36.278c-7.82-5.861-16.298-10.691-25.249-14.389 c-14.036-5.803-29.225-8.832-44.792-8.83c-15.572-0.002-30.761,3.027-44.797,8.83c-14.037,5.799-26.917,14.372-37.901,25.36 c-11.376,11.375-19.956,24.598-25.656,38.689c-5.704,14.094-8.547,29.054-8.548,44.007c0,14.954,2.843,29.914,8.548,44.007 c3.693,9.131,8.603,17.892,14.691,26.027l-36.285,36.285c-6.524,6.524-6.524,17.102,0,23.627c6.525,6.524,17.102,6.524,23.627,0 l36.278-36.278c7.82,5.861,16.298,10.691,25.249,14.389c14.036,5.803,29.225,8.832,44.792,8.83 c15.572,0.002,30.761-3.027,44.797-8.83c14.037-5.799,26.917-14.372,37.901-25.359c11.376-11.375,19.955-24.599,25.656-38.689 c5.704-14.094,8.547-29.054,8.548-44.007c0-14.954-2.843-29.914-8.548-44.008c-3.693-9.131-8.603-17.892-14.691-26.027 l36.285-36.285C392.47,143.157,392.47,132.579,385.946,126.055z M178.621,287.472c-4.066-10.044-6.108-20.754-6.107-31.471 c0-10.717,2.042-21.428,6.107-31.472c4.07-10.047,10.146-19.431,18.31-27.599c7.908-7.906,17.06-13.98,27.036-18.106 c9.978-4.122,20.783-6.295,32.033-6.296c11.245,0.002,22.051,2.174,32.03,6.297c4.897,2.025,9.593,4.525,14.044,7.476 L186.305,302.069C183.229,297.418,180.669,292.53,178.621,287.472z M333.38,287.472c-4.07,10.047-10.146,19.431-18.31,27.599 c-7.908,7.906-17.06,13.98-27.036,18.106c-9.978,4.122-20.783,6.295-32.033,6.296c-11.245-0.002-22.05-2.174-32.03-6.297 c-4.897-2.025-9.593-4.526-14.044-7.476l115.769-115.769c3.076,4.651,5.636,9.539,7.684,14.597 c4.066,10.044,6.108,20.754,6.107,31.472C339.488,266.717,337.446,277.427,333.38,287.472z"/>
              </svg>
              <p>This list is empty</p>
              <button v-if="watchlist.tickers && watchlist.tickers.length > 0" class="import-btn" @click="showImportWatchlistModal = true">
                Import Watchlist
              </button>
            </div>
          </div>
</template>

<script setup>
import { ref, watch, computed, nextTick, onMounted, reactive } from 'vue';
import Sortable from 'sortablejs';
import CreateNote from '@/components/charts/CreateNote.vue'
import CreateWatchlist from '@/components/charts/CreateWatchlist.vue'
import RenameWatchlist from '@/components/charts/RenameWatchlist.vue'
import ImportWatchlist from '@/components/charts/ImportWatchlist.vue'

const props = defineProps({
  apiKey: {
    type: String,
    required: true
  },
  user: {
    type: String,
    required: true
  },
  defaultSymbol: {
    type: String,
    required: true
  },
  selectedSymbol: {
    type: String,
    default: null
  },
  selectedItem: {
    type: String,
    default: null
  },
  getImagePath: {
    type: Function,
    required: true
  },
  ImagePaths: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['select-symbol', 'refresh-notes']);

// status for loading bars 
const isLoading2 = ref(true);
const isLoading3 = ref(true);

const showDropdown = ref(false)
const showCreateNoteModal = ref(false)
const showCreateWatchlistModal = ref(false)
const showRenameWatchlistModal = ref(false)
const showImportWatchlistModal = ref(false)

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
    props.getImagePath(item)
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
    ]);

    if (watchlist2.tickers && watchlist2.tickers.length > 0) {
      await Promise.all(watchlist2.tickers.map(fetchItemData));
    }

    await nextTick();

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

const watchlist = reactive([]); // dynamic list containing watchlist names for every user 
const watchlist2 = reactive([]); // dynamic list containing content of watchlists
const quotes = reactive({}); // dynamic list containing quotes for elements of watchlist
const changes = reactive({}); // dynamic list containing price changes for elements of watchlist
const perc = reactive({}); // dynamic list containing % changes for elements of watchlist
const selectedWatchlist = ref(JSON.parse(localStorage.getItem('selectedWatchlist')) || null);
const CurrentWatchlistName = computed(() => selectedWatchlist.value?.Name || '');

function updateSelectedWatchlist(watch) {
  selectedWatchlist.value = watch;
  localStorage.setItem('selectedWatchlist', JSON.stringify(watch));
}

// generates all watchlist names 
async function getWatchlists() {
    try {
      const response = await fetch(`/api/${props.user}/watchlists`, {
        headers: {
          'X-API-KEY': props.apiKey,
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
}

// generates the current watchlist tickers 
async function filterWatchlist(watch) {
  if (watch) {
    updateSelectedWatchlist(watch);
  }

  try {
    const response = await fetch(`/api/${props.user}/watchlists/${selectedWatchlist.value.Name}`, {
      headers: {
        'X-API-KEY': props.apiKey,
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

async function getData(items) {
  if (!Array.isArray(items)) items = [items];
  try {
    // Join tickers as comma-separated for the query param
    const tickersParam = items.map(encodeURIComponent).join(',');
    const response = await fetch(`/api/data-values?tickers=${tickersParam}`, {
      headers: {
        'X-API-KEY': props.apiKey,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // Assume data is an object: { TICKER: {close, closeDiff, percentChange}, ... }
    for (const item of items) {
      if (data[item]) {
        quotes[item] = parseFloat(data[item].close).toFixed(2);
        changes[item] = parseFloat(data[item].closeDiff);
        perc[item] = parseFloat(data[item].percentChange);
      }
    }
  } catch (error) {
    error.value = error.message;
  }
}

async function DeleteWatchlist(watch) {
  const currentWatchlistName = watch.Name;

  // Set up the API request
  const apiUrl = `/api/${props.user}/delete/watchlists/${currentWatchlistName}`;
  const requestOptions = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': props.apiKey,
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
    const response = await fetch(`/api/${props.user}/deleteticker/watchlists/${patchData.watchlist}/${patchData.ticker}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
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
          'X-API-KEY': props.apiKey,
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
      const patchResponse = await fetch(`/api/${props.user}/watchlists/${patchData.Name}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': props.apiKey,
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
  await getFullWatchlists(props.user);
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
    selectedIndex.value = watchlist2.tickers.findIndex((item) => item === props.selectedItem);
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
      selectSymbol(newSelectedItem);
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
      user: props.user,
      Name: selectedOption,
      newListOrder,
    };

    const response = await fetch(`/api/watchlists/update-order/${props.user}/${selectedOption}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
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
  await getFullWatchlists(props.user);
  await filterWatchlist();
  await getWatchlists();
};

async function addtoWatchlist(ticker, symbol, $event) {
  const isChecked = $event.target.checked;
  const isAdding = isChecked;
  try {
    const response = await fetch(`/api/watchlist/addticker/${isAdding ? 'true' : 'false'}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify({
        watchlistName: ticker.Name,
        symbol: symbol,
        user: props.user
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
  getFullWatchlists(props.user);
  isAssetInWatchlist(ticker, symbol);
};

const FullWatchlists = ref([]);

async function getFullWatchlists(user) {
  try {
    const response = await fetch(`/api/${props.user}/full-watchlists`, {
      headers: {
        'X-API-KEY': props.apiKey,
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
getFullWatchlists(props.user);


const isAssetInWatchlist = (ticker, symbol) => {
  const watchlist = FullWatchlists.value.find(w => w.Name === ticker);
  if (watchlist) {
    return watchlist.List.includes(symbol);
  }
  return false;
};

// Export Watchlist logic
function exportWatchlist() {
  if (!watchlist2.tickers || watchlist2.tickers.length === 0) return;
  const imagePathsArray = Array.isArray(props.ImagePaths) ? props.ImagePaths : [];
  const exportList = watchlist2.tickers.map(symbol => {
    let exchange = '-';
    // Try to match symbol case-insensitively
    const imageObj = imagePathsArray.find(img => img.symbol && img.symbol.toUpperCase() === symbol.toUpperCase());
    if (imageObj && imageObj.exchange) exchange = imageObj.exchange;
    return `${exchange}:${symbol}`;
  });
  const fileName = selectedWatchlist.value?.Name
    ? `${selectedWatchlist.value.Name}.txt`
    : 'watchlist.txt';
  const blob = new Blob([exportList.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleImportWatchlistRefresh() {
  filterWatchlist(selectedWatchlist.value);
  showImportWatchlistModal.value = false;
}

function selectSymbol(symbol, index) {
  emit('select-symbol', symbol);
  if (typeof index === 'number') {
    selectedIndex.value = index;
  }
}

</script>