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
          Volume analysis is often called the "forgotten indicator" in technical analysis, yet it's one of the most powerful tools for confirming price movements and understanding market participation. While price tells you what happened, volume tells you who was involved and how strongly they participated. Understanding volume can help you distinguish between meaningful price moves and market noise, identify potential reversals, and confirm the strength of trends. This comprehensive guide will teach you how to master volume analysis and incorporate it into your trading strategy.
        </p>

        <h2>What is Volume?</h2>

        <p>
          Volume represents the total number of shares or contracts traded during a specific time period. It measures market participation and liquidity, showing how actively buyers and sellers are engaging with a security.
        </p>

        <p>
          <strong>Key Concept:</strong> Price is the result of the battle between supply and demand, and volume shows the intensity of that battle. High volume on price moves indicates strong conviction, while low volume suggests weak participation.
        </p>

        <h2>Types of Volume</h2>

        <h3>Tick Volume</h3>
        <p>
          The most basic form of volume - simply counts the number of price changes (ticks) during a period. This is what most charting platforms display as "volume."
        </p>

        <h3>Share/Contract Volume</h3>
        <p>
          The actual number of shares or contracts traded. More accurate than tick volume but requires access to time and sales data.
        </p>

        <h3>Dollar Volume</h3>
        <p>
          Total dollar value traded (price × volume). Useful for comparing activity across different price levels.
        </p>

        <h2>Volume and Price Relationship</h2>

        <h3>Volume Confirms Price Trends</h3>
        <p>
          <strong>High Volume + Price Increase:</strong> Strong bullish move - buyers are aggressive
        </p>
        <p>
          <strong>High Volume + Price Decrease:</strong> Strong bearish move - sellers are aggressive
        </p>
        <p>
          <strong>Low Volume + Price Movement:</strong> Weak move - may reverse or be insignificant
        </p>

        <h3>Volume and Breakouts</h3>
        <p>
          Breakouts on high volume are more likely to be sustained:
        </p>
        <ul>
          <li><strong>High volume breakout:</strong> Strong conviction, likely to continue</li>
          <li><strong>Low volume breakout:</strong> Weak participation, likely to fail</li>
        </ul>

        <h3>Volume at Peaks and Valleys</h3>
        <p>
          <strong>High volume at peaks:</strong> Strong selling pressure, potential reversal
        </p>
        <p>
          <strong>High volume at valleys:</strong> Strong buying pressure, potential reversal
        </p>
        <p>
          <strong>Low volume at extremes:</strong> May indicate continuation rather than reversal
        </p>

        <h2>Volume Indicators</h2>

        <h3>On-Balance Volume (OBV)</h3>
        <p>
          <strong>Calculation:</strong> Cumulative volume that adds volume on up days and subtracts on down days
        </p>
        <p>
          <strong>Interpretation:</strong>
        </p>
        <ul>
          <li>Rising OBV = Accumulation (buying pressure)</li>
          <li>Falling OBV = Distribution (selling pressure)</li>
          <li>OBV divergences often signal reversals</li>
        </ul>

        <h3>Volume Weighted Average Price (VWAP)</h3>
        <p>
          <strong>Calculation:</strong> Average price weighted by volume throughout the day
        </p>
        <p>
          <strong>Uses:</strong>
        </p>
        <ul>
          <li>Institutional trading benchmark</li>
          <li>Support/resistance levels</li>
          <li>Mean reversion trading</li>
        </ul>

        <h3>Volume Oscillators</h3>
        <p>
          <strong>Chaikin Money Flow (CMF):</strong> Combines price and volume to measure buying/selling pressure
        </p>
        <p>
          <strong>Volume Rate of Change:</strong> Measures volume momentum
        </p>

        <h3>Accumulation/Distribution Line</h3>
        <p>
          <strong>Formula:</strong> ((Close - Low) - (High - Close)) / (High - Low) × Volume
        </p>
        <p>
          <strong>Interpretation:</strong> Rising line = accumulation, falling line = distribution
        </p>

        <h2>Volume Patterns and Signals</h2>

        <h3>Volume Spikes</h3>
        <p>
          Sudden increases in volume often signal important events:
        </p>
        <ul>
          <li><strong>Breakout volume:</strong> Confirms validity of price breakout</li>
          <li><strong>Reversal volume:</strong> High volume at turning points</li>
          <li><strong>News volume:</strong> Often precedes or follows significant news</li>
        </ul>

        <h3>Volume Climax</h3>
        <p>
          Extremely high volume that often marks the end of a trend:
        </p>
        <ul>
          <li><strong>Bullish climax:</strong> High volume at market top</li>
          <li><strong>Bearish climax:</strong> High volume at market bottom</li>
          <li><strong>Followed by:</strong> Often leads to consolidation or reversal</li>
        </ul>

        <h3>Drying Up Volume</h3>
        <p>
          Declining volume during a trend often signals weakening momentum:
        </p>
        <ul>
          <li><strong>Fading trend:</strong> Lower volume on each successive move</li>
          <li><strong>Potential reversal:</strong> When volume reaches very low levels</li>
        </ul>

        <h3>Volume Divergences</h3>
        <p>
          When volume and price move in opposite directions:
        </p>
        <ul>
          <li><strong>Bullish divergence:</strong> Price makes lower lows, volume makes higher lows</li>
          <li><strong>Bearish divergence:</strong> Price makes higher highs, volume makes lower highs</li>
          <li><strong>Signal:</strong> Potential reversal when confirmed by price action</li>
        </ul>

        <h2>Volume Analysis in Different Market Conditions</h2>

        <h3>Trending Markets</h3>
        <p>
          Volume should increase in the direction of the trend:
        </p>
        <ul>
          <li><strong>Uptrend:</strong> Higher volume on up days, lower on down days</li>
          <li><strong>Downtrend:</strong> Higher volume on down days, lower on up days</li>
          <li><strong>Volume expansion:</strong> Confirms trend continuation</li>
        </ul>

        <h3>Ranging Markets</h3>
        <p>
          Volume patterns in sideways markets:
        </p>
        <ul>
          <li><strong>Low overall volume:</strong> Indicates lack of conviction</li>
          <li><strong>Volume spikes:</strong> May signal potential breakout direction</li>
          <li><strong>Balanced volume:</strong> Neither buyers nor sellers dominant</li>
        </ul>

        <h3>Volatile Markets</h3>
        <p>
          High volume is normal in volatile conditions:
        </p>
        <ul>
          <li><strong>Extreme volume:</strong> May indicate capitulation or climax</li>
          <li><strong>Volume analysis:</strong> Focus on relative volume changes</li>
          <li><strong>Confirmation:</strong> Price moves need volume confirmation</li>
        </ul>

        <h2>Volume-Based Trading Strategies</h2>

        <h3>Volume Breakout Strategy</h3>
        <p>
          <strong>Setup:</strong> Price consolidates with declining volume
        </p>
        <p>
          <strong>Entry:</strong> Breakout on expanding volume
        </p>
        <p>
          <strong>Stop Loss:</strong> Below consolidation low
        </p>
        <p>
          <strong>Take Profit:</strong> Measure move equal to consolidation height
        </p>

        <h3>Volume Reversal Strategy</h3>
        <p>
          <strong>Setup:</strong> High volume at support/resistance
        </p>
        <p>
          <strong>Entry:</strong> Price reversal on high volume
        </p>
        <p>
          <strong>Confirmation:</strong> Candlestick reversal pattern
        </p>

        <h3>OBV Divergence Strategy</h3>
        <p>
          <strong>Setup:</strong> Price makes new high/low, OBV doesn't
        </p>
        <p>
          <strong>Entry:</strong> On price confirmation of reversal
        </p>
        <p>
          <strong>Risk:</strong> Divergences can persist in strong trends
        </p>

        <h3>VWAP Trading Strategy</h3>
        <p>
          <strong>Mean Reversion:</strong> Buy below VWAP, sell above VWAP
        </p>
        <p>
          <strong>Momentum:</strong> Breakouts above/below VWAP
        </p>
        <p>
          <strong>Institutional:</strong> VWAP often acts as support/resistance
        </p>

        <h2>Advanced Volume Techniques</h2>

        <h3>Volume Profile</h3>
        <p>
          Shows volume at each price level over time:
        </p>
        <ul>
          <li><strong>Point of Control (POC):</strong> Price level with highest volume</li>
          <li><strong>Value Area:</strong> 70% of volume concentration</li>
          <li><strong>High Volume Nodes:</strong> Key support/resistance areas</li>
        </ul>

        <h3>Time Segmented Volume (TSV)</h3>
        <p>
          OBV variant that uses intraday data for more precise signals
        </p>

        <h3>Volume-Price Trend (VPT)</h3>
        <p>
          Combines price change percentage with volume for trend analysis
        </p>

        <h3>Negative Volume Index (NVI)</h3>
        <p>
          Accumulates volume only on down days - tracks smart money
        </p>

        <h2>Common Volume Analysis Mistakes</h2>

        <h3>1. Ignoring Relative Volume</h3>
        <p>
          Absolute volume numbers mean little without context. Always compare current volume to historical averages.
        </p>

        <h3>2. Trading Without Price Confirmation</h3>
        <p>
          Volume analysis works best when combined with price action. Don't trade volume signals in isolation.
        </p>

        <h3>3. Over-relying on Single Volume Events</h3>
        <p>
          One high-volume day doesn't make a trend. Look for consistent volume patterns over time.
        </p>

        <h3>4. Confusing Cause and Effect</h3>
        <p>
          High volume often follows price moves, not precedes them. Be careful about assuming causation.
        </p>

        <h2>Volume Analysis Tools and Platforms</h2>

        <h3>Basic Tools</h3>
        <ul>
          <li><strong>Volume bars:</strong> Standard volume histogram</li>
          <li><strong>Volume moving averages:</strong> Smooth volume trends</li>
          <li><strong>Volume oscillators:</strong> Overbought/oversold volume levels</li>
        </ul>

        <h3>Advanced Tools</h3>
        <ul>
          <li><strong>Volume Profile:</strong> Professional volume analysis</li>
          <li><strong>Market Profile:</strong> Time-price-volume analysis</li>
          <li><strong>Order Flow:</strong> Real-time bid/ask volume</li>
        </ul>

        <h3>Free vs Premium</h3>
        <p>
          Basic volume analysis is available on most free platforms. Advanced tools like Volume Profile often require premium subscriptions.
        </p>

        <h2>Developing a Volume-Based Strategy</h2>

        <h3>Step 1: Define Your Style</h3>
        <p>
          Different trading styles use volume differently:
        </p>
        <ul>
          <li><strong>Day traders:</strong> Focus on intraday volume patterns</li>
          <li><strong>Swing traders:</strong> Use daily/weekly volume confirmation</li>
          <li><strong>Position traders:</strong> Look at longer-term volume trends</li>
        </ul>

        <h3>Step 2: Choose Your Tools</h3>
        <p>
          Start with basic volume bars and OBV, then add more complex indicators as you gain experience.
        </p>

        <h3>Step 3: Backtest Your Approach</h3>
        <p>
          Test volume strategies on historical data to understand their effectiveness in different market conditions.
        </p>

        <h3>Step 4: Combine with Other Analysis</h3>
        <p>
          Volume works best when combined with:
        </p>
        <ul>
          <li>Price action analysis</li>
          <li>Technical indicators</li>
          <li>Fundamental analysis</li>
        </ul>

        <h2>Conclusion</h2>

        <p>
          Volume analysis is the key to understanding market participation and conviction. While price shows you what happened, volume tells you how strongly market participants felt about those price moves. High volume confirms meaningful moves, while low volume suggests potential weakness or lack of conviction.
        </p>

        <p>
          Remember that volume analysis is most powerful when used as confirmation rather than the sole decision-making factor. Combine volume signals with price action, technical indicators, and sound risk management for the best results.
        </p>

        <p>
          Start by observing basic volume patterns on your charts, then gradually incorporate volume indicators like OBV and VWAP. With practice, you'll develop an intuitive sense of how volume influences price action and use this knowledge to improve your trading decisions. Volume doesn't lie - it shows the true participation behind every price move.
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