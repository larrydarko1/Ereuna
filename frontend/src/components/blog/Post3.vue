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
          Support and resistance levels are fundamental concepts in technical analysis that every trader should master. These invisible lines on your charts represent psychological barriers where buying and selling pressure converge, creating predictable price behavior patterns. Understanding how to identify and trade these levels can significantly improve your trading accuracy and profitability.
        </p>

        <h2>What Are Support and Resistance Levels?</h2>

        <p>
          <strong>Support levels</strong> are price levels where buying pressure is strong enough to prevent the price from falling further. Think of support as a "floor" that the price bounces off during downtrends.
        </p>

        <p>
          <strong>Resistance levels</strong> are price levels where selling pressure is strong enough to prevent the price from rising further. Think of resistance as a "ceiling" that the price bounces off during uptrends.
        </p>

        <p>
          These levels form because of the collective psychology of market participants. When price approaches a previous high (resistance) or low (support), traders who missed the move or are positioned against the trend often enter the market, creating the bounce.
        </p>

        <h2>How to Identify Support and Resistance</h2>

        <h3>1. Historical Price Levels</h3>
        <p>
          The most basic method is looking at historical price action:
        </p>
        <ul>
          <li><strong>Support:</strong> Previous lows where price reversed upward</li>
          <li><strong>Resistance:</strong> Previous highs where price reversed downward</li>
        </ul>

        <h3>2. Trend Lines</h3>
        <p>
          Connect multiple highs or lows to form diagonal support/resistance lines:
        </p>
        <ul>
          <li><strong>Ascending trend lines:</strong> Connect higher lows (support)</li>
          <li><strong>Descending trend lines:</strong> Connect lower highs (resistance)</li>
        </ul>

        <h3>3. Moving Averages</h3>
        <p>
          Popular moving averages (50-day, 100-day, 200-day) often act as dynamic support/resistance levels, especially during strong trends.
        </p>

        <h3>4. Psychological Levels</h3>
        <p>
          Round numbers often create strong psychological barriers:
        </p>
        <ul>
          <li>$100, $500, $1000 stock prices</li>
          <li>50, 100, 200 point levels in indices</li>
          <li>Key percentage levels (25%, 50%, 75% of major moves)</li>
        </ul>

        <h2>Types of Support and Resistance</h2>

        <h3>Major vs Minor Levels</h3>
        <p>
          <strong>Major levels</strong> are tested multiple times and hold consistently. These are the most important and reliable.
        </p>
        <p>
          <strong>Minor levels</strong> are tested fewer times and may break more easily. They're useful for short-term trading but less reliable for longer-term analysis.
        </p>

        <h3>Dynamic vs Static Levels</h3>
        <p>
          <strong>Static levels</strong> are horizontal lines that don't change (historical highs/lows).
        </p>
        <p>
          <strong>Dynamic levels</strong> move with price action (moving averages, trend lines).
        </p>

        <h2>Trading Support and Resistance</h2>

        <h3>The Bounce Strategy</h3>
        <p>
          When price approaches support/resistance, anticipate a bounce:
        </p>
        <ul>
          <li><strong>Buy at support:</strong> Enter long positions when price reaches support</li>
          <li><strong>Sell at resistance:</strong> Enter short positions when price reaches resistance</li>
          <li><strong>Confirmation:</strong> Wait for candlestick reversal patterns or momentum indicators</li>
        </ul>

        <h3>The Breakout Strategy</h3>
        <p>
          When price breaks through support/resistance:
        </p>
        <ul>
          <li><strong>Breakout above resistance:</strong> Buy the breakout for continuation</li>
          <li><strong>Breakout below support:</strong> Sell the breakdown for continuation</li>
          <li><strong>Volume confirmation:</strong> Look for increased volume on breakouts</li>
        </ul>

        <h3>The Range Trading Strategy</h3>
        <p>
          In sideways markets, buy at support and sell at resistance:
        </p>
        <ul>
          <li><strong>Identify the range:</strong> Clear support and resistance levels</li>
          <li><strong>Trade the bounces:</strong> Buy low, sell high within the range</li>
          <li><strong>Risk management:</strong> Place stops just outside the range</li>
        </ul>

        <h2>Support Becomes Resistance (and Vice Versa)</h2>

        <p>
          One of the most powerful concepts in technical analysis is that <strong>broken support becomes resistance, and broken resistance becomes support</strong>.
        </p>

        <p>
          When price breaks above resistance, that level often becomes support on retests. Conversely, when price breaks below support, that level often becomes resistance on retests. This phenomenon occurs because traders who missed the original move will often enter on the retest.
        </p>

        <h2>Volume Confirmation</h2>

        <p>
          Always look for volume confirmation at key levels:
        </p>
        <ul>
          <li><strong>High volume at support:</strong> Indicates strong buying interest</li>
          <li><strong>High volume at resistance:</strong> Indicates strong selling pressure</li>
          <li><strong>Low volume bounces:</strong> May indicate weak reactions (potential breakouts)</li>
        </ul>

        <h2>Common Mistakes to Avoid</h2>

        <h3>1. Drawing Too Many Lines</h3>
        <p>
          Focus on the most significant levels. Too many lines create confusion and reduce effectiveness.
        </p>

        <h3>2. Ignoring Time Frames</h3>
        <p>
          Support/resistance levels are time-frame specific. A level that's significant on a daily chart may not matter on a 5-minute chart.
        </p>

        <h3>3. Trading Without Confirmation</h3>
        <p>
          Never enter trades based solely on approaching a level. Wait for confirmation through price action, candlesticks, or indicators.
        </p>

        <h3>4. Not Adjusting for News Events</h3>
        <p>
          Major news events can invalidate technical levels. Always be aware of upcoming economic releases or company announcements.
        </p>

        <h2>Advanced Concepts</h2>

        <h3>Pivot Points</h3>
        <p>
          Calculated levels based on previous day's high, low, and close. Provide multiple support/resistance levels for intraday trading.
        </p>

        <h3>Fibonacci Retracements</h3>
        <p>
          Use Fibonacci ratios (23.6%, 38.2%, 50%, 61.8%) to identify potential support/resistance levels within trends.
        </p>

        <h3>Multiple Time Frame Analysis</h3>
        <p>
          Check how levels align across different time frames. Levels that are significant on higher time frames carry more weight.
        </p>

        <h2>Risk Management with Support/Resistance</h2>

        <h3>Stop Loss Placement</h3>
        <ul>
          <li><strong>Below support:</strong> Place stops just below support levels</li>
          <li><strong>Above resistance:</strong> Place stops just above resistance levels</li>
          <li><strong>Percentage-based:</strong> Use a percentage of the level distance</li>
        </ul>

        <h3>Position Sizing</h3>
        <p>
          Consider the distance to your stop loss when determining position size. Wider stops require smaller positions to maintain risk control.
        </p>

        <h2>Conclusion</h2>

        <p>
          Support and resistance levels are the foundation of technical analysis. They represent the collective psychology of market participants and create predictable trading opportunities. While they're not foolproof, understanding how to identify and trade these levels gives you a significant edge in the markets.
        </p>

        <p>
          Remember that support and resistance are areas, not exact lines. Price may test these levels multiple times before breaking through. Always combine level analysis with other technical tools and proper risk management for the best results.
        </p>

        <p>
          Practice identifying these levels on historical charts before applying them to live trading. With experience, you'll develop an intuitive sense of which levels are most likely to hold and which are ready to break.
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