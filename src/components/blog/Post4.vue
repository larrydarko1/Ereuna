<template>
  <article class="blog-post">
    <header class="post-header">
      <div class="post-meta">
        <span class="post-category">{{ category }}</span>
        <span class="post-date">{{ formatDate(date) }}</span>
      </div>
      <h1 class="post-title">{{ title }}</h1>
      <div class="post-tags" v-if="tags.length">
        <span
          v-for="tag in tags"
          :key="tag"
          class="tag"
        >
          {{ tag }}
        </span>
      </div>
    </header>

    <div class="post-content">
      <div class="post-image" v-if="image">
        <img :src="image" :alt="title" class="post-image-content">
      </div>

      <div class="post-body">
        <p>
          The Relative Strength Index (RSI) is one of the most popular and versatile momentum oscillators in technical analysis. Developed by J. Welles Wilder in 1978, RSI measures the speed and magnitude of price changes to identify overbought and oversold conditions. Understanding RSI can help traders time entries and exits more effectively, spot potential reversals, and confirm trend strength. This comprehensive guide will teach you everything you need to know about using RSI in your trading.
        </p>

        <h2>What is the Relative Strength Index (RSI)?</h2>

        <p>
          RSI is a momentum oscillator that compares the magnitude of recent gains to recent losses over a specified time period. It oscillates between 0 and 100, with readings above 70 typically considered overbought and readings below 30 considered oversold.
        </p>

        <p>
          The indicator smooths price action to filter out market noise while highlighting the underlying momentum. Unlike moving averages that focus on price levels, RSI focuses on the rate of change, making it excellent for identifying momentum shifts before they become obvious in price.
        </p>

        <h2>How RSI is Calculated</h2>

        <p>
          RSI uses a two-step calculation process:
        </p>

        <h3>Step 1: Calculate RS (Relative Strength)</h3>
        <p>
          <strong>RS = Average Gain / Average Loss</strong>
        </p>
        <p>
          Where:
        </p>
        <ul>
          <li><strong>Average Gain:</strong> Average of upward price changes over the specified period</li>
          <li><strong>Average Loss:</strong> Average of downward price changes over the specified period</li>
        </ul>

        <h3>Step 2: Calculate RSI</h3>
        <p>
          <strong>RSI = 100 - (100 / (1 + RS))</strong>
        </p>

        <p>
          The default period for RSI is 14 days, but traders commonly use 9, 14, or 21 periods depending on their trading style and timeframe.
        </p>

        <h2>RSI Levels and Interpretation</h2>

        <h3>Overbought (Above 70)</h3>
        <p>
          When RSI rises above 70, it suggests the asset may be overbought, meaning buying pressure has pushed prices too high too quickly. This doesn't necessarily mean prices will immediately reverse, but it does indicate that momentum is strong and a pullback could be coming.
        </p>

        <h3>Oversold (Below 30)</h3>
        <p>
          When RSI falls below 30, it suggests the asset may be oversold, meaning selling pressure has pushed prices too low too quickly. This indicates potential buying opportunities as the asset may be undervalued relative to recent momentum.
        </p>

        <h3>Neutral Zone (30-70)</h3>
        <p>
          RSI readings between 30 and 70 are considered neutral. The asset is neither strongly overbought nor oversold, and price action is relatively balanced.
        </p>

        <h2>Common RSI Trading Strategies</h2>

        <h3>1. Overbought/Oversold Reversal Strategy</h3>
        <p>
          The most basic RSI strategy involves buying when RSI drops below 30 (oversold) and selling when RSI rises above 70 (overbought).
        </p>

        <p>
          <strong>Entry Signals:</strong>
        </p>
        <ul>
          <li><strong>Buy:</strong> RSI crosses below 30</li>
          <li><strong>Sell:</strong> RSI crosses above 70</li>
        </ul>

        <p>
          <strong>Exit Strategy:</strong> Close positions when RSI returns to the neutral zone (around 50) or use trailing stops.
        </p>

        <h3>2. RSI Divergence Strategy</h3>
        <p>
          Divergences occur when price and RSI move in opposite directions, signaling potential reversals.
        </p>

        <h4>Bullish Divergence</h4>
        <ul>
          <li>Price makes lower lows</li>
          <li>RSI makes higher lows</li>
          <li>Signal: Potential upward reversal</li>
        </ul>

        <h4>Bearish Divergence</h4>
        <ul>
          <li>Price makes higher highs</li>
          <li>RSI makes lower highs</li>
          <li>Signal: Potential downward reversal</li>
        </ul>

        <h3>3. Centerline Crossover Strategy</h3>
        <p>
          The centerline (50) acts as support/resistance for RSI.
        </p>

        <p>
          <strong>Buy Signal:</strong> RSI crosses above 50 (momentum shifting to bullish)
        </p>
        <p>
          <strong>Sell Signal:</strong> RSI crosses below 50 (momentum shifting to bearish)
        </p>

        <h3>4. RSI Trend Confirmation</h3>
        <p>
          Use RSI to confirm the strength of a trend:
        </p>
        <ul>
          <li><strong>Strong uptrend:</strong> RSI stays above 50, rarely dips below 30</li>
          <li><strong>Strong downtrend:</strong> RSI stays below 50, rarely rises above 70</li>
          <li><strong>Weak trend:</strong> RSI oscillates around 50, frequent overbought/oversold readings</li>
        </ul>

        <h2>Advanced RSI Techniques</h2>

        <h3>Dynamic Overbought/Oversold Levels</h3>
        <p>
          Instead of fixed 70/30 levels, adjust based on market conditions:
        </p>
        <ul>
          <li><strong>Strong uptrend:</strong> Use 80/20 levels</li>
          <li><strong>Strong downtrend:</strong> Use 80/20 levels</li>
          <li><strong>Sideways market:</strong> Use 70/30 levels</li>
        </ul>

        <h3>RSI Slope Analysis</h3>
        <p>
          The slope (angle) of RSI can indicate momentum strength:
        </p>
        <ul>
          <li><strong>Steep upward slope:</strong> Strong bullish momentum</li>
          <li><strong>Steep downward slope:</strong> Strong bearish momentum</li>
          <li><strong>Flat slope:</strong> Weak or consolidating momentum</li>
        </ul>

        <h3>Multiple Time Frame RSI</h3>
        <p>
          Check RSI across different timeframes for confirmation:
        </p>
        <ul>
          <li><strong>Higher timeframe:</strong> Overall trend direction</li>
          <li><strong>Lower timeframe:</strong> Entry/exit timing</li>
        </ul>

        <h2>Combining RSI with Other Indicators</h2>

        <h3>RSI + Moving Averages</h3>
        <p>
          Use moving averages for trend direction and RSI for timing:
        </p>
        <ul>
          <li>Only take long signals when price is above the 200-day MA</li>
          <li>Only take short signals when price is below the 200-day MA</li>
        </ul>

        <h3>RSI + Support/Resistance</h3>
        <p>
          RSI can help identify potential bounce levels:
        </p>
        <ul>
          <li>Look for oversold RSI readings near support levels</li>
          <li>Look for overbought RSI readings near resistance levels</li>
        </ul>

        <h3>RSI + Volume</h3>
        <p>
          Volume confirms RSI signals:
        </p>
        <ul>
          <li>High volume on RSI divergence = stronger signal</li>
          <li>Low volume on RSI extreme = weaker signal</li>
        </ul>

        <h2>RSI Period Selection</h2>

        <h3>Short-term Trading (Intraday/Scalping)</h3>
        <ul>
          <li><strong>9-period RSI:</strong> Very responsive, more signals</li>
          <li><strong>14-period RSI:</strong> Good balance of responsiveness and reliability</li>
        </ul>

        <h3>Swing Trading (Days to Weeks)</h3>
        <ul>
          <li><strong>14-period RSI:</strong> Standard setting, works well on daily charts</li>
          <li><strong>21-period RSI:</strong> Smoother, fewer false signals</li>
        </ul>

        <h3>Long-term Investing (Weeks to Months)</h3>
        <ul>
          <li><strong>21-period RSI:</strong> Reduces noise, focuses on major moves</li>
          <li><strong>28-period RSI:</strong> Very smooth, monthly perspective</li>
        </ul>

        <h2>Common RSI Mistakes to Avoid</h2>

        <h3>1. Trading Every Signal</h3>
        <p>
          Not every overbought/oversold reading leads to a reversal. Use additional confirmation from price action, volume, or other indicators.
        </p>

        <h3>2. Ignoring the Trend</h3>
        <p>
          RSI works best in ranging markets. In strong trends, securities can stay overbought/oversold for extended periods.
        </p>

        <h3>3. Using RSI in Isolation</h3>
        <p>
          RSI is most effective when combined with other analysis tools. Don't rely on it as your only decision-making factor.
        </p>

        <h3>4. Over-optimizing Levels</h3>
        <p>
          While 70/30 are standard levels, don't constantly adjust them based on hindsight. Stick to a consistent approach.
        </p>

        <h2>RSI in Different Market Conditions</h2>

        <h3>Trending Markets</h3>
        <p>
          In strong trends, RSI can stay overbought/oversold for long periods. Use dynamic levels and focus on divergences rather than absolute levels.
        </p>

        <h3>Ranging Markets</h3>
        <p>
          RSI excels in sideways markets. The 70/30 levels work well for identifying potential reversal points.
        </p>

        <h3>Volatile Markets</h3>
        <p>
          During high volatility, RSI can reach extreme levels quickly. Consider using wider overbought/oversold thresholds (75/25).
        </p>

        <h2>Risk Management with RSI</h2>

        <h3>Stop Loss Placement</h3>
        <ul>
          <li><strong>After oversold signal:</strong> Place stop below recent swing low</li>
          <li><strong>After overbought signal:</strong> Place stop above recent swing high</li>
          <li><strong>Percentage stops:</strong> 1-2% below entry for short-term trades</li>
        </ul>

        <h3>Position Sizing</h3>
        <p>
          Adjust position size based on RSI strength:
        </p>
        <ul>
          <li><strong>Strong signals:</strong> RSI near 20 or 80 with divergence</li>
          <li><strong>Weak signals:</strong> RSI moderately overbought/oversold</li>
        </ul>

        <h2>Conclusion</h2>

        <p>
          The Relative Strength Index is a powerful tool that every trader should have in their arsenal. It provides valuable insights into momentum, helps identify potential reversal points, and can confirm trend strength. While it's not infallible, when used properly with other technical analysis tools, RSI can significantly improve your trading decisions.
        </p>

        <p>
          Remember that RSI works best when you understand its limitations and use it as part of a comprehensive trading strategy. Practice identifying divergences, testing different periods, and combining RSI with other indicators to develop a robust approach that works for your trading style.
        </p>

        <p>
          Start with the standard 14-period RSI and 70/30 levels, then experiment to find what works best for your markets and timeframe. With experience, you'll learn to read RSI like a pro and use it to gain an edge in your trading.
        </p>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
interface Props {
  title: string
  date: string
  category: string
  tags: string[]
  image?: string
}

const props = withDefaults(defineProps<Props>(), {
  image: ''
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<style scoped>
:root {
  --accent1: #7aa2f7;
  --accent2: #bb9af7;
  --accent3: #7dcfff;
  --text1: #c0caf5;
  --text2: #a9b1d6;
  --text3: #222222;
  --base1: #1a1b26;
  --base2: #24283b;
  --base3: #414868;
  --base4: #16161e;
  --positive: #9ece6a;
  --negative: #f7768e;
}

.blog-post {
  max-width: 900px;
  margin: 0 auto;
  background: rgba(36, 40, 59, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(65, 72, 104, 0.3);
  border-radius: 6px;
  padding: 3rem;
  color: var(--brand-text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  position: relative;
  overflow: hidden;
}

.post-header {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--base3);
}

.post-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.post-category {
  background-color: var(--brand-gradient-start);
  color: var(--base1);
  padding: 0.3rem 0.8rem;
  border-radius: 3px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-size: 0.8rem;
}

.post-date {
  color: var(--brand-text-secondary);
}

.post-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--brand-text-primary);
  margin: 0 0 1rem 0;
  line-height: 1.2;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background-color: var(--base3);
  color: var(--brand-text-secondary);
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.post-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.post-image {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.post-image-content {
  width: 100%;
  height: auto;
  display: block;
}

.post-body {
  font-size: 1.1rem;
  color: var(--brand-text-primary);
}

.post-body h2 {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--brand-gradient-start);
  margin: 2rem 0 1rem 0;
}

.post-body h3 {
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--brand-text-primary);
  margin: 1.5rem 0 0.5rem 0;
}

.post-body h4 {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--brand-text-secondary);
  margin: 1.2rem 0 0.5rem 0;
}

.post-body p {
  margin-bottom: 1.5rem;
  color: var(--brand-text-secondary);
}

.post-body ul {
  margin: 1rem 0 1.5rem 1.5rem;
  color: var(--brand-text-secondary);
}

.post-body li {
  margin-bottom: 0.5rem;
}

.post-body strong {
  color: var(--brand-text-primary);
  font-weight: 600;
}

@media (max-width: 768px) {
  .blog-post {
    margin: 0 1rem;
    padding: 2rem 1.5rem;
    border-radius: 12px;
  }

  .post-title {
    font-size: 2rem;
  }

  .post-body {
    font-size: 1rem;
  }

  .post-body h2 {
    font-size: 1.5rem;
  }

  .post-body h3 {
    font-size: 1.2rem;
  }
}
</style>