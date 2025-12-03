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
          As a retail trader who's been actively involved in the markets for five years—starting my journey in 2020—I've experienced firsthand the challenges of swing and position trading alongside long-term investing. What began as a passion for understanding market dynamics quickly revealed the inefficiencies in traditional research workflows. My story with Ereuna isn't just about building a tool; it's about solving real problems that countless retail traders face every day.
        </p>

        <p>
          For years, I relied on established platforms like TradingView for charting and IBD (Investor's Business Daily) for their digital tools and MarketSurge (formerly MarketSmith) for proprietary metrics and formulas. While these tools were powerful individually, the workflow they created was anything but streamlined.
        </p>

        <h2>The Problem: A Manual, Error-Prone Research Process</h2>

        <p>
          My daily routine involved maintaining multiple screeners with intentionally minimal filtering—so I wouldn't risk excluding potentially good candidates by being too restrictive. I'd run IBD screeners sequentially, one after another, then manually scan through the results looking for duplicate stocks across different screens. When I found overlaps, I'd make handwritten notes before importing those ticker symbols into TradingView for technical analysis and charting.
        </p>

        <p>
          This process had several critical flaws:
        </p>

        <ul>
          <li><strong>Time-consuming manual review:</strong> Hours spent cross-referencing screeners and noting duplicates</li>
          <li><strong>Human error:</strong> Easy to miss overlaps or misread data during manual scanning</li>
          <li><strong>Information overload:</strong> Stuck reviewing countless irrelevant symbols that didn't fit my workflow</li>
          <li><strong>No hiding mechanism:</strong> Once a stock appeared in results, there was no pragmatic way to permanently exclude it from future queries</li>
        </ul>

        <p>
          After months of this inefficient workflow, I became curious about new aggregation methods and automation possibilities. I started exploring how to make this process easier and more reliable, implementing various solutions that eventually evolved into the foundation of Ereuna.
        </p>

        <h2>The Solution: Building a Centralized, Automated Platform</h2>

        <p>
          What started as a personal project to centralize my workflow and gain better control over my data quickly became a comprehensive web application. My primary goals were simple but ambitious: speed up the research process through new aggregations and automations, while maintaining the quality and accuracy I needed for confident trading decisions. While AI integration was considered (and could potentially boost research capabilities), it wasn't my main focus, as AI can sometimes be unreliable for critical financial analysis.
        </p>

        <p>
          The screener became the heart of the platform, with two breakthrough features that transformed my workflow:
        </p>

        <h2>Key Features That Revolutionized My Process</h2>

        <h3>1. Asset Hiding for Workflow Customization</h3>
        <p>
          The ability to hide specific assets that don't fit my trading criteria was a game-changer. Stocks that consistently proved irrelevant to my swing trading or long-term investment strategy could now be made invisible in all queries. This eliminated the constant distraction of reviewing symbols I knew weren't suitable, allowing me to focus on genuinely promising opportunities.
        </p>

        <h3>2. Simultaneous Multi-Screener Execution with Smart Deduplication</h3>
        <p>
          Instead of running screeners sequentially and manually hunting for duplicates, I developed a system to select and cherry-pick multiple screeners and execute them simultaneously with a single click. The platform automatically highlights duplicate values, sorts them intelligently, and presents a concise, consolidated list of stocks that match my criteria. Most importantly, irrelevant stocks that don't align with my workflow are automatically filtered out.
        </p>

        <h2>The Impact: 80% Time Reduction Without Sacrificing Quality</h2>

        <p>
          After months of testing and refinement, the results were transformative. My research process sped up by 80% while maintaining—or even improving—the quality of my analysis. What used to take hours of manual cross-referencing and chart review can now be accomplished in minutes with a few strategic clicks.
        </p>

        <p>
          This efficiency gain allows me to:
        </p>

        <ul>
          <li>Review significantly more opportunities without burnout</li>
          <li>Dedicate more time to in-depth analysis of promising candidates</li>
          <li>Stay responsive to market developments and news</li>
          <li>Maintain better work-life balance as a retail trader</li>
          <li>Reduce decision fatigue from information overload</li>
        </ul>

        <h2>Lessons Learned from Building Ereuna</h2>

        <p>
          Developing this platform taught me valuable lessons about both software development and trading workflow optimization:
        </p>

        <h3>1. Personal Pain Points Drive Innovation</h3>
        <p>
          The most effective solutions come from solving real problems you experience daily. My frustration with manual screener management directly led to features that other traders might not have considered.
        </p>

        <h3>2. Automation Must Preserve Quality</h3>
        <p>
          While speed is important, accuracy and reliability are paramount in financial analysis. Every automation I implemented includes validation layers to ensure data integrity and prevent costly mistakes.
        </p>

        <h3>3. User Experience is Everything</h3>
        <p>
          Complex functionality needs an intuitive interface. I focused on making powerful features accessible through simple, streamlined workflows that feel natural to traders.
        </p>

        <h3>4. Continuous Iteration Based on Real Usage</h3>
        <p>
          Building for personal use provided immediate feedback loops. Every feature was tested extensively in real trading scenarios before being refined or expanded.
        </p>

        <h2>The Future: Democratizing Efficient Research</h2>

        <p>
          While AI and machine learning hold promise for financial analysis, the foundation of reliable research remains rooted in solid data management and workflow efficiency. Ereuna represents how addressing the fundamental pain points of retail trading—time, accuracy, and focus—can dramatically improve outcomes.
        </p>

        <p>
          My journey from manual IBD-TradingView workflows to an automated, personalized platform demonstrates that retail traders don't need to accept inefficient processes as "just the way it is." By identifying specific pain points and building targeted solutions, we can create tools that level the playing field and allow individual traders to compete more effectively with institutional players.
        </p>

        <p>
          If you're a retail trader struggling with similar workflow challenges—whether it's manual screener management, information overload, or the inability to customize your research environment—consider how targeted automation and better data control could transform your process. The time savings and improved focus might be exactly what you need to take your trading to the next level.
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
