<template>
  <body>
    <Header />
    <div id="main">
      <div class="tooltip-container" style="position: relative;">
  <div class="tooltip" v-if="showTooltip" :style="{ top: tooltipTop + 'px', left: tooltipLeft + 'px' }">
    <span class="tooltip-text">{{ tooltipText }}</span>
  </div>
</div>
      <div id="filters">
        <div id="screener-select" class="select-container" :class="{ 'error-border': isScreenerError }" @mouseover="showDropdown = true" @mouseout="showDropdown = false">
          <img :src="downIcon" alt="Dropdown Icon" class="dropdown-icon" :class="{ 'dropdown-icon-hover': showDropdown }" />
  <p class="selected-value" @click.stop="">{{ selectedScreener ? selectedScreener : (ScreenersName.length > 0 ? 'Choose a Screener...' : 'No screeners available.') }}</p>
  <div class="dropdown-container" v-if="ScreenersName.length > 0">
    <div class="wrapper">
    <div v-for="(screener, index) in ScreenersName" :key="index" :class="{'selected': selectedScreener === screener.Name}" @click="selectScreener(screener.Name)">
      <button class="icondlt2" @click.stop="ExcludeScreener(screener.Name)" v-b-tooltip.hover title="Toggle This Screener's Inclusion">
        <img class="img2" :src="getScreenerImage(screener)" alt="toggle screener">
      </button>
      {{ screener.Name }}
      <button class="icondlt" @click.stop="DeleteScreener(screener.Name)" v-b-tooltip.hover title="Delete This Screener">
        <img class="img2" src="@/assets/icons/close.png" alt="delete screener">
      </button>
    </div>
  </div>
  </div>
</div>
        <div :class="[showPriceInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Price</p>
  <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'price')" @mouseout="handleMouseOut" />
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
              <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
            </button>
            <button class="btnsr" style="float:right" @click="Reset('price')">
              <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
            </button>
          </div>
          </div>
        </div>
        <div :class="[showMarketCapInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Market Cap (1000s)</p>
  <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'market-cap')" @mouseout="handleMouseOut" />
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
                <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
              </button>
              <button class="btnsr"style="float:right" @click="Reset('Marketcap')">
                <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
              </button>
            </div>
          </div>
        </div>
        <div :class="[showIPOInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>IPO Date</p>
  <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'ipo')" @mouseout="handleMouseOut" />
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
                <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
              </button>
              <button class="btnsr"style="float:right" @click="Reset('IPO')">
                <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
              </button>
            </div>
          </div>
        </div>
        <div :class="[ShowSector ? 'param-s2-expanded' : 'param-s1']">
    <div class="row">
      <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Sector</p>
  <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'sector')" @mouseout="handleMouseOut" />
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
          <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
        </button>
        <button class="btns2r" style="float:right" @click="Reset('Sector')">
          <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
        </button>
      </div>
    </div>
  </div>
  <div :class="[ShowExchange ? 'param-s3-expanded' : 'param-s1']">
    <div class="row">
      <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Exchange</p>
  <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'exchange')" @mouseout="handleMouseOut" />
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
          <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
        </button>
        <button class="btns3r" style="float:right" @click="Reset('Exchange')">
          <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
        </button>
      </div>
    </div>
  </div>
  <div :class="[ShowCountry ? 'param-s9-expanded' : 'param-s1']">
    <div class="row">
      <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Country</p>
  <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'country')" @mouseout="handleMouseOut" />
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
          <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
        </button>
        <button class="btns3r" style="float:right" @click="Reset('Country')">
          <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
        </button>
      </div>
    </div>
  </div>
        <div :class="[showPEInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>PE Ratio</p>
  <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'pe')" @mouseout="handleMouseOut" />
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
                <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
              </button>
              <button class="btnsr"style="float:right" @click="Reset('PE')">
                <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
              </button>
            </div>
          </div>
        </div>
        <div :class="[showPSInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>PS Ratio</p>
  <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'ps')" @mouseout="handleMouseOut" />
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
                <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
              </button>
              <button class="btnsr"style="float:right" @click="Reset('PS')">
                <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
              </button>
            </div>
          </div>
        </div>
        <div :class="[showPEGInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>PEG Ratio</p>
  <img class="question-img" id="price" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'peg')" @mouseout="handleMouseOut" />
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
                <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
              </button>
              <button class="btnsr"style="float:right" @click="Reset('PEG')">
                <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
              </button>
            </div>
          </div>
        </div>
        <div :class="[showEPSInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div>
              <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
                 <p >EPS</p>
                 <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'eps')" @mouseout="handleMouseOut" />
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
                <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
              </button>
              <button class="btnsr"style="float:right" @click="Reset('EPS')">
                <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
              </button>
            </div>
          </div>
        </div>
        <div :class="[showPBInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>PB Ratio</p>
  <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'pb')" @mouseout="handleMouseOut" />
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
                <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
              </button>
              <button class="btnsr"style="float:right" @click="Reset('PB')">
                <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
              </button>
            </div>
          </div>
        </div>
        <div :class="[showDivYieldInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Dividend Yield TTM (%)</p>
  <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'div')" @mouseout="handleMouseOut" />
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
                <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
              </button>
              <button class="btnsr"style="float:right" @click="Reset('DivYield')">
                <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
              </button>
            </div>
          </div>
        </div>
        <div :class="[showFundYoYQoQ ? 'param-s5-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Revenue / Earnings / EPS Growth</p>
  <img class="question-img" id="price" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'growth')" @mouseout="handleMouseOut" />
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
                <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
              </button>
              <button class="btns5r"style="float:right" @click="Reset('FundGrowth')">
                <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
              </button>
            </div>
          </div>
        </div>
        <div :class="[showPricePerf ? 'param-s6-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Price Performance</p>
  <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'perf')" @mouseout="handleMouseOut" />
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
              <p style="margin-right: 10px;">200MA</p>
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
              <p style="margin-right: 10px;">50MA</p>
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
              <p style="margin-right: 10px;">20MA</p>
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
              <p style="margin-right: 10px;">10MA</p>
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
          </div>
              </div>
            <div class="row">
              <button class="btns6" style="float:right" @click="SetPricePerformance()">
                <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
              </button>
              <button class="btns6r"style="float:right" @click="Reset('PricePerformance')">
                <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
              </button>
            </div>
          </div>
        </div>
        <div :class="[showRSscore ? 'param-s8-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Technical Score</p>
  <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'rs')" @mouseout="handleMouseOut" />
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
                <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
              </button>
              <button class="btns8r"style="float:right" @click="Reset('RSscore')">
                <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
              </button>
            </div>
          </div>
        </div>
        <div :class="[showVolume ? 'param-s7-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Volume</p>
  <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'volume')" @mouseout="handleMouseOut" />
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
        <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
      </button>
      <button class="btns7r"style="float:right" @click="Reset('Volume')">
        <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
      </button>
    </div>
  </div>
</div>
<div :class="[showADV ? 'param-s10-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Average Daily Volatility (ADV)</p>
  <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'adv')" @mouseout="handleMouseOut" />
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
                <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
              </button>
              <button class="btns8r"style="float:right" @click="Reset('ADV')">
                <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
              </button>
            </div>
          </div>
        </div>
        <div :class="[showROE ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Return of Equity (ROE)</p>
  <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'roe')" @mouseout="handleMouseOut" />
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
                <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
              </button>
              <button class="btnsr"style="float:right" @click="Reset('ROE')">
                <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
              </button>
            </div>
          </div>
        </div>
        <div :class="[showROA ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
  <p>Return of Assets (ROA)</p>
  <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'roa')" @mouseout="handleMouseOut" />
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
                <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
              </button>
              <button class="btnsr"style="float:right" @click="Reset('ROA')">
                <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
              </button>
            </div>
          </div>
        </div>
        <div :class="[showCurrentRatio ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Current Ratio</p>
      <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'current-ratio')" @mouseout="handleMouseOut" />
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
        <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
      </button>
      <button class="btnsr" style="float:right" @click="Reset('CurrentRatio')">
        <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
      </button>
    </div>
  </div>
</div>
<div :class="[showCurrentAssets ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Current Assets (1000s)</p>
      <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'current-assets')" @mouseout="handleMouseOut" />
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
        <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
      </button>
      <button class="btnsr" style="float:right" @click="Reset('CurrentAssets')">
        <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
      </button>
    </div>
  </div>
</div>
<div :class="[showCurrentLiabilities ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Current Liabilities (1000s)</p>
      <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'current-liabilities')" @mouseout="handleMouseOut" />
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
        <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
      </button>
      <button class="btnsr" style="float:right" @click="Reset('CurrentLiabilities')">
        <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
      </button>
    </div>
  </div>
</div>
<div :class="[showCurrentDebt ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Current Debt (1000s)</p>
      <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'current-debt')" @mouseout="handleMouseOut" />
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
        <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
      </button>
      <button class="btnsr" style="float:right" @click="Reset('CurrentDebt')">
        <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
      </button>
    </div>
  </div>
</div>
<div :class="[showCashEquivalents ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Cash & Equivalents (1000s)</p>
      <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'casheq')" @mouseout="handleMouseOut" />
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
        <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
      </button>
      <button class="btnsr" style="float:right" @click="Reset('CashEquivalents')">
        <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
      </button>
    </div>
  </div>
</div>
<div :class="[showFreeCashFlow ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Free Cash Flow (1000s)</p>
      <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'fcf')" @mouseout="handleMouseOut" />
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
        <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
      </button>
      <button class="btnsr" style="float:right" @click="Reset('FCF')">
        <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
      </button>
    </div>
  </div>
</div>
<div :class="[showProfitMargin ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Profit Margin</p>
      <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'profit-margin')" @mouseout="handleMouseOut" />
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
        <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
      </button>
      <button class="btnsr" style="float:right" @click="Reset('ProfitMargin')">
        <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
      </button>
    </div>
  </div>
</div>
<div :class="[showGrossMargin ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Gross Margin</p>
      <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'gross-margin')" @mouseout="handleMouseOut" />
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
        <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
      </button>
      <button class="btnsr" style="float:right" @click="Reset('GrossMargin')">
        <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
      </button>
    </div>
  </div>
</div>
<div :class="[showDebtToEquityRatio ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Debt to Equity Ratio</p>
      <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'debt-equity')" @mouseout="handleMouseOut" />
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
        <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
      </button>
      <button class="btnsr" style="float:right" @click="Reset('DebtEquity')">
        <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
      </button>
    </div>
  </div>
</div>
<div :class="[showBookValue ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Book Value (1000s)</p>
      <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'book-value')" @mouseout="handleMouseOut" />
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
        <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
      </button>
      <button class="btnsr" style="float:right" @click="Reset('BookValue')">
        <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
      </button>
    </div>
  </div>
</div>
<div :class="[showEV ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>EV (Enterprise Value) - 1000s</p>
      <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'ev')" @mouseout="handleMouseOut" />
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
        <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
      </button>
      <button class="btnsr" style="float:right" @click="Reset('EV')">
        <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
      </button>
    </div>
  </div>
</div>
<div :class="[showRSI ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>RSI (Relative Strength Index)</p>
      <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'rsi')" @mouseout="handleMouseOut" />
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
        <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
      </button>
      <button class="btnsr" style="float:right" @click="Reset('RSI')">
        <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
      </button>
    </div>
  </div>
</div>
<div :class="[showGap ? 'param-s1-expanded' : 'param-s1']">
  <div class="row">
    <div style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px; display: flex; flex-direction: row; align-items: center;">
      <p>Gap %</p>
      <img class="question-img" src="@/assets/icons/question.png" alt="Question mark" @mouseover="handleMouseOver($event, 'gap')" @mouseout="handleMouseOut" />
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
        <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
      </button>
      <button class="btnsr" style="float:right" @click="Reset('Gap')">
        <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
      </button>
    </div>
  </div>
</div>
        <div class="results"></div>
      </div>
      <div id="resultsDiv" >
        <div v-if="showCreateScreener" class="CreateScreener">
          <img class="inner-logo" src="@/assets/icons/owl.png" alt="">
          <h3>Create Screener</h3>
          <input
      id="inputcreate"
      placeholder="Enter Screener Name"
      type="text"
      v-model="screenerName"
      :class="{'input-error': screenerName.length > 20}"
    />
          <div class="inner">
            <button @click="showCreateScreener = false"><img class="imgbtn" src="@/assets/icons/back-arrow.png" alt=""></button>
            <button @click="CreateScreener()"><img class="imgbtn" src="@/assets/icons/submit.png" alt=""></button>
          </div>
        </div>
        <div v-if="showRenameScreener" class="RenameScreener">
          <img class="inner-logo" src="@/assets/icons/owl.png" alt="">
          <h3>Rename Screener</h3>
          <input 
        id="inputrename" 
        placeholder="Enter Screener Name" 
        type="text"
        v-model="screenerName"
      :class="{'input-error': screenerName.length > 20}"
      />
          <div class="inner">
            <button @click="showRenameScreener = false"><img class="imgbtn" src="@/assets/icons/back-arrow.png" alt=""></button>
            <button @click="UpdateScreener()"><img class="imgbtn" src="@/assets/icons/submit.png" alt=""></button>
          </div>
        </div>
        <div v-if="showSearch" class="searchDiv">
          <input type="search" class="search-input" placeholder="Search..." 
          v-model="searchQuery" @input="toUpperCase" @keydown.enter="SearchElement()">
          <button class="search-btn" @click="SearchElement()"><img class="img3" src="@/assets/icons/search.png" alt="search"></button>
        </div>
        <div class="navmenu">
          <button class="snavbtn" id="watchlistCreate" :class="{ 'snavbtnslct': showCreateScreener }" @click="showCreateScreener = !showCreateScreener" v-b-tooltip.hover
            title="Create New Screener"><img class="img2" src="@/assets/icons/add.png"
              alt="create new screener"></button>
          <button class="snavbtn" id="screenerModify" :class="{ 'snavbtnslct': showRenameScreener }" @click="showRenameScreener = !showRenameScreener" v-b-tooltip.hover
            title="Rename Current Screener"><img class="img2" src="@/assets/icons/edit2.png"
              alt="edit screener name"></button>
          <button class="snavbtn" v-b-tooltip.hover title="Reset Screener" @click="async() => {await ResetScreener(); await CurrentScreener();}" ><img class="img2"
             src="@/assets/icons/reset.png" alt="reset screener"></button>
          <button id="watchlistAutoplay" class="snavbtn" :class="{ 'snavbtnslct': autoplayRunning === true }" @click="AutoPlay()" v-b-tooltip.hover
            title="Autoplay Results"><img class="img2" src="@/assets/icons/play.png" alt="autoplay"></button>
          <button class="snavbtn" :class="{ 'snavbtnslct': listMode === 'hidden' }" v-b-tooltip.hover title="Hidden List" @click="showHiddenResults()"><img class="img2"
              src="@/assets/icons/hide.png" alt="show hidden list"></button>
              <button class="snavbtn" :class="{ 'snavbtnslct': listMode === 'combined' }" v-b-tooltip.hover title="Show Combined Screener Results" @click="showCombinedResults()">
            <img class="img2" src="@/assets/icons/intersect.png" alt="show combined screener results">
          </button>
          <button class="snavbtn" :class="{ 'snavbtnslct': showSearch }" id="showSearch" @click="showSearch = !showSearch" v-b-tooltip.hover title="Search">
            <img class="img2" src="@/assets/icons/search.png" alt="search">
          </button>
          <h1 :key="resultListLength" class='title2'>RESULTS: {{ resultListLength }}</h1>
        </div>
          <div v-if="listMode === 'main'">
            <div class="RES" >
          <div class="Header">
            <div style="min-width: 50px;"></div>
            <div style="min-width: 50px;"></div>
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
          <div id="wlist-container"  @scroll.passive="handleScroll1">
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
                  <img class="img" src="@/assets/icons/dots.png" alt="" style="border: none;">
                </button>
                <div class="dropdown-menu">
                  <div @click="hideStock(asset)" @click.stop style="display: flex; flex-direction: row; align-items: center; height: 14px;">
                    <img src="@/assets/icons/hide.png" alt="" style="width: 15px; height: 15px; margin-right: 5px;">
                    <p>Hide Stock</p>
                  </div>
                  <div class="nested-dropdown" style="display: flex; flex-direction: row; align-items: center; height: 14px;">
                    <img src="@/assets/icons/add.png" alt="" style="width: 15px; height: 15px; margin-right: 5px;">
                    <p>Add to Watchlist</p>
                    <div class="nested-dropdown-menu">
                  <div v-for="(ticker, index) in watchlist.tickers" :key="index" class="watchlist-item">
                    <label :for="'watchlist-' + index" class="checkbox-label">
                      <div @click.stop="toggleWatchlist(ticker, asset.Symbol)" style="cursor: pointer;">
                        <img
  class="watchlist-icon"
  :src="getWatchlistIcon(ticker, asset.Symbol)"
  alt="Toggle Watchlist"
/>
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
            <div style="min-width: 50px;"></div>
            <div style="min-width: 50px;"></div>
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
          <div id="wlist-container" style="height: 2000px; width: 100vw; overflow-y: scroll; z-index: 1000;" @scroll.passive="handleScroll2">
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
                  <img class="img" src="@/assets/icons/dots.png" alt="" style="border: none;">
                </button>
                <div class="dropdown-menu">
                  <div @click="hideStock(asset)" @click.stop style="display: flex; flex-direction: row; align-items: center; height: 14px;">
                    <img src="@/assets/icons/hide.png" alt="" style="width: 15px; height: 15px; margin-right: 5px;">
                    <p>Hide Stock</p>
                  </div>
                  <div class="nested-dropdown" style="display: flex; flex-direction: row; align-items: center; height: 14px;">
                    <img src="@/assets/icons/add.png" alt="" style="width: 15px; height: 15px; margin-right: 5px;">
                    <p>Add to Watchlist</p>
                    <div class="nested-dropdown-menu">
                  <div v-for="(ticker, index) in watchlist.tickers" :key="index" class="watchlist-item">
                    <label :for="'watchlist-' + index" class="checkbox-label">
                      <div @click.stop="toggleWatchlist(ticker, asset.Symbol)" style="cursor: pointer;">
                        <img
  class="watchlist-icon"
  :src="getWatchlistIcon(ticker, asset.Symbol)"
  alt="Toggle Watchlist"
/>
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
            <div style="min-width: 50px;"></div>
            <div style="min-width: 50px;"></div>
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
          <div id="wlist-container" style="height: 2000px; width: 100vw; overflow-y: scroll; z-index: 1000;" @scroll.passive="handleScroll3">
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
                  <img class="img" src="@/assets/icons/dots.png" alt="" style="border: none;">
                </button>
                <div class="dropdown-menu">
                  <div @click="ShowStock(asset)" @click.stop style="display: flex; flex-direction: row; align-items: center; height: 14px;">
                    <img src="@/assets/icons/show.png" alt="" style="width: 15px; height: 15px; margin-right: 5px;">
                    <p>Show Stock</p>
                  </div>
                  <div class="nested-dropdown" style="display: flex; flex-direction: row; align-items: center; height: 14px;">
                    <img src="@/assets/icons/add.png" alt="" style="width: 15px; height: 15px; margin-right: 5px;">
                    <p>Add to Watchlist</p>
                    <div class="nested-dropdown-menu">
                  <div v-for="(ticker, index) in watchlist.tickers" :key="index" class="watchlist-item">
                    <label :for="'watchlist-' + index" class="checkbox-label">
                      <div @click.stop="toggleWatchlist(ticker, asset.Symbol)" style="cursor: pointer;">
                        <img
  class="watchlist-icon"
  :src="getWatchlistIcon(ticker, asset.Symbol)"
  alt="Toggle Watchlist"
/>
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
            <div style="min-width: 50px;"></div>
            <div style="min-width: 50px;"></div>
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
          <div id="wlist-container" style="height: 2000px; width: 100vw; overflow-y: scroll; z-index: 1000;" @scroll.passive="handleScroll4">
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
                  <img class="img" src="@/assets/icons/dots.png" alt="" style="border: none;">
                </button>
                <div class="dropdown-menu">
                  <div @click="hideStock(asset)" @click.stop style="display: flex; flex-direction: row; align-items: center; height: 14px;">
                    <img src="@/assets/icons/hide.png" alt="" style="width: 15px; height: 15px; margin-right: 5px;">
                    <p>Hide Stock</p>
                  </div>
                  <div class="nested-dropdown" style="display: flex; flex-direction: row; align-items: center; height: 14px;">
                    <img src="@/assets/icons/add.png" alt="" style="width: 15px; height: 15px; margin-right: 5px;">
                    <p>Add to Watchlist</p>
                    <div class="nested-dropdown-menu">
                  <div v-for="(ticker, index) in watchlist.tickers" :key="index" class="watchlist-item">
                    <label :for="'watchlist-' + index" class="checkbox-label">
                      <div @click.stop="toggleWatchlist(ticker, asset.Symbol)" style="cursor: pointer;">
                        <img
  class="watchlist-icon"
  :src="getWatchlistIcon(ticker, asset.Symbol)"
  alt="Toggle Watchlist"
/>
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
      <div id="sidebar-r">
        <h1 class="title3">WEEKLY CHART</h1>
        <div class="loading-container1" v-if="isChartLoading1">
      <LoadingOverlay :active="true" color="#8c8dfe" opacity="1" loader="spinner" size="32" />
    </div>
    <div class="loading-container1" v-if="isLoading1">
      <LoadingOverlay :active="true" color="#8c8dfe" opacity="1" loader="spinner" size="32" />
    </div>
        <div id="wk-chart"></div>
        <h1 class="title3">DAILY CHART</h1>
        <div class="loading-container2" v-if="isChartLoading2">
      <LoadingOverlay :active="true" color="#8c8dfe" opacity="1" loader="spinner" size="32" />
    </div>
    <div class="loading-container2" v-if="isLoading2">
      <LoadingOverlay :active="true" color="#8c8dfe" opacity="1" loader="spinner" size="32" />
    </div>
        <div id="dl-chart"></div>
        <h1 class="title3">SUMMARY</h1>
        <div style="padding-top: 5px; overflow: scroll; border:none" id="summary">
          <div style="color: whitesmoke; text-align: center; border: none">
  <div v-for="(item, index) in screenerSummary" :key="index">
    <div style="padding: 5px;" v-if="item">
  {{ item.attribute }} : {{ item.value }}
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
import { computed, onMounted, ref, watch, nextTick, reactive } from 'vue';
import { createChart, ColorType } from 'lightweight-charts';
import LoadingOverlay from 'vue-loading-overlay';
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
    ? new URL('@/assets/icons/checked.png', import.meta.url).href
    : new URL('@/assets/icons/unchecked.png', import.meta.url).href;
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
    let symbol = defaultSymbol;
    const response = await fetch(`/api/${symbol}/data`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    
    if (!response.ok) {
      data.value = null; // Explicitly set to null if response is not ok
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newData = await response.json();
    
    // Check if newData is undefined, null, or empty
    if (!newData || newData.length === 0) {
      data.value = null;
    } else {
      data.value = newData;
    }
  } catch (err) {
    data.value = null; // Set to null in case of any error
    error.value = err.message;
  }
}

async function fetchData2() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data2`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    
    if (!response.ok) {
      data2.value = null; // Explicitly set to null if response is not ok
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newData2 = await response.json();
    
    // Check if newData2 is undefined, null, or empty
    if (!newData2 || newData2.length === 0) {
      data2.value = null;
    } else {
      data2.value = newData2;
    }
  } catch (error) {
    data2.value = null; // Set to null in case of any error
    error.value = error.message;
  }
}

async function fetchData3() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data3`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    
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
    data3.value = null; // Set to null in case of any error
    error.value = error.message;
  }
}

async function fetchData4() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data4`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    
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
    data4.value = null; // Set to null in case of any error
    error.value = error.message;
  }
}

async function fetchData5() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data5`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    
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
    data5.value = null; // Set to null in case of any error
    error.value = error.message;
  }
}

// Apply the same pattern to fetchData6, fetchData7, fetchData8, fetchData9, fetchData10, fetchData11, and fetchData12
async function fetchData6() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data6`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    
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
    data6.value = null; // Set to null in case of any error
    error.value = error.message;
  }
}

async function fetchData7() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data7`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    
    if (!response.ok) {
      data7.value = null; // Explicitly set to null if response is not ok
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newData7 = await response.json();
    
    // Check if newData7 is undefined, null, or empty
    if (!newData7 || newData7.length === 0) {
      data7.value = null;
    } else {
      data7.value = newData7;
    }
  } catch (error) {
    data7.value = null; // Set to null in case of any error
    error.value = error.message;
  }
}

async function fetchData8() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data8`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    
    if (!response.ok) {
      data8.value = null; // Explicitly set to null if response is not ok
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newData8 = await response.json();
    
    // Check if newData8 is undefined, null, or empty
    if (!newData8 || newData8.length === 0) {
      data8.value = null;
    } else {
      data8.value = newData8;
    }
  } catch (error) {
    data8.value = null; // Set to null in case of any error
    error.value = error.message;
  }
}

async function fetchData9() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data9`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    
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
    data9.value = null; // Set to null in case of any error
    error.value = error.message;
  }
}

async function fetchData10() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data10`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    
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
    data10.value = null; // Set to null in case of any error
    error.value = error.message;
  }
}

async function fetchData11() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data11`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    
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
    data11.value = null; // Set to null in case of any error
    error.value = error.message;
  }
}

async function fetchData12() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data12`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    
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
    data12.value = null; // Set to null in case of any error
    error.value = error.message;
  }
}

// mounts daily chart (including volume)
onMounted(async () => {

  await fetchUserDefaultSymbol();
  
  nextTick();

  const chartDiv = document.getElementById('dl-chart');
  const chart = createChart(chartDiv, {
    height: 250,
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
      downColor: '#90bff9',
      upColor: '#4caf50',
      borderDownColor: '#90bff9',
      borderUpColor: '#4caf50',
      wickDownColor: '#90bff9',
      wickUpColor: '#4caf50',
      priceLineVisible: true,
    });

  const Histogram = chart.addHistogramSeries({
    color: '#ffffff',
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    priceLineVisible: false,
    priceFormat: {
      type: 'volume',
    },
    priceScaleId: '',
  });

  const MaSeries1 = chart.addLineSeries({
    color: '#00bcd4',
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    priceLineVisible: false,
    lineWidth: 1,
  });

  const MaSeries2 = chart.addLineSeries({
    color: '#2862ff',
    lineWidth: 1,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    priceLineVisible: false,
  });

  const MaSeries3 = chart.addLineSeries({
    color: '#ffeb3b',
    lineWidth: 1,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    priceLineVisible: false,
  });

  const MaSeries4 = chart.addLineSeries({
    color: '#4caf50',
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
      const color = relativeVolume > 2 ? '#8c8dfe' : '#4D4D4D'; // green for above-average volume, gray for below-average volume
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

  isLoading1.value = false

});

// mounts Weekly chart (including volume)
onMounted(async () => {

  const chartDiv = document.getElementById('wk-chart');
  const chart = createChart(chartDiv, {
    height: 250,
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
      downColor: '#90bff9',
      upColor: '#4caf50',
      borderDownColor: '#90bff9',
      borderUpColor: '#4caf50',
      wickDownColor: '#90bff9',
      wickUpColor: '#4caf50',
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
    });

  const Histogram = chart.addHistogramSeries({
    color: '#ffffff',
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    priceLineVisible: false,
    priceFormat: {
      type: 'volume',
    },
    priceScaleId: '',
  });

  const MaSeries1 = chart.addLineSeries({
    color: '#00bcd4',
    lineWidth: 1,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    priceLineVisible: false,
  });

  const MaSeries2 = chart.addLineSeries({
    color: '#2862ff',
    lineWidth: 1,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    priceLineVisible: false,
  });

  const MaSeries3 = chart.addLineSeries({
    color: '#ffeb3b',
    lineWidth: 1,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    priceLineVisible: false,
  });

  const MaSeries4 = chart.addLineSeries({
    color: '#4caf50',
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
      const color = relativeVolume > 2 ? '#8c8dfe' : '#4d4d4d'; // green for above-average volume, gray for below-average volume
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
  await fetchData8();
  await fetchData9();
  await fetchData10();
  await fetchData11();
  await fetchData12();

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
  if (autoplayRunning) {
    clearTimeout(autoplayTimeoutId);
    autoplayRunning = false;
  } else {
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
      console.error(responseData.message);
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
      'RelVolume1W', 'RelVolume1M', 'RelVolume6M', 'RelVolume1Y', 'RSScore1W','RSScore1M', 'RSScore4M', 'MA10', 'MA20', 'MA50', 'MA200', 'NewHigh',
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
}

const getScreenerImage = (screener) => {
  return screener.Include
    ? new URL('@/assets/icons/include.png', import.meta.url).href // Show exclude image if Include is true
    : new URL('@/assets/icons/exclude.png', import.meta.url).href; // Show include image if Include is false
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
  'blw50',
  'blw20',
  'blw10'
]);

const ma50Options = ref([
  '-',
  'abv200',
  'abv20',
  'abv10',
  'blw200',
  'blw20',
  'blw10'
]);

const ma20Options = ref([
  '-',
  'abv200',
  'abv50',
  'abv10',
  'blw200',
  'blw50',
  'blw10'
]);

const ma10Options = ref([
  '-',
  'abv200',
  'abv50',
  'abv20',
  'blw200',
  'blw50',
  'blw20'
]);

const changepercSelect = ref('-');
const ma200Select = ref('-');
const ma50Select = ref('-');
const ma20Select = ref('-');
const ma10Select = ref('-');

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

    const leftProfitMargin = parseFloat(document.getElementById('left-pm').value)
    const rightProfitMargin = parseFloat(document.getElementById('right-pm').value)

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

    const leftGrossMargin = parseFloat(document.getElementById('left-gm').value)
    const rightGrossMargin = parseFloat(document.getElementById('right-gm').value)

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
  const rect = element.getBoundingClientRect()
  tooltipTop.value = rect.top + window.scrollY + element.offsetHeight - 30;
  tooltipLeft.value = rect.left + window.scrollX + element.offsetWidth / 2
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

</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

#main {
  position: relative;
  display: flex;
  max-height: 800px;
}

#filters {
  flex: 0 0 20%;
  flex-direction: column;
  background-color: $base4;
  overflow-y: scroll;
  min-width: 300px;
}

#resultsDiv {
  flex: 0 0 50%;
  width: 100vw;
  overflow-x: scroll;
  max-height: 800px;
}

#sidebar-r {
  position: absolute;
  top: 0;
  right: 0;
  width: 30%;
  background-color: $base4;
  z-index: 1000;
}

#filters {
  background-color: $base4;
  display: flexbox;
  color: $text1;
  height: 100%;
  text-align: center;
}

.param-s {
  margin: 3px;
  padding: 5px;
  color: $text2;
  background-color: $base2;
  border: none;
  height: 80px;
  position: relative;
}

.param-s1 {
  margin: 3px;
  padding: 5px;
  color: $text2;
  background-color: $base2;
  border: none;
  height: 20px;
  position: relative;
}

.param-s1-expanded {
  margin: 3px;
  padding: 5px;
  color: $text2;
  background-color: $base2;
  border: none;
  height: 120px;
  position: relative;
}

.param-s2 {
  margin: 3px;
  padding: 5px;
  color: $text2;
  background-color: $base2;
  border: none;
  height: 20px;
  position: relative;
}

.param-s2-expanded {
  margin: 3px;
  padding: 5px;
  color: $text2;
  background-color: $base2;
  border: none;
  height: 170px;
  position: relative;
}

.param-s3 {
  margin: 3px;
  padding: 5px;
  color: $text2;
  background-color: $base2;
  border: none;
  height: 20px;
  position: relative;
}

.param-s3-expanded {
  margin: 3px;
  padding: 5px;
  color: $text2;
  background-color: $base2;
  border: none;
  height: 120px;
  position: relative;
}

.param-s5-expanded {
  margin: 3px;
  padding: 5px;
  color: $text2;
  background-color: $base2;
  border: none;
  height: 500px;
  position: relative;
}

.param-s6-expanded {
  margin: 3px;
  padding: 5px;
  color: $text2;
  background-color: $base2;
  border: none;
  height: 430px;
  position: relative;
}

.param-s7-expanded {
  margin: 3px;
  padding: 5px;
  color: $text2;
  background-color: $base2;
  border: none;
  height: 200px;
  position: relative;
}

.param-s8-expanded {
  margin: 3px;
  padding: 5px;
  color: $text2;
  background-color: $base2;
  border: none;
  height: 400px;
  position: relative;
}

.param-s9 {
  margin: 3px;
  padding: 5px;
  color: $text2;
  background-color: $base2;
  border: none;
  height: 20px;
  position: relative;
}

.param-s9-expanded {
  margin: 3px;
  padding: 5px;
  color: $text2;
  background-color: $base2;
  border: none;
  height: 450px;
  position: relative;
}

.param-s10-expanded {
  margin: 3px;
  padding: 5px;
  color: $text2;
  background-color: $base2;
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
  background-color: $base2;
  border: none;
  color: whitesmoke;
  padding: 5px;
  position: absolute;
  top: 70%;
  left: 87%;
}

.param-s button:hover {
  background-color: $accent1;
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
  background-color: $base2;
  border: none;
  color: $text1;
  padding: 5px;
  position: absolute;
  top: 80%;
  left: 87%;
}

.param-s2 button:hover {
  background-color: $accent1;
}

.param-s3 button {
  background-color: $base2;
  border: none;
  color: $text1;
  padding: 5px;
  position: absolute;
  top: 65%;
  left: 87%;
}

.param-s3 button:hover {
  background-color: $accent1;
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
  background-color: $base2;
  color: $text2;
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
  background-color: rgba($text2, 0.6);
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
  background-color: $text1;
  -webkit-transition: .3s;
  transition: .3s;
  margin: none;
  padding: none;
}

input:checked+.slider {
  background-color: $accent1;
}

input:focus+.slider {
  box-shadow: 0 0 1px $accent1;
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
  background-color: $base2;
  color: $text1;
  text-align: center;
  margin: 0 auto;
  display: block;
  padding: 5px;
}

.screens:hover {
  width: 100%;
  outline: none;
  border: none;
  background-color: $base3;
  color: $text1;
  text-align: center;
  margin: 0 auto;
  display: block;
  padding: 5px;
}

.Header{
  background-color: $base1;
  text-align: center;
  color: $text1;
  border: none;
  display: flex; 
  flex-direction: row; 
  width: 100vw; 
  height: 30px; 
  align-items: center;
  min-width: 2610px;
}

.even {
  background-color: rgba($base2, 0.5);
  text-align: center;
  color: $text1;
  border: none;
  word-break: break-all;
  min-width: 2610px;
}

.odd {
  background-color: $base2;
  text-align: center;
  color: $text1;
  word-break: break-all;
  min-width: 2610px;
}

.even:hover,
.odd:hover {
  background-color: rgba($accent2, 0.3);
  cursor: pointer;
}

.selected {
  background-color: rgba($accent2, 0.4);
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

.img3 {
  width: 8px;
  height: 8px;
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
  background-color: $base2;
  width: 100vw;
  min-width: 2610px;
}

.title2 {
  position: absolute;
  top: 13%;
  left: 14%;
  border: none;
}

.title3 {
  border: none;
  width: 100%;
  padding: 6px;
  margin: none;
  height: 12.8px;
}

.snavbtn {
  background-color: $base2;
  color: $text1;
  opacity: 0.60;
  padding: 5px;
  outline: none;
  border: none;
  cursor: pointer;
}

.snavbtnslct{
  background-color: $base1;
  color: $text1;
  padding: 5px;
  outline: none;
  border: none;
  opacity: 1;
}

.snavbtn:hover {
  opacity: 1;
  color: $text1;
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
  padding: 10px;
  border: 2px solid $accent3; 
}

.RenameScreener h3,
.CreateScreener h3 {
  background-color: transparent;
    color: rgba($text1, 0.5);
    border: none;
    margin-top: 10px;
}

.RenameScreener input,
.CreateScreener input {
  border-radius: 25px;
  padding: 5px 5px 5px 15px;
  margin: 7px;
  width: 160px;
  outline: none;
  color: $base3; /* Dark text color */
  transition: border-color 0.3s, box-shadow 0.3s; /* Smooth transition for focus effects */
  border: solid 1px $base4;
  background-color:$base4;
}

.RenameScreener input:focus,
.CreateScreener input:focus {
  border-color: $accent1; /* Change border color on focus */
  box-shadow: 0 0 5px rgba($accent3, 0.5); /* Subtle shadow effect */
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
  background-color: $base4;
  color: $text1;
  text-align: center;
  align-items: center;
  padding: 100px;
  border:none;
}

.results2{
  background-color: $base1;
  width: 100vw;
  color: $text1;
  border:none;
}

.results2v{
  padding: 20px;
  background-color: $base4;
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
  background-color: $base1;
  border: none;
  min-height: 250px;
}

.no-border {
  border: none;
  border-style: none;
}

.loading-container1 {
  position: absolute;
  top: 10%;
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
  background-color: $base2;
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
 border-radius: 10px;
 padding-left: 5px;
}

.searchDiv button{
 height: 21px;
 background-color: $accent1;
 outline: none;
 border: none;
 border-radius: 25px;
 position: absolute;
 right:0.3px;
}

.searchDiv button:hover{
 height: 21px;
 background-color: $accent2;
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
  background-color: $base2;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 24.5px;
  border-right: solid 1px $base1;
  z-index: 1000;
}

.wrapper{
  background-color: $base2;
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
  background-color: $base4;
  margin-bottom: 0.1px;
  z-index: 1000;
}

.select-container:hover .dropdown-container div {
  display: block;
  background-color: $base4;
  padding: 5px;
  cursor: pointer;
  z-index: 1000;
}

.wrapper div {
  border-radius: 5px;
}

.select-container .wrapper div:hover {
  background-color: $accent2;
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
  background-color: $base4;
}

.dropdown-menu > div {
  background-color: $base4;
  padding: 5px;
  height: 14px;
  display: flex;
  align-items: center;
  border-radius: 5px;
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

.nested-dropdown-menu {
  display: none;
  position: absolute;
  left: 100%;
  top: 0; 
  background-color: $base4;
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
  background-color: $accent2;
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

.icondlt2{
  background-color: transparent;
  border: none;
  padding: 0;
  float: left;
  opacity: 0.60;
  margin: 0;
}

.icondlt2:hover{
  cursor: pointer;
  opacity: 1;
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
  color: $accent1; /* Change to your preferred color */
  margin-left: 4px;
  cursor: pointer; /* Indicates to users that it has a tooltip */
  position: relative; /* Positioning context for the tooltip */
}

.tooltip2 {
  visibility: hidden; /* Initially hide the tooltip */
  width: 120px; /* Adjust width as necessary */
  background-color: $base1; /* Background color of the tooltip */
  color: $text1; /* Text color */
  text-align: center; /* Center text */
  border-radius: 5px; /* Rounded corners */
  border: solid 1px $accent3;
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
  color: $text1; /* Change text color when checked */
  opacity: 1;
}

.checkmark {
  width: 8px; /* Smaller width */
  height: 8px; /* Smaller height */
  background-color: $text1;
  border-radius: 50%; /* Make it circular */
  margin-right: 5px;
  display: inline-block;
  transition: background-color 0.3s, border-color 0.3s; /* Add transition for border color */
}

.custom-checkbox.checked .checkmark {
  background-color: $accent1; /* Change to your desired color */
  border-color: $accent1; /* Change to your desired border color */
}

.custom-checkbox.checked {
  color: $text1; /* Change text color when checked */
}

.select-container__no-screeners {
  text-align: center;
  color: $text2;
  font-size: 14px;
}

.input{
  border-radius: 25px;
  padding: 5px 5px 5px 15px;
  margin: 7px;
  width: 160px;
  outline: none;
  color: $text1; /* Dark text color */
  transition: border-color 0.3s, box-shadow 0.3s; /* Smooth transition for focus effects */
  border: solid 1px $base4;
  background-color:$base4;
}

.input:focus{
  border-color: $accent1; /* Change border color on focus */
  box-shadow: 0 0 5px rgba(140, 141, 254, 0.5); /* Subtle shadow effect */
  outline: none; /* Remove default outline */
}

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

input[type="date"]::-webkit-calendar-picker-indicator {
  display: none;
}

input[type="date"]{
  color: $base3;
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
  background-color: $base2;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 20px;
  height: 5px;
  border-radius: 15px;
  margin-left: 4px;
  padding: 7px;
  z-index: 1000;
  border: solid 2px $base1;
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
  background-color: $base2;
  padding: 5px;
  height: 14px;
  display: flex;
  align-items: center;
}

.changeperc-dropdown-menu > div:hover {
  background-color: $accent2;
}

.changeperc-dropdown-btn:hover + .changeperc-dropdown-menu, 
.changeperc-dropdown-menu:hover {
  display: block;
}

.ma200-select-container, .ma50-select-container, .ma20-select-container, .ma10-select-container {
  position: relative;
  background-color: $base2;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 40px;
  height: 5px;
  border-radius: 15px;
  margin-left: 4px;
  padding: 7px;
  border: solid 2px $base1;
}

.ma200-dropdown-btn, .ma50-dropdown-btn, .ma20-dropdown-btn, .ma10-dropdown-btn {
  background-color: transparent;
  border: none;
  cursor: pointer;
}

.ma200-dropdown-menu, .ma50-dropdown-menu, .ma20-dropdown-menu, .ma10-dropdown-menu {
  display: none;
  cursor: pointer;
  width: 125px;
  position: absolute; 
  z-index: 1000;
  top: -10px;
  left: 20px;
}

.ma200-dropdown-menu > div, .ma50-dropdown-menu > div, .ma20-dropdown-menu > div, .ma10-dropdown-menu > div {
  background-color: $base2;
  padding: 5px;
  height: 14px;
  display: flex;
  align-items: center;
}

.ma200-dropdown-menu > div:hover, .ma50-dropdown-menu > div:hover, .ma20-dropdown-menu > div:hover, .ma10-dropdown-menu > div:hover {
  background-color: $accent1;
}

.ma200-dropdown-btn:hover + .ma200-dropdown-menu, 
.ma200-dropdown-menu:hover,
.ma50-dropdown-btn:hover + .ma50-dropdown-menu, 
.ma50-dropdown-menu:hover,
.ma20-dropdown-btn:hover + .ma20-dropdown-menu, 
.ma20-dropdown-menu:hover,
.ma10-dropdown-btn:hover + .ma10-dropdown-menu, 
.ma10-dropdown-menu:hover {
  display: block;
}

.relvol-select-container, .avgvol-select-container {
  position: relative;
  background-color: $base2;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 40px;
  height: 5px;
  border-radius: 15px;
  margin-left: 4px;
  padding: 7px;
  border: solid 2px $base1;
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
  background-color: $base2;
  padding: 5px;
  height: 14px;
  display: flex;
  align-items: center;
}

.relvol-dropdown-menu > div:hover, .avgvol-dropdown-menu > div:hover {
  background-color: $accent1;
}

.relvol-dropdown-btn:hover + .relvol-dropdown-menu, 
.relvol-dropdown-menu:hover,
.avgvol-dropdown-btn:hover + .avgvol-dropdown-menu, 
.avgvol-dropdown-menu:hover {
  display: block;
}

#wlist-container{
  height: 3000px; 
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
  width: 15px; height: 15px;
  cursor: pointer;
  margin-left: 7px;
}

.tooltip {
  position: absolute;
  background-color: $base1;
  border: 1px solid $accent3;
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  width: 200px;
}

.tooltip-text {
  color: $text1;
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
</style>