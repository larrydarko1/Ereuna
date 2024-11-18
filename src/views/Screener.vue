<template>
  <body>
    <Header />
    <div id="main">
      <div id="filters">
        <div id="screener-select" class="select-container">
    <p class="selected-value" @click.stop="">{{ selectedScreener ? selectedScreener : 'Choose a Screener...' }}</p>
    <div class="dropdown-container">
      <div v-for="(screener, index) in ScreenersName" :key="index" :class="{'selected': selectedScreener === screener.Name}" @click="selectScreener(screener.Name)">
        <button class="icondlt2" @click.stop="ExcludeScreener(screener.Name)" v-b-tooltip.hover title="Toggle This Screener's Inclusion">
          <img class="img2" :src="getScreenerImage(screener)" alt="toggle screener">
        </button>
        {{ screener.Name }}
        <button class="icondlt" @click.stop="DeleteScreener(screener.Name)" v-b-tooltip.hover title="Delete This Screener">
          <img class="img2" src="@/assets/icons/delete.png" alt="delete screener">
        </button>
      </div>
    </div>
  </div>
        <div :class="[showPriceInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <p style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px;">Price</p>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showPriceInputs" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showPriceInputs">
            <div class="row">
              <input class="left" id="left-p" type="text" placeholder="min">
              <input class="right" id="right-p" type="text" placeholder="max">
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
            <p style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px;">Market Cap (1000s)</p>
            <label style="float:right" class="switch">
              <input type="checkbox" v-model="showMarketCapInputs">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showMarketCapInputs">
            <div class="row">
              <input class="left" id="left-mc" type="text" placeholder="min">
              <input class="right" id="right-mc" type="text" placeholder="max">
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
            <p style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px;">IPO Date</p>
            <label style="float:right" class="switch">
              <input type="checkbox" v-model="showIPOInputs">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showIPOInputs">
            <div class="row">
              <input class="left" id="left-ipo" type="date" placeholder="min">
              <input class="right" id="right-ipo" type="date" placeholder="max">
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
        <div :class="[ShowSector ? 'param-s2-expanded' : 'param-s2']">
          <div class="row">
            <p style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px;">Sector</p>
            <label style="float:right" class="switch">
              <input type="checkbox" v-model="ShowSector">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none" v-if="ShowSector">
            <div class="row2">
              <div class="check" v-for="(sector, index) in Sectors" :key="index">
                <input type="checkbox" :id="`sector-${index}`" :value="sector">
                <label :for="`sector-${index}`">{{ sector }}</label>
              </div>
            </div>
            <div class="row">
              <button class="btns2" style="float:right" @click="SetSector()">
                <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
              </button>
              <button class="btns2r"style="float:right" @click="Reset('Sector')">
                <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
              </button>
            </div>
          </div>
        </div>
        <div :class="[ShowExchange ? 'param-s3-expanded' : 'param-s3']">
          <div class="row">
            <p style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px;">Exchange</p>
            <label style="float:right" class="switch">
              <input type="checkbox" v-model="ShowExchange">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none" v-if="ShowExchange">
            <div class="row2">
              <div class="check" v-for="(exchange, index) in Exchanges" :key="index">
                <input type="checkbox" :id="`exchange-${index}`" :value="exchange">
                <label :for="`sector-${index}`">{{ exchange }}</label>
              </div>
            </div>
            <div class="row">
              <button class="btns3" style="float:right" @click="SetExchange()">
                <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
              </button>
              <button class="btns3r"style="float:right" @click="Reset('Exchange')">
                <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
              </button>
            </div>
          </div>
        </div>
        <div :class="[ShowCountry ? 'param-s3-expanded' : 'param-s3']">
          <div class="row">
            <p style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px;">Country</p>
            <label style="float:right" class="switch">
              <input type="checkbox" v-model="ShowCountry">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none" v-if="ShowCountry">
            <div class="row2">
              <div class="check" v-for="(country, index) in Country" :key="index">
                <input type="checkbox" :id="`country-${index}`" :value="country">
                <label :for="`sector-${index}`">{{ country }}</label>
              </div>
            </div>
            <div class="row">
              <button class="btns3" style="float:right" @click="SetCountry()">
                <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
              </button>
              <button class="btns3r"style="float:right" @click="Reset('Country')">
                <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
              </button>
            </div>
          </div>
        </div>
        <div :class="[showPEInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <p style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px;">PE Ratio</p>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showPEInputs" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showPEInputs">
            <div class="row">
              <input class="left" id="left-pe" type="text" placeholder="min">
              <input class="right" id="right-pe" type="text" placeholder="max">
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
        <div :class="[showPEForwInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <p style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px;">Forward PE</p>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showPEForwInputs" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showPEForwInputs">
            <div class="row">
              <input class="left" id="left-pef" type="text" placeholder="min">
              <input class="right" id="right-pef" type="text" placeholder="max">
            </div>
            <div class="row">
              <button class="btns" style="float:right" @click="SetForwardPE()">
                <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
              </button>
              <button class="btnsr"style="float:right" @click="Reset('ForwardPE')">
                <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
              </button>
            </div>
          </div>
        </div>
        <div :class="[showPEGInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <p style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px;">PEG Ratio</p>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showPEGInputs" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showPEGInputs">
            <div class="row">
              <input class="left" id="left-peg" type="text" placeholder="min">
              <input class="right" id="right-peg" type="text" placeholder="max">
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
            <p style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px;">EPS</p>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showEPSInputs" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showEPSInputs">
            <div class="row">
              <input class="left" id="left-eps" type="text" placeholder="min">
              <input class="right" id="right-eps" type="text" placeholder="max">
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
        <div :class="[showPSInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <p style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px;">PS Ratio</p>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showPSInputs" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showPSInputs">
            <div class="row">
              <input class="left" id="left-ps" type="text" placeholder="min">
              <input class="right" id="right-ps" type="text" placeholder="max">
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
        <div :class="[showPBInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <p style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px;">PB Ratio</p>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showPBInputs" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showPBInputs">
            <div class="row">
              <input class="left" id="left-pb" type="text" placeholder="min">
              <input class="right" id="right-pb" type="text" placeholder="max">
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
        <div :class="[showBetaInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <p style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px;">Beta</p>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showBetaInputs" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showBetaInputs">
            <div class="row">
              <input class="left" id="left-beta" type="text" placeholder="min">
              <input class="right" id="right-beta" type="text" placeholder="max">
            </div>
            <div class="row">
              <button class="btns" style="float:right" @click="SetBeta()">
                <img class="iconbtn" src="@/assets/icons/diskette.png" alt="Save">
              </button>
              <button class="btnsr"style="float:right" @click="Reset('Beta')">
                <img class="iconbtn" src="@/assets/icons/reset2.png" alt="Reset">
              </button>
            </div>
          </div>
        </div>
        <div :class="[showDivYieldInputs ? 'param-s1-expanded' : 'param-s1']">
          <div class="row">
            <p style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px;">Dividend Yield (%)</p>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showDivYieldInputs" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showDivYieldInputs">
            <div class="row">
              <input class="left" id="left-divyield" type="text" placeholder="min">
              <input class="right" id="right-divyield" type="text" placeholder="max">
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
            <p style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px;">Revenue / Earnings / EPS Growth</p>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showFundYoYQoQ" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showFundYoYQoQ">
            <div class="DataInputs">
            <p>Revenue Growth (YoY)</p>
            <input id="left-RevYoY" type="text" placeholder="min">
            <input id="right-RevYoY" type="text" placeholder="max">
              <p>Revenue Growth (QoQ)</p>
              <input id="left-RevQoQ" type="text" placeholder="min">
              <input id="right-RevQoQ" type="text" placeholder="max">
              <p>Earnings Growth (YoY)</p>
              <input id="left-EarningsYoY" type="text" placeholder="min">
              <input id="right-EarningsYoY" type="text" placeholder="max">
              <p>Earnings Growth (QoQ)</p>
              <input id="left-EarningsQoQ" type="text" placeholder="min">
              <input id="right-EarningsQoQ" type="text" placeholder="max">
              <p>EPS Growth (YoY)</p>
              <input id="left-EPSYoY" type="text" placeholder="min">
              <input id="right-EPSYoY" type="text" placeholder="max">
              <p>EPS Growth (QoQ)</p>
              <input id="left-EPSQoQ" type="text" placeholder="min">
              <input id="right-EPSQoQ" type="text" placeholder="max">
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
            <p style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px;">Price Performance</p>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showPricePerf" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showPricePerf">
            <div class="DataInputs11">
            <p style="text-align: center;">Change %</p>
            <div style="display: flex; justify-content: center; align-items: center; border: none;">
            <input id="changeperc1" type="text" style="width: 70px; margin: 0 5px;" placeholder="Min">
            <input id="changeperc2" type="text" style="width: 70px; margin: 0 5px;" placeholder="Max">
            <select name="" id="changepercselect" style="width: 50px;">
              <option value="" style="text-align: center;">-</option>
              <option value="1D" style="text-align: center;">1D</option>
              <option value="1W" style="text-align: center;">1W</option>
              <option value="1M" style="text-align: center;">1M</option>
              <option value="4M" style="text-align: center;">4M</option>
              <option value="6M" style="text-align: center;">6M</option>
              <option value="1Y" style="text-align: center;">1Y</option>
              <option value="YTD" style="text-align: center;">YTD</option>
            </select>
          </div>
          <div style="border: none;">
            <p style="text-align: center;">% off 52weekhigh</p>
            <div style="display: flex; justify-content: center; align-items: center; border:none;">
              <input type="text" id="weekhigh1" style="width: 70px; margin: 0 5px;" placeholder="Min">
              <input type="text" id="weekhigh2" style="width: 70px; margin: 0 5px;" placeholder="Max">
            </div>
            <p style="text-align: center;">% off 52weeklow</p>
            <div style="display: flex; justify-content: center; align-items: center; border:none;">
              <input type="text" id="weeklow1" style="width: 70px; margin: 0 5px;" placeholder="Min">
              <input type="text" id="weeklow2" style="width: 70px; margin: 0 5px;" placeholder="Max">
            </div>
          </div>
            <div style="display: flex; flex-direction: column; align-items: center; border:none;">
            <div style="display: flex; align-items: center; border:none;">
              <input type="checkbox" id="alltimehigh">
              <p style="margin-left: 10px;">New All time High</p>
            </div>
            <div style="display: flex; align-items: center; border:none;">
              <input type="checkbox" id="alltimelow">
              <p style="margin-left: 10px;">New All time Low</p>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; border: none;">
            <div style="display: flex; align-items: center; border: none;">
              <p style="margin-right: 10px;">200MA</p>
              <select name="" id="ma200" style="text-align: center;">
                <option value="-" style="text-align: center;">-</option>
                <option value="abv50" style="text-align: center;">above 50MA</option>
                <option value="abv20" style="text-align: center;">above 20MA</option>
                <option value="abv10" style="text-align: center;">above 10MA</option>
                <option value="blw50" style="text-align: center;">below 50MA</option>
                <option value="blw20" style="text-align: center;">below 20MA</option>
                <option value="blw10" style="text-align: center;">below 10MA</option>
              </select>
            </div>
            <div style="display: flex; align-items: center; border: none;">
              <p style="margin-right: 10px;">50MA</p>
              <select name="" id="ma50" style="text-align: center;">
                <option value="-" style="text-align: center;">-</option>
                <option value="abv200" style="text-align: center;">above 200MA</option>
                <option value="abv20" style="text-align: center;">above 20MA</option>
                <option value="abv10" style="text-align: center;">above 10MA</option>
                <option value="blw200" style="text-align: center;">below 200MA</option>
                <option value="blw20" style="text-align: center;">below 20MA</option>
                <option value="blw10" style="text-align: center;">below 10MA</option>
              </select>
            </div>
            <div style="display: flex; align-items: center; border: none;">
              <p style="margin-right: 10px;">20MA</p>
              <select name="" id="ma20" style="text-align: center;">
                <option value="-" style="text-align: center;">-</option>
                <option value="abv200" style="text-align: center;">above 200MA</option>
                <option value="abv50" style="text-align: center;">above 50MA</option>
                <option value="abv10" style="text-align: center;">above 10MA</option>
                <option value="blw200" style="text-align: center;">below 200MA</option>
                <option value="blow50" style="text-align: center;">below 50MA</option>
                <option value="blw10" style="text-align: center;">below 10MA</option>
              </select>
            </div>
            <div style="display: flex; align-items: center; border: none;">
              <p style="margin-right: 10px;">10MA</p>
              <select name="" id="ma10" style="text-align: center;">
                <option value="-" style="text-align: center;">-</option>
                <option value="abv200" style="text-align: center;">above 200MA</option>
                <option value="abv50" style="text-align: center;">above 50MA</option>
                <option value="abv20" style="text-align: center;">above 20MA</option>
                <option value="blw200" style="text-align: center;">below 200MA</option>
                <option value="blw50" style="text-align: center;">below 50MA</option>
                <option value="blw20" style="text-align: center;">below 20MA</option>
              </select>
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
            <p style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px;">Technical Score</p>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showRSscore" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showRSscore">
            <div class="DataInputs10">
            <p>Technical Score (1W)</p>
            <input type="number" id="RSscore1Winput1" name="input5" min="1" max="100">
            <input type="number" id="RSscore1Winput2" name="input6" min="1" max="100">
            <p>Technical Score (1M)</p>
            <input type="number" id="RSscore1Minput1" name="input1" min="1" max="100">
            <input type="number" id="RSscore1Minput2" name="input2" min="1" max="100">
            <p>Technical Score (4M)</p>
            <input type="number" id="RSscore4Minput1" name="input3" min="1" max="100">
            <input type="number" id="RSscore4Minput2" name="input4" min="1" max="100">
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
            <p style="float:left; font-weight: bold; position:absolute; top: 0px; left: 5px;">Volume</p>
            <label style="float:right" class="switch">
              <input type="checkbox" id="price-check" v-model="showVolume" style="border: none;">
              <span class="slider round"></span>
            </label>
          </div>
          <div style="border: none;" v-if="showVolume">
            <div class="DataInputs4">
              <p>Relative Volume</p>
              <input id="left-relvol" type="text" placeholder="min">
              <input id="right-relvol" type="text" placeholder="max">
              <select name="" id="option-relvol">
                <option value="-">-</option>
                <option value="1W">1W</option>
                <option value="1M">1M</option>
                <option value="6M">6M</option>
                <option value="1Y">1Y</option>
              </select>
              <p>Average Volume (1000s)</p>
              <input id="left-avgvol" type="text" placeholder="min">
              <input id="right-avgvol" type="text" placeholder="max">
              <select name="" id="option-avgvol">
                <option value="-">-</option>
                <option value="1W">1W</option>
                <option value="1M">1M</option>
                <option value="6M">6M</option>
                <option value="1Y">1Y</option>
              </select>
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
        <div class="results"></div>
      </div>
      <div id="resultsDiv">
        <div v-if="showCreateScreener" class="CreateScreener">
          <img class="inner-logo" src="@/assets/icons/owl.png" alt="">
          <h3>Create Screener</h3>
          <p style="color: whitesmoke; opacity: 0.60; font-size: 7px; margin: 0; padding: 0;" >Max 20 Characters / 20 Screeners for each user</p>
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
          <template v-if="listMode === 'main'">
            <div class="RES" >
          <div class="Header" style="display: flex; flex-direction: row; width: 100vw; height: 30px; align-items: center;">
            <div style="flex:0.5;"></div>
            <div style="flex:0.5;"></div>
            <div style="flex:1;">Ticker</div>
            <div style="flex:2;">Name</div>
            <div style="flex:1;">Price</div>
            <div style="flex:1;">Chg%</div>
            <div style="flex:1;">Technical Score (1W)</div>
            <div style="flex:1;">Technical Score (1M)</div>
            <div style="flex:1;">Technical Score (4M)</div>
            <div style="flex:1;">ISIN</div>
            <div style="flex:1;">Market Cap</div>
            <div style="flex:1;">PE Ratio</div>
            <div style="flex:1;">PEG Ratio</div>
            <div style="flex:1;">Dividend Yield</div>
            <div style="flex:1;">EPS</div>
            <div style="flex:1;">Beta</div>
          </div>
          <div id="wlist-container" style="height: 2000px; width: 100vw; overflow-y: scroll; z-index: 1000;" @scroll.passive="handleScroll1">
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
            <div style="flex:0.5; position: relative;">
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
                      <span class="checkmark"></span>
                      {{ ticker.Name }}
                    </label>
                  </div>
                </div>
                  </div>
                </div>
              </div>
              <div style="flex:0.5;">
                <img 
  :src="getImagePath(asset)" 
  class="img" 
/>
              </div>
              <div style="flex:1;" class="btsymbol">{{ asset.Symbol }}</div>
              <div style="flex:2;">{{ asset.Name }}</div>
              <div style="flex:1;">{{ asset.Close }}</div>
              <div style="flex:1;" :class="asset.todaychange > 0 ? 'positive ' : 'negative'">{{ (asset.todaychange * 100).toFixed(2) }}%</div>
              <div style="flex:1;">{{ asset.RSScore1W }}</div>
              <div style="flex:1;">{{ asset.RSScore1M }}</div>
              <div style="flex:1;">{{ asset.RSScore4M }}</div>
              <div style="flex:1;">{{ asset.ISIN }}</div>
              <div style="flex:1;">{{ parseInt(asset.MarketCapitalization).toLocaleString() }}</div>
              <div style="flex:1;">{{ asset.PERatio }}</div>
              <div style="flex:1;">{{ asset.PEGRatio }}</div>
              <div style="flex:1;">{{ (asset.DividendYield * 100).toFixed(2)}}%</div>
              <div style="flex:1;">{{ asset.EPS }}</div>
              <div style="flex:1;">{{ asset.Beta }}</div>
            </div>
            <div class="results2"> 
            </div>
          </div>
          </div>
          </template>
          <template v-else-if="listMode === 'filter'">
            <div class="RES">
          <div class="Header" style="display: flex; flex-direction: row; width: 100vw; height: 30px; align-items: center;">
            <div style="flex:0.5;"></div>
            <div style="flex:0.5;"></div>
            <div style="flex:1;">Ticker</div>
            <div style="flex:2;">Name</div>
            <div style="flex:1;">Price</div>
            <div style="flex:1;">Chg%</div>
            <div style="flex:1;">Technical Score (1W)</div>
            <div style="flex:1;">Technical Score (1M)</div>
            <div style="flex:1;">Technical Score (4M)</div>
            <div style="flex:1;">ISIN</div>
            <div style="flex:1;">Market Cap</div>
            <div style="flex:1;">PE Ratio</div>
            <div style="flex:1;">PEG Ratio</div>
            <div style="flex:1;">Dividend Yield</div>
            <div style="flex:1;">EPS</div>
            <div style="flex:1;">Beta</div>
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
              <div style="flex:0.5; position: relative;">
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
                      <span class="checkmark"></span>
                      {{ ticker.Name }}
                    </label>
                  </div>
                </div>
                  </div>
                </div>
              </div>
              <div style="flex:0.5;">
                <img 
  :src="getImagePath(asset)" 
  class="img" 
/>
              </div>
              <div style="flex:1;" class="btsymbol">{{ asset.Symbol }}</div>
              <div style="flex:2;">{{ asset.Name }}</div>
              <div style="flex:1;">{{ asset.Close }}</div>
              <div style="flex:1;" :class="asset.todaychange > 0 ? 'positive ' : 'negative'">{{ (asset.todaychange * 100).toFixed(2) }}%</div>
              <div style="flex:1;">{{ asset.RSScore1W }}</div>
              <div style="flex:1;">{{ asset.RSScore1M }}</div>
              <div style="flex:1;">{{ asset.RSScore4M }}</div>
              <div style="flex:1;">{{ asset.ISIN }}</div>
              <div style="flex:1;">{{ parseInt(asset.MarketCapitalization).toLocaleString() }}</div>
              <div style="flex:1;">{{ asset.PERatio }}</div>
              <div style="flex:1;">{{ asset.PEGRatio }}</div>
              <div style="flex:1;">{{ (asset.DividendYield * 100).toFixed(2)}}%</div>
              <div style="flex:1;">{{ asset.EPS }}</div>
              <div style="flex:1;">{{ asset.Beta }}</div>
            </div>
            <div class="results2"> 
            </div>
          </div>
          </div>
          </template>
          <template v-else-if="listMode === 'hidden'">
            <div class="RES">
          <div class="Header" style="display: flex; flex-direction: row; width: 100vw; height: 30px; align-items: center;">
            <div style="flex:0.5;"></div>
            <div style="flex:0.5;"></div>
            <div style="flex:1;">Ticker</div>
            <div style="flex:2;">Name</div>
            <div style="flex:1;">Price</div>
            <div style="flex:1;">Chg%</div>
            <div style="flex:1;">Technical Score (1W)</div>
            <div style="flex:1;">Technical Score (1M)</div>
            <div style="flex:1;">Technical Score (4M)</div>
            <div style="flex:1;">ISIN</div>
            <div style="flex:1;">Market Cap</div>
            <div style="flex:1;">PE Ratio</div>
            <div style="flex:1;">PEG Ratio</div>
            <div style="flex:1;">Dividend Yield</div>
            <div style="flex:1;">EPS</div>
            <div style="flex:1;">Beta</div>
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
              <div style="flex:0.5; position: relative;">
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
                      <span class="checkmark"></span>
                      {{ ticker.Name }}
                    </label>
                  </div>
                </div>
                  </div>
                </div>
              </div>
              <div style="flex:0.5;">
                <img 
  :src="getImagePath(asset)" 
  class="img" 
/>
              </div>
              <div style="flex:1;" class="btsymbol">{{ asset.Symbol }}</div>
              <div style="flex:2;">{{ asset.Name }}</div>
              <div style="flex:1;">{{ asset.Close }}</div>
              <div style="flex:1;" :class="asset.todaychange > 0 ? 'positive ' : 'negative'">{{ (asset.todaychange * 100).toFixed(2) }}%</div>
              <div style="flex:1;">{{ asset.RSScore1W }}</div>
              <div style="flex:1;">{{ asset.RSScore1M }}</div>
              <div style="flex:1;">{{ asset.RSScore4M }}</div>
              <div style="flex:1;">{{ asset.ISIN }}</div>
              <div style="flex:1;">{{ parseInt(asset.MarketCapitalization).toLocaleString() }}</div>
              <div style="flex:1;">{{ asset.PERatio }}</div>
              <div style="flex:1;">{{ asset.PEGRatio }}</div>
              <div style="flex:1;">{{ (asset.DividendYield * 100).toFixed(2)}}%</div>
              <div style="flex:1;">{{ asset.EPS }}</div>
              <div style="flex:1;">{{ asset.Beta }}</div>
            </div>
            <div class="results2"> 
            </div>
            </div>
          </div>
          </template>
          <template v-else-if="listMode === 'combined'">
            <div class="RES">
          <div class="Header" style="display: flex; flex-direction: row; width: 100vw; height: 30px; align-items: center;">
            <div style="flex:0.5;"></div>
            <div style="flex:0.5;"></div>
            <div style="flex:1;">Ticker</div>
            <div style="flex:2;">Name</div>
            <div style="flex:1;">Price</div>
            <div style="flex:1;">Chg%</div>
            <div style="flex:1;">Technical Score (1W)</div>
            <div style="flex:1;">Technical Score (1M)</div>
            <div style="flex:1;">Technical Score (4M)</div>
            <div style="flex:1;">ISIN</div>
            <div style="flex:1;">Market Cap</div>
            <div style="flex:1;">PE Ratio</div>
            <div style="flex:1;">PEG Ratio</div>
            <div style="flex:1;">Dividend Yield</div>
            <div style="flex:1;">EPS</div>
            <div style="flex:1;">Beta</div>
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
              <div style="flex:0.5; position: relative;">
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
                      <span class="checkmark"></span>
                      {{ ticker.Name }}
                    </label>
                  </div>
                </div>
                  </div>
                </div>
              </div>
              <div style="flex:0.5;">
                <img 
  :src="getImagePath(asset)" 
  class="img" 
/>
              </div>
              <div style="flex:1;" class="btsymbol">
                {{ asset.Symbol }}
  <span v-if="asset.isDuplicate" class="duplicate-asterisk">
    * 
    <span class="tooltip">
      Appears in:
      <div v-for="(screener, index) in asset.screenerNames" :key="index">{{ screener }}</div>
    </span>
  </span>
</div>
              <div style="flex:2;">{{ asset.Name }}</div>
              <div style="flex:1;">{{ asset.Close }}</div>
              <div style="flex:1;" :class="asset.todaychange > 0 ? 'positive ' : 'negative'">{{ (asset.todaychange * 100).toFixed(2) }}%</div>
              <div style="flex:1;">{{ asset.RSScore1W }}</div>
              <div style="flex:1;">{{ asset.RSScore1M }}</div>
              <div style="flex:1;">{{ asset.RSScore4M }}</div>
              <div style="flex:1;">{{ asset.ISIN }}</div>
              <div style="flex:1;">{{ parseInt(asset.MarketCapitalization).toLocaleString() }}</div>
              <div style="flex:1;">{{ asset.PERatio }}</div>
              <div style="flex:1;">{{ asset.PEGRatio }}</div>
              <div style="flex:1;">{{ (asset.DividendYield * 100).toFixed(2)}}%</div>
              <div style="flex:1;">{{ asset.EPS }}</div>
              <div style="flex:1;">{{ asset.Beta }}</div>
            </div>
            <div class="results2"> 
            </div>
          </div>
          </div>
          </template>
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
        <div style="padding-top: 5px; overflow: scroll; border:none" id="summary">
          <h1 class="title3" style="position: sticky; top:0">SUMMARY</h1>
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

//user import - user session 
const store = useStore();
let user = store.getters.getUser;

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

    const response = await fetch(`/api/${user}/default-symbol`);
    if (!response.ok) throw new Error('Failed to fetch default symbol');

    const data = await response.json();
    return data.defaultSymbol;
  } catch (error) {
    console.error('Error fetching user default symbol:', error);
    return null;
  }
}

async function updateUserDefaultSymbol(symbol) {
  try {
    if (!user) return;

    const response = await fetch(`/api/${user}/update-default-symbol`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultSymbol: symbol })
    });

    if (!response.ok) throw new Error('Failed to update default symbol');
  } catch (error) {
    console.error('Error updating user default symbol:', error);
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
let showVolume = ref(false);
let showDivYieldInputs = ref(false);
let showIPOInputs = ref(false);
const listMode = ref('main');

const ImagePaths = ref([]);

// Async function to fetch symbols and exchanges
async function fetchSymbolsAndExchanges() {
  try {
    const response = await fetch('/api/symbols-exchanges');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Dynamically import all SVG files from the exchanges directories
    const importedImages = import.meta.glob('/src/assets/images/*/*.svg');
    
    // Map the data to the required format for ImagePaths
    ImagePaths.value = data.map(item => {
      const imagePath = Object.keys(importedImages).find(path => 
        path.includes(`/${item.Exchange}/${item.Symbol}.svg`)
      );
      
      return {
        symbol: item.Symbol,
        exchange: item.Exchange,
        path: imagePath ? imagePath : '/src/assets/images/Blank.svg'
      };
    });
  } catch (error) {
    console.error('Error fetching symbols and exchanges:', error);
  }
}

function getImagePath(item) {
  // If item is an object, use its Symbol
  const symbol = typeof item === 'object' ? item.Symbol : item;
  
  const imageObject = ImagePaths.value.find(image => image.symbol === symbol);

  if (imageObject) {
    return imageObject.path;
  }
  
  return '/src/assets/images/Blank.svg'; // Default to Blank.svg
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
    const response = await fetch(`/api/${symbol}/data`);
    const newData = await response.json();
    data.value = newData; // Update the data variable with the new data
  } catch (err) {
    console.log(err);
  }
}

async function fetchData2() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data2`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const newData2 = await response.json();
    data2.value = newData2; // Update the data2 variable with the new data

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

async function fetchData3() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data3`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const newData3 = await response.json();
    data3.value = newData3;

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

async function fetchData4() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data4`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const newData4 = await response.json();
    data4.value = newData4;

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

async function fetchData5() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data5`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const newData5 = await response.json();
    data5.value = newData5;

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

async function fetchData6() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data6`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const newData6 = await response.json();
    data6.value = newData6;

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

async function fetchData7() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data7`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const newData7 = await response.json();
    data7.value = newData7;

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

async function fetchData8() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data8`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const newData8 = await response.json();
    data8.value = newData8;

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

async function fetchData9() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data9`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const newData9 = await response.json();
    data9.value = newData9;

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

async function fetchData10() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data10`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const newData10 = await response.json();
    data10.value = newData10;

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

async function fetchData11() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data11`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const newData11 = await response.json();
    data11.value = newData11;

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

async function fetchData12() {
  let ticker = defaultSymbol;
  try {
    const response = await fetch(`/api/${ticker}/data12`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const newData12 = await response.json();
    data12.value = newData12;

  } catch (error) {
    console.error('Error fetching data:', error);
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

  const barSeries = chart.addBarSeries({
    downColor: '#90bff9',
    upColor: '#4caf50',
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
    MaSeries1.setData(newData3);
  });

  watch(data4, (newData4) => {
    MaSeries2.setData(newData4);
  });

  watch(data5, (newData5) => {
    MaSeries3.setData(newData5);
  });

  watch(data6, (newData6) => {
    MaSeries4.setData(newData6);
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

  const barSeries = chart.addBarSeries({
    downColor: '#90bff9',
    upColor: '#4caf50',
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
    MaSeries1.setData(newData9);
  });

  watch(data10, (newData10) => {
    MaSeries2.setData(newData10);
  });

  watch(data11, (newData11) => {
    MaSeries3.setData(newData11);
  });

  watch(data12, (newData12) => {
    MaSeries4.setData(newData12);
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
const Exchanges = ref([]); // hosts all available exchanges 
const Country = ref([]); // hosts all available countries 
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
  user = user;
  try {
    const response = await fetch(`/api/${user}/screener/results/all`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    screenerResults.value = data; 
  } catch (error) {
    console.error('Error fetching screener results:', error);
  }
}
GetScreenerResultsAll();

// shows hidden results, it switch values between screeners, i think, there's a similar function below
async function GetHiddenResults() {
  user = user;
  try {
    const response = await fetch(`/api/${user}/screener/results/hidden`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    HiddenResults.value = data; 
  } catch (error) {
    console.error('Error fetching screener results:', error);
  }
}
GetHiddenResults();

// gets all screener values for user 
async function GetScreeners() {
  user = user; // Ensure user is defined
  try {
    const response = await fetch(`/api/screener/${user}/names`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    // Assuming data is now an array of objects with Name and Include properties
    ScreenersName.value = data; 
  } catch (error) {
    console.error('Error fetching screeners:', error);
  }
}
GetScreeners();

// adds and modifies price value for screener 
async function SetPrice() {
  try {
    const leftPrice = parseFloat(document.getElementById('left-p').value)
    const rightPrice = parseFloat(document.getElementById('right-p').value)
    console.log('Min: ', leftPrice, 'Max: ', rightPrice)
    user = user;

    if (leftPrice >= rightPrice) {
      throw new Error('Min price cannot be higher than or equal to max price')
    }

    const response = await fetch('/api/screener/price', {
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
    console.log('Response data:', data)

    if (data.message === 'Price range updated successfully') {
      await fetchScreenerResults(selectedScreener.value); 
    } else {
      throw new Error('Error updating price range')
    }
  } catch (error) {
    console.error('Error setting price:', error)
    await fetchScreenerResults(selectedScreener.value);
  }
}

// add and or modifies market cap value and sends it
async function SetMarketCap() {
  try {
    const leftPrice = parseFloat(document.getElementById('left-mc').value);
    const rightPrice = parseFloat(document.getElementById('right-mc').value);
    console.log('Min: ', leftPrice, 'Max: ', rightPrice);
    user = user;

    if (leftPrice >= rightPrice) {
      throw new Error('Min price cannot be higher than or equal to max price');
    }

    const response = await fetch('/api/screener/marketcap', {
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
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Response data:', data);

    if (data.message === 'market cap updated successfully') {
      try {
        await fetchScreenerResults(selectedScreener.value);
      } catch (error) {
        console.error('Error updating screener results:', error);
      }
    } else {
      throw new Error('Error updating range');
    }
  } catch (error) {
    console.error('Error setting value:', error);
    await fetchScreenerResults(selectedScreener.value);
  }
}

// add and or modifies market cap value and sends it
async function SetIpoDate() {
  try {
    const leftPrice = document.getElementById('left-ipo').value;
    const rightPrice = document.getElementById('right-ipo').value;
    console.log('Min: ', leftPrice, 'Max: ', rightPrice);
    user = user;

    const response = await fetch('/api/screener/ipo-date', {
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
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Response data:', data);

    if (data.message === 'ipo updated successfully') {
      try {
        await fetchScreenerResults(selectedScreener.value);
      } catch (error) {
        console.error('Error updating screener results:', error);
      }
    } else {
      throw new Error('Error updating range');
    }
  } catch (error) {
    console.error('Error setting value:', error);
    await fetchScreenerResults(selectedScreener.value);
  }
}

// hides a stock in screener and puts in in hidden list 
async function hideStock(asset) {
  try {
    const symbol = asset.Symbol;
    user = user;
    const url = `/api/screener/${user}/hidden/${symbol}`;

    if (!symbol) {
      throw new Error('Please provide a valid symbol');
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Response data:', data);

    if (data.message === 'Hidden List updated successfully') {
      console.log('Stock hidden successfully');
    } else {
      throw new Error('Error hiding stock');
    }
  } catch (error) {
    console.error('Error hiding stock:', error);
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
  user = user;
  try {
    const response = await fetch(`/api/screener/results/${user}/hidden`);
    if (response.ok) {
      const data = await response.json();
      hideList.value = data;
    } else {
      console.error('Error:', response.status);
    }
  } catch (error) {
    console.error('Error:', error);
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
    user = user;
    console.log('Symbol:', asset.Symbol)
    const url = `/api/screener/${user}/show/${symbol}`;

    if (!symbol) {
      throw new Error('Please provide a valid symbol');
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Response data:', data);

    if (data.message === 'Hidden List updated successfully') {
      console.log('Stock removed successfully');
    } else {
      throw new Error('Error showing stock');
    }
  } catch (error) {
    console.error('Error showing stock:', error);
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
    const response = await fetch('/api/screener/sectors')
    const data = await response.json()
    Sectors.value = data
  } catch (error) {
    console.error('Error:', error)
  }
}
GetSectors();

// generates options for checkboxes for exchanges 
async function GetExchanges() {
  try {
    const response = await fetch('/api/screener/exchange')
    const data = await response.json()
    Exchanges.value = data
  } catch (error) {
    console.error('Error:', error)
  }
}
GetExchanges();

// generates options for checkboxes for country 
async function GetCountry() {
  try {
    const response = await fetch('/api/screener/country')
    const data = await response.json()
    Country.value = data
  } catch (error) {
    console.error('Error:', error)
  }
}
GetCountry();

// sends sectors data to update screener
async function SetSector() {
  const selectedSectors = [];
  user = user;
  this.Sectors.forEach((sector, index) => {
    const checkbox = document.getElementById(`sector-${index}`);
    if (checkbox.checked) {
      selectedSectors.push(sector);
    }
  });
  try {
    const response = await fetch('/api/screener/sectors', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sectors: selectedSectors, screenerName: selectedScreener.value, user: user })
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(data);
    await fetchScreenerResults(selectedScreener.value); // Update the list after setting the sector
  } catch (error) {
    console.error(error);
    await fetchScreenerResults(selectedScreener.value);
  }
}

// sends exchanges data to update screener
async function SetExchange() {
  const selectedExchanges = [];
  user = user;
  this.Exchanges.forEach((exchange, index) => {
    const checkbox = document.getElementById(`exchange-${index}`);
    if (checkbox.checked) {
      selectedExchanges.push(exchange);
    }
  });
  try {
    const response = await fetch('/api/screener/exchange', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ exchanges: selectedExchanges, screenerName: selectedScreener.value, user: user })
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(data);
    await fetchScreenerResults(selectedScreener.value); // Update the list after setting the exchange
  } catch (error) {
    console.error(error);
    await fetchScreenerResults(selectedScreener.value);
  }
}

// sends country data to update screener
async function SetCountry() {
  const selectedCountries = [];
  user = user;
  this.Country.forEach((country, index) => {
    const checkbox = document.getElementById(`country-${index}`);
    if (checkbox.checked) {
      selectedCountries.push(country);
    }
  });
  try {
    const response = await fetch('/api/screener/country', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ countries: selectedCountries, screenerName: selectedScreener.value, user: user })
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(data);
    await fetchScreenerResults(selectedScreener.value); // Update the list after setting the country
  } catch (error) {
    console.error(error);
    await fetchScreenerResults(selectedScreener.value);
  }
}

// creates new screeners 
async function CreateScreener() {
  try {
    const ScreenerName = document.getElementById('inputcreate').value.trim();

    // Optional: Client-side validation before sending request
    if (ScreenerName.length > 20) {
      alert('Screener name cannot be longer than 20 characters');
      return;
    }

    const response = await fetch(`/api/${user}/create/screener/${ScreenerName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const responseData = await response.json();

    // Check if the request was successful
    if (response.ok) {
      console.log(responseData.message);
      await GetScreeners();
      await GetCompoundedResults();
      showCreateScreener.value = false;
    } else {
      console.error(responseData.message);
    }
  } catch (error) {
    console.error('Error creating screener:', error);
    alert('An error occurred while creating the screener');
  }
}

// renames screener 
async function UpdateScreener() {
  try {
    const ScreenerName = document.getElementById('inputrename').value.trim();
    const oldname = selectedScreener.value; // Get the current name of the screener

    // Check if the new screener name is too long
    if (ScreenerName.length > 20) {
      alert('Screener name cannot be longer than 20 characters');
      return;
    }

    // Optional: Check if the new name is different from the old name
    if (ScreenerName === oldname) {
      alert('New screener name must be different from the current name');
      return;
    }

    const response = await fetch(`/api/${user}/rename/screener`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newname: ScreenerName, oldname: oldname })
    });

    const responseData = await response.json();

    // Check if the request was successful
    if (response.ok) {
      console.log('Screener renamed successfully!');
      selectedScreener.value = ScreenerName;
      await GetScreeners();
      await GetCompoundedResults();
      showRenameScreener.value = false;
    } else {
      // Handle error messages from the server
      alert(responseData.message);
    }
  } catch (error) {
    console.error('Error renaming screener:', error);
    alert('An error occurred while renaming the screener');
  }
}

// deletes screeners 
async function DeleteScreener(screenerName) {
  user = user; // Assuming user is defined elsewhere
  const apiUrl = `/api/${user}/delete/screener/${screenerName}`;
  const requestOptions = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ currentScreenerName: screenerName })
  };

  try {
    const response = await fetch(apiUrl, requestOptions);
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
  
  await GetScreeners();
  await GetCompoundedResults();
}

async function fetchScreenerResults(screenerName) {
  user = user;
  try {
    const response = await fetch(`/api/screener/${user}/results/filtered/${screenerName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
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
    console.error('Error fetching screener results:', error);
  }
}

async function fetchPerformanceResults(symbol) {
  
    try {
      const response = await fetch(`/api/screener/performance/${symbol}`);
      const performanceData = await response.json();
      PerformanceResults.value.push(performanceData);
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
    }
  }

// adds and modifies PE Ratio value for screener 
async function SetPE() {
  try {
    const leftPrice = parseFloat(document.getElementById('left-pe').value)
    const rightPrice = parseFloat(document.getElementById('right-pe').value)
    user = user;

    if (leftPrice >= rightPrice) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/pe', {
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
    } else {
      throw new Error('Error updating price range')
    }
    await fetchScreenerResults(selectedScreener.value); 
  } catch (error) {
    console.error('Error setting price:', error)
    await fetchScreenerResults(selectedScreener.value);
  }
}

// adds and modifies Forward PE Ratio value for screener 
async function SetForwardPE() {
  try {
    const leftPrice = parseFloat(document.getElementById('left-pef').value)
    const rightPrice = parseFloat(document.getElementById('right-pef').value)
    user = user;

    if (leftPrice >= rightPrice) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/forward-pe', {
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
    const leftPrice = parseFloat(document.getElementById('left-peg').value)
    const rightPrice = parseFloat(document.getElementById('right-peg').value)
    user = user;

    if (leftPrice >= rightPrice) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/peg', {
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

// adds and modifies EPS value for screener 
async function SetEPS() {
  try {
    const leftPrice = parseFloat(document.getElementById('left-eps').value)
    const rightPrice = parseFloat(document.getElementById('right-eps').value)
    user = user;

    if (leftPrice >= rightPrice) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/eps', {
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

// adds and modifies PS Ratio value for screener 
async function SetPSRatio() {
  try {
    const leftPrice = parseFloat(document.getElementById('left-ps').value)
    const rightPrice = parseFloat(document.getElementById('right-ps').value)
    user = user

    if (leftPrice >= rightPrice) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/ps-ratio', {
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

// adds and modifies PB Ratio value for screener 
async function SetPBRatio() {
  try {
    const leftPrice = parseFloat(document.getElementById('left-pb').value)
    const rightPrice = parseFloat(document.getElementById('right-pb').value)
    user = user

    if (leftPrice >= rightPrice) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/pb-ratio', {
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
    } 
  } catch (error) {
    console.error('Error setting price:', error)
    await fetchScreenerResults(selectedScreener.value);
  }
  await fetchScreenerResults(selectedScreener.value);
}

// adds and modifies Beta value for screener 
async function SetBeta() {
  try {
    const leftPrice = parseFloat(document.getElementById('left-beta').value)
    const rightPrice = parseFloat(document.getElementById('right-beta').value)
    user = user

    if (leftPrice >= rightPrice) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/beta', {
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
    const leftPrice = parseFloat(document.getElementById('left-divyield').value)
    const rightPrice = parseFloat(document.getElementById('right-divyield').value)
    user = user

    if (leftPrice >= rightPrice) {
      throw new Error('Min cannot be higher than or equal to max')
    }

    const response = await fetch('/api/screener/div-yield', {
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

// adds and modifies YoY and/or Qoq value for screener 
async function SetFundamentalGrowth() {
  try {
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
    user = user;

    const response = await fetch('/api/screener/fundamental-growth', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
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
      console.error('Error:', error.response.data.message);
      // Display an error message to the user
    } else {
      console.error('Error setting price:', error)
      await fetchScreenerResults(selectedScreener.value);
  }}
}

// updates screener value with volume parameters 
async function SetVolume(){
  try {
    const value1 = parseFloat(document.getElementById('left-relvol').value)
    const value2 = parseFloat(document.getElementById('right-relvol').value)
    const value3 = parseFloat(document.getElementById('left-avgvol').value * 1000)
    const value4 = parseFloat(document.getElementById('right-avgvol').value * 1000)
    const relVolOption = document.getElementById('option-relvol').value
    const avgVolOption = document.getElementById('option-avgvol').value
    user = user;

    const response = await fetch('/api/screener/volume', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
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
    console.error('Error setting price:', error)
    await fetchScreenerResults(selectedScreener.value);
  }
}

// updates screener value with RS Score parameters 
async function SetRSscore(){
  try {
    const value1 = parseFloat(document.getElementById('RSscore1Minput1').value)
    const value2 = parseFloat(document.getElementById('RSscore1Minput2').value)
    const value3 = parseFloat(document.getElementById('RSscore4Minput1').value)
    const value4 = parseFloat(document.getElementById('RSscore4Minput2').value)
    const value5 = parseFloat(document.getElementById('RSscore1Winput1').value)
    const value6 = parseFloat(document.getElementById('RSscore1Winput2').value)
    user = user

    const response = await fetch('/api/screener/rs-score', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
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
    console.error('Error:', error)
    await fetchScreenerResults(selectedScreener.value);
  }
}

// updates screener value with price performance parameters 
async function SetPricePerformance(){
  try {
    const changeperc1 = parseFloat(document.getElementById('changeperc1').value) / 100;
    const changeperc2 = parseFloat(document.getElementById('changeperc2').value) / 100;
    const changepercselect = document.getElementById('changepercselect').value;
    const weekhigh1 = parseFloat(document.getElementById('weekhigh1').value);
    const weekhigh2 = parseFloat(document.getElementById('weekhigh2').value);
    const weeklow1 = parseFloat(document.getElementById('weeklow1').value);
    const weeklow2 = parseFloat(document.getElementById('weeklow2').value);
    const alltimehigh = document.getElementById('alltimehigh').checked ? 'yes' : 'no';
    const alltimelow = document.getElementById('alltimelow').checked ? 'yes' : 'no';
    const ma200 = document.getElementById('ma200').value;
    const ma50 = document.getElementById('ma50').value;
    const ma20 = document.getElementById('ma20').value;
    const ma10 = document.getElementById('ma10').value;
    user = user;

    const response = await fetch('/api/screener/price-performance', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
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
      console.error('Error:', error.response.data.message);
      await fetchScreenerResults(selectedScreener.value);
    } else {
      console.error('Error setting price:', error)
      await fetchScreenerResults(selectedScreener.value);
  }}
}

// function that updates screener parameters graphically 
async function CurrentScreener() {
  user = user;
  const Name = selectedScreener.value;

  try {
    const response = await fetch(`/api/screener/datavalues/${user}/${Name}`);
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
    console.error(error);
  }
}

// function that resets screener values (all of them)
async function ResetScreener() {
  user = user;
  const Name = selectedScreener.value;

  try {
    const response = await fetch(`/api/screener/reset/${user}/${Name}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
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
    console.log(jsonData);
    await fetchScreenerResults(selectedScreener.value);
  } catch (error) {
    console.error('Error:', error);
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
};

// function that resets indivudal values for screeners 
async function Reset(value) {
  const stringValue = valueMap[value];
  try {
    user = user;
    const Name = selectedScreener.value;

    const requestBody = {
      stringValue,
      user,
      Name
    };

    const options = {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    };

    const response = await fetch('/api/reset/screener/param', options);

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
      
    }
    await fetchScreenerResults(selectedScreener.value);
    console.log('Value reset successfully');
  } catch (error) {
    console.error('Error resetting value:', error);
    await fetchScreenerResults(selectedScreener.value);
  }
}

// function that updates screener summary graphically 
async function SummaryScreener() {
  user = user;
  const Name = selectedScreener.value;

  try {
    const response = await fetch(`/api/screener/summary/${user}/${Name}`);
    const screenerSettings = await response.json();

    const attributes = [
      'Price', 'MarketCap', 'Sectors', 'Exchanges', 'Countries', 'PE', 'ForwardPE', 'PEG', 'EPS', 'PS', 'PB', 'Beta', 'DivYield',
      'EPSQoQ', 'EPSYoY', 'EarningsQoQ', 'EarningsYoY', 'RevQoQ', 'RevYoY', 'AvgVolume1W', 'AvgVolume1M', 'AvgVolume6M', 'AvgVolume1Y',
      'RelVolume1W', 'RelVolume1M', 'RelVolume6M', 'RelVolume1Y', 'RSScore1W','RSScore1M', 'RSScore4M', 'MA10', 'MA20', 'MA50', 'MA200', 'NewHigh',
      'NewLow', 'PercOffWeekHigh', 'PercOffWeekLow', 'changePerc', 'IPO',
    ];

    const attributeMapping = {
      'MarketCap': 'Market Cap',
      'PE': 'PE Ratio',
      'ForwardPE': 'Forward PE',
      'PS': 'PS Ratio',
      'PB': 'PB Ratio',
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
      'RSScore1W': 'RSI Score (1W)',
      'RSScore1M': 'RS Score (1M)',
      'RSScore4M': 'RS Score (4M)',
      'NewHigh': 'New High',
      'NewLow': 'New Low',
      'PercOffWeekHigh': '% Off 52WeekHigh',
      'PercOffWeekLow': '% Off 52WeekLow',
      'changePerc': 'Change (%)',
      'IPO': 'IPO',
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
    console.error(error);
  }
}

// fetches data for cumulative screener results 
async function GetCompoundedResults() {
  user = user;
  try {
    const response = await fetch(`/api/screener/${user}/all`);
    const data = await response.json();
    compoundedResults.value = data;
  } catch (error) {
    console.error('Error:', error);
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
  // Update the selected screener value
  emit('update:modelValue', screener);
}

const watchlist = reactive({ tickers: [] });
const selectedWatchlist = ref([]);

// generates all watchlist names 
async function getWatchlists() {
  user = user;
  try {
    const response = await fetch(`/api/${user}/watchlists`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    watchlist.tickers = data; 
  } catch (error) {
    console.error('Error fetching watchlists:', error);
  }
}

onMounted(() => {
  getWatchlists();
});

async function addtoWatchlist(ticker, symbol, $event) {
  const isChecked = $event.target.checked;
  user = user;

  // Your existing logic here
  console.log(`Updating watchlist: ${ticker.Name}, Symbol: ${symbol}, Checked: ${isChecked}`);
  const isAdding = isChecked;

  try {
    const response = await fetch(`/api/watchlist/addticker/${isAdding ? 'true' : 'false'}`, {
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

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    console.log(`Symbol ${symbol} ${isAdding ? 'added to' : 'removed from'} watchlist ${ticker.Name}`)

  } catch (error) {
    console.error('Error updating watchlist:', error)
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
  const response = await fetch(`/api/${user}/full-watchlists`)
  FullWatchlists.value = await response.json()
};
getFullWatchlists(user);


const isAssetInWatchlist = (ticker, symbol) => {
  // Find the watchlist with matching Name
  const watchlist = FullWatchlists.value.find(w => w.Name === ticker);
  
  // If watchlist exists, check if symbol is in its List
  if (watchlist) {
    return watchlist.List.includes(symbol);
  }
  
  return false;
};

async function ExcludeScreener(screener) {
  // Assuming user is defined elsewhere in your context
  user = user; 
  const apiUrl = `/api/${user}/toggle/screener/${screener}`; // Assuming screener has a Name property
  const requestOptions = {
    method: 'PATCH', // Use PATCH to update the Include status
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ currentScreenerName: screener }) // Sending the current screener name
  };

  try {
    const response = await fetch(apiUrl, requestOptions);
    const data = await response.json();
  } catch (error) {
    console.error(error);
  }

  await GetScreeners(); // Refresh the list of screeners
  await GetCompoundedResults(); // Refresh the compounded results
}

const getScreenerImage = (screener) => {
  return screener.Include
    ? new URL('@/assets/icons/exclude.png', import.meta.url).href // Show exclude image if Include is true
    : new URL('@/assets/icons/include.png', import.meta.url).href; // Show include image if Include is false
};

const screenerName = ref('');

const searchQuery = ref('');

const toUpperCase = () => {
  searchQuery.value = searchQuery.value.toUpperCase();
};

</script>

<style scoped>
#main {
  position: relative;
  display: flex;
  height: 100vh;
}

#filters {
  flex: 0 0 20%;
  flex-direction: column;
  background-color: #2c2b3e;
  overflow-y: scroll;
}

#resultsDiv {
  flex: 0 0 50%;
  width: 100vw;
  overflow-x: scroll;
}

#resultsDiv table {
  flex: 0 0 50%;
  width: 100vw;
}

#sidebar-r {
  position: absolute;
  top: 0;
  right: 0;
  width: 30%;
  height: 100vh;
  background-color: #2c2b3d;
  z-index: 1000;
}

#filters {
  background-color: #2c2b3e;
  display: flexbox;
  color: white;
  height: 100%;
  text-align: center;
}

.param-s {
  margin: 3px;
  padding: 5px;
  color: #b3b3b3;
  background-color: #3f3e56;
  border: none;
  height: 80px;
  position: relative;
}

.param-s1 {
  margin: 3px;
  padding: 5px;
  color: #b3b3b3;
  background-color: #3f3e56;
  border: none;
  height: 20px;
  position: relative;
}

.param-s1-expanded {
  margin: 3px;
  padding: 5px;
  color: #b3b3b3;
  background-color: #3f3e56;
  border: none;
  height: 80px;
  position: relative;
}

.param-s2 {
  margin: 3px;
  padding: 5px;
  color: #b3b3b3;
  background-color: #3f3e56;
  border: none;
  height: 20px;
  position: relative;
}

.param-s2-expanded {
  margin: 3px;
  padding: 5px;
  color: #b3b3b3;
  background-color: #3f3e56;
  border: none;
  height: 170px;
  position: relative;
}

.param-s3 {
  margin: 3px;
  padding: 5px;
  color: #b3b3b3;
  background-color: #3f3e56;
  border: none;
  height: 20px;
  position: relative;
}

.param-s3-expanded {
  margin: 3px;
  padding: 5px;
  color: #b3b3b3;
  background-color: #3f3e56;
  border: none;
  height: 60px;
  position: relative;
}

.param-s5-expanded {
  margin: 3px;
  padding: 5px;
  color: #b3b3b3;
  background-color: #3f3e56;
  border: none;
  height: 350px;
  position: relative;
}

.param-s6-expanded {
  margin: 3px;
  padding: 5px;
  color: #b3b3b3;
  background-color: #3f3e56;
  border: none;
  height: 400px;
  position: relative;
}

.param-s7-expanded {
  margin: 3px;
  padding: 5px;
  color: #b3b3b3;
  background-color: #3f3e56;
  border: none;
  height: 150px;
  position: relative;
}

.param-s8-expanded {
  margin: 3px;
  padding: 5px;
  color: #b3b3b3;
  background-color: #3f3e56;
  border: none;
  height: 200px;
  position: relative;
}

.DataInputs{
  position: absolute;
  left: 25%;
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
  left: 20%;
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
  left: 35%;
  top: 20%;
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
  background-color: #27252e;
  border: none;
  color: whitesmoke;
  padding: 5px;
  position: absolute;
  top: 70%;
  left: 87%;
}

.param-s button:hover {
  background-color: #8c8dfe;
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
  top: 70%;
  left: 89%;
}

.btnsr {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  top: 70%;
  left: 80%;
}

.btns2 {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  top: 86%;
  left: 89%;
}

.btns2r {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  top: 86%;
  left: 80%;
}

.btns3 {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  top: 65%;
  left: 89%;
}

.btns3r {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  top: 65%;
  left: 80%;
}

.btns5 {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  top: 92.5%;
  left: 89%;
}

.btns5r {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  top: 92.5%;
  left: 80%;
}

.btns6 {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  top: 93.5%;
  left: 89%;
}

.btns6r {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  top: 93.5%;
  left: 80%;
}

.btns7 {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  top: 83%;
  left: 89%;
}

.btns7r {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  top: 83%;
  left: 80%;
}

.btns8 {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  top: 88%;
  left: 89%;
}

.btns8r {
  background-color: transparent;
  border: none;
  padding: 5px;
  position: absolute;
  top: 88%;
  left: 80%;
}

.param-s2 button {
  background-color: #27252e;
  border: none;
  color: whitesmoke;
  padding: 5px;
  position: absolute;
  top: 80%;
  left: 87%;
}

.param-s2 button:hover {
  background-color: #8c8dfe;
}

.param-s3 button {
  background-color: #27252e;
  border: none;
  color: whitesmoke;
  padding: 5px;
  position: absolute;
  top: 65%;
  left: 87%;
}

.param-s3 button:hover {
  background-color: #8c8dfe;
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
  top: 33%;
  left: 2%;
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
  background-color: #3f3e56;
  color: #b3b3b3;
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
  background-color: #ccc;
  -webkit-transition: .1s;
  transition: .1s;
  margin: none;
  padding: none;
  border: solid 1px #171728;
}

.slider:before {
  position: absolute;
  content: "";
  height: 13px;
  width: 13px;
  left: 2px;
  bottom: 2.5px;
  background-color: white;
  -webkit-transition: .1s;
  transition: .1s;
  margin: none;
  padding: none;
}

input:checked+.slider {
  background-color: #8c8dfe;
}

input:focus+.slider {
  box-shadow: 0 0 1px #8c8dfe;
}

input:checked+.slider:before {
  -webkit-transform: translateX(13px);
  -ms-transform: translateX(13px);
  transform: translateX(20px);
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
  background-color: #322b3d;
  color: whitesmoke;
  text-align: center;
  margin: 0 auto;
  display: block;
  padding: 5px;
}

.screens:hover {
  width: 100%;
  outline: none;
  border: none;
  background-color: #3e364b;
  color: whitesmoke;
  text-align: center;
  margin: 0 auto;
  display: block;
  padding: 5px;
}

.Header,
Header th {
  background-color: #0f0f1b;
  text-align: center;
  color: whitesmoke;
  border: none;
}

.even {
  background-color: #27252e;
  text-align: center;
  color: whitesmoke;
  border: none;
  word-break: break-all;
}

.odd {
  background-color: #322f3b;
  text-align: center;
  color: whitesmoke;
  word-break: break-all;
}

.even:hover,
.odd:hover {
  background-color: #8c8efe44;
  cursor: pointer;
}

.selected {
  background-color: #8c8efe65;
}

.even td,
.odd td {
  border: none;
  padding: 5px;
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
  background-color: #3f3e56;
  width: 100vw;
}

.title2 {
  position: absolute;
  top: 13%;
  left: 23%;
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
  background-color: #3f3e56;
  color: #ebebeb;
  opacity: 0.60;
  padding: 5px;
  outline: none;
  border: none;
}

.snavbtnslct{
  background-color: #37333d;
  color: #ebebeb;
  padding: 5px;
  outline: none;
  border: none;
  opacity: 1;
}

.snavbtn:hover {
  opacity: 1;
  color: #ebebeb;
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
    background-color: #3f3e56;
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

.RenameScreener h3,
.CreateScreener h3 {
  background-color: transparent;
    color: whitesmoke;
    border: none;
    margin-top: 10px;
}

.RenameScreener input,
.CreateScreener input {
  margin-bottom: 3px;
    margin-top: 5px;
    text-align: center;
    background-color: #e0e0e0;
  color: rgb(7, 7, 7);
  padding: 5px;
  outline: none;
  border: solid 1px #3f3e56;
}

.RenameScreener input:focus,
.CreateScreener input:focus {
  border-color: #8c8dfe;
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
  background-color: #2c2b3e;
  color: whitesmoke;
  text-align: center;
  align-items: center;
  padding: 10px;
  height: 50px;
  border:none;
}

.results2{
  background-color: #0f0f1b;
  width: 100vw;
  color: whitesmoke;
  height: 200px;
  border:none;
}

.results2v{
  padding: 20px;
  background-color: #2c2b3e;
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
  background-color: #0f0f1b;
  height: 140px;
  border: none;
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
  background-color: #2c2b3e;
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
 background-color: #8c8dfe;
 outline: none;
 border: none;
 border-radius: 25px;
 position: absolute;
 right:0.3px;
}

.searchDiv button:hover{
 height: 21px;
 background-color: #787afa;
 outline: none;
 border: none;
 cursor: pointer;
}

.img3{
  height: 10px;
  width: 10px;
}

#wlist{
  outline: none;
}

.select-container {
  position: relative;
  background-color: #2c2b3d;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 24.5px;
  border-right: solid 1px #3d354a;
  z-index: 1000;
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
  background-color: #2c2b3e;
  border-top: 0.1px solid #151515;
  border-bottom: 0.1px solid #151515;
  z-index: 1000;
}

.select-container:hover .dropdown-container div {
  display: block;
  background-color: #2c2b3e;
  padding: 5px;
  cursor: pointer;
  z-index: 1000;
}

.select-container .dropdown-container div:hover {
  background-color: #4c4a66;
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
}

.dropdown-menu > div {
  background-color: #322f3b;
  padding: 5px;
  height: 14px;
  display: flex;
  align-items: center;
}

.dropdown-menu > div:hover {
  background-color: #565265;
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
  background-color: #322f3b;
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
}

.watchlist-item:hover {
  background-color: #565265;
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
  color: #8c8dfe; /* Change to your preferred color */
  margin-left: 4px;
  cursor: pointer; /* Indicates to users that it has a tooltip */
  position: relative; /* Positioning context for the tooltip */
}

.tooltip {
  visibility: hidden; /* Initially hide the tooltip */
  width: 120px; /* Adjust width as necessary */
  background-color: #3f3e56; /* Background color of the tooltip */
  color: #fff; /* Text color */
  text-align: center; /* Center text */
  border-radius: 5px; /* Rounded corners */
  padding: 5px; /* Padding */
  position: absolute; /* Positioning */
  z-index: 1000; /* Ensure it appears above other elements */
  top: 100%; 
  left: 50%; 
  margin-left: -60px; /* Adjust for half the width of the tooltip */
  opacity: 0; /* Start with opacity 0 */
  transition: opacity 0.3s; /* Smooth transition for visibility */
}

.duplicate-asterisk:hover .tooltip {
  visibility: visible; /* Show tooltip on hover */
  opacity: 1; /* Fade in */
}

.imgbtn{
  width: 15px;
  height: 15px;
}

</style>