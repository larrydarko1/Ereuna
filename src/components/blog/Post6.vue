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
          Bollinger Bands are one of the most powerful and versatile technical analysis tools available to traders. Developed by John Bollinger in the 1980s, this indicator combines a simple moving average with standard deviation bands to create a dynamic envelope around price action. Understanding Bollinger Bands can help traders identify volatility, spot potential reversals, and time entries with remarkable accuracy. This comprehensive guide will teach you everything you need to know about mastering Bollinger Bands.
        </p>

        <h2>What Are Bollinger Bands?</h2>

        <p>
          Bollinger Bands consist of three lines plotted on a price chart:
        </p>

        <ul>
          <li><strong>Middle Band:</strong> A simple moving average (typically 20-period)</li>
          <li><strong>Upper Band:</strong> Middle band + (standard deviation × multiplier)</li>
          <li><strong>Lower Band:</strong> Middle band - (standard deviation × multiplier)</li>
        </ul>

        <p>
          The bands expand and contract based on market volatility. During periods of high volatility, the bands widen. During low volatility periods, they narrow. This dynamic nature makes Bollinger Bands particularly effective for identifying changing market conditions.
        </p>

        <h2>How Bollinger Bands Are Calculated</h2>

        <p>
          The standard Bollinger Bands use these parameters:
        </p>

        <ul>
          <li><strong>Period:</strong> 20 (length of the moving average)</li>
          <li><strong>Standard Deviation:</strong> 2 (multiplier for upper/lower bands)</li>
        </ul>

        <h3>Calculation Steps:</h3>
        <ol>
          <li><strong>Middle Band:</strong> 20-period Simple Moving Average</li>
          <li><strong>Standard Deviation:</strong> Calculate the standard deviation of closing prices over 20 periods</li>
          <li><strong>Upper Band:</strong> Middle Band + (2 × Standard Deviation)</li>
          <li><strong>Lower Band:</strong> Middle Band - (2 × Standard Deviation)</li>
        </ol>

        <p>
          While 20,2 is the standard setting, traders often adjust these parameters:
        </p>
        <ul>
          <li><strong>Shorter periods (10-15):</strong> More responsive for short-term trading</li>
          <li><strong>Longer periods (25-30):</strong> Smoother for longer-term analysis</li>
          <li><strong>Higher multipliers (2.5-3):</strong> Wider bands for volatile markets</li>
          <li><strong>Lower multipliers (1.5-1.8):</strong> Narrower bands for ranging markets</li>
        </ul>

        <h2>Understanding Bollinger Band Components</h2>

        <h3>The Middle Band (Moving Average)</h3>
        <p>
          The middle band is simply a 20-period simple moving average. It acts as dynamic support/resistance and provides the baseline for the bands. Price interaction with the middle band often signals trend strength.
        </p>

        <h3>The Upper and Lower Bands</h3>
        <p>
          The upper and lower bands represent the expected trading range based on recent volatility. Approximately 95% of price action should occur within these bands (assuming 2 standard deviations).
        </p>

        <p>
          <strong>Upper Band:</strong> Acts as resistance during uptrends
        </p>
        <p>
          <strong>Lower Band:</strong> Acts as support during downtrends
        </p>

        <h3>Band Width (Volatility)</h3>
        <p>
          The distance between the upper and lower bands indicates market volatility:
        </p>
        <ul>
          <li><strong>Expanding bands:</strong> Increasing volatility</li>
          <li><strong>Contracting bands:</strong> Decreasing volatility (potential breakout)</li>
          <li><strong>Parallel bands:</strong> Steady volatility</li>
        </ul>

        <h2>Core Bollinger Band Strategies</h2>

        <h3>1. Bollinger Band Squeeze</h3>
        <p>
          The squeeze occurs when bands contract to their narrowest point, indicating low volatility. This often precedes a significant price move.
        </p>

        <p>
          <strong>Setup:</strong> Bands squeeze together over several periods
        </p>
        <p>
          <strong>Signal:</strong> Wait for bands to expand (squeeze release)
        </p>
        <p>
          <strong>Entry:</strong> Enter in the direction of the breakout
        </p>
        <p>
          <strong>Stop Loss:</strong> Place below/above the squeeze area
        </p>

        <h3>2. Mean Reversion (Bounce) Strategy</h3>
        <p>
          Price tends to return to the middle band after touching the outer bands.
        </p>

        <p>
          <strong>Buy Signal:</strong> Price touches or goes below lower band
        </p>
        <p>
          <strong>Sell Signal:</strong> Price touches or goes above upper band
        </p>
        <p>
          <strong>Exit:</strong> When price reaches the middle band or opposite band
        </p>

        <h3>3. Band Walk Strategy</h3>
        <p>
          During strong trends, price "walks" along one band.
        </p>

        <p>
          <strong>Bullish Band Walk:</strong> Price hugs the upper band in an uptrend
        </p>
        <p>
          <strong>Bearish Band Walk:</strong> Price hugs the lower band in a downtrend
        </p>
        <p>
          <strong>Entry:</strong> Buy/sell when price pulls back to the middle band during a band walk
        </p>

        <h3>4. Middle Band Crossover</h3>
        <p>
          The middle band acts as dynamic support/resistance.
        </p>

        <p>
          <strong>Buy:</strong> Price breaks above middle band (bullish trend)
        </p>
        <p>
          <strong>Sell:</strong> Price breaks below middle band (bearish trend)
        </p>
        <p>
          <strong>Confirmation:</strong> Use volume or other indicators
        </p>

        <h2>Advanced Bollinger Band Techniques</h2>

        <h3>Bollinger Band %B</h3>
        <p>
          %B measures where the current price is relative to the bands:
        </p>
        <p>
          <strong>Formula:</strong> %B = (Price - Lower Band) / (Upper Band - Lower Band)
        </p>

        <p>
          <strong>Interpretation:</strong>
        </p>
        <ul>
          <li>%B > 1.0: Price above upper band</li>
          <li>%B = 0.5: Price at middle band</li>
          <li>%B < 0.0: Price below lower band</li>
        </ul>

        <h3>Bollinger Band Width (BBW)</h3>
        <p>
          BBW measures the relative width of the bands:
        </p>
        <p>
          <strong>Formula:</strong> BBW = (Upper Band - Lower Band) / Middle Band
        </p>

        <p>
          <strong>Uses:</strong>
        </p>
        <ul>
          <li>Identify periods of low/high volatility</li>
          <li>Spot potential breakouts (low BBW)</li>
          <li>Confirm trend strength (high BBW)</li>
        </ul>

        <h3>Double Bollinger Bands</h3>
        <p>
          Using two sets of Bollinger Bands with different periods:
        </p>
        <ul>
          <li><strong>Inner bands:</strong> 20-period, 1 SD (more responsive)</li>
          <li><strong>Outer bands:</strong> 20-period, 2 SD (standard)</li>
        </ul>

        <h3>Bollinger Bands + RSI</h3>
        <p>
          Combine with RSI for stronger signals:
        </p>
        <ul>
          <li>Buy: Price at lower band + RSI oversold</li>
          <li>Sell: Price at upper band + RSI overbought</li>
        </ul>

        <h3>Bollinger Bands + MACD</h3>
        <p>
          Use MACD to confirm Bollinger Band signals:
        </p>
        <ul>
          <li>MACD bullish crossover + squeeze release = Strong buy</li>
          <li>MACD bearish crossover + squeeze release = Strong sell</li>
        </ul>

        <h2>Bollinger Bands in Different Market Conditions</h2>

        <h3>Trending Markets</h3>
        <p>
          In strong trends, price often hugs one band while the other band acts as support/resistance.
        </p>
        <ul>
          <li><strong>Uptrend:</strong> Price walks upper band, lower band provides support</li>
          <li><strong>Downtrend:</strong> Price walks lower band, upper band provides resistance</li>
          <li><strong>Strategy:</strong> Buy dips to middle band in uptrends, sell rallies to middle band in downtrends</li>
        </ul>

        <h3>Ranging Markets</h3>
        <p>
          In sideways markets, bands contract and price oscillates between upper and lower bands.
        </p>
        <ul>
          <li><strong>Strategy:</strong> Mean reversion - buy lower band, sell upper band</li>
          <li><strong>Caution:</strong> Be prepared for potential breakouts</li>
        </ul>

        <h3>Volatile Markets</h3>
        <p>
          Bands expand significantly during high volatility periods.
        </p>
        <ul>
          <li><strong>Strategy:</strong> Wait for bands to stabilize before entering</li>
          <li><strong>Risk:</strong> Wider stops needed due to increased volatility</li>
        </ul>

        <h2>Common Bollinger Band Mistakes</h2>

        <h3>1. Trading Every Touch</h3>
        <p>
          Not every touch of the bands leads to a reversal. Use additional confirmation from price action, volume, or other indicators.
        </p>

        <h3>2. Ignoring the Trend</h3>
        <p>
          Bollinger Bands work best when aligned with the prevailing trend. Don't fight the trend by buying every lower band touch in a downtrend.
        </p>

        <h3>3. Poor Timing on Squeezes</h3>
        <p>
          Entering immediately when bands start expanding can be premature. Wait for a clear directional move.
        </p>

        <h3>4. Using Fixed Settings</h3>
        <p>
          Different markets and timeframes require different settings. What works on daily charts may not work on 5-minute charts.
        </p>

        <h2>Settings for Different Trading Styles</h2>

        <h3>Scalping (1-5 minute charts)</h3>
        <ul>
          <li><strong>Period:</strong> 10-15</li>
          <li><strong>Deviation:</strong> 1.5-2.0</li>
          <li><strong>Focus:</strong> Quick mean reversion plays</li>
        </ul>

        <h3>Day Trading (15-60 minute charts)</h3>
        <ul>
          <li><strong>Period:</strong> 15-20</li>
          <li><strong>Deviation:</strong> 2.0</li>
          <li><strong>Focus:</strong> Intraday range and momentum</li>
        </ul>

        <h3>Swing Trading (Daily charts)</h3>
        <ul>
          <li><strong>Period:</strong> 20</li>
          <li><strong>Deviation:</strong> 2.0</li>
          <li><strong>Focus:</strong> Trend continuation and reversals</li>
        </ul>

        <h3>Position Trading (Weekly charts)</h3>
        <ul>
          <li><strong>Period:</strong> 20-25</li>
          <li><strong>Deviation:</strong> 2.0-2.5</li>
          <li><strong>Focus:</strong> Major trend identification</li>
        </ul>

        <h2>Risk Management with Bollinger Bands</h2>

        <h3>Stop Loss Placement</h3>
        <ul>
          <li><strong>Outside bands:</strong> Place stops beyond the outer bands</li>
          <li><strong>Middle band:</strong> Use middle band as trailing stop</li>
          <li><strong>Percentage stops:</strong> 1-2% for short-term, 3-5% for longer-term</li>
        </ul>

        <h3>Position Sizing</h3>
        <p>
          Adjust position size based on volatility:
        </p>
        <ul>
          <li><strong>Narrow bands:</strong> Smaller positions (high probability but smaller moves)</li>
          <li><strong>Wide bands:</strong> Larger positions (lower probability but larger moves)</li>
        </ul>

        <h3>Take Profit Targets</h3>
        <ul>
          <li><strong>Opposite band:</strong> Target the opposite band</li>
          <li><strong>Middle band:</strong> Partial profit at middle band</li>
          <li><strong>Multiple targets:</strong> Scale out at different levels</li>
        </ul>

        <h2>Advanced Bollinger Band Patterns</h2>

        <h3>W-Bottom Pattern</h3>
        <p>
          Price touches lower band twice, forming a "W" shape. Second touch often leads to strong upward move.
        </p>

        <h3>M-Top Pattern</h3>
        <p>
          Price touches upper band twice, forming an "M" shape. Second touch often leads to strong downward move.
        </p>

        <h3>Band Expansion Breakout</h3>
        <p>
          After a squeeze, price breaks out with expanding bands. Enter in direction of breakout with volume confirmation.
        </p>

        <h3>Band Contraction Setup</h3>
        <p>
          Bands contract while price moves sideways. Anticipate a breakout in the direction of the prior trend.
        </p>

        <h2>Conclusion</h2>

        <p>
          Bollinger Bands are a versatile and powerful tool that every serious trader should master. Their ability to adapt to changing market conditions makes them invaluable for identifying volatility, spotting potential reversals, and timing entries with precision.
        </p>

        <p>
          While Bollinger Bands are not a standalone trading system, when combined with other technical analysis tools and sound risk management, they can significantly improve your trading performance. Remember that no indicator works perfectly in all market conditions, so always use Bollinger Bands as part of a comprehensive trading strategy.
        </p>

        <p>
          Start with the standard 20,2 settings and practice identifying the different patterns and signals. With experience, you'll develop an intuitive sense of how price interacts with the bands and use this knowledge to gain a significant edge in your trading. The key is consistency, patience, and always prioritizing risk management over chasing signals.
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

.post-body ol {
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