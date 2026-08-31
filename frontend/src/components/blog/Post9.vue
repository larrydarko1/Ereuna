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
          Fibonacci retracements are among the most powerful and widely used technical analysis tools in trading. Based on the famous Fibonacci sequence discovered by Italian mathematician Leonardo Fibonacci in the 13th century, these retracement levels help traders identify potential support and resistance areas where price is likely to reverse or consolidate. Understanding Fibonacci retracements can significantly improve your ability to time entries, set stop losses, and identify profit targets. This comprehensive guide will teach you how to master Fibonacci analysis and incorporate it into your trading strategy.
        </p>

        <h2>The Fibonacci Sequence and Golden Ratio</h2>

        <p>
          The Fibonacci sequence is a series of numbers where each number is the sum of the two preceding ones: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, and so on.
        </p>

        <p>
          The key ratio in this sequence is the <strong>Golden Ratio (φ) = 1.618</strong>, which appears repeatedly in nature, art, and financial markets. The inverse of the Golden Ratio (0.618 or 61.8%) is particularly important in trading.
        </p>

        <h3>Key Fibonacci Ratios</h3>
        <ul>
          <li><strong>23.6%:</strong> First retracement level</li>
          <li><strong>38.2%:</strong> Second retracement level</li>
          <li><strong>50.0%:</strong> Midpoint (not true Fibonacci but widely used)</li>
          <li><strong>61.8%:</strong> Golden Ratio retracement (most important)</li>
          <li><strong>78.6%:</strong> Final retracement level</li>
        </ul>

        <h2>How to Draw Fibonacci Retracements</h2>

        <h3>Step 1: Identify the Trend</h3>
        <p>
          Fibonacci retracements work best in trending markets. Identify a clear uptrend or downtrend before drawing retracement levels.
        </p>

        <h3>Step 2: Find the Swing Points</h3>
        <p>
          <strong>For Uptrends:</strong>
        </p>
        <ul>
          <li>Low Point (0%): Recent major low</li>
          <li>High Point (100%): Recent major high</li>
        </ul>

        <p>
          <strong>For Downtrends:</strong>
        </p>
        <ul>
          <li>High Point (0%): Recent major high</li>
          <li>Low Point (100%): Recent major low</li>
        </ul>

        <h3>Step 3: Draw the Retracement Levels</h3>
        <p>
          Most charting platforms have a built-in Fibonacci retracement tool. Simply click on the low point first, then drag to the high point (or vice versa for downtrends).
        </p>

        <h3>Step 4: Interpret the Levels</h3>
        <p>
          The tool will automatically draw horizontal lines at the key Fibonacci ratios between your swing points.
        </p>

        <h2>Understanding Fibonacci Retracement Levels</h2>

        <h3>23.6% Retracement</h3>
        <p>
          The shallowest retracement level. Often acts as weak support/resistance. Price may bounce here briefly before continuing the trend.
        </p>

        <h3>38.2% Retracement</h3>
        <p>
          Moderate retracement level. Frequently provides strong support/resistance. Many traders consider this the "minimum" retracement in a healthy trend.
        </p>

        <h3>50.0% Retracement</h3>
        <p>
          Psychological midpoint. While not a true Fibonacci ratio, it's widely watched because traders often expect price to reverse at "halfway" points.
        </p>

        <h3>61.8% Retracement (Golden Ratio)</h3>
        <p>
          The most important Fibonacci level. Often provides major support/resistance. Many significant reversals occur at this level.
        </p>

        <h3>78.6% Retracement</h3>
        <p>
          Deep retracement level. If price reaches here, it may signal trend exhaustion. Often leads to either a strong reversal or trend continuation.
        </p>

        <h2>Fibonacci Retracement Trading Strategies</h2>

        <h3>Strategy 1: Retracement Bounce Trading</h3>
        <p>
          <strong>Setup:</strong> Identify a strong trend with clear swing points
        </p>
        <p>
          <strong>Entry:</strong> Buy at Fibonacci support levels (38.2%, 50%, 61.8%) in uptrends
        </p>
        <p>
          <strong>Confirmation:</strong> Wait for bullish candlestick reversal pattern
        </p>
        <p>
          <strong>Stop Loss:</strong> Below the recent swing low
        </p>
        <p>
          <strong>Take Profit:</strong> Next Fibonacci resistance level or previous high
        </p>

        <h3>Strategy 2: Breakout Continuation Trading</h3>
        <p>
          <strong>Setup:</strong> Price retraces to a Fibonacci level and consolidates
        </p>
        <p>
          <strong>Entry:</strong> Buy when price breaks above the consolidation high
        </p>
        <p>
          <strong>Stop Loss:</strong> Below the consolidation low
        </p>
        <p>
          <strong>Take Profit:</strong> Next Fibonacci extension level
        </p>

        <h3>Strategy 3: Multiple Time Frame Analysis</h3>
        <p>
          <strong>Higher Timeframe:</strong> Use weekly/monthly charts to identify major Fibonacci levels
        </p>
        <p>
          <strong>Lower Timeframe:</strong> Use daily/hourly charts for precise entry timing
        </p>
        <p>
          <strong>Confluence:</strong> Look for alignment between multiple timeframes
        </p>

        <h3>Strategy 4: Fibonacci Cluster Trading</h3>
        <p>
          <strong>Setup:</strong> When multiple Fibonacci levels converge with other technical factors
        </p>
        <p>
          <strong>Entry:</strong> Trade in direction of the prevailing trend at cluster areas
        </p>
        <p>
          <strong>Confirmation:</strong> Volume spike or momentum divergence
        </p>

        <h2>Fibonacci Extensions</h2>

        <p>
          While retracements measure pullbacks within a trend, extensions project potential price targets beyond the original move.
        </p>

        <h3>Key Extension Levels</h3>
        <ul>
          <li><strong>100%:</strong> Equal to the original move</li>
          <li><strong>127.2%:</strong> First extension level</li>
          <li><strong>161.8%:</strong> Golden Ratio extension (most important)</li>
          <li><strong>200%:</strong> Double the original move</li>
          <li><strong>261.8%:</strong> Final extension level</li>
        </ul>

        <h3>How to Draw Extensions</h3>
        <p>
          <strong>For Uptrends:</strong>
        </p>
        <ol>
          <li>Click on the swing low</li>
          <li>Drag to the swing high</li>
          <li>Extend the tool beyond the swing high</li>
        </ol>

        <p>
          <strong>Profit Targets:</strong> Use extension levels as potential exit points
        </p>

        <h2>Fibonacci Arcs and Fans</h2>

        <h3>Fibonacci Arcs</h3>
        <p>
          Curved lines that intersect Fibonacci ratios. Used to identify potential support/resistance curves.
        </p>
        <ul>
          <li><strong>Drawing:</strong> Click low, drag to high, arcs appear at 38.2%, 50%, 61.8%</li>
          <li><strong>Use:</strong> Price often bounces off these curved levels</li>
        </ul>

        <h3>Fibonacci Fans</h3>
        <p>
          Diagonal lines from a swing low to high, with parallel lines at Fibonacci angles.
        </p>
        <ul>
          <li><strong>Angles:</strong> 38.2°, 50°, 61.8° from horizontal</li>
          <li><strong>Use:</strong> Identify trend channels and potential breakout points</li>
        </ul>

        <h2>Combining Fibonacci with Other Tools</h2>

        <h3>Fibonacci + Support/Resistance</h3>
        <p>
          <strong>Confluence:</strong> When Fibonacci levels align with horizontal S/R lines
        </p>
        <p>
          <strong>Power:</strong> These confluence areas have higher probability of causing reversals
        </p>

        <h3>Fibonacci + Moving Averages</h3>
        <p>
          <strong>Confirmation:</strong> Look for Fibonacci bounces near moving averages
        </p>
        <p>
          <strong>Example:</strong> 61.8% retracement near 200-day MA = strong support
        </p>

        <h3>Fibonacci + RSI</h3>
        <p>
          <strong>Oversold Bounce:</strong> RSI below 30 at Fibonacci support
        </p>
        <p>
          <strong>Overbought Rejection:</strong> RSI above 70 at Fibonacci resistance
        </p>

        <h3>Fibonacci + Volume</h3>
        <p>
          <strong>Confirmation:</strong> High volume at Fibonacci levels increases significance
        </p>
        <p>
          <strong>Divergence:</strong> Watch for volume divergences at key levels
        </p>

        <h2>Common Fibonacci Trading Mistakes</h2>

        <h3>1. Drawing Incorrect Swing Points</h3>
        <p>
          The accuracy of your Fibonacci levels depends entirely on selecting the correct swing points. Use significant highs/lows, not minor fluctuations.
        </p>

        <h3>2. Trading Every Level</h3>
        <p>
          Not every Fibonacci level will cause a reversal. Focus on the most significant levels (38.2%, 61.8%) and look for confluence with other factors.
        </p>

        <h3>3. Ignoring the Trend</h3>
        <p>
          Fibonacci works best in trending markets. Avoid using retracements in strongly ranging or choppy markets.
        </p>

        <h3>4. Over-reliance on Fibonacci Alone</h3>
        <p>
          Fibonacci levels are most powerful when combined with other technical analysis tools and price action confirmation.
        </p>

        <h2>Fibonacci in Different Market Conditions</h2>

        <h3>Strong Trending Markets</h3>
        <p>
          Fibonacci retracements work exceptionally well in strong trends. Price often retraces to 38.2% or 61.8% before continuing the trend.
        </p>

        <h3>Sideways/Ranging Markets</h3>
        <p>
          Fibonacci levels are less reliable in choppy markets. Price may bounce between levels without a clear trend direction.
        </p>

        <h3>Volatile Markets</h3>
        <p>
          During high volatility, Fibonacci levels may be reached quickly. Use wider stops and consider volatility-based position sizing.
        </p>

        <h2>Advanced Fibonacci Techniques</h2>

        <h3>Fibonacci Time Zones</h3>
        <p>
          Vertical lines that indicate potential time periods where reversals may occur, based on Fibonacci numbers.
        </p>

        <h3>Fibonacci Channel</h3>
        <p>
          Parallel lines drawn at 61.8% and 161.8% extensions, creating a channel for trend continuation.
        </p>

        <h3>Internal Retracements</h3>
        <p>
          Drawing Fibonacci levels within smaller price swings within the larger trend for more precise entries.
        </p>

        <h3>Fibonacci Projections</h3>
        <p>
          Using Fibonacci ratios to project potential price targets based on previous swings.
        </p>

        <h2>Risk Management with Fibonacci</h2>

        <h3>Stop Loss Placement</h3>
        <ul>
          <li><strong>Below swing low:</strong> For long positions from Fibonacci support</li>
          <li><strong>Above swing high:</strong> For short positions from Fibonacci resistance</li>
          <li><strong>Behind next level:</strong> Place stops just beyond the next Fibonacci level</li>
        </ul>

        <h3>Position Sizing</h3>
        <p>
          <strong>Level Importance:</strong> Larger positions at 61.8% levels, smaller at 23.6% levels
        </p>
        <p>
          <strong>Confluence Factor:</strong> Increase position size when multiple factors align
        </p>

        <h3>Take Profit Strategy</h3>
        <ul>
          <li><strong>Next level:</strong> Exit at the next Fibonacci resistance/support</li>
          <li><strong>Extension targets:</strong> Use Fibonacci extensions for profit targets</li>
          <li><strong>Trailing stops:</strong> Trail stops using Fibonacci levels</li>
        </ul>

        <h2>Developing a Fibonacci Trading Plan</h2>

        <h3>Step 1: Define Your Trading Style</h3>
        <p>
          <strong>Swing Traders:</strong> Use daily/weekly charts for major Fibonacci levels
        </p>
        <p>
          <strong>Day Traders:</strong> Use intraday charts with multiple timeframe confirmation
        </p>
        <p>
          <strong>Position Traders:</strong> Focus on major trend continuation patterns
        </p>

        <h3>Step 2: Choose Your Levels</h3>
        <p>
          Start with the three main levels: 38.2%, 50%, and 61.8%. Add 23.6% and 78.6% as you gain experience.
        </p>

        <h3>Step 3: Set Entry Criteria</h3>
        <p>
          Always require confirmation:
        </p>
        <ul>
          <li>Candlestick reversal patterns</li>
          <li>Momentum indicators</li>
          <li>Volume confirmation</li>
        </ul>

        <h3>Step 4: Backtest Your Strategy</h3>
        <p>
          Test your Fibonacci approach on historical data to understand win rates and optimal risk-reward ratios.
        </p>

        <h2>Conclusion</h2>

        <p>
          Fibonacci retracements are a powerful tool that can significantly enhance your technical analysis capabilities. Based on mathematical principles that appear throughout nature and financial markets, these levels help identify high-probability areas where price is likely to reverse or consolidate.
        </p>

        <p>
          While Fibonacci levels are not foolproof, they provide traders with a structured approach to analyzing price movements and identifying potential turning points. The key to success lies in combining Fibonacci analysis with other technical tools, proper risk management, and price action confirmation.
        </p>

        <p>
          Start by mastering the basic retracement levels (38.2%, 50%, 61.8%) and practice drawing them on historical charts. As you gain experience, incorporate extensions, arcs, and fans into your analysis. Remember that Fibonacci is a tool, not a crystal ball - use it to increase your edge, not guarantee profits.
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