<template>
  <div class="doc-content">
    <h1>Archie AI (In Development)</h1>
    
    <section>
      <div class="note-box security-notice">
        <h3>Experimental Feature</h3>
        <p>
          Archie is an experimental AI agent currently in alpha testing. All suggestions are for informational 
          purposes only and do not constitute legal financial advice. Ereuna assumes no responsibility for 
          trading outcomes based on Archie's recommendations.
        </p>
      </div>
    </section>

    <section>
      <h2>Overview</h2>
      <p>
        Archie is an AI trading agent currently in active development and alpha testing. This advanced AI 
        system is being trained on a comprehensive database containing millions of financial documents to 
        provide users with faster insights and enhanced research support.
      </p>
      <p>
        As a highly experimental tool, Archie is not yet available on the platform, and there is no estimated 
        time of arrival for its release. Development is ongoing, and updates will be announced as progress continues.
      </p>
    </section>

    <section>
      <h2>Planned Capabilities</h2>
      <p>Once released, Archie is designed to offer the following features:</p>
      
      <div class="note-box">
        <h3>Pattern Recognition</h3>
        <p>
          Recognize patterns in financial data by analyzing historical price movements, volume trends, and 
          market conditions to identify potential trading opportunities.
        </p>
      </div>

      <div class="note-box">
        <h3>Price Forecasting</h3>
        <p>
          Attempt price forecasting using machine learning models trained on historical market data, technical 
          indicators, and fundamental analysis to project potential future price movements.
        </p>
      </div>

      <div class="note-box">
        <h3>Valuation Assessment</h3>
        <p>
          Assess price targets and intrinsic values by analyzing company fundamentals, cash flows, earnings, 
          and market conditions to help evaluate whether assets are undervalued or overvalued.
        </p>
      </div>

      <div class="note-box">
        <h3>Trade Suggestions</h3>
        <p>
          Suggest potential trades based on technical analysis, fundamental data, and market conditions. 
          Recommendations will include entry points, price targets, and risk assessments.
        </p>
      </div>

      <div class="note-box">
        <h3>Personalized Learning</h3>
        <p>
          Adapt to individual users based on information from their simulated portfolios. Archie will learn 
          from your trading style, risk tolerance, and preferences to provide increasingly relevant insights.
        </p>
      </div>
    </section>

    <section>
      <h2>Availability and Settings</h2>
      <div class="note-box">
        <h3>Optional Feature</h3>
        <p>
          Archie will be optional and can be toggled on or off in your Account settings. You have full control 
          over whether to enable AI-powered insights in your trading workflow.
        </p>
      </div>

      <div class="note-box">
        <h3>Development Status</h3>
        <p>
          Archie is in active development and alpha testing. The AI is being trained on millions of financial 
          documents and market data points to ensure accuracy and reliability before public release.
        </p>
      </div>
    </section>

    <section>
      <h2>Important Considerations</h2>
      <div class="troubleshoot">
        <h3>Not Financial Advice</h3>
        <ul>
          <li>Archie's suggestions are for informational and educational purposes only</li>
          <li>AI recommendations do not constitute professional financial advice</li>
          <li>Always conduct your own research before making investment decisions</li>
          <li>Consider consulting with a licensed financial advisor for personalized advice</li>
        </ul>

        <h3>Experimental Nature</h3>
        <ul>
          <li>Archie is an experimental AI system still under development</li>
          <li>Accuracy and reliability may vary, especially in volatile market conditions</li>
          <li>AI predictions are probabilistic and not guaranteed outcomes</li>
          <li>Past performance does not guarantee future results</li>
        </ul>

        <h3>User Responsibility</h3>
        <ul>
          <li>Users are solely responsible for their trading decisions</li>
          <li>Ereuna assumes no liability for outcomes based on AI recommendations</li>
          <li>Risk management and position sizing remain the user's responsibility</li>
          <li>Always use appropriate risk controls and stop-losses</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Training Data</h2>
      <p>
        Archie is being trained on an extensive database of financial information, including:
      </p>
      <ul>
        <li><strong>Financial Statements:</strong> Millions of quarterly and annual reports from public companies</li>
        <li><strong>Market Data:</strong> Historical price, volume, and technical indicator data</li>
        <li><strong>News and Analysis:</strong> Financial news articles, analyst reports, and market commentary</li>
        <li><strong>Economic Indicators:</strong> Macroeconomic data, interest rates, and market sentiment indicators</li>
        <li><strong>Corporate Actions:</strong> Dividends, splits, mergers, acquisitions, and other material events</li>
      </ul>
    </section>

    <section>
      <h2>Future Updates</h2>
      <p>
        As development progresses, we'll share updates on Archie's capabilities and expected release timeline. 
        Stay tuned to our release notes and announcements for the latest information on this exciting feature.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
// Documentation component for Archie AI
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

ol, ul {
  margin-left: 1.5rem;
  margin-bottom: 1rem;
  list-style: none;
  padding-left: 0;
}

li {
  font-size: 1rem;
  color: var(--brand-text-secondary);
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

a {
  color: var(--brand-gradient-end);
  text-decoration: underline;
  transition: opacity 0.2s ease;
}

a:hover {
  opacity: 0.8;
}

.note-box {
  background: linear-gradient(135deg, rgba(122, 162, 247, 0.08) 0%, rgba(137, 221, 255, 0.08) 100%);
  border: 1px solid var(--brand-glass-border);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.note-box.security-notice {
  background: linear-gradient(135deg, rgba(247, 180, 122, 0.08) 0%, rgba(255, 200, 137, 0.08) 100%);
  border-color: rgba(247, 180, 122, 0.3);
}

.note-box h3 {
  margin-top: 0;
  color: var(--brand-gradient-start);
  font-size: 1.1rem;
}

.note-box.security-notice h3 {
  color: #f7b47a;
}

.note-box p {
  margin-bottom: 0;
}

.troubleshoot {
  background: var(--brand-bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid var(--brand-glass-border);
}

.troubleshoot h3 {
  color: var(--brand-gradient-start);
  margin-top: 1rem;
  font-size: 1.1rem;
}

.troubleshoot h3:first-child {
  margin-top: 0;
}

.troubleshoot ul {
  margin-left: 1.5rem;
  margin-bottom: 1.5rem;
}

.troubleshoot ul:last-child {
  margin-bottom: 0;
}

strong {
  color: var(--brand-text-primary);
  font-weight: 600;
}
</style>
