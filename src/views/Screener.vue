<template>
  <body>
    <Header />
       <div class="mobilenav">
    <button
      class="mnavbtn"
      :class="{ selected: selected === 'filters' }"
      @click="select('filters')"
    >
      Filters
    </button>
    <button
      class="mnavbtn"
      :class="{ selected: selected === 'list' }"
      @click="select('list')"
    >
      List
    </button>
    <button
      class="mnavbtn"
      :class="{ selected: selected === 'charts' }"
      @click="select('charts')"
    >
      Charts
    </button>
  </div>
    <div id="main2">
      <div class="tooltip-container" style="position: relative;">
  <div class="tooltip" v-if="showTooltip" :style="{ top: tooltipTop + 'px', left: tooltipLeft + 'px' }">
    <span class="tooltip-text">{{ tooltipText }}</span>
  </div>
</div>
      <div id="filters" :class="{ 'hidden-mobile': selected !== 'filters' }">
        <div id="screener-select" class="select-container" :class="{ 'error-border': isScreenerError }" @mouseover="showDropdown = true" @mouseout="showDropdown = false">
           <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
      :class="{ 'dropdown-icon': showDropdown }" 
      v-if="!showDropdown">
  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
  <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
  <g id="SVGRepo_iconCarrier"> 
    <path fill-rule="evenodd" clip-rule="evenodd" d="M12.7071 14.7071C12.3166 15.0976 11.6834 15.0976 11.2929 14.7071L6.29289 9.70711C5.90237 9.31658 5.90237 8.68342 6.29289 8.29289C6.68342 7.90237 7.31658 7.90237 7.70711 8.29289L12 12.5858L16.2929 8.29289C16.6834 7.90237 17.3166 7.90237 17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711L12.7071 14.7071Z" fill="var(--text1)"></path> 
  </g>
</svg>
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" 
      :class="{ 'dropdown-icon': showDropdown }" 
      v-else transform="matrix(1, 0, 0, 1, 0, 0)rotate(180)">
  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
  <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
  <g id="SVGRepo_iconCarrier"> 
    <path fill-rule="evenodd" clip-rule="evenodd" d="M12.7071 14.7071C12.3166 15.0976 11.6834 15.0976 11.2929 14.7071L6.29289 9.70711C5.90237 9.31658 5.90237 8.68342 6.29289 8.29289C6.68342 7.90237 7.31658 7.90237 7.70711 8.29289L12 12.5858L16.2929 8.29289C16.6834 7.90237 17.3166 7.90237 17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711L12.7071 14.7071Z" fill="var(--text1)"></path> 
  </g>
</svg>
  <p class="selected-value" @click.stop="">{{ selectedScreener ? selectedScreener : (ScreenersName.length > 0 ? 'Choose a Screener...' : 'No screeners available.') }}</p>
  <div class="dropdown-container" v-if="ScreenersName.length > 0">
    <div class="wrapper">
    <div v-for="(screener, index) in ScreenersName" :key="index" :class="{'selected': selectedScreener === screener.Name}" @click="selectScreener(screener.Name)">
<button class="icondlt2">
<span class="img3" v-html="getScreenerImage(screener)" @click.stop="ExcludeScreener(screener.Name)" v-b-tooltip.hover title="Toggle This Screener's Inclusion" alt="toggle screener"></span>
</button>
      {{ screener.Name }}
      <button class="icondlt"  @click.stop="DeleteScreener(screener.Name)" v-b-tooltip.hover title="Delete This Screener">
         <svg class="img2" viewBox="0 0 16 16" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" version="1.1" id="svg8" fill="var(--text1)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><metadata id="metadata5"><rdf:rdf><cc:work><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"></dc:type><dc:title></dc:title><dc:date>2021</dc:date><dc:creator><cc:agent><dc:title>Timothée Giet</dc:title></cc:agent></dc:creator><cc:license rdf:resource="http://creativecommons.org/licenses/by-sa/4.0/"></cc:license></cc:work><cc:license rdf:about="http://creativecommons.org/licenses/by-sa/4.0/"><cc:permits rdf:resource="http://creativecommons.org/ns#Reproduction"></cc:permits><cc:permits rdf:resource="http://creativecommons.org/ns#Distribution"></cc:permits><cc:requires rdf:resource="http://creativecommons.org/ns#Notice"></cc:requires><cc:requires rdf:resource="http://creativecommons.org/ns#Attribution"></cc:requires><cc:permits rdf:resource="http://creativecommons.org/ns#DerivativeWorks"></cc:permits><cc:requires rdf:resource="http://creativecommons.org/ns#ShareAlike"></cc:requires></cc:license></rdf:rdf></metadata><rect transform="rotate(45)" ry="0" y="-1" x="4.3137083" height="2" width="14" id="rect1006" style="opacity:1;vector-effect:none;fill:var(--text1);fill-opacity:1;stroke:none;stroke-width:4;stroke-linecap:square;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:3.20000005;stroke-opacity:1"></rect><rect transform="rotate(-45)" ry="0" y="10.313708" x="-7" height="2" width="14" id="rect1006-5" style="opacity:1;vector-effect:none;fill:var(--text1);fill-opacity:1;stroke:none;stroke-width:4;stroke-linecap:square;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:3.20000005;stroke-opacity:1"></rect></g></svg>
      </button>
    </div>
  </div>
  </div>
</div>
        <div :class="[showPriceInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Price</p>
  <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'price')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
</div>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showPriceInputs" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showPriceInputs">
            <div class="row">
              <input class="left input" id="left-p" type="text" placeholder="min">
              <input class="right input" id="right-p" type="text" placeholder="max">
            </div>
            <div class="row" style="flex-direction: row;">
            <button class="btns" style="float:right" @click="SetPrice()">
              <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
            </button>
            <button class="btnsr" style="float:right" @click="Reset('price')">
           <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
            </button>
          </div>
          </div>
        </div>
        <div :class="[showMarketCapInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Market Cap (1000s)</p>
  <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'market-cap')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
</div>
            <label style="float:right" class="switch">
              <input type="checkbox" v-model="showMarketCapInputs">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showMarketCapInputs">
            <div class="row">
              <input class="left input" id="left-mc" type="text" placeholder="min">
              <input class="right input" id="right-mc" type="text" placeholder="max">
            </div>
            <div class="row">
              <button class="btns" style="float:right" @click="SetMarketCap()">
                 <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
              </button>
              <button class="btnsr"style="float:right" @click="Reset('Marketcap')">
               <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
              </button>
            </div>
          </div>
        </div>
        <div :class="[showIPOInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>IPO Date</p>
   <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'ipo')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
</div>
            <label style="float:right" class="switch">
              <input type="checkbox" v-model="showIPOInputs">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showIPOInputs">
            <div class="row">
              <input class="left input" id="left-ipo" type="date" placeholder="min">
              <input class="right input" id="right-ipo" type="date" placeholder="max">
            </div>
            <div class="row">
              <button class="btns" style="float:right" @click="SetIpoDate()">
                <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
              </button>
              <button class="btnsr"style="float:right" @click="Reset('IPO')">
               <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
              </button>
            </div>
          </div>
        </div>
        <div :class="[ShowSector ? 'param-s2-expanded' : 'param-s1']">
    <div class="row">
      <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Sector</p>
   <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'sector')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
</div>
      <label style="float:right" class="switch">
        <input type="checkbox" v-model="ShowSector">
        <span class="slider round"></span>
      </label>
    </div>
    <div style="border: none" v-if="ShowSector">
      <div class="row2">
        <div class="check" v-for="(sector, index) in Sectors" :key="index">
          <div 
            :id="`sector-${index}`" 
            class="custom-checkbox" 
            :class="{ checked: selectedSectors[index] }" 
            @click="toggleSector(index)"
          >
            <span class="checkmark"></span>
            {{ sector }}
          </div>
        </div>
      </div>
      <div class="row">
        <button class="btns2" style="float:right" @click="SetSector">
         <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
        </button>
        <button class="btns2r" style="float:right" @click="Reset('Sector')">
         <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
        </button>
      </div>
    </div>
  </div>
  <div :class="[ShowExchange ? 'param-s3-expanded' : 'param-s1']">
    <div class="row">
      <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Exchange</p>
   <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'exchange')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
</div>
      <label style="float:right" class="switch">
        <input type="checkbox" v-model="ShowExchange">
        <span class="slider round"></span>
      </label>
    </div>
    <div style="border: none" v-if="ShowExchange">
      <div class="row2">
        <div class="check" v-for="(exchange, index) in Exchanges" :key="index">
          <div 
            :id="`exchange-${index}`" 
            class="custom-checkbox" 
            :class="{ checked: selectedExchanges[index] }" 
            @click="toggleExchange(index)"
          >
            <span class="checkmark"></span>
            {{ exchange }}
          </div>
        </div>
      </div>
      <div class="row">
        <button class="btns3" style="float:right" @click="SetExchange">
          <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
        </button>
        <button class="btns3r" style="float:right" @click="Reset('Exchange')">
         <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
        </button>
      </div>
    </div>
  </div>
  <div :class="[ShowCountry ? 'param-s9-expanded' : 'param-s1']">
    <div class="row">
      <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Country</p>
   <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'country')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
</div>
      <label style="float:right" class="switch">
        <input type="checkbox" v-model="ShowCountry">
        <span class="slider round"></span>
      </label>
    </div>
    <div style="border: none" v-if="ShowCountry">
      <div class="row2">
        <div class="check" v-for="(country, index) in Country" :key="index">
          <div 
            :id="`country-${index}`" 
            class="custom-checkbox" 
            :class="{ checked: selectedCountries[index] }" 
            @click="toggleCountry(index)"
          >
            <span class="checkmark"></span>
            {{ country }}
          </div>
        </div>
      </div>
      <div class="row">
        <button class="btns3" style="float:right" @click="SetCountry">
          <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
        </button>
        <button class="btns3r" style="float:right" @click="Reset('Country')">
         <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
        </button>
      </div>
    </div>
  </div>
        <div :class="[showPEInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>PE Ratio</p>
   <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'pe')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
</div>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showPEInputs" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showPEInputs">
            <div class="row">
              <input class="left input" id="left-pe" type="text" placeholder="min">
              <input class="right input" id="right-pe" type="text" placeholder="max">
            </div>
            <div class="row">
              <button class="btns" style="float:right" @click="SetPE()">
              <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
              </button>
              <button class="btnsr"style="float:right" @click="Reset('PE')">
               <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
              </button>
            </div>
          </div>
        </div>
        <div :class="[showPSInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>PS Ratio</p>
   <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'ps')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
</div>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showPSInputs" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showPSInputs">
            <div class="row">
              <input class="left input" id="left-ps" type="text" placeholder="min">
              <input class="right input" id="right-ps" type="text" placeholder="max">
            </div>
            <div class="row">
              <button class="btns" style="float:right" @click="SetPSRatio()">
                <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
              </button>
              <button class="btnsr"style="float:right" @click="Reset('PS')">
               <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
              </button>
            </div>
          </div>
        </div>
        <div :class="[showPEGInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>PEG Ratio</p>
  <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'peg')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
</div>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showPEGInputs" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showPEGInputs">
            <div class="row">
              <input class="left input" id="left-peg" type="text" placeholder="min">
              <input class="right input" id="right-peg" type="text" placeholder="max">
            </div>
            <div class="row">
              <button class="btns" style="float:right" @click="SetPEG()">
               <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
              </button>
              <button class="btnsr"style="float:right" @click="Reset('PEG')">
               <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
              </button>
            </div>
          </div>
        </div>
        <div :class="[showEPSInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div>
              <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
                 <p >EPS</p>
                 <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'eps')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
              </div>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showEPSInputs" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          </div>
          <div style="border: none;" v-if="showEPSInputs">
            <div class="row">
              <input class="left input" id="left-eps" type="text" placeholder="min">
              <input class="right input" id="right-eps" type="text" placeholder="max">
            </div>
            <div class="row">
              <button class="btns" style="float:right" @click="SetEPS()">
                <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
              </button>
              <button class="btnsr"style="float:right" @click="Reset('EPS')">
               <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
              </button>
            </div>
          </div>
        </div>
        <div :class="[showPBInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>PB Ratio</p>
   <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'pb')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
</div>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showPBInputs" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showPBInputs">
            <div class="row">
              <input class="left input" id="left-pb" type="text" placeholder="min">
              <input class="right input" id="right-pb" type="text" placeholder="max">
            </div>
            <div class="row">
              <button class="btns" style="float:right" @click="SetPBRatio()">
                <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
              </button>
              <button class="btnsr"style="float:right" @click="Reset('PB')">
               <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
              </button>
            </div>
          </div>
        </div>
        <div :class="[showDivYieldInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Dividend Yield TTM (%)</p>
   <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'div')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
</div>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showDivYieldInputs" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showDivYieldInputs">
            <div class="row">
              <input class="left input" id="left-divyield" type="text" placeholder="min">
              <input class="right input" id="right-divyield" type="text" placeholder="max">
            </div>
            <div class="row">
              <button class="btns" style="float:right" @click="SetDivYield()">
                <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
              </button>
              <button class="btnsr"style="float:right" @click="Reset('DivYield')">
                <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
              </button>
            </div>
          </div>
        </div>
        <div :class="[showFundYoYQoQ ? 'param-s5-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Revenue / Earnings / EPS Growth</p>
  <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'growth')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
</div>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showFundYoYQoQ" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showFundYoYQoQ">
            <div class="DataInputs">
            <p>Revenue Growth (YoY)</p>
            <input id="left-RevYoY" class="input" type="text" placeholder="min">
            <input id="right-RevYoY" class="input" type="text" placeholder="max">
              <p>Revenue Growth (QoQ)</p>
              <input id="left-RevQoQ" class="input" type="text" placeholder="min">
              <input id="right-RevQoQ" class="input" type="text" placeholder="max">
              <p>Earnings Growth (YoY)</p>
              <input id="left-EarningsYoY" class="input" type="text" placeholder="min">
              <input id="right-EarningsYoY" class="input" type="text" placeholder="max">
              <p>Earnings Growth (QoQ)</p>
              <input id="left-EarningsQoQ" class="input" type="text" placeholder="min">
              <input id="right-EarningsQoQ" class="input" type="text" placeholder="max">
              <p>EPS Growth (YoY)</p>
              <input id="left-EPSYoY" class="input" type="text" placeholder="min">
              <input id="right-EPSYoY" class="input" type="text" placeholder="max">
              <p>EPS Growth (QoQ)</p>
              <input id="left-EPSQoQ" class="input" type="text" placeholder="min">
              <input id="right-EPSQoQ" class="input" type="text" placeholder="max">
            </div>
            <div class="row">
              <button class="btns5" style="float:right" @click="SetFundamentalGrowth()">
                <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
              </button>
              <button class="btns5r"style="float:right" @click="Reset('FundGrowth')">
               <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
              </button>
            </div>
          </div>
        </div>
        <div :class="[showPricePerf ? 'param-s6-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Price Performance</p>
   <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'perf')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
</div>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showPricePerf" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showPricePerf">
            <div class="DataInputs11">
            <p style="text-align: center;">Change %</p>
            <div style="display: flex; justify-content: center; align-items: center; border: none;">
            <input class="input" id="changeperc1" type="text" style="width: 70px; margin: 0 5px;" placeholder="Min">
            <input class="input" id="changeperc2" type="text" style="width: 70px; margin: 0 5px;" placeholder="Max">
            <div class="changeperc-select-container">
  <div class="changeperc-dropdown-btn">
    <p class="selected-value">{{ changepercSelect }}</p>
  </div>
  <div class="changeperc-dropdown-menu">
    <div v-for="(option, index) in changepercOptions" :key="index" @click="selectChangepercOption(option)">
      {{ option }}
    </div>
  </div>
</div>
          </div>
          <div style="border: none;">
            <p style="text-align: center;">% off 52weekhigh</p>
            <div style="display: flex; justify-content: center; align-items: center; border:none;">
              <input class="input" type="text" id="weekhigh1" style="width: 70px; margin: 0 5px;" placeholder="Min">
              <input class="input" type="text" id="weekhigh2" style="width: 70px; margin: 0 5px;" placeholder="Max">
            </div>
            <p style="text-align: center;">% off 52weeklow</p>
            <div style="display: flex; justify-content: center; align-items: center; border:none;">
              <input class="input" type="text" id="weeklow1" style="width: 70px; margin: 0 5px;" placeholder="Min">
              <input class="input" type="text" id="weeklow2" style="width: 70px; margin: 0 5px;" placeholder="Max">
            </div>
          </div>
            <div style="display: flex; flex-direction: column; align-items: center; border:none;">
              <br>
              <div 
  class="custom-checkbox" 
  :class="{ checked: allTimeHigh }" 
  @click="toggleAllTimeHigh"
>
  <span class="checkmark"></span>
  New All time High
</div>
<div 
  class="custom-checkbox" 
  :class="{ checked: allTimeLow }" 
  @click="toggleAllTimeLow"
>
  <span class="checkmark"></span>
  New All time Low
</div>
          </div>
          <br>
          <div style="display: flex; flex-direction: column; align-items: center; border: none;">
            <div style="display: flex; align-items: center; border: none;">
              <p style="margin-right: 10px;">200 DMA</p>
              <div class="ma200-select-container">
  <div class="ma200-dropdown-btn">
    <p class="selected-value">{{ ma200Select }}</p>
  </div>
  <div class="ma200-dropdown-menu">
    <div v-for="(option, index) in ma200Options" :key="index" @click="selectMa200Option(option)">
      {{ option }}
    </div>
  </div>
</div>
            </div>
            <div style="display: flex; align-items: center; border: none;">
              <p style="margin-right: 10px;">50 DMA</p>
              <div class="ma50-select-container">
  <div class="ma50-dropdown-btn">
    <p class="selected-value">{{ ma50Select }}</p>
  </div>
  <div class="ma50-dropdown-menu">
    <div v-for="(option, index) in ma50Options" :key="index" @click="selectMa50Option(option)">
      {{ option }}
    </div>
  </div>
</div>
            </div>
            <div style="display: flex; align-items: center; border: none;">
              <p style="margin-right: 10px;">20 DMA</p>
              <div class="ma20-select-container">
  <div class="ma20-dropdown-btn">
    <p class="selected-value">{{ ma20Select }}</p>
  </div>
  <div class="ma20-dropdown-menu">
    <div v-for="(option, index) in ma20Options" :key="index" @click="selectMa20Option(option)">
      {{ option }}
    </div>
  </div>
</div>
            </div>
            <div style="display: flex; align-items: center; border: none;">
              <p style="margin-right: 10px;">10 DMA</p>
              <div class="ma10-select-container">
  <div class="ma10-dropdown-btn">
    <p class="selected-value">{{ ma10Select }}</p>
  </div>
  <div class="ma10-dropdown-menu">
    <div v-for="(option, index) in ma10Options" :key="index" @click="selectMa10Option(option)">
      {{ option }}
    </div>
  </div>
</div>
            </div>
                <div style="display: flex; align-items: center; border: none;">
              <p style="margin-right: 10px;">Price</p>
              <div class="price-select-container">
  <div class="price-dropdown-btn">
    <p class="selected-value">{{ priceSelect }}</p>
  </div>
  <div class="price-dropdown-menu">
    <div v-for="(option, index) in priceOptions" :key="index" @click="selectPriception(option)">
      {{ option }}
    </div>
  </div>
</div>
            </div>
          </div>
              </div>
            <div class="row">
              <button class="btns6" style="float:right" @click="SetPricePerformance()">
                <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
              </button>
              <button class="btns6r"style="float:right" @click="Reset('PricePerformance')">
               <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
              </button>
            </div>
          </div>
        </div>
        <div :class="[showRSscore ? 'param-s8-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Technical Score</p>
  <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'rs')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
</div>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showRSscore" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showRSscore">
            <div class="DataInputs10">
            <p>Technical Score (1W)</p>
            <input class="input" type="number" placeholder="min (1)" id="RSscore1Winput1" name="input5" min="1" max="100">
            <input class="input" type="number" placeholder="max (100)" id="RSscore1Winput2" name="input6" min="1" max="100">
            <p>Technical Score (1M)</p>
            <input class="input" type="number" placeholder="min (1)" id="RSscore1Minput1" name="input1" min="1" max="100">
            <input class="input" type="number" placeholder="max (100)" id="RSscore1Minput2" name="input2" min="1" max="100">
            <p>Technical Score (4M)</p>
            <input class="input" type="number" placeholder="min (1)" id="RSscore4Minput1" name="input3" min="1" max="100">
            <input class="input" type="number" placeholder="max (100)" id="RSscore4Minput2" name="input4" min="1" max="100">
            </div>
            <div class="row">
              <button class="btns8" style="float:right" @click="SetRSscore()">
                <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
              </button>
              <button class="btns8r"style="float:right" @click="Reset('RSscore')">
               <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
              </button>
            </div>
          </div>
        </div>
        <div :class="[showVolume ? 'param-s7-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Volume</p>
  <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'volume')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
</div>
    <label style="float:right" class="switch">
      <input type="checkbox" id="price-check" v-model="showVolume" style="border: none;">
      <span class="slider round"></span>
    </label>
  </div>
  <div style="border: none;" v-if="showVolume">
    <div class="DataInputs4">
      <p>Relative Volume</p>
      <div style="display: flex; align-items: center;">
  <input class="input" id="left-relvol" type="text" placeholder="min" style="width: 70px; margin: 0 5px;">
  <input class="input" id="right-relvol" type="text" placeholder="max" style="width: 70px; margin: 0 5px;">
  <div class="relvol-select-container" style="margin-left: 5px;">
    <div class="relvol-dropdown-btn">
      <p class="selected-value">{{ relVolSelect }}</p>
    </div>
    <div class="relvol-dropdown-menu">
      <div v-for="(option, index) in relVolOptions" :key="index" @click="selectRelVolOption(option)">
        {{ option }}
      </div>
    </div>
  </div>
</div>
      <p>Average Volume (1000s)</p>
      <div style="display: flex; align-items: center;">
  <input class="input" id="left-avgvol" type="text" placeholder="min" style="width: 70px; margin: 0 5px;">
  <input class="input" id="right-avgvol" type="text" placeholder="max" style="width: 70px; margin: 0 5px;">
  <div class="avgvol-select-container" style="margin-left: 5px;">
    <div class="avgvol-dropdown-btn">
      <p class="selected-value">{{ avgVolSelect }}</p>
    </div>
    <div class="avgvol-dropdown-menu">
      <div v-for="(option, index) in avgVolOptions" :key="index" @click="selectAvgVolOption(option)">
        {{ option }}
      </div>
    </div>
  </div>
</div>
</div>
    <div class="row">
      <button class="btns7" style="float:right" @click="SetVolume()">
        <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
      </button>
      <button class="btns7r"style="float:right" @click="Reset('Volume')">
      <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
      </button>
    </div>
  </div>
</div>
<div :class="[showADV ? 'param-s10-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Average Daily Volatility (ADV)</p>
  <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'adv')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
</div>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showADV" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showADV">
            <div class="DataInputs10">
            <p>ADV (1W)</p>
            <input class="input" type="number" placeholder="min (%)" id="ADV1Winput1" name="input1">
            <input class="input" type="number" placeholder="max (%)" id="ADV1Winput2" name="input2">
            <p>ADV (1M)</p>
            <input class="input" type="number" placeholder="min (%)" id="ADV1Minput1" name="input3">
            <input class="input" type="number" placeholder="max (%)" id="ADV1Minput2" name="input4">
            <p>ADV (4M)</p>
            <input class="input" type="number" placeholder="min (%)" id="ADV4Minput1" name="input5">
            <input class="input" type="number" placeholder="max (%)" id="ADV4Minput2" name="input6">
            <p>ADV (1Y)</p>
            <input class="input" type="number" placeholder="min (%)" id="ADV1Yinput1" name="input7">
            <input class="input" type="number" placeholder="max (%)" id="ADV1Yinput2" name="input8">
            </div>
            <div class="row">
              <button class="btns8" style="float:right" @click="SetADV()">
                <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
              </button>
              <button class="btns8r"style="float:right" @click="Reset('ADV')">
               <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
              </button>
            </div>
          </div>
        </div>
        <div :class="[showROE ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Return of Equity (ROE)</p>
   <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'roe')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
</div>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showROE" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showROE">
            <div class="row">
              <input class="left input" id="left-roe" type="text" placeholder="min">
              <input class="right input" id="right-roe" type="text" placeholder="max">
            </div>
            <div class="row">
              <button class="btns" style="float:right" @click="SetROE()">
                <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
              </button>
              <button class="btnsr"style="float:right" @click="Reset('ROE')">
               <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
              </button>
            </div>
          </div>
        </div>
        <div :class="[showROA ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Return of Assets (ROA)</p>
   <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'roa')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
</div>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showROA" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showROA">
            <div class="row">
              <input class="left input" id="left-roa" type="text" placeholder="min">
              <input class="right input" id="right-roa" type="text" placeholder="max">
            </div>
            <div class="row">
              <button class="btns" style="float:right" @click="SetROA()">
                <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
              </button>
              <button class="btnsr"style="float:right" @click="Reset('ROA')">
               <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
              </button>
            </div>
          </div>
        </div>
        <div :class="[showCurrentRatio ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Current Ratio</p>
      <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'current-ratio')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
    </div>
    <label style="float:right" class="switch">
      <input type="checkbox" id="current-ratio-check" v-model="showCurrentRatio" style="border: none;">
      <span class="slider round"></span>
    </label>
  </div>
  <div style="border: none;" v-if="showCurrentRatio">
    <div class="row">
      <input class="left input" id="left-current-ratio" type="text" placeholder="min">
      <input class="right input" id="right-current-ratio" type="text" placeholder="max">
    </div>
    <div class="row">
      <button class="btns" style="float:right" @click="SetCurrentRatio()">
        <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
      </button>
      <button class="btnsr" style="float:right" @click="Reset('CurrentRatio')">
       <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
      </button>
    </div>
  </div>
</div>
<div :class="[showCurrentAssets ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Current Assets (1000s)</p>
     <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'current-assets')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
    </div>
    <label style="float:right" class="switch">
      <input type="checkbox" v-model="showCurrentAssets">
      <span class="slider round"></span>
    </label>
  </div>
  <div style="border: none;" v-if="showCurrentAssets">
    <div class="row">
      <input class="left input" id="left-ca" type="text" placeholder="min">
      <input class="right input" id="right-ca" type="text" placeholder="max">
    </div>
    <div class="row">
      <button class="btns" style="float:right" @click="SetCurrentAssets()">
        <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
      </button>
      <button class="btnsr" style="float:right" @click="Reset('CurrentAssets')">
       <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
      </button>
    </div>
  </div>
</div>
<div :class="[showCurrentLiabilities ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Current Liabilities (1000s)</p>
     <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'current-liabilities')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
    </div>
    <label style="float:right" class="switch">
      <input type="checkbox" v-model="showCurrentLiabilities">
      <span class="slider round"></span>
    </label>
  </div>
  <div style="border: none;" v-if="showCurrentLiabilities">
    <div class="row">
      <input class="left input" id="left-cl" type="text" placeholder="min">
      <input class="right input" id="right-cl" type="text" placeholder="max">
    </div>
    <div class="row">
      <button class="btns" style="float:right" @click="SetCurrentLiabilities()">
        <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
      </button>
      <button class="btnsr" style="float:right" @click="Reset('CurrentLiabilities')">
      <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
      </button>
    </div>
  </div>
</div>
<div :class="[showCurrentDebt ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Current Debt (1000s)</p>
      <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'current-debt')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
    </div>
    <label style="float:right" class="switch">
      <input type="checkbox" v-model="showCurrentDebt">
      <span class="slider round"></span>
    </label>
  </div>
  <div style="border: none;" v-if="showCurrentDebt">
    <div class="row">
      <input class="left input" id="left-cd" type="text" placeholder="min">
      <input class="right input" id="right-cd" type="text" placeholder="max">
    </div>
    <div class="row">
      <button class="btns" style="float:right" @click="SetCurrentDebt()">
        <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
      </button>
      <button class="btnsr" style="float:right" @click="Reset('CurrentDebt')">
     <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
      </button>
    </div>
  </div>
</div>
<div :class="[showCashEquivalents ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Cash & Equivalents (1000s)</p>
      <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'casheq')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
    </div>
    <label style="float:right" class="switch">
      <input type="checkbox" v-model="showCashEquivalents">
      <span class="slider round"></span>
    </label>
  </div>
  <div style="border: none;" v-if="showCashEquivalents">
    <div class="row">
      <input class="left input" id="left-ce" type="text" placeholder="min">
      <input class="right input" id="right-ce" type="text" placeholder="max">
    </div>
    <div class="row">
      <button class="btns" style="float:right" @click="SetCashEquivalents()">
         <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
      </button>
      <button class="btnsr" style="float:right" @click="Reset('CashEquivalents')">
       <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
      </button>
    </div>
  </div>
</div>
<div :class="[showFreeCashFlow ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Free Cash Flow (1000s)</p>
      <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'fcf')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
    </div>
    <label style="float:right" class="switch">
      <input type="checkbox" v-model="showFreeCashFlow">
      <span class="slider round"></span>
    </label>
  </div>
  <div style="border: none;" v-if="showFreeCashFlow">
    <div class="row">
      <input class="left input" id="left-fcf" type="text" placeholder="min">
      <input class="right input" id="right-fcf" type="text" placeholder="max">
    </div>
    <div class="row">
      <button class="btns" style="float:right" @click="SetFreeCashFlow()">
        <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
      </button>
      <button class="btnsr" style="float:right" @click="Reset('FCF')">
      <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
      </button>
    </div>
  </div>
</div>
<div :class="[showProfitMargin ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Profit Margin</p>
      <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'profit-margin')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
    </div>
    <label style="float:right" class="switch">
      <input type="checkbox" id="profit-margin-check" v-model="showProfitMargin" style="border: none;">
      <span class="slider round"></span>
    </label>
  </div>
  <div style="border: none;" v-if="showProfitMargin">
    <div class="row">
      <input class="left input" id="left-pm" type="text" placeholder="min">
      <input class="right input" id="right-pm" type="text" placeholder="max">
    </div>
    <div class="row">
      <button class="btns" style="float:right" @click="SetProfitMargin()">
       <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
      </button>
      <button class="btnsr" style="float:right" @click="Reset('ProfitMargin')">
      <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
      </button>
    </div>
  </div>
</div>
<div :class="[showGrossMargin ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Gross Margin</p>
     <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'gross-margin')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
    </div>
    <label style="float:right" class="switch">
      <input type="checkbox" id="gross-margin-check" v-model="showGrossMargin" style="border: none;">
      <span class="slider round"></span>
    </label>
  </div>
  <div style="border: none;" v-if="showGrossMargin">
    <div class="row">
      <input class="left input" id="left-gm" type="text" placeholder="min">
      <input class="right input" id="right-gm" type="text" placeholder="max">
    </div>
    <div class="row">
      <button class="btns" style="float:right" @click="SetGrossMargin()">
        <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
      </button>
      <button class="btnsr" style="float:right" @click="Reset('GrossMargin')">
       <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
      </button>
    </div>
  </div>
</div>
<div :class="[showDebtToEquityRatio ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Debt to Equity Ratio</p>
      <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'debt-equity')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
    </div>
    <label style="float:right" class="switch">
      <input type="checkbox" id="debt-to-equity-check" v-model="showDebtToEquityRatio" style="border: none;">
      <span class="slider round"></span>
    </label>
  </div>
  <div style="border: none;" v-if="showDebtToEquityRatio">
    <div class="row">
      <input class="left input" id="left-der" type="text" placeholder="min">
      <input class="right input" id="right-der" type="text" placeholder="max">
    </div>
    <div class="row">
      <button class="btns" style="float:right" @click="SetDebtToEquityRatio()">
        <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
      </button>
      <button class="btnsr" style="float:right" @click="Reset('DebtEquity')">
       <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
      </button>
    </div>
  </div>
</div>
<div :class="[showBookValue ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Book Value (1000s)</p>
      <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'book-value')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
    </div>
    <label style="float:right" class="switch">
      <input type="checkbox" id="book-value-check" v-model="showBookValue" style="border: none;">
      <span class="slider round"></span>
    </label>
  </div>
  <div style="border: none;" v-if="showBookValue">
    <div class="row">
      <input class="left input" id="left-bv" type="text" placeholder="min">
      <input class="right input" id="right-bv" type="text" placeholder="max">
    </div>
    <div class="row">
      <button class="btns" style="float:right" @click="SetBookValue()">
        <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
      </button>
      <button class="btnsr" style="float:right" @click="Reset('BookValue')">
       <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
      </button>
    </div>
  </div>
</div>
<div :class="[showEV ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>EV (Enterprise Value) - 1000s</p>
      <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'ev')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
    </div>
    <label style="float:right" class="switch">
      <input type="checkbox" id="ev-check" v-model="showEV" style="border: none;">
      <span class="slider round"></span>
    </label>
  </div>
  <div style="border: none;" v-if="showEV">
    <div class="row">
      <input class="left input" id="left-ev" type="text" placeholder="min">
      <input class="right input" id="right-ev" type="text" placeholder="max">
    </div>
    <div class="row">
      <button class="btns" style="float:right" @click="SetEV()">
        <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
      </button>
      <button class="btnsr" style="float:right" @click="Reset('EV')">
       <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
      </button>
    </div>
  </div>
</div>
<div :class="[showRSI ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>RSI (Relative Strength Index)</p>
      <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'rsi')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
    </div>
    <label style="float:right" class="switch">
      <input type="checkbox" id="rsi-check" v-model="showRSI" style="border: none;">
      <span class="slider round"></span>
    </label>
  </div>
  <div style="border: none;" v-if="showRSI">
    <div class="row">
      <input class="left input" id="left-rsi" type="number" placeholder="min" min="1" max="100">
      <input class="right input" id="right-rsi" type="number" placeholder="max" min="1" max="100">
    </div>
    <div class="row">
      <button class="btns" style="float:right" @click="SetRSI()">
        <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g></g></g></svg>
      </button>
      <button class="btnsr" style="float:right" @click="Reset('RSI')">
       <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
      </button>
    </div>
  </div>
</div>
<div :class="[showGap ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Gap %</p>
      <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
       @mouseover="handleMouseOver($event, 'gap')" @mouseout="handleMouseOut">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
    </g>
  </svg>
    </div>
    <label style="float:right" class="switch">
      <input type="checkbox" id="gap-percent-check" v-model="showGap" style="border: none;">
      <span class="slider round"></span>
    </label>
  </div>
  <div style="border: none;" v-if="showGap">
    <div class="row">
      <input class="left input" id="left-gap" type="text" placeholder="min">
      <input class="right input" id="right-gap" type="text" placeholder="max">
    </div>
    <div class="row">
      <button class="btns" style="float:right" @click="SetGapPercent()">
        <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9,29l0,-8.25c0,-1.518 1.232,-2.75 2.75,-2.75l8.5,0c1.518,0 2.75,1.232 2.75,2.75l0,8.25l-14,-0Zm-2,-0.101c-0.953,-0.195 -1.837,-0.665 -2.536,-1.363c-0.937,-0.938 -1.464,-2.21 -1.464,-3.536c-0,-4.439 -0,-11.561 0,-16c-0,-1.326 0.527,-2.598 1.464,-3.536c0.938,-0.937 2.21,-1.464 3.536,-1.464l2,-0l0,5.083c0,2.201 1.613,3.917 3.5,3.917l5,0c1.887,0 3.5,-1.716 3.5,-3.917l0,-5.083l0.221,0c0.24,0 0.472,0.087 0.654,0.244l5.779,5c0.22,0.19 0.346,0.466 0.346,0.756c0,0 0,9.426 -0,15c0,1.326 -0.527,2.598 -1.464,3.536c-0.699,0.698 -1.583,1.168 -2.536,1.363l0,-8.149c0,-2.622 -2.128,-4.75 -4.75,-4.75c0,0 -8.5,0 -8.5,0c-2.622,0 -4.75,2.128 -4.75,4.75l0,8.149Zm13,-25.899l0,5.083c0,1.02 -0.626,1.917 -1.5,1.917c0,0 -5,0 -5,0c-0.874,0 -1.5,-0.897 -1.5,-1.917l0,-5.083l8,0Z"></path><g id="Icon"></g></g></svg>
      </button>
      <button class="btnsr" style="float:right" @click="Reset('Gap')">
       <svg class="iconbtn" fill="var(--text1)" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M960 0v213.333c411.627 0 746.667 334.934 746.667 746.667S1371.627 1706.667 960 1706.667 213.333 1371.733 213.333 960c0-197.013 78.4-382.507 213.334-520.747v254.08H640V106.667H53.333V320h191.04C88.64 494.08 0 720.96 0 960c0 529.28 430.613 960 960 960s960-430.72 960-960S1489.387 0 960 0" fill-rule="evenodd"></path> </g></svg>
      </button>
    </div>
  </div>
</div>
        <div class="results"></div>
      </div>
      <div id="resultsDiv" :class="{ 'hidden-mobile': selected !== 'list' }">
        <div v-if="showCreateScreener" class="CreateScreener">
        <svg class="inner-logo" version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2134.000000 2134.000000"
 preserveAspectRatio="xMidYMid meet">
<g transform="translate(0.000000,2134.000000) scale(0.100000,-0.100000)"
fill="var(--text1)" stroke="none">
<path d="M355 21282 c-175 -110 -255 -220 -291 -402 -25 -124 -15 -421 20
-625 104 -601 387 -1216 800 -1735 123 -155 475 -507 616 -616 280 -217 609
-419 1640 -1007 1314 -749 1735 -942 2525 -1157 257 -70 457 -130 660 -200
924 -315 1748 -774 2455 -1366 434 -363 775 -722 1190 -1249 226 -288 317
-379 445 -443 88 -43 153 -55 285 -50 132 5 194 24 287 84 72 48 197 173 283
284 233 300 352 440 614 714 308 324 765 741 1030 940 147 110 476 327 671
442 189 111 663 350 860 433 345 146 572 223 1122 381 1006 287 1271 406 2563
1145 1100 630 1429 831 1710 1049 140 108 493 461 616 616 424 534 714 1175
809 1790 26 166 31 467 11 570 -36 183 -117 294 -294 403 l-92 57 -273 -2
c-149 -1 -246 -3 -214 -5 31 -2 57 -8 57 -12 0 -20 -966 -572 -1955 -1118
-775 -427 -847 -462 -1125 -543 -319 -93 -606 -133 -955 -133 -318 0 -567 30
-860 104 -270 68 -413 120 -830 301 -1352 588 -2103 789 -3348 899 -298 26
-927 37 -1212 20 -880 -51 -1660 -206 -2527 -500 -353 -120 -486 -174 -1168
-469 -561 -242 -873 -321 -1356 -342 -455 -19 -824 20 -1176 126 -280 83 -380
132 -1143 552 -413 227 -1022 569 -1419 796 -163 94 -254 140 -287 146 -72 14
-124 45 -158 94 -17 24 -37 46 -46 49 -22 9 -18 25 8 30 12 2 -86 5 -218 5
l-240 1 -90 -57z"/>
<path d="M19408 21333 c28 -2 76 -2 105 0 28 2 5 3 -53 3 -58 0 -81 -1 -52 -3z"/>
<path d="M2668 15663 c-106 -99 -342 -418 -523 -706 -387 -617 -648 -1285
-765 -1960 -65 -377 -84 -670 -77 -1147 6 -360 19 -545 58 -805 125 -849 505
-1739 1054 -2470 694 -926 1639 -1601 2760 -1973 393 -131 761 -205 1215 -244
217 -19 820 -16 1055 5 478 43 804 92 839 127 12 12 -5 38 -258 375 -318 422
-480 672 -745 1153 l-123 222 -167 0 c-643 0 -1147 109 -1667 360 -383 184
-691 401 -1002 704 -383 374 -682 822 -875 1311 -175 444 -239 804 -239 1350
0 611 120 1142 374 1650 183 365 364 619 697 980 94 102 181 214 181 234 0 14
-49 38 -315 156 -275 122 -561 265 -870 438 -320 178 -439 241 -503 266 l-53
21 -51 -47z"/>
<path d="M18409 15616 c-90 -46 -239 -126 -330 -179 -258 -149 -527 -288 -734
-382 -387 -176 -457 -209 -462 -222 -7 -18 70 -122 173 -233 273 -295 429
-503 594 -791 226 -394 394 -862 445 -1233 48 -353 48 -880 0 -1232 -48 -355
-209 -812 -414 -1178 -413 -738 -1086 -1338 -1855 -1653 -464 -191 -909 -273
-1477 -273 l-167 0 -122 -222 c-252 -456 -435 -741 -704 -1098 -212 -280 -306
-410 -306 -421 0 -12 53 -25 260 -64 367 -69 618 -88 1125 -89 497 0 759 20
1095 85 1456 282 2780 1184 3622 2469 368 560 633 1184 772 1817 81 372 106
609 113 1109 9 632 -27 1014 -138 1464 -183 742 -504 1431 -947 2030 -169 228
-311 380 -355 380 -13 0 -98 -38 -188 -84z"/>
<path d="M10602 11199 c-37 -11 -44 -25 -62 -118 -33 -180 -156 -513 -280
-761 -191 -379 -407 -678 -715 -985 -281 -282 -540 -474 -950 -705 -110 -62
-201 -114 -203 -115 -12 -11 103 -216 241 -429 216 -335 366 -522 846 -1061
174 -195 358 -422 539 -665 248 -333 341 -407 542 -431 97 -11 219 -6 300 13
137 32 248 132 450 403 233 314 459 589 718 873 251 275 419 479 534 647 135
197 338 534 374 621 l14 32 -203 112 c-400 222 -668 420 -952 705 -320 320
-541 629 -736 1030 -124 255 -247 600 -266 745 -8 63 -18 78 -61 90 -44 12
-85 12 -130 -1z"/>
<path d="M1413 8015 c3 -16 9 -68 12 -115 30 -392 123 -820 312 -1425 165
-528 435 -1160 557 -1303 25 -29 83 -101 128 -160 114 -148 273 -310 397 -402
135 -102 282 -177 576 -293 132 -52 341 -142 465 -200 124 -57 238 -107 255
-111 16 -4 73 -32 126 -62 180 -100 318 -152 785 -294 614 -187 1092 -375
1659 -655 876 -432 1632 -934 2390 -1586 258 -222 448 -402 810 -768 181 -183
389 -388 460 -454 113 -104 130 -124 130 -151 l0 -31 186 -3 186 -2 12 28 c28
68 127 132 204 132 27 0 86 54 496 463 561 557 784 760 1176 1073 1154 919
2396 1568 3804 1984 327 97 519 170 653 247 43 25 136 69 206 98 70 29 201 87
292 130 90 42 272 119 405 172 132 52 278 115 325 140 243 128 419 282 625
548 38 50 94 119 123 153 114 136 370 720 527 1202 147 454 264 912 310 1220
18 121 48 431 42 437 -3 2 -44 -47 -93 -109 -49 -62 -142 -178 -208 -258 -883
-1066 -1941 -1794 -3221 -2215 -1136 -375 -2424 -435 -3615 -169 -85 19 -278
68 -428 110 l-272 75 -149 -141 c-82 -78 -180 -166 -218 -196 -183 -148 -429
-289 -604 -348 -122 -41 -219 -48 -567 -44 -311 5 -319 5 -407 32 -191 58
-455 207 -653 368 -42 35 -124 108 -182 163 -58 54 -121 114 -141 133 l-36 33
-214 -60 c-564 -158 -911 -223 -1432 -268 -236 -20 -820 -23 -1047 -4 -961 77
-1761 299 -2600 722 -932 469 -1698 1111 -2414 2024 -143 182 -140 178 -133
140z"/>
<path d="M9683 3 c15 -2 39 -2 55 0 15 2 2 4 -28 4 -30 0 -43 -2 -27 -4z"/>
<path d="M11462 3 c59 -2 158 -2 220 0 62 1 14 3 -107 3 -121 0 -172 -2 -113
-3z"/>
</g>
</svg>
          <h3 style="color: var(--text1)">Create Screener</h3>
          <input
      id="inputcreate"
      placeholder="Enter Screener Name"
      type="text"
      v-model="screenerName"
      :class="{'input-error': screenerName.length > 20}"
    />
          <div class="inner">
            <button @click="showCreateScreener = false">
             <svg class="imgbtn" fill="var(--text1)" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 882.968 882.968" xml:space="preserve" transform="rotate(180)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M661.885,492.032c10.23,10.11,23.566,15.155,36.896,15.155c13.541,0,27.078-5.207,37.348-15.601l131.684-133.271 c9.785-9.905,15.236-23.291,15.154-37.216c-0.084-13.923-5.695-27.243-15.6-37.029l-131.48-129.912 c-20.625-20.379-53.867-20.18-74.244,0.445c-20.379,20.625-20.18,53.865,0.445,74.244l41.236,40.747H235.337 c-62.861,0-121.959,24.479-166.408,68.93C24.48,382.975,0,442.072,0,504.934v3.693c0,62.861,24.479,121.959,68.929,166.408 c44.45,44.449,103.547,68.929,166.408,68.929H381.2c62.861,0,121.958-24.479,166.408-68.929s68.93-103.547,68.93-166.408v-3.693 c0-28.995-23.506-52.5-52.5-52.5s-52.5,23.505-52.5,52.5v3.693c0,71.868-58.469,130.337-130.337,130.337H235.337 C163.469,638.964,105,580.495,105,508.627v-3.693c0-71.868,58.469-130.337,130.337-130.337h468.778l-42.676,43.191 C641.061,438.412,641.26,471.653,661.885,492.032z"></path> </g> </g></svg>
            </button>
            <button @click="CreateScreener()">
               <svg class="imgbtn" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M11 8C11 7.44772 11.4477 7 12 7C12.5523 7 13 7.44771 13 8V11H16C16.5523 11 17 11.4477 17 12C17 12.5523 16.5523 13 16 13H13V16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16V13H8C7.44772 13 7 12.5523 7 12C7 11.4477 7.44771 11 8 11H11V8Z" fill="var(--text1)"></path> <path fill-rule="evenodd" clip-rule="evenodd" d="M23 4C23 2.34315 21.6569 1 20 1H4C2.34315 1 1 2.34315 1 4V20C1 21.6569 2.34315 23 4 23H20C21.6569 23 23 21.6569 23 20V4ZM21 4C21 3.44772 20.5523 3 20 3H4C3.44772 3 3 3.44772 3 4V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V4Z" fill="var(--text1)"></path> </g></svg>
            </button>
          </div>
        </div>
        <div v-if="showRenameScreener" class="RenameScreener">
         <svg class="inner-logo" version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2134.000000 2134.000000"
 preserveAspectRatio="xMidYMid meet">
<g transform="translate(0.000000,2134.000000) scale(0.100000,-0.100000)"
fill="var(--text1)" stroke="none">
<path d="M355 21282 c-175 -110 -255 -220 -291 -402 -25 -124 -15 -421 20
-625 104 -601 387 -1216 800 -1735 123 -155 475 -507 616 -616 280 -217 609
-419 1640 -1007 1314 -749 1735 -942 2525 -1157 257 -70 457 -130 660 -200
924 -315 1748 -774 2455 -1366 434 -363 775 -722 1190 -1249 226 -288 317
-379 445 -443 88 -43 153 -55 285 -50 132 5 194 24 287 84 72 48 197 173 283
284 233 300 352 440 614 714 308 324 765 741 1030 940 147 110 476 327 671
442 189 111 663 350 860 433 345 146 572 223 1122 381 1006 287 1271 406 2563
1145 1100 630 1429 831 1710 1049 140 108 493 461 616 616 424 534 714 1175
809 1790 26 166 31 467 11 570 -36 183 -117 294 -294 403 l-92 57 -273 -2
c-149 -1 -246 -3 -214 -5 31 -2 57 -8 57 -12 0 -20 -966 -572 -1955 -1118
-775 -427 -847 -462 -1125 -543 -319 -93 -606 -133 -955 -133 -318 0 -567 30
-860 104 -270 68 -413 120 -830 301 -1352 588 -2103 789 -3348 899 -298 26
-927 37 -1212 20 -880 -51 -1660 -206 -2527 -500 -353 -120 -486 -174 -1168
-469 -561 -242 -873 -321 -1356 -342 -455 -19 -824 20 -1176 126 -280 83 -380
132 -1143 552 -413 227 -1022 569 -1419 796 -163 94 -254 140 -287 146 -72 14
-124 45 -158 94 -17 24 -37 46 -46 49 -22 9 -18 25 8 30 12 2 -86 5 -218 5
l-240 1 -90 -57z"/>
<path d="M19408 21333 c28 -2 76 -2 105 0 28 2 5 3 -53 3 -58 0 -81 -1 -52 -3z"/>
<path d="M2668 15663 c-106 -99 -342 -418 -523 -706 -387 -617 -648 -1285
-765 -1960 -65 -377 -84 -670 -77 -1147 6 -360 19 -545 58 -805 125 -849 505
-1739 1054 -2470 694 -926 1639 -1601 2760 -1973 393 -131 761 -205 1215 -244
217 -19 820 -16 1055 5 478 43 804 92 839 127 12 12 -5 38 -258 375 -318 422
-480 672 -745 1153 l-123 222 -167 0 c-643 0 -1147 109 -1667 360 -383 184
-691 401 -1002 704 -383 374 -682 822 -875 1311 -175 444 -239 804 -239 1350
0 611 120 1142 374 1650 183 365 364 619 697 980 94 102 181 214 181 234 0 14
-49 38 -315 156 -275 122 -561 265 -870 438 -320 178 -439 241 -503 266 l-53
21 -51 -47z"/>
<path d="M18409 15616 c-90 -46 -239 -126 -330 -179 -258 -149 -527 -288 -734
-382 -387 -176 -457 -209 -462 -222 -7 -18 70 -122 173 -233 273 -295 429
-503 594 -791 226 -394 394 -862 445 -1233 48 -353 48 -880 0 -1232 -48 -355
-209 -812 -414 -1178 -413 -738 -1086 -1338 -1855 -1653 -464 -191 -909 -273
-1477 -273 l-167 0 -122 -222 c-252 -456 -435 -741 -704 -1098 -212 -280 -306
-410 -306 -421 0 -12 53 -25 260 -64 367 -69 618 -88 1125 -89 497 0 759 20
1095 85 1456 282 2780 1184 3622 2469 368 560 633 1184 772 1817 81 372 106
609 113 1109 9 632 -27 1014 -138 1464 -183 742 -504 1431 -947 2030 -169 228
-311 380 -355 380 -13 0 -98 -38 -188 -84z"/>
<path d="M10602 11199 c-37 -11 -44 -25 -62 -118 -33 -180 -156 -513 -280
-761 -191 -379 -407 -678 -715 -985 -281 -282 -540 -474 -950 -705 -110 -62
-201 -114 -203 -115 -12 -11 103 -216 241 -429 216 -335 366 -522 846 -1061
174 -195 358 -422 539 -665 248 -333 341 -407 542 -431 97 -11 219 -6 300 13
137 32 248 132 450 403 233 314 459 589 718 873 251 275 419 479 534 647 135
197 338 534 374 621 l14 32 -203 112 c-400 222 -668 420 -952 705 -320 320
-541 629 -736 1030 -124 255 -247 600 -266 745 -8 63 -18 78 -61 90 -44 12
-85 12 -130 -1z"/>
<path d="M1413 8015 c3 -16 9 -68 12 -115 30 -392 123 -820 312 -1425 165
-528 435 -1160 557 -1303 25 -29 83 -101 128 -160 114 -148 273 -310 397 -402
135 -102 282 -177 576 -293 132 -52 341 -142 465 -200 124 -57 238 -107 255
-111 16 -4 73 -32 126 -62 180 -100 318 -152 785 -294 614 -187 1092 -375
1659 -655 876 -432 1632 -934 2390 -1586 258 -222 448 -402 810 -768 181 -183
389 -388 460 -454 113 -104 130 -124 130 -151 l0 -31 186 -3 186 -2 12 28 c28
68 127 132 204 132 27 0 86 54 496 463 561 557 784 760 1176 1073 1154 919
2396 1568 3804 1984 327 97 519 170 653 247 43 25 136 69 206 98 70 29 201 87
292 130 90 42 272 119 405 172 132 52 278 115 325 140 243 128 419 282 625
548 38 50 94 119 123 153 114 136 370 720 527 1202 147 454 264 912 310 1220
18 121 48 431 42 437 -3 2 -44 -47 -93 -109 -49 -62 -142 -178 -208 -258 -883
-1066 -1941 -1794 -3221 -2215 -1136 -375 -2424 -435 -3615 -169 -85 19 -278
68 -428 110 l-272 75 -149 -141 c-82 -78 -180 -166 -218 -196 -183 -148 -429
-289 -604 -348 -122 -41 -219 -48 -567 -44 -311 5 -319 5 -407 32 -191 58
-455 207 -653 368 -42 35 -124 108 -182 163 -58 54 -121 114 -141 133 l-36 33
-214 -60 c-564 -158 -911 -223 -1432 -268 -236 -20 -820 -23 -1047 -4 -961 77
-1761 299 -2600 722 -932 469 -1698 1111 -2414 2024 -143 182 -140 178 -133
140z"/>
<path d="M9683 3 c15 -2 39 -2 55 0 15 2 2 4 -28 4 -30 0 -43 -2 -27 -4z"/>
<path d="M11462 3 c59 -2 158 -2 220 0 62 1 14 3 -107 3 -121 0 -172 -2 -113
-3z"/>
</g>
</svg>
          <h3 style="color: var(--text1)">Rename Screener</h3>
          <input 
        id="inputrename" 
        placeholder="Enter Screener Name" 
        type="text"
        v-model="screenerName"
      :class="{'input-error': screenerName.length > 20}"
      />
          <div class="inner">
            <button @click="showRenameScreener = false">
             <svg class="imgbtn" fill="var(--text1)" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 882.968 882.968" xml:space="preserve" transform="rotate(180)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M661.885,492.032c10.23,10.11,23.566,15.155,36.896,15.155c13.541,0,27.078-5.207,37.348-15.601l131.684-133.271 c9.785-9.905,15.236-23.291,15.154-37.216c-0.084-13.923-5.695-27.243-15.6-37.029l-131.48-129.912 c-20.625-20.379-53.867-20.18-74.244,0.445c-20.379,20.625-20.18,53.865,0.445,74.244l41.236,40.747H235.337 c-62.861,0-121.959,24.479-166.408,68.93C24.48,382.975,0,442.072,0,504.934v3.693c0,62.861,24.479,121.959,68.929,166.408 c44.45,44.449,103.547,68.929,166.408,68.929H381.2c62.861,0,121.958-24.479,166.408-68.929s68.93-103.547,68.93-166.408v-3.693 c0-28.995-23.506-52.5-52.5-52.5s-52.5,23.505-52.5,52.5v3.693c0,71.868-58.469,130.337-130.337,130.337H235.337 C163.469,638.964,105,580.495,105,508.627v-3.693c0-71.868,58.469-130.337,130.337-130.337h468.778l-42.676,43.191 C641.061,438.412,641.26,471.653,661.885,492.032z"></path> </g> </g></svg>
            </button>
            <button @click="UpdateScreener()">
               <svg class="imgbtn" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M11 8C11 7.44772 11.4477 7 12 7C12.5523 7 13 7.44771 13 8V11H16C16.5523 11 17 11.4477 17 12C17 12.5523 16.5523 13 16 13H13V16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16V13H8C7.44772 13 7 12.5523 7 12C7 11.4477 7.44771 11 8 11H11V8Z" fill="var(--text1)"></path> <path fill-rule="evenodd" clip-rule="evenodd" d="M23 4C23 2.34315 21.6569 1 20 1H4C2.34315 1 1 2.34315 1 4V20C1 21.6569 2.34315 23 4 23H20C21.6569 23 23 21.6569 23 20V4ZM21 4C21 3.44772 20.5523 3 20 3H4C3.44772 3 3 3.44772 3 4V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V4Z" fill="var(--text1)"></path> </g></svg>
            </button>
          </div>
        </div>
        <div v-if="showSearch" class="searchDiv">
          <input type="search" class="search-input" placeholder="Search..." 
          v-model="searchQuery" @input="toUpperCase" @keydown.enter="SearchElement()">
          <button class="search-btn" @click="SearchElement()">
            <svg class="img3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M14.9536 14.9458L21 21M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
          </button>
        </div>
        <div class="navmenu">
          <button class="snavbtn" id="watchlistCreate" :class="{ 'snavbtnslct': showCreateScreener }" @click="showCreateScreener = !showCreateScreener" v-b-tooltip.hover
            title="Create New Screener">
            <svg class="img2" viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="var(--text1)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>new-indicator</title> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="scheduler" fill="var(--text1)" transform="translate(85.333333, 85.333333)"> <path d="M170.666667,1.42108547e-14 C264.923264,-3.10380131e-15 341.333333,76.4100694 341.333333,170.666667 C341.333333,264.923264 264.923264,341.333333 170.666667,341.333333 C76.4100694,341.333333 2.57539587e-14,264.923264 1.42108547e-14,170.666667 C2.6677507e-15,76.4100694 76.4100694,3.15255107e-14 170.666667,1.42108547e-14 Z M170.666667,42.6666667 C99.9742187,42.6666667 42.6666667,99.9742187 42.6666667,170.666667 C42.6666667,241.359115 99.9742187,298.666667 170.666667,298.666667 C241.359115,298.666667 298.666667,241.359115 298.666667,170.666667 C298.666667,99.9742187 241.359115,42.6666667 170.666667,42.6666667 Z M192,85.3333333 L191.999333,149.333333 L256,149.333333 L256,192 L191.999333,191.999333 L192,256 L149.333333,256 L149.333333,191.999333 L85.3333333,192 L85.3333333,149.333333 L149.333333,149.333333 L149.333333,85.3333333 L192,85.3333333 Z" id="Combined-Shape"> </path> </g> </g> </g></svg>
               <label class=btnlabel>Create</label></button>
          <button class="snavbtn" id="screenerModify" :class="{ 'snavbtnslct': showRenameScreener }" @click="showRenameScreener = !showRenameScreener" v-b-tooltip.hover
            title="Rename Current Screener">
            <svg class="img2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M9 5H14M14 5H19M14 5V19M9 19H14M14 19H19" stroke="var(--text1)" stroke-width="2"></path> <path d="M11 9H4C2.89543 9 2 9.89543 2 11V15H11" stroke="var(--text1)" stroke-width="2"></path> <path d="M17 15H20C21.1046 15 22 14.1046 22 13V9H17" stroke="var(--text1)" stroke-width="2"></path> </g></svg>
              <label class=btnlabel>Rename</label></button>
          <button class="snavbtn" v-b-tooltip.hover title="Reset Screener" @click="async() => {await ResetScreener(); await CurrentScreener();}" >
           <svg class="img2" fill="var(--text1)" viewBox="0 0 512 512" data-name="Layer 1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" stroke="var(--text1)" stroke-width="20.48"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M64,256H34A222,222,0,0,1,430,118.15V85h30V190H355V160h67.27A192.21,192.21,0,0,0,256,64C150.13,64,64,150.13,64,256Zm384,0c0,105.87-86.13,192-192,192A192.21,192.21,0,0,1,89.73,352H157V322H52V427H82V393.85A222,222,0,0,0,478,256Z"></path></g></svg>
             <label class=btnlabel>Reset</label></button>
          <button id="watchlistAutoplay" class="snavbtn" :class="{ 'snavbtnslct': autoplayRunning === true }" @click="AutoPlay()" v-b-tooltip.hover
            title="Autoplay Results">
            <svg class="img2" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="var(--text1)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill="var(--text1)" fill-rule="evenodd" d="M5.23331,0.493645 C6.8801,-0.113331 8.6808,-0.161915 10.3579,0.355379 C11.4019,0.6773972 12.361984,1.20757325 13.1838415,1.90671757 L13.4526,2.14597 L14.2929,1.30564 C14.8955087,0.703065739 15.9071843,1.0850774 15.994017,1.89911843 L16,2.01275 L16,6.00002 L12.0127,6.00002 C11.1605348,6.00002 10.7153321,5.01450817 11.2294893,4.37749065 L11.3056,4.29291 L12.0372,3.56137 C11.389,2.97184 10.6156,2.52782 9.76845,2.26653 C8.5106,1.87856 7.16008,1.915 5.92498,2.37023 C4.68989,2.82547 3.63877,3.67423 2.93361,4.78573 C2.22844,5.89723 1.90836,7.20978 2.02268,8.52112 C2.13701,9.83246 2.6794,11.0698 3.56627,12.0425 C4.45315,13.0152 5.63528,13.6693 6.93052,13.9039 C8.22576,14.1385 9.56221,13.9407 10.7339,13.3409 C11.9057,12.7412 12.8476,11.7727 13.4147,10.5848 C13.6526,10.0864 14.2495,9.8752 14.748,10.1131 C15.2464,10.351 15.4575,10.948 15.2196,11.4464 C14.4635,13.0302 13.2076,14.3215 11.6453,15.1213 C10.0829,15.921 8.30101,16.1847 6.57402,15.8719 C4.84704,15.559 3.27086,14.687 2.08836,13.39 C0.905861,12.0931 0.182675,10.4433 0.0302394,8.69483 C-0.122195,6.94637 0.304581,5.1963 1.2448,3.7143 C2.18503,2.2323 3.58652,1.10062 5.23331,0.493645 Z M6,5.46077 C6,5.09472714 6.37499031,4.86235811 6.69509872,5.0000726 L6.7678,5.03853 L10.7714,7.57776 C11.0528545,7.75626909 11.0784413,8.14585256 10.8481603,8.36273881 L10.7714,8.42224 L6.7678,10.9615 C6.45867857,11.1575214 6.06160816,10.965274 6.00646097,10.6211914 L6,10.5392 L6,5.46077 Z"></path> </g></svg>
            <label class=btnlabel>Autoplay</label></button>
          <button class="snavbtn" :class="{ 'snavbtnslct': listMode === 'hidden' }" v-b-tooltip.hover title="Hidden List" @click="showHiddenResults()">
           <svg class="img2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g id="Edit / Hide"> <path id="Vector" d="M3.99989 4L19.9999 20M16.4999 16.7559C15.1473 17.4845 13.6185 17.9999 11.9999 17.9999C8.46924 17.9999 5.36624 15.5478 3.5868 13.7788C3.1171 13.3119 2.88229 13.0784 2.7328 12.6201C2.62619 12.2933 2.62616 11.7066 2.7328 11.3797C2.88233 10.9215 3.11763 10.6875 3.58827 10.2197C4.48515 9.32821 5.71801 8.26359 7.17219 7.42676M19.4999 14.6335C19.8329 14.3405 20.138 14.0523 20.4117 13.7803L20.4146 13.7772C20.8832 13.3114 21.1182 13.0779 21.2674 12.6206C21.374 12.2938 21.3738 11.7068 21.2672 11.38C21.1178 10.9219 20.8827 10.6877 20.4133 10.2211C18.6338 8.45208 15.5305 6 11.9999 6C11.6624 6 11.3288 6.02241 10.9999 6.06448M13.3228 13.5C12.9702 13.8112 12.5071 14 11.9999 14C10.8953 14 9.99989 13.1046 9.99989 12C9.99989 11.4605 10.2135 10.9711 10.5608 10.6113" stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g> </g></svg>
               <label class=btnlabel>Hidden Stocks</label></button>
              <button class="snavbtn" :class="{ 'snavbtnslct': listMode === 'combined' }" v-b-tooltip.hover title="Show Combined Screener Results" @click="showCombinedResults()">
           <svg class="img2" fill="var(--text1)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M8,8 L8,4.5 C8,3.11928813 9.11928813,2 10.5,2 L19.5,2 C20.8807119,2 22,3.11928813 22,4.5 L22,13.5 C22,14.8807119 20.8807119,16 19.5,16 L16,16 L16,19.5 C16,20.8807119 14.8807119,22 13.5,22 L4.5,22 C3.11928813,22 2,20.8807119 2,19.5 L2,10.5 C2,9.11928813 3.11928813,8 4.5,8 L8,8 Z M9,8.5 C9,8.77614237 8.77614237,9 8.5,9 L4.5,9 C3.67157288,9 3,9.67157288 3,10.5 L3,19.5 C3,20.3284271 3.67157288,21 4.5,21 L13.5,21 C14.3284271,21 15,20.3284271 15,19.5 L15,15.5 C15,15.2238576 15.2238576,15 15.5,15 L19.5,15 C20.3284271,15 21,14.3284271 21,13.5 L21,4.5 C21,3.67157288 20.3284271,3 19.5,3 L10.5,3 C9.67157288,3 9,3.67157288 9,4.5 L9,8.5 Z M13.5,9 C13.2238576,9 13,8.77614237 13,8.5 C13,8.22385763 13.2238576,8 13.5,8 C14.8807119,8 16,9.11928813 16,10.5 C16,10.7761424 15.7761424,11 15.5,11 C15.2238576,11 15,10.7761424 15,10.5 C15,9.67157288 14.3284271,9 13.5,9 Z M8,13.5 C8,13.2238576 8.22385763,13 8.5,13 C8.77614237,13 9,13.2238576 9,13.5 C9,14.3284271 9.67157288,15 10.5,15 C10.7761424,15 11,15.2238576 11,15.5 C11,15.7761424 10.7761424,16 10.5,16 C9.11928813,16 8,14.8807119 8,13.5 Z M12.5,16 C12.2238576,16 12,15.7761424 12,15.5 C12,15.2238576 12.2238576,15 12.5,15 L13.5,15 C13.7761424,15 14,15.2238576 14,15.5 C14,15.7761424 13.7761424,16 13.5,16 L12.5,16 Z M10.5,9 C10.2238576,9 10,8.77614237 10,8.5 C10,8.22385763 10.2238576,8 10.5,8 L11.5,8 C11.7761424,8 12,8.22385763 12,8.5 C12,8.77614237 11.7761424,9 11.5,9 L10.5,9 Z M8,10.5 C8,10.2238576 8.22385763,10 8.5,10 C8.77614237,10 9,10.2238576 9,10.5 L9,11.5 C9,11.7761424 8.77614237,12 8.5,12 C8.22385763,12 8,11.7761424 8,11.5 L8,10.5 Z M15,12.5 C15,12.2238576 15.2238576,12 15.5,12 C15.7761424,12 16,12.2238576 16,12.5 L16,13.5 C16,13.7761424 15.7761424,14 15.5,14 C15.2238576,14 15,13.7761424 15,13.5 L15,12.5 Z"></path> </g></svg>
            <label class=btnlabel>Multi-Screener</label>
          </button>
          <button style="display: none;" class="snavbtn" :class="{ 'snavbtnslct': showSearch }" id="showSearch" @click="showSearch = !showSearch" v-b-tooltip.hover title="Search">
           <svg class="img2" fill="var(--text1)" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M12.027 9.92L16 13.95 14 16l-4.075-3.976A6.465 6.465 0 0 1 6.5 13C2.91 13 0 10.083 0 6.5 0 2.91 2.917 0 6.5 0 10.09 0 13 2.917 13 6.5a6.463 6.463 0 0 1-.973 3.42zM1.997 6.452c0 2.48 2.014 4.5 4.5 4.5 2.48 0 4.5-2.015 4.5-4.5 0-2.48-2.015-4.5-4.5-4.5-2.48 0-4.5 2.014-4.5 4.5z" fill-rule="evenodd"></path> </g></svg>
            <label class=btnlabel>Search</label></button>
        </div>
        <div class="navmenu-mobile">
          <button class="snavbtn" id="watchlistCreate" :class="{ 'snavbtnslct': showCreateScreener }" @click="showCreateScreener = !showCreateScreener" v-b-tooltip.hover
            title="Create New Screener">
            <svg class="img2" viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="var(--text1)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>new-indicator</title> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="scheduler" fill="var(--text1)" transform="translate(85.333333, 85.333333)"> <path d="M170.666667,1.42108547e-14 C264.923264,-3.10380131e-15 341.333333,76.4100694 341.333333,170.666667 C341.333333,264.923264 264.923264,341.333333 170.666667,341.333333 C76.4100694,341.333333 2.57539587e-14,264.923264 1.42108547e-14,170.666667 C2.6677507e-15,76.4100694 76.4100694,3.15255107e-14 170.666667,1.42108547e-14 Z M170.666667,42.6666667 C99.9742187,42.6666667 42.6666667,99.9742187 42.6666667,170.666667 C42.6666667,241.359115 99.9742187,298.666667 170.666667,298.666667 C241.359115,298.666667 298.666667,241.359115 298.666667,170.666667 C298.666667,99.9742187 241.359115,42.6666667 170.666667,42.6666667 Z M192,85.3333333 L191.999333,149.333333 L256,149.333333 L256,192 L191.999333,191.999333 L192,256 L149.333333,256 L149.333333,191.999333 L85.3333333,192 L85.3333333,149.333333 L149.333333,149.333333 L149.333333,85.3333333 L192,85.3333333 Z" id="Combined-Shape"> </path> </g> </g> </g></svg></button>
          <button class="snavbtn" id="screenerModify" :class="{ 'snavbtnslct': showRenameScreener }" @click="showRenameScreener = !showRenameScreener" v-b-tooltip.hover
            title="Rename Current Screener">
            <svg class="img2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M9 5H14M14 5H19M14 5V19M9 19H14M14 19H19" stroke="var(--text1)" stroke-width="2"></path> <path d="M11 9H4C2.89543 9 2 9.89543 2 11V15H11" stroke="var(--text1)" stroke-width="2"></path> <path d="M17 15H20C21.1046 15 22 14.1046 22 13V9H17" stroke="var(--text1)" stroke-width="2"></path> </g></svg>
             </button>
          <button class="snavbtn" v-b-tooltip.hover title="Reset Screener" @click="async() => {await ResetScreener(); await CurrentScreener();}" >
           <svg class="img2" fill="var(--text1)" viewBox="0 0 512 512" data-name="Layer 1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" stroke="var(--text1)" stroke-width="20.48"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M64,256H34A222,222,0,0,1,430,118.15V85h30V190H355V160h67.27A192.21,192.21,0,0,0,256,64C150.13,64,64,150.13,64,256Zm384,0c0,105.87-86.13,192-192,192A192.21,192.21,0,0,1,89.73,352H157V322H52V427H82V393.85A222,222,0,0,0,478,256Z"></path></g></svg>
             </button>
          <button class="snavbtn" :class="{ 'snavbtnslct': listMode === 'hidden' }" v-b-tooltip.hover title="Hidden List" @click="showHiddenResults()">
           <svg class="img2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g id="Edit / Hide"> <path id="Vector" d="M3.99989 4L19.9999 20M16.4999 16.7559C15.1473 17.4845 13.6185 17.9999 11.9999 17.9999C8.46924 17.9999 5.36624 15.5478 3.5868 13.7788C3.1171 13.3119 2.88229 13.0784 2.7328 12.6201C2.62619 12.2933 2.62616 11.7066 2.7328 11.3797C2.88233 10.9215 3.11763 10.6875 3.58827 10.2197C4.48515 9.32821 5.71801 8.26359 7.17219 7.42676M19.4999 14.6335C19.8329 14.3405 20.138 14.0523 20.4117 13.7803L20.4146 13.7772C20.8832 13.3114 21.1182 13.0779 21.2674 12.6206C21.374 12.2938 21.3738 11.7068 21.2672 11.38C21.1178 10.9219 20.8827 10.6877 20.4133 10.2211C18.6338 8.45208 15.5305 6 11.9999 6C11.6624 6 11.3288 6.02241 10.9999 6.06448M13.3228 13.5C12.9702 13.8112 12.5071 14 11.9999 14C10.8953 14 9.99989 13.1046 9.99989 12C9.99989 11.4605 10.2135 10.9711 10.5608 10.6113" stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g> </g></svg>
              </button>
              <button class="snavbtn" :class="{ 'snavbtnslct': listMode === 'combined' }" v-b-tooltip.hover title="Show Combined Screener Results" @click="showCombinedResults()">
           <svg class="img2" fill="var(--text1)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M8,8 L8,4.5 C8,3.11928813 9.11928813,2 10.5,2 L19.5,2 C20.8807119,2 22,3.11928813 22,4.5 L22,13.5 C22,14.8807119 20.8807119,16 19.5,16 L16,16 L16,19.5 C16,20.8807119 14.8807119,22 13.5,22 L4.5,22 C3.11928813,22 2,20.8807119 2,19.5 L2,10.5 C2,9.11928813 3.11928813,8 4.5,8 L8,8 Z M9,8.5 C9,8.77614237 8.77614237,9 8.5,9 L4.5,9 C3.67157288,9 3,9.67157288 3,10.5 L3,19.5 C3,20.3284271 3.67157288,21 4.5,21 L13.5,21 C14.3284271,21 15,20.3284271 15,19.5 L15,15.5 C15,15.2238576 15.2238576,15 15.5,15 L19.5,15 C20.3284271,15 21,14.3284271 21,13.5 L21,4.5 C21,3.67157288 20.3284271,3 19.5,3 L10.5,3 C9.67157288,3 9,3.67157288 9,4.5 L9,8.5 Z M13.5,9 C13.2238576,9 13,8.77614237 13,8.5 C13,8.22385763 13.2238576,8 13.5,8 C14.8807119,8 16,9.11928813 16,10.5 C16,10.7761424 15.7761424,11 15.5,11 C15.2238576,11 15,10.7761424 15,10.5 C15,9.67157288 14.3284271,9 13.5,9 Z M8,13.5 C8,13.2238576 8.22385763,13 8.5,13 C8.77614237,13 9,13.2238576 9,13.5 C9,14.3284271 9.67157288,15 10.5,15 C10.7761424,15 11,15.2238576 11,15.5 C11,15.7761424 10.7761424,16 10.5,16 C9.11928813,16 8,14.8807119 8,13.5 Z M12.5,16 C12.2238576,16 12,15.7761424 12,15.5 C12,15.2238576 12.2238576,15 12.5,15 L13.5,15 C13.7761424,15 14,15.2238576 14,15.5 C14,15.7761424 13.7761424,16 13.5,16 L12.5,16 Z M10.5,9 C10.2238576,9 10,8.77614237 10,8.5 C10,8.22385763 10.2238576,8 10.5,8 L11.5,8 C11.7761424,8 12,8.22385763 12,8.5 C12,8.77614237 11.7761424,9 11.5,9 L10.5,9 Z M8,10.5 C8,10.2238576 8.22385763,10 8.5,10 C8.77614237,10 9,10.2238576 9,10.5 L9,11.5 C9,11.7761424 8.77614237,12 8.5,12 C8.22385763,12 8,11.7761424 8,11.5 L8,10.5 Z M15,12.5 C15,12.2238576 15.2238576,12 15.5,12 C15.7761424,12 16,12.2238576 16,12.5 L16,13.5 C16,13.7761424 15.7761424,14 15.5,14 C15.2238576,14 15,13.7761424 15,13.5 L15,12.5 Z"></path> </g></svg>
            
          </button>
        </div>
          <div v-if="listMode === 'main'">
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
          </div>
          <div v-else-if="listMode === 'filter'">
            <div class="RES">
          <div class="Header" style="display: flex; flex-direction: row; width: 100vw; height: 30px; align-items: center;">
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
          <div class="wlist-container" @scroll.passive="handleScroll2">
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
              <div style="min-width: 50px; position: relative;">
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
          </div>
          <div v-else-if="listMode === 'hidden'">
            <div class="RES">
          <div class="Header" style="display: flex; flex-direction: row; width: 100vw; height: 30px; align-items: center;">
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
          <div class="wlist-container" @scroll.passive="handleScroll3">
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
                  <div @click="ShowStock(asset)" @click.stop style="display: flex; flex-direction: row; align-items: center; height: 14px;">
                   <svg style="width: 15px; height: 15px; margin-right: 5px;" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="var(--text1)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M0 0h48v48H0z" fill="none"></path> <g id="Shopicon"> <circle cx="24" cy="24" r="4"></circle> <path d="M24,38c12,0,20-14,20-14s-8-14-20-14S4,24,4,24S12,38,24,38z M24,16c4.418,0,8,3.582,8,8s-3.582,8-8,8s-8-3.582-8-8 S19.582,16,24,16z"></path> </g> </g></svg>
                    <p>Show Stock</p>
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
              <div style="min-width: 100px;;">{{ asset.Close }}</div>
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
          </div>
          <div v-else-if="listMode === 'combined'">
            <div class="RES">
          <div class="Header" style="display: flex; flex-direction: row; width: 100vw; height: 30px; align-items: center;">
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
          <div class="wlist-container" @scroll.passive="handleScroll4">
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
              <div style="min-width: 70px;" class="btsymbol">
                {{ asset.Symbol }}
  <span v-if="asset.isDuplicate" class="duplicate-asterisk">
    * 
    <span class="tooltip2">
      Appears in:
      <div v-for="(screener, index) in asset.screenerNames" :key="index">{{ screener }}</div>
    </span>
  </span>
</div>
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
          </div>
        </div>
      <div id="sidebar-r" :class="{ 'hidden-mobile': selected !== 'charts' }">
       <h1 class="title3">WEEKLY CHART</h1>
<div class="chart-container">
    <div class="loading-container1" v-if="isChartLoading1 || isLoading1">
        <Loader />
    </div>
    <div id="wk-chart" ref="wkchart" style="width: 100%; height: 250px;" :class="{'hidden': isChartLoading1 || isLoading1}"></div>
</div>

<h1 class="title3">DAILY CHART</h1>
<div class="chart-container">
    <div class="loading-container2" v-if="isChartLoading2 || isLoading2">
        <Loader />
    </div>
    <div id="dl-chart" ref="dlchart" style="width: 100%; height: 250px;" :class="{'hidden': isChartLoading2 || isLoading2}"></div>
</div>
        <h1 class="title3">SUMMARY</h1>
        <div style="padding-top: 5px; border:none" id="summary">
          <div style="color: whitesmoke; text-align: center; border: none; overflow: scroll">
  <div style="color: var(--text1)" v-for="(item, index) in screenerSummary" :key="index">
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
    <Footer />
  </body>
</template>

<script setup>
// @ is an alias to /src
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
import Loader from '@/components/loader.vue'
import { computed, onMounted, ref, watch, nextTick, reactive, toRef} from 'vue';
import { createChart, ColorType } from 'lightweight-charts';
import { useStore } from 'vuex';
import NotificationPopup from '@/components/NotificationPopup.vue';
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
const showSearch = ref(false) // shows searchbar 
const selectedScreener = ref('') // selectes current screener 
const selectedSymbol = ref(''); // similar to selectedItem 
let showPriceInputs = ref(false); 
let showMarketCapInputs = ref(false);
let ShowSector = ref(false);
let ShowExchange = ref(false);
let ShowCountry = ref(false);
let showPEInputs = ref(false);
let showPEForwInputs = ref(false);
let showPEGInputs = ref(false);
let showEPSInputs = ref(false);
let showPSInputs = ref(false);
let showPBInputs = ref(false);
let showBetaInputs = ref(false);
let showFundYoYQoQ = ref(false);
let showPricePerf = ref(false);
let showRSscore = ref(false);
let showADV = ref(false);
let showVolume = ref(false);
let showDivYieldInputs = ref(false);
let showIPOInputs = ref(false);
let showROE = ref(false);
let showROA = ref(false);
let showCurrentRatio = ref(false);
let showCurrentAssets = ref(false);
let showCurrentLiabilities = ref(false);
let showCurrentDebt = ref(false);
let showCashEquivalents = ref(false);
let showFreeCashFlow = ref(false);
let showProfitMargin = ref(false);
let showGrossMargin = ref(false);
let showDebtToEquityRatio = ref(false);
let showBookValue = ref(false);
let showEV = ref(false);
let showRSI = ref(false);
let showGap = ref(false);
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
  await fetchData();
  await fetchData3();
  await fetchData7();
  await fetchData9();
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

  await fetchData();
  await fetchData3();

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

  const barSeries =  chart.addCandlestickSeries({
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

  await fetchData7();
  await fetchData9();

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
const Sectors = ref([]); // hosts all available sectors 
const selectedSectors = ref([]);
const Exchanges = ref([]); // hosts all available exchanges 
const selectedExchanges = ref([]);
const Country = ref([]); // hosts all available countries 
const selectedCountries = ref([]);
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
  else if(listMode.value === 'combined')
  {listMode.value = 'hidden';
  currentList.value = HiddenResults.value;}
  else if(listMode.value === 'filter')
  {listMode.value = 'hidden';
  currentList.value = HiddenResults.value;}
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
  else if(listMode.value === 'hidden')
  {listMode.value = 'combined';
  currentList.value = compoundedResults.value;}
  else if(listMode.value === 'filter')
  {listMode.value = 'combined';
  currentList.value = compoundedResults.value;}
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

// adds and modifies price value for screener 
async function SetPrice() {
  try {

    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftPrice = parseFloat(document.getElementById('left-p').value)
    const rightPrice = parseFloat(document.getElementById('right-p').value)

    if (leftPrice >= rightPrice) {
      throw new Error('Min price cannot be higher than or equal to max price')
    }

    const response = await fetch('/api/screener/price', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftPrice,
        maxPrice: rightPrice,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'Price range updated successfully') {
      await fetchScreenerResults(selectedScreener.value); 
    } else {
      throw new Error('Error updating price range')
    }
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

// add and or modifies market cap value and sends it
async function SetMarketCap() {
  try {

    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftPrice = parseFloat(document.getElementById('left-mc').value);
    const rightPrice = parseFloat(document.getElementById('right-mc').value);

    if (leftPrice >= rightPrice) {
      throw new Error('Min price cannot be higher than or equal to max price');
    }

    const response = await fetch('/api/screener/marketcap', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftPrice,
        maxPrice: rightPrice,
        screenerName: selectedScreener.value,
        user: user
      })
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.message === 'market cap updated successfully') {
      try {
        await fetchScreenerResults(selectedScreener.value);
      } catch (error) {
        error.value = error.message;
      }
    } else {
      throw new Error('Error updating range');
    }
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

// add and or modifies market cap value and sends it
async function SetIpoDate() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftPrice = document.getElementById('left-ipo').value;
    const rightPrice = document.getElementById('right-ipo').value;

    const response = await fetch('/api/screener/ipo-date', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftPrice,
        maxPrice: rightPrice,
        screenerName: selectedScreener.value,
        user: user
      })
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.message === 'ipo updated successfully') {
      try {
        await fetchScreenerResults(selectedScreener.value);
      } catch (error) {
        error.value = error.message;
      }
    } else {
      throw new Error('Error updating range');
    }
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

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

// starts autoplay all rows of screeners in order 
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

// complementary function for autoplay function 
function logElement() {
  if (!autoplayRunning) return; // Check if autoplay is still running

  const rows = document.querySelectorAll('#wlist');

  if (autoplayIndex >= rows.length) {
    autoplayIndex = 0;
  }

  rows[autoplayIndex].click();

  const symbolElement = rows[autoplayIndex].querySelector('td.btsymbol');

  if (symbolElement) {
    const symbolValue = symbolElement.textContent;
    console.log(symbolValue);
  } else {
    console.error('No element with class "btsymbol" found in row', autoplayIndex);
  }

  autoplayIndex++;
  autoplayTimeoutId = setTimeout(logElement, 7000); // 7 seconds
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

// generates options for checkboxes for sectors
async function GetSectors() {
  try {
    const response = await fetch('/api/screener/sectors', {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    const data = await response.json();
    Sectors.value = data;
    selectedSectors.value = new Array(data.length).fill(false); // Initialize selection state
  } catch (error) {
    error.value = error.message;
  }
}
GetSectors();

const toggleSector = (index) => {
  selectedSectors.value[index] = !selectedSectors.value[index]; // Toggle the selected state
};

// generates options for checkboxes for exchanges 
async function GetExchanges() {
  try {
    const response = await fetch('/api/screener/exchange', {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    const data = await response.json();
    Exchanges.value = data;
    selectedExchanges.value = new Array(data.length).fill(false); // Initialize selection state
  } catch (error) {
    error.value = error.message;
  }
}
GetExchanges();

const toggleExchange = (index) => {
  selectedExchanges.value[index] = !selectedExchanges.value[index]; // Toggle the selected state
};

// generates options for checkboxes for country 
async function GetCountry() {
  try {
    const response = await fetch('/api/screener/country', {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    const data = await response.json();
    Country.value = data;
    selectedCountries.value = new Array(data.length).fill(false); // Initialize selection state
  } catch (error) {
    error.value = error.message;
  }
}
GetCountry();

const toggleCountry = (index) => {
  selectedCountries.value[index] = !selectedCountries.value[index]; // Toggle the selected state
};

// sends sectors data to update screener
async function SetSector() {
  const selected = Sectors.value.filter((_, index) => selectedSectors.value[index]); // Get selected sectors

  try {
    const response = await fetch('/api/screener/sectors', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ sectors: selected, screenerName: selectedScreener.value, user: user })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    await fetchScreenerResults(selectedScreener.value); // Update the list after setting the sector
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

// sends exchanges data to update screener
async function SetExchange() {
  const selected = Exchanges.value.filter((_, index) => selectedExchanges.value[index]); // Get selected exchanges

  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const response = await fetch('/api/screener/exchange', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ exchanges: selected, screenerName: selectedScreener.value, user: user })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    await fetchScreenerResults(selectedScreener.value); // Update the list after setting the exchange
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

// sends country data to update screener
async function SetCountry() {
  const selected = Country.value.filter((_, index) => selectedCountries.value[index]); // Get selected countries

  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const response = await fetch('/api/screener/country', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ countries: selected, screenerName: selectedScreener.value, user: user })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    await fetchScreenerResults(selectedScreener.value); // Update the list after setting the country
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

// creates new screeners 
async function CreateScreener() {
  try {
    const ScreenerName = document.getElementById('inputcreate').value.trim();

    // Optional: Client-side validation before sending request
    if (ScreenerName.length > 20) {
      notification.value.show('Screener name cannot be longer than 20 characters');
      return;
    }

    const response = await fetch(`/api/${user}/create/screener/${ScreenerName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      }
    });

    const responseData = await response.json();

    // Check if the request was successful
    if (response.ok) {
      await GetScreeners();
      await GetCompoundedResults();
      showCreateScreener.value = false;
    } else {
      if (response.status === 400 && responseData.message === 'Maximum number of screeners (20) has been reached') {
        notification.value.show('You have reached the maximum number of screeners (20). Please delete some screeners to create new ones.');
      } else {
        console.error(responseData.message);
      }
    }
  } catch (error) {
    error.value = error.message;
  }
}

// renames screener 
async function UpdateScreener() {
  try {
    const ScreenerName = document.getElementById('inputrename').value.trim();
    const oldname = selectedScreener.value; // Get the current name of the screener

    // Check if the new screener name is too long
    if (ScreenerName.length > 20) {
      notification.value.show('Screener name cannot be longer than 20 characters');
      return;
    }

    // Optional: Check if the new name is different from the old name
    if (ScreenerName === oldname) {
      notification.value.show('New screener name must be different from the current name');
      return;
    }

    const response = await fetch(`/api/${user}/rename/screener`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ newname: ScreenerName, oldname: oldname })
    });

    const responseData = await response.json();

    // Check if the request was successful
    if (response.ok) {
      selectedScreener.value = ScreenerName;
      await GetScreeners();
      await GetCompoundedResults();
      showRenameScreener.value = false;
    } else {
    }
  } catch (error) {
    error.value = error.message;
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

// adds and modifies PE Ratio value for screener 
async function SetPE() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftPrice = parseFloat(document.getElementById('left-pe').value)
    const rightPrice = parseFloat(document.getElementById('right-pe').value)

    if (leftPrice >= rightPrice) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/pe', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftPrice,
        maxPrice: rightPrice,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
    } else {
      throw new Error('Error updating price range')
    }
    await fetchScreenerResults(selectedScreener.value); 
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

// adds and modifies Forward PE Ratio value for screener 
async function SetForwardPE() {
  try {
    const leftPrice = parseFloat(document.getElementById('left-pef').value)
    const rightPrice = parseFloat(document.getElementById('right-pef').value)

    if (leftPrice >= rightPrice) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch(`/api/screener/forward-pe/${apiKey}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        minPrice: leftPrice,
        maxPrice: rightPrice,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
      await fetchScreenerResults(selectedScreener.value);
    } else {
      throw new Error('Error updating price range')
    }
  } catch (error) {
    console.error('Error setting price:', error)
    await fetchScreenerResults(selectedScreener.value);
  }
}

// adds and modifies PEG Ratio value for screener 
async function SetPEG() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftPrice = parseFloat(document.getElementById('left-peg').value)
    const rightPrice = parseFloat(document.getElementById('right-peg').value)

    if (leftPrice >= rightPrice) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/peg', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftPrice,
        maxPrice: rightPrice,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
      await fetchScreenerResults(selectedScreener.value);
    } else {
      throw new Error('Error updating price range')
    }
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

// adds and modifies EPS value for screener 
async function SetEPS() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftPrice = parseFloat(document.getElementById('left-eps').value)
    const rightPrice = parseFloat(document.getElementById('right-eps').value)

    if (leftPrice >= rightPrice) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/eps', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftPrice,
        maxPrice: rightPrice,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
      await fetchScreenerResults(selectedScreener.value);
    } else {
      throw new Error('Error updating price range')
    }
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

// adds and modifies PS Ratio value for screener 
async function SetPSRatio() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftPrice = parseFloat(document.getElementById('left-ps').value)
    const rightPrice = parseFloat(document.getElementById('right-ps').value)

    if (leftPrice >= rightPrice) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/ps-ratio', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftPrice,
        maxPrice: rightPrice,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
      await fetchScreenerResults(selectedScreener.value);
    } else {
      throw new Error('Error updating price range')
    }
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

// adds and modifies PB Ratio value for screener 
async function SetPBRatio() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftPrice = parseFloat(document.getElementById('left-pb').value)
    const rightPrice = parseFloat(document.getElementById('right-pb').value)

    if (leftPrice >= rightPrice) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/pb-ratio', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftPrice,
        maxPrice: rightPrice,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
      await fetchScreenerResults(selectedScreener.value);
    } 
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
  await fetchScreenerResults(selectedScreener.value);
}

// adds and modifies Beta value for screener 
async function SetBeta() {
  try {
    const leftPrice = parseFloat(document.getElementById('left-beta').value)
    const rightPrice = parseFloat(document.getElementById('right-beta').value)

    if (leftPrice >= rightPrice) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch(`/api/screener/beta/${apiKey}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        minPrice: leftPrice,
        maxPrice: rightPrice,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
      await fetchScreenerResults(selectedScreener.value);
    } else {
      throw new Error('Error updating price range')
    }
  } catch (error) {
    console.error('Error setting price:', error)
    await fetchScreenerResults(selectedScreener.value);
  }
}

// adds and modifies dividend yield value for screener 
async function SetDivYield() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftPrice = parseFloat(document.getElementById('left-divyield').value)
    const rightPrice = parseFloat(document.getElementById('right-divyield').value)

    if (leftPrice >= rightPrice) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/div-yield', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftPrice,
        maxPrice: rightPrice,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
      await fetchScreenerResults(selectedScreener.value);
    } else {
      throw new Error('Error updating price range')
    }
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

// adds and modifies YoY and/or Qoq value for screener 
async function SetFundamentalGrowth() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftRevYoY = parseFloat(document.getElementById('left-RevYoY').value);
    const rightRevYoY = parseFloat(document.getElementById('right-RevYoY').value);
    const leftRevQoQ = parseFloat(document.getElementById('left-RevQoQ').value);
    const rightRevQoQ = parseFloat(document.getElementById('right-RevQoQ').value);
    const leftEarningsYoY = parseFloat(document.getElementById('left-EarningsYoY').value);
    const rightEarningsYoY = parseFloat(document.getElementById('right-EarningsYoY').value);
    const leftEarningsQoQ = parseFloat(document.getElementById('left-EarningsQoQ').value);
    const rightEarningsQoQ = parseFloat(document.getElementById('right-EarningsQoQ').value);
    const leftEPSYoY = parseFloat(document.getElementById('left-EPSYoY').value);
    const rightEPSYoY = parseFloat(document.getElementById('right-EPSYoY').value);
    const leftEPSQoQ = parseFloat(document.getElementById('left-EPSQoQ').value);
    const rightEPSQoQ = parseFloat(document.getElementById('right-EPSQoQ').value);

    const response = await fetch('/api/screener/fundamental-growth', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minRevYoY: leftRevYoY, 
        maxRevYoY: rightRevYoY, 
        minRevQoQ: leftRevQoQ, 
        maxRevQoQ: rightRevQoQ,
        minEarningsYoY: leftEarningsYoY,
        maxEarningsYoY: rightEarningsYoY,
        minEarningsQoQ: leftEarningsQoQ,
        maxEarningsQoQ: rightEarningsQoQ,
        minEPSYoY: leftEPSYoY,
        maxEPSYoY: rightEPSYoY,
        minEPSQoQ: leftEPSQoQ,
        maxEPSQoQ: rightEPSQoQ,
        screenerName: selectedScreener.value,
        user: user
      })
    });
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json();

    if (data.message === 'updated successfully') {
      await fetchScreenerResults(selectedScreener.value);
    } else {
      throw new Error('Error updating')
    }
  } catch (error) {
    if (error.response && error.response.status === 400) {
      error.value = error.response.data.message;
      // Display an error message to the user
    } else {
      error.value = error.message;
      await fetchScreenerResults(selectedScreener.value);
  }}
}

// updates screener value with volume parameters 
async function SetVolume(){
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const value1 = parseFloat(document.getElementById('left-relvol').value)
    const value2 = parseFloat(document.getElementById('right-relvol').value)
    const value3 = parseFloat(document.getElementById('left-avgvol').value * 1000)
    const value4 = parseFloat(document.getElementById('right-avgvol').value * 1000)
    const relVolOption = relVolSelect.value
    const avgVolOption = avgVolSelect.value

    const response = await fetch('/api/screener/volume', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        value1: value1,
        value2: value2,
        value3: value3,
        value4: value4,
        relVolOption: relVolOption,
        avgVolOption: avgVolOption,
        screenerName: selectedScreener.value,
        user: user
      })
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
      await fetchScreenerResults(selectedScreener.value);
    } else {
      throw new Error('Error updating price range')
    }
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

// updates screener value with RS Score parameters 
async function SetRSscore(){
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const value1 = parseFloat(document.getElementById('RSscore1Minput1').value)
    const value2 = parseFloat(document.getElementById('RSscore1Minput2').value)
    const value3 = parseFloat(document.getElementById('RSscore4Minput1').value)
    const value4 = parseFloat(document.getElementById('RSscore4Minput2').value)
    const value5 = parseFloat(document.getElementById('RSscore1Winput1').value)
    const value6 = parseFloat(document.getElementById('RSscore1Winput2').value)

    const response = await fetch('/api/screener/rs-score', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        value1: value1,
        value2: value2,
        value3: value3,
        value4: value4,
        value5: value5,
        value6: value6,
        screenerName: selectedScreener.value,
        user: user
      })
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
      await fetchScreenerResults(selectedScreener.value);
    } else {
      throw new Error('Error updating range')
    }
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

// updates screener value with ADV parameters 
async function SetADV(){
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const value1 = parseFloat(document.getElementById('ADV1Winput1').value).toFixed(2);
    const value2 = parseFloat(document.getElementById('ADV1Winput2').value).toFixed(2);
    const value3 = parseFloat(document.getElementById('ADV1Minput1').value).toFixed(2);
    const value4 = parseFloat(document.getElementById('ADV1Minput2').value).toFixed(2);
    const value5 = parseFloat(document.getElementById('ADV4Minput1').value).toFixed(2);
    const value6 = parseFloat(document.getElementById('ADV4Minput2').value).toFixed(2);
    const value7 = parseFloat(document.getElementById('ADV1Yinput1').value).toFixed(2);
    const value8 = parseFloat(document.getElementById('ADV1Yinput2').value).toFixed(2);

    const response = await fetch('/api/screener/adv', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        value1: value1,
        value2: value2,
        value3: value3,
        value4: value4,
        value5: value5,
        value6: value6,
        value7: value7,
        value8: value8,
        screenerName: selectedScreener.value,
        user: user
      })
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
      await fetchScreenerResults(selectedScreener.value);
    } else {
      throw new Error('Error updating range')
    }
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

// updates screener value with price performance parameters 
async function SetPricePerformance(){
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }
    const changeperc1 = parseFloat(document.getElementById('changeperc1').value) / 100;
    const changeperc2 = parseFloat(document.getElementById('changeperc2').value) / 100;
    const changepercselect = changepercSelect.value;
    const weekhigh1 = parseFloat(document.getElementById('weekhigh1').value);
    const weekhigh2 = parseFloat(document.getElementById('weekhigh2').value);
    const weeklow1 = parseFloat(document.getElementById('weeklow1').value);
    const weeklow2 = parseFloat(document.getElementById('weeklow2').value);
    const alltimehigh = allTimeHigh.value ? 'yes' : 'no';
    const alltimelow = allTimeLow.value ? 'yes' : 'no';
    const ma200 = ma200Select.value;
    const ma50 = ma50Select.value;
    const ma20 = ma20Select.value;
    const ma10 = ma10Select.value;
    const pricevalue = priceSelect.value;

    const response = await fetch('/api/screener/price-performance', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        value1: changeperc1, 
        value2: changeperc2, 
        value3: changepercselect, 
        value4: weekhigh1,
        value5: weekhigh2,
        value6: weeklow1,
        value7: weeklow2,
        value8: alltimehigh,
        value9: alltimelow,
        value10: ma200,
        value11: ma50,
        value12: ma20,
        value13: ma10,
        value14: pricevalue,
        screenerName: selectedScreener.value,
        user: user
      })
    });
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json();

    if (data.message === 'updated successfully') {
      await fetchScreenerResults(selectedScreener.value);
    } else {
      throw new Error('Error updating')
    }
  } catch (error) {
    if (error.response && error.response.status === 400) {
      error.value = error.response.data.message;
      await fetchScreenerResults(selectedScreener.value);
    } else {
      error.value = error.message;
      await fetchScreenerResults(selectedScreener.value);
  }}
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
      if (sectorsList.includes(value) || exchangesList.includes(value) || countriesList.includes(value)) {
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
  'Gap': 'Gap'
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
      'RelVolume1W', 'RelVolume1M', 'RelVolume6M', 'RelVolume1Y', 'RSScore1W','RSScore1M', 'RSScore4M', 'MA10', 'MA20', 'MA50', 'MA200', 'CurrentPrice', 'NewHigh',
      'NewLow', 'PercOffWeekHigh', 'PercOffWeekLow', 'changePerc', 'IPO', 'ADV1W', 'ADV1M', 'ADV4M', 'ADV1Y', 'ROE', 'ROA', 'currentRatio', 
      'assetsCurrent', 'liabilitiesCurrent', 'debtCurrent', 'cashAndEq', 'freeCashFlow', 'profitMargin', 'grossMargin', 'debtEquity', 'bookVal', 'EV',
      'RSI', 'Gap'
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

function SearchElement() {
  const searchValue = document.querySelector('.search-input').value;
  const divElements = document.querySelectorAll('#wlist');

  divElements.forEach((div) => {
    const tdElement = div.querySelector('.btsymbol');
    if (tdElement.textContent.includes(searchValue.toUpperCase())) {
      div.style.display = 'flex';
    } else {
      div.style.display = 'none';
    }
  });
  showSearch.value = false;
}

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

async function getFullWatchlists(user){
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

const getScreenerImage = (screener) => {
  const includeSvg = `
   <svg height=20 width=20 fill="var(--text1)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
      <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
      <g id="SVGRepo_iconCarrier">
        <path d="M9 9h6v6H9z"></path>
        <path d="M19 17V7c0-1.103-.897-2-2-2H7c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h10c1.103 0 2-.897 2-2zM7 7h10l.002 10H7V7z"></path>
      </g>
    </svg>
  `;
    const excludeSvg = ` <svg height=20 width=20 fill="var(--text1)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
      <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
      <g id="SVGRepo_iconCarrier">
        <path d="M7 5c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h10c1.103 0 2-.897 2-2V7c0-1.103-.897-2-2-2H7zm0 12V7h10l.002 10H7z"></path>
      </g>
    </svg>
  `;
  return screener.Include ? includeSvg : excludeSvg;
};

const screenerName = ref('');

const searchQuery = ref('');

const toUpperCase = () => {
  searchQuery.value = searchQuery.value.toUpperCase();
};

const changepercOptions = ref([
  '-',
  '1D',
  '1W',
  '1M',
  '4M',
  '6M',
  '1Y',
  'YTD'
]);

const ma200Options = ref([
  '-',
  'abv50',
  'abv20',
  'abv10',
  'abvPrice',
  'blw50',
  'blw20',
  'blw10',
  'blwPrice'
]);

const ma50Options = ref([
  '-',
  'abv200',
  'abv20',
  'abv10',
  'abvPrice',
  'blw200',
  'blw20',
  'blw10',
  'blwPrice'
]);

const ma20Options = ref([
  '-',
  'abv200',
  'abv50',
  'abv10',
  'abvPrice',
  'blw200',
  'blw50',
  'blw10',
  'blwPrice'
]);

const ma10Options = ref([
  '-',
  'abv200',
  'abv50',
  'abv20',
  'abvPrice',
  'blw200',
  'blw50',
  'blw20',
  'blwPrice'
]);

const priceOptions = ref([
  '-',
  'abv200',
  'abv50',
  'abv20',
  'abv10',
  'blw200',
  'blw50',
  'blw20',
  'blw10'
]);

const changepercSelect = ref('-');
const ma200Select = ref('-');
const ma50Select = ref('-');
const ma20Select = ref('-');
const ma10Select = ref('-');
const priceSelect = ref('-');

function selectChangepercOption(option) {
  changepercSelect.value = option;
}

function selectMa200Option(option) {
  ma200Select.value = option;
}

function selectMa50Option(option) {
  ma50Select.value = option;
}

function selectMa20Option(option) {
  ma20Select.value = option;
}

function selectMa10Option(option) {
  ma10Select.value = option;
}

function selectPriception(option) {
  priceSelect.value = option;
}

const allTimeHigh = ref(false);
const allTimeLow = ref(false);

function toggleAllTimeHigh() {
  allTimeHigh.value = !allTimeHigh.value;
}

function toggleAllTimeLow() {
  allTimeLow.value = !allTimeLow.value;
}

const relVolOptions = ref([
  '-',
  '1W',
  '1M',
  '6M',
  '1Y'
]);

const avgVolOptions = ref([
  '-',
  '1W',
  '1M',
  '6M',
  '1Y'
]);

const relVolSelect = ref('-');
const avgVolSelect = ref('-');

function selectRelVolOption(option) {
  relVolSelect.value = option;
}

function selectAvgVolOption(option) {
  avgVolSelect.value = option;
}

async function SetROE() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftROE = parseFloat(document.getElementById('left-roe').value)
    const rightROE = parseFloat(document.getElementById('right-roe').value)

    if (leftROE >= rightROE) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/roe', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftROE,
        maxPrice: rightROE,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
    } else {
      throw new Error('Error updating ROE range')
    }
    await fetchScreenerResults(selectedScreener.value); 
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

async function SetROA() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftROA = parseFloat(document.getElementById('left-roa').value)
    const rightROA = parseFloat(document.getElementById('right-roa').value)

    if (leftROA >= rightROA) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/roa', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftROA,
        maxPrice: rightROA,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
    } else {
      throw new Error('Error updating ROA range')
    }
    await fetchScreenerResults(selectedScreener.value); 
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

async function SetCurrentRatio() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftCurrentRatio = parseFloat(document.getElementById('left-current-ratio').value)
    const rightCurrentRatio = parseFloat(document.getElementById('right-current-ratio').value)

    if (leftCurrentRatio >= rightCurrentRatio) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/current-ratio', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftCurrentRatio,
        maxPrice: rightCurrentRatio,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
    } else {
      throw new Error('Error updating Current Ratio range')
    }
    await fetchScreenerResults(selectedScreener.value); 
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

async function SetCurrentAssets() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftCurrentAssets = parseFloat(document.getElementById('left-ca').value)
    const rightCurrentAssets = parseFloat(document.getElementById('right-ca').value)

    if (leftCurrentAssets >= rightCurrentAssets) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/current-assets', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftCurrentAssets,
        maxPrice: rightCurrentAssets,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
    } else {
      throw new Error('Error updating Current Assets range')
    }
    await fetchScreenerResults(selectedScreener.value); 
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

async function SetCurrentLiabilities() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftCurrentLiabilities = parseFloat(document.getElementById('left-cl').value)
    const rightCurrentLiabilities = parseFloat(document.getElementById('right-cl').value)

    if (leftCurrentLiabilities >= rightCurrentLiabilities) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/current-liabilities', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftCurrentLiabilities,
        maxPrice: rightCurrentLiabilities,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
    } else {
      throw new Error('Error updating Current Liabilities range')
    }
    await fetchScreenerResults(selectedScreener.value); 
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

async function SetCurrentDebt() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftCurrentDebt = parseFloat(document.getElementById('left-cd').value)
    const rightCurrentDebt = parseFloat(document.getElementById('right-cd').value)

    if (leftCurrentDebt >= rightCurrentDebt) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/current-debt', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftCurrentDebt,
        maxPrice: rightCurrentDebt,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
    } else {
      throw new Error('Error updating Current Debt range')
    }
    await fetchScreenerResults(selectedScreener.value); 
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

async function SetCashEquivalents() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftCashEquivalents = parseFloat(document.getElementById('left-ce').value)
    const rightCashEquivalents = parseFloat(document.getElementById('right-ce').value)

    if (leftCashEquivalents >= rightCashEquivalents) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/cash-equivalents', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftCashEquivalents,
        maxPrice: rightCashEquivalents,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
    } else {
      throw new Error('Error updating Cash Equivalents range')
    }
    await fetchScreenerResults(selectedScreener.value); 
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

async function SetFreeCashFlow() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftFreeCashFlow = parseFloat(document.getElementById('left-fcf').value)
    const rightFreeCashFlow = parseFloat(document.getElementById('right-fcf').value)

    if (leftFreeCashFlow >= rightFreeCashFlow) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/free-cash-flow', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftFreeCashFlow,
        maxPrice: rightFreeCashFlow,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
    } else {
      throw new Error('Error updating Free Cash Flow range')
    }
    await fetchScreenerResults(selectedScreener.value); 
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

async function SetProfitMargin() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftProfitMargin = parseFloat(document.getElementById('left-pm').value) / 100
    const rightProfitMargin = parseFloat(document.getElementById('right-pm').value) / 100

    if (leftProfitMargin >= rightProfitMargin) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/profit-margin', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftProfitMargin,
        maxPrice: rightProfitMargin,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
    } else {
      throw new Error('Error updating Profit Margin range')
    }
    await fetchScreenerResults(selectedScreener.value); 
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

async function SetGrossMargin() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftGrossMargin = parseFloat(document.getElementById('left-gm').value) / 100
    const rightGrossMargin = parseFloat(document.getElementById('right-gm').value) / 100

    if (leftGrossMargin >= rightGrossMargin) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/gross-margin', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftGrossMargin,
        maxPrice: rightGrossMargin,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
    } else {
      throw new Error('Error updating Gross Margin range')
    }
    await fetchScreenerResults(selectedScreener.value); 
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

async function SetDebtToEquityRatio() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftDebtToEquityRatio = parseFloat(document.getElementById('left-der').value)
    const rightDebtToEquityRatio = parseFloat(document.getElementById('right-der').value)

    if (leftDebtToEquityRatio >= rightDebtToEquityRatio) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/debt-to-equity-ratio', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftDebtToEquityRatio,
        maxPrice: rightDebtToEquityRatio,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
    } else {
      throw new Error('Error updating Debt to Equity Ratio range')
    }
    await fetchScreenerResults(selectedScreener.value); 
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

async function SetBookValue() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftBookValue = parseFloat(document.getElementById('left-bv').value)
    const rightBookValue = parseFloat(document.getElementById('right-bv').value)

    if (leftBookValue >= rightBookValue) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/book-value', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftBookValue,
        maxPrice: rightBookValue,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
    } else {
      throw new Error('Error updating Book Value range')
    }
    await fetchScreenerResults(selectedScreener.value); 
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

async function SetEV() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftEV = parseFloat(document.getElementById('left-ev').value)
    const rightEV = parseFloat(document.getElementById('right-ev').value)

    if (leftEV >= rightEV) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/ev', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftEV,
        maxPrice: rightEV,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
    } else {
      throw new Error('Error updating EV range')
    }
    await fetchScreenerResults(selectedScreener.value); 
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

async function SetRSI() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftRSI = parseFloat(document.getElementById('left-rsi').value)
    const rightRSI = parseFloat(document.getElementById('right-rsi').value)

    if (leftRSI >= rightRSI) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/rsi', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftRSI,
        maxPrice: rightRSI,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
    } else {
      throw new Error('Error updating RSI range')
    }
    await fetchScreenerResults(selectedScreener.value); 
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}

async function SetGapPercent() {
  try {
    if (!selectedScreener.value) {
      isScreenerError.value = true
      throw new Error('Please select a screener')
    }

    const leftGapPercent = parseFloat(document.getElementById('left-gap').value)
    const rightGapPercent = parseFloat(document.getElementById('right-gap').value)

    if (leftGapPercent >= rightGapPercent) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/gap-percent', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        minPrice: leftGapPercent,
        maxPrice: rightGapPercent,
        screenerName: selectedScreener.value,
        user: user
      })
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.message === 'updated successfully') {
    } else {
      throw new Error('Error updating Gap % range')
    }
    await fetchScreenerResults(selectedScreener.value); 
  } catch (error) {
    error.value = error.message;
    await fetchScreenerResults(selectedScreener.value);
  }
}


const showTooltip = ref(false)
let tooltipText = ref('');
let tooltipLeft = ref();
let tooltipTop = ref();

function handleMouseOver(event, id) {
  showTooltip.value = true
  const element = event.target
  const svgRect = element.parentNode.getBoundingClientRect()
  tooltipTop.value = svgRect.top + window.scrollY + svgRect.height - 45;
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

.param-s1-expanded {
  margin: 3px;
  padding: 5px;
  color: var(--text2);
  background-color: var(--base2);
  border: none;
  height: 120px;
  position: relative;
}

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


.DataInputs{
  position: absolute;
  left: 17%;
  top: 10%;
  border: none;
}

.DataInputs2{
  position: absolute;
  left: 25%;
  top: 10%;
  border: none;
}

.DataInputs4{
  position: absolute;
  left: 5%;
  top: 15%;
  border: none;
}

.DataInputs4 input{
  width: 50px;
  margin-right: 5px;
}

.DataInputs4 p{
  font-weight: bold;
}

.DataInputs10{
  position: absolute;
  left: 0%;
  top: 10%;
  border: none;
}

.DataInputs10 input{
  margin-right: 5px;
}

.DataInputs10 p{
  font-weight: bold;
}

.DataInputs11{
  position: absolute;
  left: 10%;
  top: 10%;
  border: none;
}

.DataInputs11 p{
  font-weight: bold;
}

.DataInputs input{
  width: 50px;
  margin-right: 10px;
}

.DataInputs p{
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

.left{
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

.Header{
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
  width: 100%;
  border: none;
  position: relative;
  display: flex;
  flex-direction: row;
  background-color: var(--base2);
  width: 100vw;
  min-width: 2610px;
}

.title2 {
  position: absolute;
  top: 13%;
  left: 20%;
  border: none;
}

.title3 {
  border: none;
  width: 100%;
  padding: 12px;
  margin: none;
  align-self: center;
  justify-content: center;
}

.snavbtn {
  display: flex;
  align-items: center;
  gap: 2px;
  margin: 5px;
  padding: 5px;
  cursor: pointer;
  text-decoration: none;
  color:var(--text1);
  border-radius: 4px;
  transition: background-color 0.3s ease;
  background-color: var(--base2);
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
  background-color: var(--base1);
}

.snavbtn.active span,
.activeText {
  color:  var(--accent1);
}

.snavbtnslct{
  background-color: var(--base1);
  color: var(--text1);
  padding: 5px;
  outline: none;
  border: none;
  opacity: 1;
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
  color: var(--base3); /* Dark text color */
  transition: border-color 0.3s, box-shadow 0.3s; /* Smooth transition for focus effects */
  border: solid 1px var(--base4);
  background-color:var(--base4);
}

.RenameScreener input:focus,
.CreateScreener input:focus {
  border-color: var(--accent1); /* Change border color on focus */
  box-shadow: 0 0 5px rgba(var(--accent3), 0.5); /* Subtle shadow effect */
  outline: none; /* Remove default outline */
}

.CreateScreener input.input-error, 
.RenameScreener input.input-error {
  border: solid 1px red !important; /* Use !important to ensure it takes precedence */
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
    margin: 2px ;
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
  border:none;
}

.results2{
  background-color: var(--base1);
  width: 100vw;
  color: var(--text1);
  border:none;
  height: 200px;
}

.results2v{
  padding: 20px;
  background-color: var(--base4);
}

.rowint{
  position: relative;
  display: flex;
  border: none;
  text-align: center;
  align-items: center;
}

.rowint p{
  font-weight: bold; 
  border: none;
  text-align: center;
}

#summary{
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
  border: none ;
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
  border: none ;
}

.searchDiv{
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

.searchDiv input{
 outline: none;
 height: 20px;
 border-radius: 5px;
 padding-left: 5px;
}

.searchDiv button{
 height: 21px;
 background-color: var(--accent1);
 outline: none;
 border: none;
 border-radius: 5px;
 position: absolute;
 right:0.3px;
}

.searchDiv button:hover{
 height: 21px;
 background-color: var(--accent2);
 outline: none;
 border: none;
 cursor: pointer;
}

.img3{
  height: 10px;
  width: 10px;
}

.select-container {
  position: relative;
  background-color: var(--base2);
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 35px;
  border-right: solid 1px var(--base1);
  z-index: 1000;
}

.wrapper{
  background-color: var(--base2);
  position: relative;
  display: flex;
  flex-direction: row;
  padding: 15px;
  border-radius: 5px;
  box-shadow: 0 8px 16px rgba(0,0,0,0.4);
}

.select-container .dropdown-container {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  z-index: 1000;
}

.select-container .dropdown-container div {
  display: none;
  background-color: var(--base4);
  margin-bottom: 0.1px;
  z-index: 1000;
}

.select-container:hover .dropdown-container div {
  display: block;
  background-color: var(--base4);
  padding: 5px;
  cursor: pointer;
  z-index: 1000;
}

.wrapper div {
  border-radius: 5px;
}

.select-container .wrapper div:hover {
  background-color: var(--accent2);
  z-index: 1000;
}

.dropdown-btn {
  background-color: transparent;
  border: none;
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

.dropdown-menu > div {
  background-color: var(--base4);
  padding: 5px;
  height: 14px;
  display: flex;
  align-items: center;
  border-radius: 5px;
}

.dropdown-menu > div:hover {
  background-color: var(--accent2);
}

.dropdown-btn:hover + .dropdown-menu, 
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
  background-color: var(--accent2);
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
.dropdown-menu > div:hover,
.watchlist-item:hover {
  border: none;
  outline: none;
}

.iconbtn{
  width: 15px;
  height: 15px;
  opacity: 0.60;
  cursor: pointer;
}

.iconbtn:hover{
  opacity: 1;
}

.icondlt{
  background-color: transparent;
  border: none;
  padding: 0;
  float: right;
  opacity: 0.60;
  margin: 0;
}

.icondlt:hover{
  cursor: pointer;
  opacity: 1;
}

.img3 {
  width: 8px;
  height: 8px;
  border: none;
  cursor: pointer;
}

.icondlt2{
  background-color: transparent;
  border: none;
  padding: 0;
  float: left;
  opacity: 0.60;
  margin: 0;
  align-items: center;
  align-content: center;
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

.duplicate-asterisk {
  color: var(--accent1); /* Change to your preferred color */
  margin-left: 4px;
  cursor: pointer; /* Indicates to users that it has a tooltip */
  position: relative; /* Positioning context for the tooltip */
}

.tooltip2 {
  visibility: hidden; /* Initially hide the tooltip */
  width: 120px; /* Adjust width as necessary */
  background-color: var(--base1); /* Background color of the tooltip */
  color: var(--text1); /* Text color */
  text-align: center; /* Center text */
  border-radius: 5px; /* Rounded corners */
  border: solid 1px var(--accent3);
  padding: 5px; /* Padding */
  position: absolute; /* Positioning */
  z-index: 1000; /* Ensure it appears above other elements */
  top: 100%; 
  left: 50%; 
  margin-left: -60px; /* Adjust for half the width of the tooltip */
  opacity: 0; /* Start with opacity 0 */
  transition: opacity 0.3s; /* Smooth transition for visibility */
}

.duplicate-asterisk:hover .tooltip2 {
  visibility: visible; /* Show tooltip on hover */
  opacity: 1; /* Fade in */
}

.imgbtn{
  width: 15px;
  height: 15px;
}

.custom-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 5px;
  opacity: 0.7; /* Initial opacity */
  transition: opacity 0.3s;
}

.custom-checkbox.checked {
  color: var(--text1); /* Change text color when checked */
  opacity: 1;
}

.checkmark {
  width: 8px; /* Smaller width */
  height: 8px; /* Smaller height */
  background-color: var(--text1);
  border-radius: 50%; /* Make it circular */
  margin-right: 5px;
  display: inline-block;
  transition: background-color 0.3s, border-color 0.3s; /* Add transition for border color */
}

.custom-checkbox.checked .checkmark {
  background-color: var(--accent1); /* Change to your desired color */
  border-color: var(--accent1); /* Change to your desired border color */
}

.custom-checkbox.checked {
  color: var(--text1); /* Change text color when checked */
}

.select-container__no-screeners {
  text-align: center;
  color: var(--text2);
  font-size: 14px;
}

.input{
  border-radius: 5px;
  padding: 5px 5px 5px 15px;
  margin: 7px;
  width: 160px;
  outline: none;
  color: var(--text1); /* Dark text color */
  transition: border-color 0.3s, box-shadow 0.3s; /* Smooth transition for focus effects */
  border: solid 1px var(--base4);
  background-color:var(--base4);
}

.input:focus{
  border-color: var(--accent1); /* Change border color on focus */
  outline: none; /* Remove default outline */
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

input[type="date"]{
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

.changeperc-select-container {
  position: relative;
  background-color: var(--base2);
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 20px;
  height: 5px;
  border-radius: 5px;
  margin-left: 4px;
  padding: 7px;
  z-index: 1000;
  border: solid 2px var(--base1);
}

.changeperc-dropdown-btn {
  background-color: transparent;
  border: none;
  cursor: pointer;
}

.changeperc-dropdown-menu {
  display: none;
  cursor: pointer;
  width: 125px;
  position: absolute; 
  z-index: 1000;
  top: -10px;
  left: 20px;
}

.changeperc-dropdown-menu > div {
  background-color: var(--base2);
  padding: 5px;
  height: 14px;
  display: flex;
  align-items: center;
}

.changeperc-dropdown-menu > div:hover {
  background-color: var(--accent2);
}

.changeperc-dropdown-btn:hover + .changeperc-dropdown-menu, 
.changeperc-dropdown-menu:hover {
  display: block;
}

.ma200-select-container, .ma50-select-container, .ma20-select-container, .ma10-select-container , .price-select-container{
  position: relative;
  background-color: var(--base2);
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 40px;
  height: 5px;
  border-radius: 5px;
  margin-left: 4px;
  padding: 7px;
  border: solid 2px var(--base1);
}

.ma200-dropdown-btn, .ma50-dropdown-btn, .ma20-dropdown-btn, .ma10-dropdown-btn, .price-dropdown-btn {
  background-color: transparent;
  border: none;
  cursor: pointer;
}

.ma200-dropdown-menu, .ma50-dropdown-menu, .ma20-dropdown-menu, .ma10-dropdown-menu, .price-dropdown-menu {
  display: none;
  cursor: pointer;
  width: 125px;
  position: absolute; 
  z-index: 1000;
  top: -10px;
  left: 20px;
}

.ma200-dropdown-menu > div, .ma50-dropdown-menu > div, .ma20-dropdown-menu > div, .ma10-dropdown-menu > div, .price-dropdown-menu > div {
  background-color: var(--base2);
  padding: 5px;
  height: 14px;
  display: flex;
  align-items: center;
}

.ma200-dropdown-menu > div:hover, .ma50-dropdown-menu > div:hover, .ma20-dropdown-menu > div:hover, .ma10-dropdown-menu > div:hover, .price-dropdown-menu > div:hover {
  background-color: var(--accent1);
}

.ma200-dropdown-btn:hover + .ma200-dropdown-menu, 
.ma200-dropdown-menu:hover,
.ma50-dropdown-btn:hover + .ma50-dropdown-menu, 
.ma50-dropdown-menu:hover,
.ma20-dropdown-btn:hover + .ma20-dropdown-menu, 
.ma20-dropdown-menu:hover,
.ma10-dropdown-btn:hover + .ma10-dropdown-menu, 
.ma10-dropdown-menu:hover, .price-dropdown-btn:hover + .price-dropdown-menu, 
.price-dropdown-menu:hover {
  display: block;
}

.relvol-select-container, .avgvol-select-container {
  position: relative;
  background-color: var(--base2);
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 40px;
  height: 5px;
  border-radius: 5px;
  margin-left: 4px;
  padding: 7px;
  border: solid 2px var(--base1);
}

.relvol-dropdown-btn, .avgvol-dropdown-btn {
  background-color: transparent;
  border: none;
  cursor: pointer;
}

.relvol-dropdown-menu, .avgvol-dropdown-menu {
  display: none;
  cursor: pointer;
  width: 125px;
  position: absolute; 
  z-index: 1000;
  top: -10px;
  left: 20px;
}

.relvol-dropdown-menu > div, .avgvol-dropdown-menu > div {
  background-color: var(--base2);
  padding: 5px;
  height: 14px;
  display: flex;
  align-items: center;
}

.relvol-dropdown-menu > div:hover, .avgvol-dropdown-menu > div:hover {
  background-color: var(--accent1);
}

.relvol-dropdown-btn:hover + .relvol-dropdown-menu, 
.relvol-dropdown-menu:hover,
.avgvol-dropdown-btn:hover + .avgvol-dropdown-menu, 
.avgvol-dropdown-menu:hover {
  display: block;
}

.wlist-container{
  height: 800px; 
  width: 100%; 
  min-width: 2610px;
  overflow-y: scroll; 
  z-index: 1000;
}

#wlist{
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

.question-img{
  width: 15px;
  cursor: pointer;
  margin-left: 5px;
}

.btnlabel{
  margin-left: 3px; 
  cursor: inherit;
}

.mobilenav {
  display: none;
}

.navmenu-mobile{
  display: none;
}

.chart-container {
    position: relative;
    width: 100%;
    height: 250px;
}

.loading-container1, .loading-container2 {
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

  .navmenu{
  display: none;
}

.navmenu-mobile{
  display: flex;
}

.mobilenav{
  display: flex;
  flex-direction: row;
  gap: 12px; /* space between buttons */
  padding: 8px 12px;
  background-color: rgba(var(--base4), 0.1); /* subtle transparent background */
  border-radius: 10px;
  justify-content: center;
  align-items: center;
}

.mnavbtn{
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
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
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
  color:var(--text1);
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
  color:  var(--accent1);
}

.snavbtnslct{
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 5px;
  padding: 5px 8px;
  cursor: pointer;
  text-decoration: none;
  color:var(--text1);
  border-radius: 4px;
  transition: background-color 0.3s ease;
  background-color: var(--accent1);
}

#wk-chart,
#dl-chart {
  background-repeat: no-repeat;
}

.input{
  border-radius: 5px;
  padding: 5px 5px 5px 15px;
  margin: 7px;
  width: 200px;
  outline: none;
  color: var(--text1); /* Dark text color */
  transition: border-color 0.3s, box-shadow 0.3s; /* Smooth transition for focus effects */
  border: solid 1px var(--base4);
  background-color:var(--base4);
  text-align: left;
}

}
</style>