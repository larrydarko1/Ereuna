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
          Candlestick patterns are the language of price action, providing traders with visual representations of market sentiment and potential future price movements. Originating from 18th-century Japanese rice traders, these patterns have stood the test of time and remain essential tools for modern traders. Understanding candlestick patterns can help you identify reversals, continuations, and key decision points with remarkable clarity. This comprehensive guide will teach you how to master candlestick analysis and incorporate it into your trading strategy.
        </p>

        <h2>Understanding Candlestick Anatomy</h2>

        <p>
          Before diving into patterns, it's crucial to understand what each candlestick represents:
        </p>

        <h3>Candlestick Components</h3>
        <ul>
          <li><strong>Body:</strong> The thick part showing the opening and closing prices</li>
          <li><strong>Upper Wick (Shadow):</strong> The thin line above the body showing the high</li>
          <li><strong>Lower Wick (Shadow):</strong> The thin line below the body showing the low</li>
          <li><strong>Color:</strong> Green/white (bullish) or red/black (bearish)</li>
        </ul>

        <h3>Reading the Message</h3>
        <p>
          Each candlestick tells a story about the battle between buyers and sellers:
        </p>
        <ul>
          <li><strong>Long body:</strong> Strong directional move (buyers or sellers in control)</li>
          <li><strong>Short body:</strong> Indecision or equilibrium</li>
          <li><strong>Long upper wick:</strong> Rejection of higher prices (selling pressure)</li>
          <li><strong>Long lower wick:</strong> Rejection of lower prices (buying support)</li>
        </ul>

        <h2>Single Candlestick Patterns</h2>

        <h3>Reversal Patterns</h3>

        <h4>Hammer</h4>
        <p>
          <strong>Description:</strong> Small body with long lower wick, little to no upper wick
        </p>
        <p>
          <strong>Psychology:</strong> Sellers pushed price down but buyers fought back strongly
        </p>
        <p>
          <strong>Signal:</strong> Potential bullish reversal, especially at support levels
        </p>
        <p>
          <strong>Confirmation:</strong> Next candle should be bullish
        </p>

        <h4>Hanging Man</h4>
        <p>
          <strong>Description:</strong> Same as hammer but appears after an uptrend
        </p>
        <p>
          <strong>Psychology:</strong> Buyers pushed price up but sellers rejected the highs
        </p>
        <p>
          <strong>Signal:</strong> Potential bearish reversal at resistance levels
        </p>

        <h4>Shooting Star</h4>
        <p>
          <strong>Description:</strong> Small body with long upper wick, little to no lower wick
        </p>
        <p>
          <strong>Psychology:</strong> Buyers pushed price up but sellers took control
        </p>
        <p>
          <strong>Signal:</strong> Potential bearish reversal, especially at resistance
        </p>

        <h4>Shooting Star</h4>
        <p>
          <strong>Description:</strong> Small body with long upper wick, little to no lower wick
        </p>
        <p>
          <strong>Psychology:</strong> Buyers pushed price up but sellers took control
        </p>
        <p>
          <strong>Signal:</strong> Potential bearish reversal, especially at resistance
        </p>

        <h4>Inverted Hammer</h4>
        <p>
          <strong>Description:</strong> Small body with long upper wick, appears in downtrend
        </p>
        <p>
          <strong>Psychology:</strong> Sellers pushed price down but buyers showed strength
        </p>
        <p>
          <strong>Signal:</strong> Potential bullish reversal
        </p>

        <h3>Indecision Patterns</h3>

        <h4>Doji</h4>
        <p>
          <strong>Description:</strong> Open and close at the same price (cross or plus sign)
        </p>
        <p>
          <strong>Psychology:</strong> Perfect balance between buyers and sellers
        </p>
        <p>
          <strong>Signal:</strong> Indecision, potential reversal depending on context
        </p>
        <p>
          <strong>Types:</strong> Long-legged doji, dragonfly doji, gravestone doji
        </p>

        <h4>Spinning Top</h4>
        <p>
          <strong>Description:</strong> Small body with long upper and lower wicks
        </p>
        <p>
          <strong>Psychology:</strong> Battle between buyers and sellers with no clear winner
        </p>
        <p>
          <strong>Signal:</strong> Indecision, often precedes strong moves
        </p>

        <h3>Continuation Patterns</h3>

        <h4>Marubozu</h4>
        <p>
          <strong>Description:</strong> No wicks, just a long body
        </p>
        <p>
          <strong>Psychology:</strong> Strong directional move with no retracement
        </p>
        <p>
          <strong>Signal:</strong> Strong continuation of current trend
        </p>
        <p>
          <strong>Types:</strong> Bullish marubozu, bearish marubozu
        </p>

        <h2>Multiple Candlestick Patterns</h2>

        <h3>Bullish Reversal Patterns</h3>

        <h4>Morning Star</h4>
        <p>
          <strong>Description:</strong> Three-candle pattern - large bearish, small indecisive, large bullish
        </p>
        <p>
          <strong>Psychology:</strong> Sellers dominate, then indecision, then buyers take control
        </p>
        <p>
          <strong>Signal:</strong> Strong bullish reversal
        </p>

        <h4>Bullish Engulfing</h4>
        <p>
          <strong>Description:</strong> Small bearish candle followed by large bullish candle that engulfs it
        </p>
        <p>
          <strong>Psychology:</strong> Sellers in control, then buyers overwhelm them completely
        </p>
        <p>
          <strong>Signal:</strong> Strong bullish reversal
        </p>

        <h4>Piercing Pattern</h4>
        <p>
          <strong>Description:</strong> Large bearish candle followed by bullish candle that opens lower but closes above midpoint
        </p>
        <p>
          <strong>Psychology:</strong> Sellers push down, but buyers recover more than half the losses
        </p>
        <p>
          <strong>Signal:</strong> Bullish reversal
        </p>

        <h4>Three White Soldiers</h4>
        <p>
          <strong>Description:</strong> Three consecutive bullish candles with higher highs and higher lows
        </p>
        <p>
          <strong>Psychology:</strong> Progressive strength from buyers
        </p>
        <p>
          <strong>Signal:</strong> Strong bullish reversal or continuation
        </p>

        <h3>Bearish Reversal Patterns</h3>

        <h4>Evening Star</h4>
        <p>
          <strong>Description:</strong> Three-candle pattern - large bullish, small indecisive, large bearish
        </p>
        <p>
          <strong>Psychology:</strong> Buyers dominate, then indecision, then sellers take control
        </p>
        <p>
          <strong>Signal:</strong> Strong bearish reversal
        </p>

        <h4>Bearish Engulfing</h4>
        <p>
          <strong>Description:</strong> Small bullish candle followed by large bearish candle that engulfs it
        </p>
        <p>
          <strong>Psychology:</strong> Buyers in control, then sellers overwhelm them completely
        </p>
        <p>
          <strong>Signal:</strong> Strong bearish reversal
        </p>

        <h4>Dark Cloud Cover</h4>
        <p>
          <strong>Description:</strong> Large bullish candle followed by bearish candle that opens higher but closes below midpoint
        </p>
        <p>
          <strong>Psychology:</strong> Buyers push up, but sellers push down more than half the gains
        </p>
        <p>
          <strong>Signal:</strong> Bearish reversal
        </p>

        <h4>Three Black Crows</h4>
        <p>
          <strong>Description:</strong> Three consecutive bearish candles with lower highs and lower lows
        </p>
        <p>
          <strong>Psychology:</strong> Progressive strength from sellers
        </p>
        <p>
          <strong>Signal:</strong> Strong bearish reversal or continuation
        </p>

        <h3>Continuation Patterns</h3>

        <h4>Rising Three Methods</h4>
        <p>
          <strong>Description:</strong> Long bullish candle, three small bearish candles, long bullish candle
        </p>
        <p>
          <strong>Psychology:</strong> Brief consolidation within an uptrend before continuation
        </p>
        <p>
          <strong>Signal:</strong> Bullish continuation
        </p>

        <h4>Falling Three Methods</h4>
        <p>
          <strong>Description:</strong> Long bearish candle, three small bullish candles, long bearish candle
        </p>
        <p>
          <strong>Psychology:</strong> Brief consolidation within a downtrend before continuation
        </p>
        <p>
          <strong>Signal:</strong> Bearish continuation
        </p>

        <h4>Bullish Harami</h4>
        <p>
          <strong>Description:</strong> Large bearish candle followed by small bullish candle contained within it
        </p>
        <p>
          <strong>Psychology:</strong> Selling pressure decreases, potential bullish reversal
        </p>
        <p>
          <strong>Signal:</strong> Bullish reversal (weaker than engulfing)
        </p>

        <h4>Bearish Harami</h4>
        <p>
          <strong>Description:</strong> Large bullish candle followed by small bearish candle contained within it
        </p>
        <p>
          <strong>Psychology:</strong> Buying pressure decreases, potential bearish reversal
        </p>
        <p>
          <strong>Signal:</strong> Bearish reversal (weaker than engulfing)
        </p>

        <h2>Advanced Candlestick Analysis</h2>

        <h3>Pattern Strength Factors</h3>
        <ul>
          <li><strong>Size:</strong> Larger patterns are more significant</li>
          <li><strong>Volume:</strong> High volume confirms pattern validity</li>
          <li><strong>Location:</strong> Patterns at key levels are stronger</li>
          <li><strong>Context:</strong> Patterns in trending markets are more reliable</li>
        </ul>

        <h3>Candlestick Combinations</h3>
        <p>
          Multiple patterns often work together:
        </p>
        <ul>
          <li><strong>Hammer + Support:</strong> Very strong bullish signal</li>
          <li><strong>Shooting Star + Resistance:</strong> Very strong bearish signal</li>
          <li><strong>Engulfing + Trend Line Break:</strong> High-probability setup</li>
        </ul>

        <h3>Time Frame Analysis</h3>
        <p>
          Patterns have different significance across timeframes:
        </p>
        <ul>
          <li><strong>Higher timeframes:</strong> More reliable but fewer signals</li>
          <li><strong>Lower timeframes:</strong> More signals but higher noise</li>
          <li><strong>Multiple timeframes:</strong> Best approach for confirmation</li>
        </ul>

        <h2>Trading Candlestick Patterns</h2>

        <h3>Entry Techniques</h3>
        <ul>
          <li><strong>Pattern completion:</strong> Enter on the close of the pattern</li>
          <li><strong>Confirmation candle:</strong> Wait for next candle to confirm direction</li>
          <li><strong>Retest:</strong> Enter on pullback to pattern area</li>
        </ul>

        <h3>Stop Loss Placement</h3>
        <ul>
          <li><strong>Pattern low/high:</strong> Below recent swing low for bullish, above swing high for bearish</li>
          <li><strong>Percentage stops:</strong> 1-2% for short-term trades</li>
          <li><strong>ATR-based:</strong> 1-2× Average True Range</li>
        </ul>

        <h3>Take Profit Targets</h3>
        <ul>
          <li><strong>Recent swing:</strong> Target previous high/low</li>
          <li><strong>Fibonacci levels:</strong> Use 61.8% or 100% extensions</li>
          <li><strong>Support/resistance:</strong> Target next key level</li>
        </ul>

        <h2>Common Mistakes to Avoid</h2>

        <h3>1. Trading Every Pattern</h3>
        <p>
          Not every candlestick pattern leads to a successful trade. Focus on high-probability setups with multiple confirmations.
        </p>

        <h3>2. Ignoring Context</h3>
        <p>
          A bullish pattern in a strong downtrend is less reliable than the same pattern in an uptrend. Always consider the broader market context.
        </p>

        <h3>3. Over-relying on Single Patterns</h3>
        <p>
          Candlesticks work best when combined with other analysis tools like support/resistance, moving averages, and indicators.
        </p>

        <h3>4. Poor Risk Management</h3>
        <p>
          Even the best patterns can fail. Always use appropriate stop losses and position sizing.
        </p>

        <h2>Candlestick Patterns in Different Markets</h2>

        <h3>Trending Markets</h3>
        <p>
          In strong trends, look for continuation patterns and avoid fighting the trend with reversal patterns.
        </p>

        <h3>Ranging Markets</h3>
        <p>
          Reversal patterns work well in sideways markets. Look for patterns at key support/resistance levels.
        </p>

        <h3>Volatile Markets</h3>
        <p>
          Large, decisive patterns are more reliable. Small patterns may get lost in the noise.
        </p>

        <h2>Developing a Candlestick Strategy</h2>

        <h3>Pattern Priority</h3>
        <p>
          Focus on the most reliable patterns first:
        </p>
        <ol>
          <li>Engulfing patterns (strongest)</li>
          <li>Morning/Evening stars</li>
          <li>Hammers and shooting stars</li>
          <li>Harami patterns</li>
          <li>Doji and spinning tops (weakest)</li>
        </ol>

        <h3>Journal Your Trades</h3>
        <p>
          Track your candlestick trades to identify which patterns work best for you and in which market conditions.
        </p>

        <h3>Combine with Other Tools</h3>
        <p>
          Use candlesticks with:
        </p>
        <ul>
          <li>Support and resistance levels</li>
          <li>Moving averages</li>
          <li>Volume analysis</li>
          <li>Momentum indicators</li>
        </ul>

        <h2>Conclusion</h2>

        <p>
          Candlestick patterns are a powerful tool for understanding market psychology and identifying high-probability trading opportunities. They provide visual cues about the balance of power between buyers and sellers, helping traders make more informed decisions.
        </p>

        <p>
          While candlestick patterns are not foolproof, when used properly with other technical analysis tools and sound risk management, they can significantly improve your trading accuracy. Remember that patterns are more reliable when they appear at key technical levels and are confirmed by volume and other indicators.
        </p>

        <p>
          Start by mastering the basic patterns (hammer, engulfing, doji) and gradually incorporate more complex formations. Practice identifying these patterns on historical charts before applying them to live trading. With experience, you'll develop an intuitive sense of market sentiment and use candlestick analysis to gain a significant edge in your trading.
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