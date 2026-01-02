<template>
  <div class="doc-content">
    <h1>Main Chart</h1>
    
    <section>
      <h2>Overview</h2>
      <p>
        The main chart component is built using a <strong>forked version of lightweight-charts</strong> by TradingView, 
        with extensive custom features and tools built on top. This powerful charting engine provides professional-grade 
        analysis capabilities with a focus on performance and usability.
      </p>
      <img class="img" src="/docs/main-chart.png" alt="Main chart with advanced features and drawing tools">
    </section>

    <section>
      <h2>Chart Types</h2>
      <p>
        The chart supports multiple visualization modes to suit different analysis preferences:
      </p>
      <ul>
        <li><strong>Candlestick:</strong> Traditional OHLC candlestick view with color-coded price action</li>
        <li><strong>Bar:</strong> OHLC bar chart for a cleaner view</li>
        <li><strong>Line:</strong> Simple line chart connecting closing prices</li>
        <li><strong>Area:</strong> Filled area chart for trend visualization</li>
        <li><strong>Baseline:</strong> Baseline chart highlighting price movement above/below a reference</li>
        <li><strong>Heikin Ashi:</strong> Smoothed candlesticks that filter out market noise</li>
      </ul>
    </section>

    <section>
      <h2>Timeframes</h2>
      <p>
        Navigate through different time perspectives with support for both intraday and daily timeframes:
      </p>
      <ul>
        <li><strong>Intraday:</strong> 5m, 15m, 30m, 1hr (with real-time WebSocket updates)</li>
        <li><strong>Daily/Weekly:</strong> 1d, 1w</li>
      </ul>
    </section>

    <section>
      <h2>Drawing Tools</h2>
      <p>
        A comprehensive suite of drawing tools for technical analysis, with automatic persistence to save your work:
      </p>
      <ul>
        <li><strong>Ruler:</strong> Measure price and time distance between two points</li>
        <li><strong>Trendline:</strong> Draw trendlines to identify support and resistance</li>
        <li><strong>Box:</strong> Highlight rectangular areas of interest</li>
        <li><strong>Text Annotation:</strong> Add custom text notes directly on the chart</li>
        <li><strong>Freehand:</strong> Draw freeform shapes and patterns</li>
        <li><strong>Price Level:</strong> Mark important price levels with horizontal lines</li>
      </ul>
      <p>
        All drawings are automatically saved to your account and persist across sessions. You can clear all drawings 
        at any time using the clear button.
      </p>
    </section>

    <section>
      <h2>Technical Indicators</h2>
      <p>
        Customize your analysis with up to 4 simultaneous technical indicators:
      </p>
      <ul>
        <li><strong>SMA (Simple Moving Average):</strong> Customizable timeframe (e.g., 20, 50, 200)</li>
        <li><strong>EMA (Exponential Moving Average):</strong> More responsive to recent price changes</li>
        <li><strong>Individual Control:</strong> Toggle visibility and customize each indicator independently</li>
      </ul>
      <p>
        Access the indicator editor through the legend button to configure type, timeframe, and visibility for each indicator.
      </p>
    </section>

    <section>
      <h2>Intrinsic Value Indicator</h2>
      <p>
        A unique feature displaying a price line representing the estimated intrinsic value of the asset. 
        This value is <strong>AI-generated</strong> using advanced machine learning models that analyze multiple 
        factors including financials, market conditions, and historical data.
      </p>
      <div class="note-box">
        <h3>Experimental Feature</h3>
        <p>
          The AI-generated intrinsic value is <strong>highly experimental</strong> and should be used as one of 
          many tools in your analysis toolkit. It is not financial advice and should not be the sole basis for 
          investment decisions. Always conduct your own research and consider multiple valuation methods.
        </p>
      </div>
    </section>

    <section>
      <h2>Chart Markers</h2>
      <p>
        Important corporate events are marked directly on the chart for easy reference:
      </p>
      <ul>
        <li><strong>Earnings:</strong> Quarterly earnings report dates with detailed information on hover</li>
        <li><strong>Dividends:</strong> Dividend payment dates with amounts</li>
        <li><strong>Splits:</strong> Stock split and reverse split events with ratios</li>
      </ul>
      <p>
        Click any marker to see detailed information in a popup. Toggle marker visibility through the chart settings.
      </p>
    </section>

    <section>
      <h2>Pattern Recognition</h2>
      <p>
        Automated technical pattern detection identifies classical chart patterns in real-time. When enabled, 
        the system scans for patterns and overlays them on the chart with visual indicators. Click the patterns 
        button to view all detected patterns with confidence scores.
      </p>
    </section>

    <section>
      <h2>Replay Mode</h2>
      <p>
        An advanced feature that allows you to replay historical price action. 
        Perfect for backtesting strategies and studying past market behavior.
      </p>
      <h3>Replay Controls</h3>
      <ul>
        <li><strong>Date Picker:</strong> Start replay from any historical date in the dataset</li>
        <li><strong>Preset Options:</strong> Quick start from 30, 90, 180, or 365 days ago</li>
        <li><strong>Play/Pause:</strong> Control replay playback</li>
        <li><strong>Step Controls:</strong> Move forward or backward one bar at a time</li>
        <li><strong>Speed Control:</strong> Adjust playback speed (1x, 2x, 4x, etc.)</li>
        <li><strong>Progress Slider:</strong> Jump to any point in the replay timeline</li>
      </ul>
    </section>

    <section>
      <h2>AI Integration</h2>
      <p>
        View AI-generated analysis and recommendations directly from the chart. When available, the AI button 
        displays recent AI insights including technical analysis, fundamental assessment, and actionable recommendations.
      </p>
    </section>

    <section>
      <h2>Trading Signals</h2>
      <p>
        Today's trading signals are displayed when available, showing buy/sell recommendations with confidence levels 
        and reasoning. Click the signals button to view detailed information.
      </p>
    </section>

    <section>
      <h2>Market Status</h2>
      <p>
        Real-time market status indicator shows whether the market is currently open, closed, or on holiday:
      </p>
      <ul>
        <li><strong>Open:</strong> Green indicator with pulsing animation</li>
        <li><strong>Closed:</strong> Gray indicator showing market hours</li>
        <li><strong>Holiday:</strong> Special indicator with holiday name</li>
        <li><strong>Crypto:</strong> Markets operate 24/7 with continuous updates</li>
      </ul>
    </section>

    <section>
      <h2>Earnings Countdown</h2>
      <p>
        When earnings are scheduled, a countdown badge displays the time remaining until the next earnings report. 
        The badge changes color based on urgency (green for distant, yellow for within a week, red for imminent).
      </p>
    </section>

    <section>
      <h2>Additional Features</h2>
      <ul>
        <li><strong>Volume Highlighting:</strong> Volume bars are highlighted when relative volume exceeds 2x the 365-day average</li>
        <li><strong>Crosshair Tracking:</strong> Hover over the chart to see detailed OHLC data and price changes</li>
        <li><strong>Screenshot Tool:</strong> Capture and export chart images with customizable settings</li>
        <li><strong>Infinite Scroll:</strong> Automatically load more historical data as you scroll back</li>
        <li><strong>Real-time Updates:</strong> WebSocket connection provides live price updates for intraday timeframes</li>
        <li><strong>Responsive Design:</strong> Chart automatically resizes to fit your screen</li>
        <li><strong>EOD Badge:</strong> Indicates exchanges with end-of-day data only</li>
      </ul>
    </section>

    <section>
      <h2>Important Notes</h2>
      <div class="note-box">
        <h3>Custom Fork</h3>
        <p>
          This chart is powered by a heavily customized fork of TradingView's lightweight-charts library, with 
          extensive modifications to support advanced features like drawing tools, pattern recognition, replay mode, 
          and persistent storage.
        </p>
      </div>

      <div class="note-box">
        <h3>Performance</h3>
        <p>
          The chart is optimized for performance, handling large datasets efficiently while maintaining smooth 
          interactions and real-time updates. Drawing persistence and settings are saved automatically to your account.
        </p>
      </div>

      <div class="note-box">
        <h3>Continuous Development</h3>
        <p>
          More features and improvements are continuously being added to the chart as the platform evolves. 
          Future enhancements will include additional indicators, more pattern types, and enhanced analysis tools.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Main Chart feature
</script>

<style scoped>
.doc-content {
  max-width: 900px;
  color: var(--brand-text-primary);
  line-height: 1.8;
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--brand-text-primary);
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, var(--brand-gradient-start) 0%, var(--brand-gradient-end) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

h2 {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--brand-text-primary);
  margin-top: 2.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--brand-glass-border);
}

h3 {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--brand-text-primary);
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

section {
  margin-bottom: 2rem;
}

p {
  font-size: 1rem;
  color: var(--brand-text-secondary);
  margin-bottom: 1rem;
}

ul, ol {
  margin-left: 1.5rem;
  margin-bottom: 1rem;
  list-style: none;
  padding-left: 0;
}

ul > li {
  position: relative;
  padding-left: 1.5rem;
}

ul > li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: var(--brand-gradient-start);
  font-weight: 600;
}

ol {
  counter-reset: item;
  list-style: none;
}

ol > li {
  position: relative;
  padding-left: 2rem;
  counter-increment: item;
}

ol > li::before {
  content: counter(item) ".";
  position: absolute;
  left: 0;
  color: var(--brand-gradient-start);
  font-weight: 600;
}

li {
  font-size: 1rem;
  color: var(--brand-text-secondary);
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.note-box {
  background: linear-gradient(135deg, rgba(122, 162, 247, 0.08) 0%, rgba(137, 221, 255, 0.08) 100%);
  border: 1px solid var(--brand-glass-border);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.note-box h3 {
  margin-top: 0;
  color: var(--brand-gradient-start);
  font-size: 1.1rem;
}

.note-box p {
  margin-bottom: 0;
}

strong {
  color: var(--brand-text-primary);
  font-weight: 600;
}

.img {
  width: 100%;
  margin: 1.5rem 0;
  border-radius: 8px;
  border: 1px solid var(--brand-glass-border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
