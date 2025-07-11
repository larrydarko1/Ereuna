<template>
  <div id="wlnav">
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
          <button class="dropdown-item" @click="showCreateNoteModal" v-b-tooltip.hover title="Create a Note">
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
          <button class="dropdown-item" @click="showCreateWatchlistModal" v-b-tooltip.hover title="Create New Watchlist">
            <svg class="img4" viewBox="0 0 32.219 32.219" fill="var(--text1)" xmlns="http://www.w3.org/2000/svg">
              <path style="fill:var(--text1);"
                d="M32.144,12.402c-0.493-1.545-3.213-1.898-6.09-2.277c-1.578-0.209-3.373-0.445-3.914-0.844 c-0.543-0.398-1.304-2.035-1.978-3.482C18.94,3.17,17.786,0.686,16.166,0.68l-0.03-0.003c-1.604,0.027-2.773,2.479-4.016,5.082 c-0.684,1.439-1.463,3.07-2.005,3.463c-0.551,0.394-2.342,0.613-3.927,0.803c-2.877,0.352-5.598,0.68-6.108,2.217 c-0.507,1.539,1.48,3.424,3.587,5.424c1.156,1.094,2.465,2.34,2.67,2.98c0.205,0.639-0.143,2.414-0.448,3.977 c-0.557,2.844-1.084,5.535,0.219,6.5c0.312,0.225,0.704,0.338,1.167,0.328c1.331-0.023,3.247-1.059,5.096-2.062 c1.387-0.758,2.961-1.611,3.661-1.621c0.675,0.002,2.255,0.881,3.647,1.654c1.891,1.051,3.852,2.139,5.185,2.119 c0.414-0.01,0.771-0.117,1.06-0.322c1.312-0.947,0.814-3.639,0.285-6.494c-0.289-1.564-0.615-3.344-0.409-3.982 c0.213-0.639,1.537-1.867,2.702-2.955C30.628,15.808,32.634,13.945,32.144,12.402z M21.473,19.355h-3.722v3.797h-3.237v-3.797 h-3.768v-3.238h3.768v-3.691h3.237v3.691h3.722V19.355z"
              />
            </svg>
            New Watchlist
          </button>
          <button class="dropdown-item" @click="showRenameWatchlistModal" v-b-tooltip.hover title="Rename Watchlist">
            <svg class="img4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 5H14M14 5H19M14 5V19M9 19H14M14 19H19" stroke="var(--text1)" stroke-width="2"/>
              <path d="M11 9H4C2.89543 9 2 9.89543 2 11V15H11" stroke="var(--text1)" stroke-width="2"/>
              <path d="M17 15H20C21.1046 15 22 14.1046 22 13V9H17" stroke="var(--text1)" stroke-width="2"/>
            </svg>
            Rename Watchlist
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  watchlist: Object,
  selectedWatchlist: Object,
  showDropdown: Boolean,
});

const emit = defineEmits([
  'filterWatchlist',
  'deleteWatchlist',
  'addWatchlist',
  'autoPlay',
  'showCreateNoteModal',
  'showCreateWatchlistModal',
  'showRenameWatchlistModal'
]);

function filterWatchlist(watch) {
  emit('filterWatchlist', watch);
}
function DeleteWatchlist(watch) {
  emit('deleteWatchlist', watch);
}
function addWatchlist() {
  emit('addWatchlist');
}
function AutoPlay() {
  emit('autoPlay');
}
function showCreateNoteModal() {
  emit('showCreateNoteModal');
}
function showCreateWatchlistModal() {
  emit('showCreateWatchlistModal');
}
function showRenameWatchlistModal() {
  emit('showRenameWatchlistModal');
}
</script>