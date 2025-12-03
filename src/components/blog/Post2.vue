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
          Moving averages are among the most fundamental and widely used technical indicators in financial analysis. Whether you're a day trader, swing trader, or long-term investor, understanding moving averages is essential for making informed trading decisions. In this comprehensive guide, we'll explore what moving averages are, how they work, and the key differences between Simple Moving Averages (SMA) and Exponential Moving Averages (EMA).
        </p>

        <h2>What Are Moving Averages?</h2>

        <p>
          A moving average is a statistical calculation that smooths out price data by creating a constantly updated average price over a specific period. Instead of looking at raw price data—which can be volatile and noisy—moving averages provide a clearer picture of the overall trend direction and momentum.
        </p>

        <p>
          Think of a moving average as a lagging indicator that follows the price action. It "moves" because it continuously recalculates as new price data becomes available, dropping the oldest data point and adding the newest one.
        </p>

        <h2>How Moving Averages Work</h2>

        <p>
          Moving averages are calculated by taking the average of a security's price over a specified number of periods. For example:
        </p>

        <ul>
          <li>A 50-day moving average uses the closing prices from the last 50 trading days</li>
          <li>A 200-day moving average uses the closing prices from the last 200 trading days</li>
          <li>A 20-period moving average on a 1-hour chart uses the last 20 hours of price data</li>
        </ul>

        <p>
          Each period (day, hour, minute, etc.), the oldest price is dropped and the newest price is added, then the average is recalculated. This creates a smooth line that follows price trends while filtering out short-term fluctuations.
        </p>

        <h2>Simple Moving Average (SMA)</h2>

        <h3>What is SMA?</h3>
        <p>
          The Simple Moving Average is the most basic form of moving average. It gives equal weight to all prices in the calculation period. If you're calculating a 10-day SMA, each of the 10 days carries exactly 10% weight (1/10 = 0.10) in the final average.
        </p>

        <h3>SMA Calculation</h3>
        <p>
          <strong>Formula:</strong> SMA = (P₁ + P₂ + P₃ + ... + Pₙ) / n
        </p>
        <p>
          Where:
        </p>
        <ul>
          <li>P₁, P₂, etc. = Individual price points (usually closing prices)</li>
          <li>n = Number of periods</li>
        </ul>

        <h3>SMA Characteristics</h3>
        <ul>
          <li><strong>Equal weighting:</strong> All periods have the same importance</li>
          <li><strong>Smooth response:</strong> Less responsive to recent price changes</li>
          <li><strong>Clear signals:</strong> Easy to interpret trend changes</li>
          <li><strong>Common periods:</strong> 50-day, 100-day, 200-day for long-term analysis</li>
        </ul>

        <h2>Exponential Moving Average (EMA)</h2>

        <h3>What is EMA?</h3>
        <p>
          The Exponential Moving Average gives more weight to recent prices while still considering historical data. Unlike SMA, which treats all periods equally, EMA applies a weighting factor that decreases exponentially for older data points.
        </p>

        <h3>EMA Calculation</h3>
        <p>
          <strong>Formula:</strong> EMA = (Current Price × Multiplier) + (Previous EMA × (1 - Multiplier))
        </p>
        <p>
          Where the Multiplier = 2 / (n + 1)
        </p>
        <p>
          For a 10-period EMA, the multiplier would be 2/(10+1) = 0.1818 (18.18%)
        </p>

        <h3>EMA Characteristics</h3>
        <ul>
          <li><strong>Recent bias:</strong> More responsive to current price action</li>
          <li><strong>Faster signals:</strong> Reacts quicker to trend changes</li>
          <li><strong>Smoother line:</strong> Less prone to whipsaws than SMA</li>
          <li><strong>Popular periods:</strong> 12-day, 26-day for short-term trading</li>
        </ul>

        <h2>Key Differences: SMA vs EMA</h2>

        <h3>1. Responsiveness to Price Changes</h3>
        <p>
          <strong>SMA:</strong> Slower to react to recent price movements because it gives equal weight to all periods. A sudden price spike will have less immediate impact on the SMA.
        </p>
        <p>
          <strong>EMA:</strong> More responsive to recent price action. New information is quickly incorporated into the calculation, making EMAs better for identifying emerging trends.
        </p>

        <h3>2. Lag Factor</h3>
        <p>
          <strong>SMA:</strong> Higher lag due to equal weighting of all periods. This can result in later signals but also fewer false signals.
        </p>
        <p>
          <strong>EMA:</strong> Lower lag because recent prices carry more weight. This provides earlier signals but can sometimes generate more false signals during choppy markets.
        </p>

        <h3>3. Trend Identification</h3>
        <p>
          <strong>SMA:</strong> Better for identifying established, longer-term trends. The 200-day SMA is particularly famous for defining major market trends.
        </p>
        <p>
          <strong>EMA:</strong> Superior for short-term trend identification and momentum analysis. EMAs are preferred by day traders and short-term swing traders.
        </p>

        <h3>4. Calculation Complexity</h3>
        <p>
          <strong>SMA:</strong> Simple arithmetic mean - easy to calculate and understand.
        </p>
        <p>
          <strong>EMA:</strong> More complex formula requiring the previous EMA value. However, most trading platforms calculate this automatically.
        </p>

        <h2>Common Moving Average Applications</h2>

        <h3>Trend Following</h3>
        <p>
          When price is above the moving average, it suggests an uptrend. When price is below, it suggests a downtrend. The direction of the moving average itself also indicates trend direction.
        </p>

        <h3>Support and Resistance</h3>
        <p>
          Moving averages often act as dynamic support or resistance levels. Prices tend to bounce off these averages during strong trends.
        </p>

        <h3>Crossover Signals</h3>
        <p>
          The most popular crossover system is the "Golden Cross" (50-day SMA crosses above 200-day SMA) and "Death Cross" (50-day SMA crosses below 200-day SMA). Shorter-term EMAs (like 5 and 10) are commonly used for entry/exit signals.
        </p>

        <h3>MACD Indicator</h3>
        <p>
          The MACD (Moving Average Convergence Divergence) uses EMAs (typically 12-day and 26-day) to identify momentum changes and potential trend reversals.
        </p>

        <h2>Choosing the Right Moving Average</h2>

        <h3>For Long-Term Investors</h3>
        <ul>
          <li>Use longer periods: 100-day, 200-day SMA</li>
          <li>Focus on major trend identification</li>
          <li>Less concerned with short-term noise</li>
        </ul>

        <h3>For Swing Traders</h3>
        <ul>
          <li>Use 20-50 period SMAs or EMAs</li>
          <li>Look for crossovers and support/resistance</li>
          <li>Balance responsiveness with reliability</li>
        </ul>

        <h3>For Day Traders</h3>
        <ul>
          <li>Use short-term EMAs: 5, 10, 20 periods</li>
          <li>Focus on quick signals and momentum</li>
          <li>Combine with other short-term indicators</li>
        </ul>

        <h2>Limitations and Best Practices</h2>

        <h3>Common Pitfalls</h3>
        <ul>
          <li><strong>Lagging nature:</strong> Moving averages are always behind current price action</li>
          <li><strong>Whipsaws:</strong> Can generate false signals in sideways/choppy markets</li>
          <li><strong>Parameter selection:</strong> No "perfect" period works for all markets/conditions</li>
          <li><strong>Over-reliance:</strong> Should be used with other analysis tools</li>
        </ul>

        <h3>Best Practices</h3>
        <ul>
          <li><strong>Multiple timeframes:</strong> Use different periods for confirmation</li>
          <li><strong>Volume confirmation:</strong> Look for volume spikes on breakouts</li>
          <li><strong>Market conditions:</strong> Adjust periods based on volatility</li>
          <li><strong>Risk management:</strong> Always use stop losses regardless of signals</li>
        </ul>

        <h2>Conclusion</h2>

        <p>
          Moving averages are powerful tools that every trader should understand. While SMAs provide reliable, stable signals for longer-term analysis, EMAs offer quicker response times for short-term trading. The choice between SMA and EMA ultimately depends on your trading style, timeframe, and market conditions.
        </p>

        <p>
          Remember that moving averages work best when combined with other technical indicators and fundamental analysis. They help filter market noise and identify trends, but they're not crystal balls—they're tools to help you make more informed decisions in an uncertain market environment.
        </p>

        <p>
          As you gain experience, you'll develop a feel for which moving averages work best for your particular strategy. Start with the basics, practice consistently, and always prioritize risk management over chasing perfect signals.
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
