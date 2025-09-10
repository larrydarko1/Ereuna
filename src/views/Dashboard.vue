<template>
  <Header />
  <div class="dashboard">
    <!-- Top Section: Date/Time & Market Status -->
    <section class="dashboard-top">
      <div class="datetime">
        <span class="date">{{ currentDate }}</span>
        <span class="time">{{ currentTime }}</span>
      </div>
      <div class="market-status" :class="marketStatusClass">
        <span class="status-label">US Markets </span>
        <span class="status-value">
          <template v-if="marketStatus === 'Holiday'">
            Holiday: {{ holidayName }}
          </template>
          <template v-else>
            {{ marketStatus }}
          </template>
        </span>
      </div>
    </section>

    <!-- First Row: Market Indexes & SMA Distribution -->
    <div class="dashboard-row">
      <section class="market-indexes card">
        <h2>Market Indexes</h2>
        <table>
          <thead>
            <tr>
              <th>ETF</th>
              <th>Price</th>
              <th>% Change</th>
              <th>1M</th>
              <th>1Q</th>
              <th>1Y</th>
              <th>YTD</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>SPY</td>
              <td>$450.23</td>
              <td class="positive">+0.85%</td>
              <td class="positive">+2.1%</td>
              <td class="positive">+5.3%</td>
              <td class="positive">+12.4%</td>
              <td class="positive">+8.7%</td>
            </tr>
            <tr>
              <td>QQQ</td>
              <td>$370.45</td>
              <td class="negative">-0.56%</td>
              <td class="positive">+1.8%</td>
              <td class="positive">+4.9%</td>
              <td class="positive">+15.2%</td>
              <td class="positive">+10.1%</td>
            </tr>
            <tr>
              <td>DIA</td>
              <td>$350.67</td>
              <td class="positive">+0.12%</td>
              <td class="positive">+1.2%</td>
              <td class="positive">+3.7%</td>
              <td class="positive">+8.9%</td>
              <td class="positive">+6.3%</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section class="sma-distribution card">
        <h2>SMA Distribution</h2>
        <div class="sma-bars">
          <div class="sma-bar" v-for="sma in smaData" :key="sma.period">
            <div class="sma-label">{{ sma.period }} SMA</div>
            <div class="bar-container">
              <div class="bar-positive" :style="{ width: sma.abovePercent + '%' }"></div>
              <div class="bar-negative" :style="{ width: sma.belowPercent + '%' }"></div>
            </div>
            <div class="bar-values">
              <span class="positive">{{ sma.above }}</span>
              <span class="negative">{{ sma.below }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Second Row: Sectors & Movers/Volume/Sentiment -->
    <div class="dashboard-row2">
         <section class="movers-volume-sentiment card">
        <h2>Top Movers & Volume Leaders</h2>
        <div class="movers-volume">
          <div>
            <h3>Top 10 Gainers</h3>
            <ul>
              <li>AAPL +400.2%</li>
              <li>NVDA +320.8%</li>
              <li>TSLA +31.1%</li>
              <li>AAPL +42.2%</li>
              <li>NVDA +38.8%</li>
              <li>TSLA +31.1%</li>
              <li>AAPL +22.2%</li>
              <li>NVDA +20.8%</li>
              <li>TSLA +15.1%</li>
              <li>TSLA +10.1%</li>
            </ul>
          </div>
          <div>
            <h3>Top 10 Losers</h3>
            <ul>
              <li>INTC -99.5%</li>
              <li>IBM -90.1%</li>
              <li>CSCO -88.8%</li>
               <li>INTC -75.5%</li>
              <li>IBM -50.1%</li>
              <li>CSCO -44.8%</li>
               <li>INTC -40.5%</li>
              <li>IBM -37.1%</li>
              <li>CSCO -30.8%</li>
               <li>INTC -25.5%</li>
            </ul>
          </div>
          <div>
            <h3>Volume Leaders</h3>
            <ul>
              <li>AAPL 120M</li>
              <li>TSLA 98M</li>
              <li>AMD 85M</li>
                <li>AAPL 120M</li>
              <li>TSLA 98M</li>
              <li>AMD 85M</li>
                <li>AAPL 120M</li>
              <li>TSLA 98M</li>
              <li>AMD 85M</li>
                <li>AAPL 120M</li>
            </ul>
          </div>
        </div>
      </section>
      <section class="sectors-movers card">
        <h2>Sector Strength</h2>
        <div class="sector-lists">
          <div>
            <h3>Strongest Sectors</h3>
            <ul>
              <li>Technology</li>
              <li>Healthcare</li>
              <li>Consumer Discretionary</li>
            </ul>
          </div>
          <div>
            <h3>Weakest Sectors</h3>
            <ul>
              <li>Utilities</li>
              <li>Energy</li>
              <li>Real Estate</li>
            </ul>
          </div>
           <div>
            <h3>Strongest Industries</h3>
            <ul>
              <li>Software</li>
              <li>Biotechnology</li>
              <li>E-commerce</li>
            </ul>
          </div>
          <div>
            <h3>Weakest Industries</h3>
            <ul>
              <li>Utilities</li>
              <li>Energy</li>
              <li>Real Estate</li>
            </ul>
          </div>
        </div>
         <div class="sentiment-overview">
          <h3>Market Sentiment</h3>
          <div class="sentiment-bar">
            <span class="sentiment-label">Bullish</span>
            <div class="sentiment-progress">
              <div class="sentiment-positive" style="width: 70%"></div>
              <div class="sentiment-negative" style="width: 30%"></div>
            </div>
            <span class="sentiment-label">Bearish</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Header from '../components/Header.vue';

// Date & Time logic
const currentDate = ref('');
const currentTime = ref('');
const marketStatus = ref('Closed');
const marketStatusClass = ref('closed');
const holidayName = ref('');

// US market hours: 9:30am - 4:00pm ET (Eastern Time)
const MARKET_OPEN_HOUR = 9;
const MARKET_OPEN_MINUTE = 30;
const MARKET_CLOSE_HOUR = 16;
const MARKET_CLOSE_MINUTE = 0;

// US market holidays (sample, add more as needed)
const usMarketHolidays = [
  { date: '2025-01-01', name: "New Year's Day" },
  { date: '2025-07-04', name: 'Independence Day' },
  { date: '2025-12-25', name: 'Christmas Day' },
  { date: '2025-11-27', name: 'Thanksgiving Day' },
  { date: '2025-09-01', name: 'Labor Day' },
  // Add more holidays as needed
];

function getUSEasternDate() {
  // Get current time in US Eastern Time (New York)
  const now = new Date();
  const estString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  return new Date(estString);
}

function updateDateTime() {
  const now = new Date();
  currentDate.value = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  currentTime.value = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Get YYYY-MM-DD for holiday check (in US Eastern Time)
  const estDate = getUSEasternDate();
  const yyyy = estDate.getFullYear();
  const mm = String(estDate.getMonth() + 1).padStart(2, '0');
  const dd = String(estDate.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  // Check for holiday
  const holiday = usMarketHolidays.find(h => h.date === todayStr);
  if (holiday) {
    marketStatus.value = 'Holiday';
    marketStatusClass.value = 'holiday';
    holidayName.value = holiday.name;
    return;
  }

  // Get hour and minute in US Eastern Time
  const hour = estDate.getHours();
  const minute = estDate.getMinutes();

  // Market open logic
  if (
    (hour > MARKET_OPEN_HOUR || (hour === MARKET_OPEN_HOUR && minute >= MARKET_OPEN_MINUTE)) &&
    (hour < MARKET_CLOSE_HOUR || (hour === MARKET_CLOSE_HOUR && minute < MARKET_CLOSE_MINUTE))
  ) {
    marketStatus.value = 'Open';
    marketStatusClass.value = 'open';
    holidayName.value = '';
  } else {
    marketStatus.value = 'Closed';
    marketStatusClass.value = 'closed';
    holidayName.value = '';
  }
}

onMounted(() => {
  updateDateTime();
  setInterval(updateDateTime, 1000);
});

// Placeholder SMA data for progress bars
const SMA_MAX = 8500;
const rawSmaData = [
  { period: 10, above: 320, below: 180 },
  { period: 20, above: 290, below: 210 },
  { period: 50, above: 250, below: 250 },
  { period: 100, above: 200, below: 300 },
  { period: 200, above: 150, below: 350 },
];
const smaData = rawSmaData.map(sma => {
  const total = sma.above + sma.below;
  let above = 0, below = 0;
  if (total > 0) {
    above = Math.round((sma.above / total) * SMA_MAX);
    below = SMA_MAX - above;
  }
  const abovePercent = total > 0 ? Math.round((above / SMA_MAX) * 100) : 0;
  const belowPercent = total > 0 ? 100 - abovePercent : 0;
  return {
    period: sma.period,
    above,
    below,
    abovePercent,
    belowPercent
  };
});
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  width: 100vw;
  box-sizing: border-box;
  background-color: var(--base2);
  overflow-x: scroll;
}
.dashboard-row {
  display: flex;
  gap: 32px;
  padding: 32px 24px 0 24px;
  margin-bottom: 0;
}
.dashboard-row2 {
  display: flex;
  gap: 32px;
  padding: 32px 24px 0 24px;
  margin-bottom: 0;
}
.dashboard-row .market-indexes.card {
  flex: 0 0 350px;
  min-width: 280px;
  max-width: 350px;
}
.dashboard-row .sma-distribution.card {
  flex: 1 1 0;
  min-width: 320px;
  max-width: 100%;
}
.dashboard-row2 .sectors-movers.card {
  flex: 0 0 320px;
  min-width: 220px;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.sector-lists {
  display: flex;
  gap: 24px;
  justify-content: space-between;
}
.sector-lists h3 {
  margin-bottom: 8px;
  font-size: 1.1rem;
  color: var(--accent1);
}
.sector-lists ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.sector-lists li {
  color: var(--text1);
  font-size: 1rem;
  margin-bottom: 4px;
}
.dashboard-row2 .movers-volume-sentiment.card {
  flex: 1 1 0;
  min-width: 320px;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.movers-volume {
  display: flex;
  gap: 24px;
  justify-content: space-between;
  margin-bottom: 18px;
}
.movers-volume h3 {
  margin-bottom: 8px;
  font-size: 1.1rem;
  color: var(--accent1);
}
.movers-volume ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.movers-volume li {
  color: var(--text1);
  font-size: 1rem;
  margin-bottom: 4px;
}
.sentiment-overview {
  margin-top: 12px;
}
.sentiment-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sentiment-label {
  color: var(--text2);
  font-size: 1rem;
}
.sentiment-progress {
  display: flex;
  width: 120px;
  height: 14px;
  border-radius: 7px;
  overflow: hidden;
  background: var(--base3);
}
.sentiment-positive {
  background: var(--positive);
  height: 100%;
}
.sentiment-negative {
  background: var(--negative);
  height: 100%;
}
.sma-bars {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 16px;
}
.sma-bar {
  display: flex;
  align-items: center;
  gap: 16px;
}
.sma-label {
  width: 80px;
  color: var(--accent1);
  font-weight: 600;
}
.bar-container {
  display: flex;
  height: 18px;
  width: 400px;
  background: var(--base3);
  border-radius: 8px;
  overflow: hidden;
}
.bar-positive {
  background: var(--positive);
  height: 100%;
}
.bar-negative {
  background: var(--negative);
  height: 100%;
}
.bar-values {
  display: flex;
  gap: 8px;
  font-size: 1rem;
  margin-left: 8px;
}
.dashboard-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px 24px 0 24px;
}
.datetime {
  color: var(--text1);
  display: flex;
  flex-direction: column;
}
.date{
    font-size: 2.5rem;
}
.time {
  font-size: 2rem;
}
.market-status {
  font-size: 1.2rem;
  padding: 8px 16px;
  border-radius: 8px;
  background: var(--base3);
  color: var(--text1);
  font-weight: bold;
}
.market-status.open {
  background: var(--positive);
  color: var(--base4);
}
.market-status.closed {
  background: var(--negative);
  color: var(--base4);
}
.market-status.holiday {
  background: var(--accent2);
  color: var(--base4);
}
.card {
  background: var(--base1);
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(44, 44, 84, 0.12);
  padding: 24px;
  margin: 32px 24px 0 24px;
}
.market-indexes table,
.sma-distribution table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
}
.market-indexes th,
.market-indexes td,
.sma-distribution th,
.sma-distribution td {
  padding: 10px 8px;
  text-align: left;
  border-bottom: 1px solid var(--base3);
}
.market-indexes th,
.sma-distribution th {
  color: var(--accent1);
  font-size: 1rem;
}
.market-indexes td,
.sma-distribution td {
  color: var(--text1);
  font-size: 1rem;
}
.positive {
  color: var(--positive) !important;
}
.negative {
  color: var(--negative) !important;
}

h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text2);
  font-weight: 700;
}
</style>