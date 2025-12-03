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
          The Moving Average Convergence Divergence (MACD) is one of the most powerful and widely used technical indicators in trading. Created by Gerald Appel in the 1970s, MACD combines trend-following moving averages with momentum oscillators to provide traders with multiple signals for identifying trend changes, momentum shifts, and potential entry/exit points. This comprehensive guide will teach you how to master MACD and incorporate it into your trading strategy.
        </p>

        <h2>What is MACD?</h2>

        <p>
          MACD is a trend-following momentum indicator that shows the relationship between two moving averages of a security's price. It consists of three main components:
        </p>

        <ul>
          <li><strong>MACD Line:</strong> The difference between the fast and slow exponential moving averages</li>
          <li><strong>Signal Line:</strong> An exponential moving average of the MACD line</li>
          <li><strong>Histogram:</strong> The difference between the MACD line and signal line</li>
        </ul>

        <p>
          MACD is designed to reveal changes in the strength, direction, momentum, and duration of a trend in a stock's price. It's particularly effective in trending markets and can help traders identify potential reversals before they become obvious in price action.
        </p>

        <h2>How MACD is Calculated</h2>

        <p>
          The standard MACD calculation uses three exponential moving averages:
        </p>

        <h3>Components:</h3>
        <ul>
          <li><strong>Fast EMA:</strong> 12-period exponential moving average</li>
          <li><strong>Slow EMA:</strong> 26-period exponential moving average</li>
          <li><strong>Signal Line:</strong> 9-period EMA of the MACD line</li>
        </ul>

        <h3>Calculation Steps:</h3>
        <ol>
          <li><strong>Calculate MACD Line:</strong> Fast EMA (12) - Slow EMA (26)</li>
          <li><strong>Calculate Signal Line:</strong> 9-period EMA of the MACD Line</li>
          <li><strong>Calculate Histogram:</strong> MACD Line - Signal Line</li>
        </ol>

        <p>
          While 12-26-9 is the standard setting, traders often adjust these periods based on their trading style and timeframe. Shorter periods (like 5-13-5) are more responsive for short-term trading, while longer periods (like 19-39-9) are smoother for longer-term analysis.
        </p>

        <h2>MACD Components Explained</h2>

        <h3>The MACD Line</h3>
        <p>
          The MACD line represents the difference between the fast and slow EMAs. When the MACD line is above zero, it indicates bullish momentum (fast EMA above slow EMA). When below zero, it indicates bearish momentum (fast EMA below slow EMA).
        </p>

        <h3>The Signal Line</h3>
        <p>
          The signal line is a 9-period EMA of the MACD line. It acts as a trigger for buy and sell signals when it crosses the MACD line. The signal line helps filter out market noise and provides more reliable signals.
        </p>

        <h3>The Histogram</h3>
        <p>
          The histogram represents the difference between the MACD line and signal line. It provides a visual representation of momentum acceleration or deceleration. When the histogram bars grow longer, momentum is increasing. When they grow shorter, momentum is decreasing.
        </p>

        <h2>MACD Trading Signals</h2>

        <h3>1. Signal Line Crossovers</h3>
        <p>
          The most basic MACD signal occurs when the MACD line crosses the signal line.
        </p>

        <p>
          <strong>Bullish Signal (Buy):</strong> MACD line crosses above the signal line
        </p>
        <p>
          <strong>Bearish Signal (Sell):</strong> MACD line crosses below the signal line
        </p>

        <p>
          These crossovers can occur above or below the zero line, providing additional context:
        </p>
        <ul>
          <li><strong>Above zero:</strong> Bullish momentum in an uptrend</li>
          <li><strong>Below zero:</strong> Bearish momentum in a downtrend</li>
        </ul>

        <h3>2. Zero Line Crossovers</h3>
        <p>
          When the MACD line crosses the zero line, it indicates a major shift in momentum.
        </p>

        <p>
          <strong>Bullish Zero Crossover:</strong> MACD line crosses above zero (from negative to positive)
        </p>
        <p>
          <strong>Bearish Zero Crossover:</strong> MACD line crosses below zero (from positive to negative)
        </p>

        <p>
          Zero line crossovers are stronger signals than signal line crossovers and often indicate the start of a new trend.
        </p>

        <h3>3. Histogram Signals</h3>
        <p>
          The histogram provides additional insight into momentum changes:
        </p>

        <p>
          <strong>Divergence:</strong> When the histogram bars start shrinking while price continues in the same direction, it may signal weakening momentum.
        </p>

        <p>
          <strong>Convergence:</strong> When histogram bars start growing, it indicates strengthening momentum.
        </p>

        <h3>4. MACD Divergences</h3>
        <p>
          Divergences occur when MACD and price move in opposite directions:
        </p>

        <h4>Bullish Divergence</h4>
        <ul>
          <li>Price makes lower lows</li>
          <li>MACD makes higher lows</li>
          <li>Signal: Potential upward reversal</li>
        </ul>

        <h4>Bearish Divergence</h4>
        <ul>
          <li>Price makes higher highs</li>
          <li>MACD makes lower highs</li>
          <li>Signal: Potential downward reversal</li>
        </ul>

        <h2>MACD Trading Strategies</h2>

        <h3>Basic MACD Strategy</h3>
        <p>
          <strong>Entry:</strong> Buy when MACD crosses above signal line, sell when MACD crosses below signal line
        </p>
        <p>
          <strong>Exit:</strong> Opposite crossover or when MACD crosses zero line
        </p>
        <p>
          <strong>Risk Management:</strong> Stop loss below recent swing low for longs, above swing high for shorts
        </p>

        <h3>MACD + Moving Averages</h3>
        <p>
          Combine MACD with trend-following moving averages:
        </p>
        <ul>
          <li>Only take long signals when price is above 200-day MA</li>
          <li>Only take short signals when price is below 200-day MA</li>
          <li>Use 50-day MA as additional confirmation</li>
        </ul>

        <h3>MACD Histogram Strategy</h3>
        <p>
          Trade based on histogram behavior:
        </p>
        <ul>
          <li><strong>Buy:</strong> When histogram starts expanding after contraction</li>
          <li><strong>Sell:</strong> When histogram starts contracting after expansion</li>
          <li><strong>Filter:</strong> Only trade in direction of prevailing trend</li>
        </ul>

        <h3>MACD Divergence Strategy</h3>
        <p>
          <strong>Setup:</strong> Identify divergence between price and MACD
        </p>
        <p>
          <strong>Entry:</strong> Enter on signal line crossover in direction of divergence
        </p>
        <p>
          <strong>Confirmation:</strong> Wait for price action confirmation (break of trend line, candlestick pattern)
        </p>

        <h2>MACD Settings for Different Timeframes</h2>

        <h3>Scalping (1-5 minute charts)</h3>
        <ul>
          <li><strong>Fast:</strong> 5-period EMA</li>
          <li><strong>Slow:</strong> 13-period EMA</li>
          <li><strong>Signal:</strong> 5-period EMA</li>
        </ul>

        <h3>Day Trading (15-60 minute charts)</h3>
        <ul>
          <li><strong>Fast:</strong> 8-period EMA</li>
          <li><strong>Slow:</strong> 17-period EMA</li>
          <li><strong>Signal:</strong> 9-period EMA</li>
        </ul>

        <h3>Swing Trading (Daily charts)</h3>
        <ul>
          <li><strong>Fast:</strong> 12-period EMA</li>
          <li><strong>Slow:</strong> 26-period EMA</li>
          <li><strong>Signal:</strong> 9-period EMA</li>
        </ul>

        <h3>Long-term Investing (Weekly charts)</h3>
        <ul>
          <li><strong>Fast:</strong> 19-period EMA</li>
          <li><strong>Slow:</strong> 39-period EMA</li>
          <li><strong>Signal:</strong> 9-period EMA</li>
        </ul>

        <h2>Combining MACD with Other Indicators</h2>

        <h3>MACD + RSI</h3>
        <p>
          Use RSI to confirm MACD signals:
        </p>
        <ul>
          <li>MACD bullish crossover + RSI oversold = Strong buy signal</li>
          <li>MACD bearish crossover + RSI overbought = Strong sell signal</li>
        </ul>

        <h3>MACD + Bollinger Bands</h3>
        <p>
          Look for MACD signals at Bollinger Band extremes:
        </p>
        <ul>
          <li>MACD bullish signal near lower Bollinger Band</li>
          <li>MACD bearish signal near upper Bollinger Band</li>
        </ul>

        <h3>MACD + Volume</h3>
        <p>
          Volume confirms MACD signals:
        </p>
        <ul>
          <li>High volume on MACD crossover = stronger signal</li>
          <li>Low volume divergences may be false signals</li>
        </ul>

        <h2>Common MACD Mistakes</h2>

        <h3>1. Trading Every Signal</h3>
        <p>
          Not every crossover leads to a profitable trade. Use additional filters and wait for confirmation.
        </p>

        <h3>2. Ignoring the Trend</h3>
        <p>
          MACD works best in trending markets. In choppy, sideways markets, it can generate many false signals.
        </p>

        <h3>3. Over-relying on Divergences</h3>
        <p>
          Divergences are powerful but not foolproof. They work best when combined with other analysis.
        </p>

        <h3>4. Not Adjusting for Market Conditions</h3>
        <p>
          Different market conditions require different MACD settings. What works in a bull market may not work in a bear market.
        </p>

        <h2>MACD in Different Market Conditions</h2>

        <h3>Trending Markets</h3>
        <p>
          MACD excels in strong trends. Zero line crossovers and divergences provide reliable signals. Use standard settings and focus on the overall trend direction.
        </p>

        <h3>Sideways/Ranging Markets</h3>
        <p>
          MACD can be noisy in choppy markets. Consider using shorter periods or combining with other indicators. Signal line crossovers may be less reliable.
        </p>

        <h3>Volatile Markets</h3>
        <p>
          During high volatility, MACD signals can come quickly. Use wider stops and consider reducing position sizes. Focus on major signals rather than every crossover.
        </p>

        <h2>Risk Management with MACD</h2>

        <h3>Stop Loss Strategies</h3>
        <ul>
          <li><strong>Percentage stops:</strong> 1-2% below entry for short-term trades</li>
          <li><strong>Support/resistance stops:</strong> Place stops below recent support levels</li>
          <li><strong>MACD-based stops:</strong> Exit when MACD crosses back against your position</li>
        </ul>

        <h3>Position Sizing</h3>
        <p>
          Adjust position size based on signal strength:
        </p>
        <ul>
          <li><strong>Strong signals:</strong> Zero line crossover with divergence</li>
          <li><strong>Moderate signals:</strong> Signal line crossover above/below zero</li>
          <li><strong>Weak signals:</strong> Signal line crossover near zero line</li>
        </ul>

        <h3>Take Profit Strategies</h3>
        <ul>
          <li><strong>Opposite crossover:</strong> Exit when MACD crosses back</li>
          <li><strong>Zero line exit:</strong> Exit when MACD reaches zero line</li>
          <li><strong>Trailing stops:</strong> Move stops based on MACD levels</li>
        </ul>

        <h2>Advanced MACD Techniques</h2>

        <h3>MACD Histogram Patterns</h3>
        <p>
          Analyze histogram patterns for momentum insights:
        </p>
        <ul>
          <li><strong>Decreasing histogram:</strong> Momentum slowing</li>
          <li><strong>Increasing histogram:</strong> Momentum building</li>
          <li><strong>Histogram flip:</strong> Potential trend change</li>
        </ul>

        <h3>MACD Multiple Time Frame Analysis</h3>
        <p>
          Check MACD across different timeframes:
        </p>
        <ul>
          <li><strong>Higher timeframe:</strong> Overall trend and major signals</li>
          <li><strong>Lower timeframe:</strong> Precise entry timing</li>
        </ul>

        <h3>MACD Squeeze</h3>
        <p>
          When MACD lines converge tightly, it may signal an impending big move. Look for expansion in the histogram as an entry signal.
        </p>

        <h2>Conclusion</h2>

        <p>
          The Moving Average Convergence Divergence is a versatile and powerful indicator that can enhance any trading strategy. Its combination of trend-following and momentum components makes it invaluable for identifying trend changes, momentum shifts, and potential reversal points.
        </p>

        <p>
          While MACD is not infallible, when used properly with other technical analysis tools and sound risk management, it can significantly improve your trading performance. Remember that no indicator works perfectly in all market conditions, so always combine MACD with price action analysis and other confirming indicators.
        </p>

        <p>
          Start with the standard 12-26-9 settings and practice identifying the different signals. With experience, you'll learn to read MACD patterns like a pro and use them to gain a significant edge in your trading. The key is consistency, patience, and always prioritizing risk management over chasing signals.
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
  color: var(--text1);
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
  background-color: var(--accent1);
  color: var(--base1);
  padding: 0.3rem 0.8rem;
  border-radius: 3px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-size: 0.8rem;
}

.post-date {
  color: var(--text2);
}

.post-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text1);
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
  color: var(--text2);
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
  color: var(--text1);
}

.post-body h2 {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--accent1);
  margin: 2rem 0 1rem 0;
}

.post-body h3 {
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--text1);
  margin: 1.5rem 0 0.5rem 0;
}

.post-body h4 {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text2);
  margin: 1.2rem 0 0.5rem 0;
}

.post-body p {
  margin-bottom: 1.5rem;
  color: var(--text2);
}

.post-body ul {
  margin: 1rem 0 1.5rem 1.5rem;
  color: var(--text2);
}

.post-body li {
  margin-bottom: 0.5rem;
}

.post-body ol {
  margin: 1rem 0 1.5rem 1.5rem;
  color: var(--text2);
}

.post-body li {
  margin-bottom: 0.5rem;
}

.post-body strong {
  color: var(--text1);
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