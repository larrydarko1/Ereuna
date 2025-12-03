<template>
  <div class="blog-container">
    <header class="blog-header">
      <div class="header-content">
        <div class="header-left">
          <img class="header-logo" src="@/assets/icons/ereuna.png" alt="Ereuna" draggable="false" @click="$router.push('/')">
        </div>
        <div class="header-center">
          <div class="search-container">
            <input
              v-model="searchQuery"
              type="text"
              class="search-input"
              placeholder="Search articles, tags..."
            >
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </div>
        </div>
        <nav class="blog-nav">
          <button
            v-for="category in categories"
            :key="category.id"
            class="nav-button"
            :class="{ active: selectedCategory === category.id }"
            @click="selectCategory(category.id)"
          >
            {{ category.name }}
          </button>
        </nav>
      </div>
    </header>
    <main class="blog-main">
      <div v-if="selectedArticle" class="article-view">
        <button class="back-button" @click="selectedArticle = null">← Back to Articles</button>
        <component
          :is="selectedArticle.component"
          v-if="selectedArticle.component"
          :title="selectedArticle.title"
          :date="selectedArticle.date"
          :category="getCategoryName(selectedArticle.category)"
          :tags="selectedArticle.tags"
          :image="selectedArticle.image"
        ></component>
      </div>
      <div v-else class="articles-list">
        <div v-if="filteredArticles.length === 0" class="no-articles">
          <h2>No articles in this category yet.</h2>
          <p>Check back soon for new content!</p>
        </div>
        <article
          v-for="article in filteredArticles"
          :key="article.id"
          class="article-card"
          @click="selectArticle(article)"
        >
          <div class="article-content">
            <div class="article-meta">
              <span class="article-category">{{ getCategoryName(article.category) }}</span>
              <span class="article-date">{{ formatDate(article.date) }}</span>
            </div>
            <h2 class="article-title">{{ article.title }}</h2>
            <p class="article-excerpt">{{ article.excerpt }}</p>
            <div class="article-tags" v-if="article.tags.length">
              <span
                v-for="tag in article.tags.slice(0, 3)"
                :key="tag"
                class="tag"
                @click.stop="searchQuery = tag"
              >
                {{ tag }}
              </span>
            </div>
            <div class="article-footer">
              <span class="read-more">Read more →</span>
            </div>
          </div>
          <div class="article-image">
            <img
              v-if="article.image"
              :src="article.image"
              :alt="article.title"
              class="article-image-content"
              @error="handleImageError"
            >
            <div v-else class="image-placeholder">
              <span>{{ article.title.charAt(0) }}</span>
            </div>
          </div>
        </article>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Post1 from '@/components/blog/Post1.vue'
import Post2 from '@/components/blog/Post2.vue'
import Post3 from '@/components/blog/Post3.vue'
import Post4 from '@/components/blog/Post4.vue'
import Post5 from '@/components/blog/Post5.vue'
import Post6 from '@/components/blog/Post6.vue'
import Post7 from '@/components/blog/Post7.vue'
import Post8 from '@/components/blog/Post8.vue'
import Post9 from '@/components/blog/Post9.vue'

// Define article interface
interface Article {
  id: string
  title: string
  excerpt: string
  date: string
  category: string
  tags: string[]
  image?: string
  component?: any
}

// Define category interface
interface Category {
  id: string
  name: string
}

// Categories
const categories = ref<Category[]>([
  { id: 'all', name: 'All Posts' },
  { id: 'tutorials', name: 'Tutorials' },
  { id: 'updates', name: 'Updates' }
])

// Placeholder articles
const articles = ref<Article[]>([
  {
    id: '1',
    title: 'How I Built an app to Cut My Financial Research Time by 80%',
    excerpt: 'Discover how I developed a powerful financial analysis platform that revolutionized my research workflow, saving countless hours while delivering deeper insights and more accurate analysis.',
    date: '2025-11-30',
    category: 'updates',
    tags: ['efficiency', 'time-saving', 'quantitative-analysis', 'investment-research', 'product-development', 'workflow-optimization', 'financial-tools', 'data-analysis', 'productivity-hack', 'fintech'],
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop&crop=center',
    component: Post1
  },
  {
    id: '2',
    title: 'Everything you need to know about Moving Averages',
    excerpt: 'Master the fundamentals of moving averages with this comprehensive guide covering SMA vs EMA, calculation methods, practical applications, and trading strategies for different market conditions.',
    date: '2025-11-30',
    category: 'tutorials',
    tags: ['technical-analysis', 'moving-averages', 'SMA', 'EMA', 'trading-indicators', 'trend-analysis', 'support-resistance', 'crossover-signals', 'MACD', 'trading-strategies'],
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=200&fit=crop&crop=center',
    component: Post2
  },
  {
    id: '3',
    title: 'Mastering Support and Resistance: The Foundation of Technical Analysis',
    excerpt: 'Learn how to identify and trade support and resistance levels effectively. Discover bounce strategies, breakout trading, and how broken levels become new barriers in this comprehensive guide.',
    date: '2025-11-30',
    category: 'tutorials',
    tags: ['technical-analysis', 'support-resistance', 'price-action', 'trading-strategies', 'chart-analysis', 'trend-lines', 'pivot-points', 'fibonacci', 'breakout-trading', 'risk-management'],
    image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&h=200&fit=crop&crop=center',
    component: Post3
  },
  {
    id: '4',
    title: 'Mastering RSI: The Complete Guide to Relative Strength Index',
    excerpt: 'Learn everything about the Relative Strength Index (RSI) - from basic overbought/oversold signals to advanced divergence strategies. Master momentum analysis with this comprehensive RSI tutorial.',
    date: '2025-11-30',
    category: 'tutorials',
    tags: ['technical-analysis', 'RSI', 'momentum-oscillator', 'overbought-oversold', 'divergence', 'trading-signals', 'momentum-analysis', 'reversal-signals', 'oscillators', 'trading-indicators'],
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop&crop=center',
    component: Post4
  },
  {
    id: '5',
    title: 'MACD Mastery: The Complete Guide to Moving Average Convergence Divergence',
    excerpt: 'Master the powerful MACD indicator with this comprehensive guide covering signal line crossovers, zero line crossovers, divergences, and advanced trading strategies for all market conditions.',
    date: '2025-11-30',
    category: 'tutorials',
    tags: ['technical-analysis', 'MACD', 'momentum-indicator', 'signal-crossover', 'divergence', 'histogram', 'trend-following', 'trading-signals', 'moving-averages', 'oscillators'],
    image: 'https://images.unsplash.com/photo-1618477247222-acbdb0e159b3?w=400&h=200&fit=crop&crop=center',
    component: Post5
  },
  {
    id: '6',
    title: 'Bollinger Bands Mastery: The Complete Guide to Volatility Trading',
    excerpt: 'Master Bollinger Bands with this comprehensive guide covering squeeze strategies, mean reversion, band walks, and advanced techniques for identifying volatility breakouts and trend continuations.',
    date: '2025-12-01',
    category: 'tutorials',
    tags: ['technical-analysis', 'bollinger-bands', 'volatility', 'squeeze', 'mean-reversion', 'band-walk', 'breakout-trading', 'trend-analysis', 'volatility-breakout', 'trading-strategies'],
    image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&h=200&fit=crop&crop=center',
    component: Post6
  },
  {
    id: '7',
    title: 'Candlestick Patterns Mastery: Reading Price Action Like a Pro',
    excerpt: 'Master the language of candlestick patterns with this comprehensive guide covering single and multiple candle formations, reversal signals, continuation patterns, and advanced price action analysis.',
    date: '2025-12-01',
    category: 'tutorials',
    tags: ['technical-analysis', 'candlestick-patterns', 'price-action', 'hammer', 'engulfing', 'doji', 'morning-star', 'evening-star', 'reversal-patterns', 'continuation-patterns'],
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=200&fit=crop&crop=center',
    component: Post7
  },
  {
    id: '8',
    title: 'Volume Analysis Mastery: Understanding Market Participation',
    excerpt: 'Master volume analysis with this comprehensive guide covering On-Balance Volume (OBV), Volume-Weighted Average Price (VWAP), volume patterns, and advanced techniques for confirming trends and identifying reversals.',
    date: '2025-12-01',
    category: 'tutorials',
    tags: ['technical-analysis', 'volume-analysis', 'OBV', 'VWAP', 'volume-patterns', 'market-participation', 'trend-confirmation', 'volume-spike', 'accumulation-distribution', 'trading-volume'],
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop&crop=center',
    component: Post8
  },
  {
    id: '9',
    title: 'Fibonacci Retracements: The Golden Ratio in Trading',
    excerpt: 'Master Fibonacci retracements with this comprehensive guide covering the Golden Ratio, drawing techniques, trading strategies, extensions, and advanced applications for identifying key support and resistance levels.',
    date: '2025-12-01',
    category: 'tutorials',
    tags: ['technical-analysis', 'fibonacci', 'golden-ratio', 'retracements', 'extensions', 'support-resistance', 'fibonacci-arcs', 'fibonacci-fans', 'trading-strategies', 'price-projections'],
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop&crop=center',
    component: Post9
  }
])

const selectedCategory = ref('all')
const selectedArticle = ref<Article | null>(null)
const searchQuery = ref('')

const filteredArticles = computed(() => {
  let filtered = articles.value

  // Filter by category
  if (selectedCategory.value !== 'all') {
    filtered = filtered.filter(article => article.category === selectedCategory.value)
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(article =>
      article.title.toLowerCase().includes(query) ||
      article.excerpt.toLowerCase().includes(query) ||
      article.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }

  return filtered
})

const selectCategory = (category: string) => {
  selectedCategory.value = category
  selectedArticle.value = null
}

const selectArticle = (article: Article) => {
  selectedArticle.value = article
  // Dynamic component loading would go here
}

const getCategoryName = (categoryId: string) => {
  const category = categories.value.find(c => c.id === categoryId)
  return category ? category.name : categoryId
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
  // Show fallback placeholder
  const placeholder = img.parentElement?.querySelector('.image-placeholder') as HTMLElement
  if (placeholder) {
    placeholder.style.display = 'flex'
  }
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
  --volume: #708090;
  --ma4: #9ece6a;
  --ma3: #e0af68;
  --ma2: #7aa2f7;
  --ma1: #bb9af7;
}

.blog-container {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--base1) 0%, var(--base4) 50%, var(--base1) 100%);
  color: var(--text1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.blog-header {
  background: rgba(36, 40, 59, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(65, 72, 104, 0.3);
  padding: 0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.header-content {
  margin: 0 auto;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-center {
  flex: 1;
  max-width: 400px;
  margin: 0 2rem;
}

.search-container {
  position: relative;
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 3rem;
  border: 1px solid rgba(65, 72, 104, 0.4);
  border-radius: 6px;
  background-color: rgba(36, 40, 59, 0.6);
  color: var(--text1);
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.search-input:focus {
  border-color: var(--accent1);
}

.search-input::placeholder {
  color: var(--text2);
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: var(--text2);
  pointer-events: none;
}

.header-logo {
  height: 32px;
  width: auto;
  cursor: pointer;
  opacity: 0.9;
  transition: opacity 0.2s ease;
}

.header-logo:hover {
  opacity: 1;
}

.blog-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent1);
  margin: 0;
}

.blog-nav {
  display: flex;
  gap: 0.5rem;
}

.nav-button {
  background: rgba(65, 72, 104, 0.3);
  border: 1px solid rgba(65, 72, 104, 0.2);
  color: var(--text2);
  font-size: 0.9rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.nav-button:hover {
  background: rgba(65, 72, 104, 0.5);
  border-color: rgba(122, 162, 247, 0.3);
  color: var(--text1);
}

.nav-button.active {
  background: var(--accent1);
  border-color: var(--accent1);
  color: var(--base1);
  box-shadow: 0 0 20px rgba(122, 162, 247, 0.3);
}

.blog-main {
  max-width: 900px;
  margin: 0 auto;
  padding: 1.5rem;
}

.articles-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.no-articles {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text2);
}

.no-articles h2 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
  color: var(--text1);
}

.article-card {
  background-color: var(--base2);
  border: 1px solid var(--base3);
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.article-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border-color: var(--accent1);
}

.article-content {
  padding: 1.25rem;
  flex: 1;
}

.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.8rem;
}

.article-category {
  background-color: var(--accent1);
  color: var(--base1);
  padding: 0.2rem 0.6rem;
  border-radius: 3px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-size: 0.75rem;
}

.article-date {
  color: var(--text2);
}

.article-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text1);
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
}

.article-excerpt {
  color: var(--text2);
  line-height: 1.5;
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tag {
  background-color: var(--base3);
  color: var(--text2);
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag:hover {
  background-color: var(--accent1);
  color: var(--base1);
}

.article-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.read-more {
  color: var(--accent1);
  font-weight: 500;
  font-size: 0.85rem;
  transition: color 0.2s ease;
}

.article-card:hover .read-more {
  color: var(--accent2);
}

.article-image {
  height: 100px;
  background-color: var(--base3);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.article-image-content {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.article-card:hover .article-image-content {
  transform: scale(1.05);
}

.image-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--accent1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--base1);
}

.article-view {
  padding: 1rem 0;
}

.back-button {
  background: none;
  border: none;
  color: var(--accent1);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 1rem;
  padding: 0.25rem 0;
  transition: color 0.2s ease;
}

.back-button:hover {
  color: var(--accent2);
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
    padding: 0.75rem 1rem;
  }

  .header-left {
    gap: 0.75rem;
  }

  .header-center {
    margin: 0;
    max-width: none;
    order: 3;
    width: 100%;
  }

  .search-container {
    max-width: none;
  }

  .blog-nav {
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.25rem;
    order: 2;
  }

  .nav-button {
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
  }

  .blog-main {
    padding: 1rem;
  }

  .articles-list {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .article-card {
    flex-direction: column;
  }

  .article-content {
    padding: 1rem;
  }

  .article-title {
    font-size: 1.1rem;
  }

  .article-image {
    height: 80px;
  }

  .image-placeholder {
    width: 30px;
    height: 30px;
    font-size: 0.9rem;
  }

  .search-container {
  position: relative;
  width: 90%;
}
}
</style>