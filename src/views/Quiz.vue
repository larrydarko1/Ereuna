<template>
  <div class="quiz-container">
    <!-- Navigation -->
    <nav class="simple-nav">
      <div class="nav-content">
        <router-link to="/" class="nav-logo">
          <img src="@/assets/icons/ereuna.png" alt="Ereuna" />
        </router-link>
        <input type="checkbox" id="nav-toggle" class="nav-toggle" />
        <label for="nav-toggle" class="nav-toggle-label" aria-label="Toggle navigation menu">
          <span></span>
          <span></span>
        </label>
        <div class="nav-links">
          <router-link to="/documentation" class="nav-link">Documentation</router-link>
          <router-link to="/about" class="nav-link">About</router-link>
        </div>
      </div>
    </nav>

    <div class="quiz-header">
      <h1 style="padding-top: 100px;">Is Ereuna Right for You?</h1>
      <p>Answer a few quick questions to see if our platform matches your investment style and needs.</p>
    </div>

    <!-- Start Screen -->
    <div v-if="!quizStarted && !showResults" class="start-screen">
      <div class="start-card">
        <div class="quiz-info">
          <div class="info-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>Takes 2-3 minutes</span>
          </div>
          <div class="info-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 11l3 3L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>{{ questions.length }} questions</span>
          </div>
          <div class="info-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>See your compatibility score</span>
          </div>
        </div>
        <button @click="startQuiz" class="start-btn">
          Start Quiz
          <svg class="button-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9.71069 18.2929C10.1012 18.6834 10.7344 18.6834 11.1249 18.2929L16.0123 13.4006C16.7927 12.6195 16.7924 11.3537 16.0117 10.5729L11.1213 5.68254C10.7308 5.29202 10.0976 5.29202 9.70708 5.68254C9.31655 6.07307 9.31655 6.70623 9.70708 7.09676L13.8927 11.2824C14.2833 11.6729 14.2833 12.3061 13.8927 12.6966L9.71069 16.8787C9.32016 17.2692 9.32016 17.9023 9.71069 18.2929Z" fill="currentColor"></path>
          </svg>
        </button>
      </div>
    </div>

    <div v-if="quizStarted && !showResults" class="quiz-content">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${(currentQuestion + 1) / questions.length * 100}%` }"></div>
      </div>
      <div class="question-counter">Question {{ currentQuestion + 1 }} of {{ questions.length }}</div>

      <div class="question-card">
        <h2>{{ questions[currentQuestion].question }}</h2>
        <p v-if="questions[currentQuestion].subtitle" class="question-subtitle">{{ questions[currentQuestion].subtitle }}</p>
        <div class="options">
          <div
            v-for="(option, index) in questions[currentQuestion].options"
            :key="index"
            class="option"
            :class="{ 
              selected: isSelected(index),
              'multi-select': questions[currentQuestion].multiSelect
            }"
            @click="selectOption(index)"
          >
            <div class="option-content">
              <div class="option-checkbox" v-if="questions[currentQuestion].multiSelect">
                <div class="checkbox-box" :class="{ checked: isSelected(index) }">
                  <svg v-if="isSelected(index)" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
              <span class="option-text">{{ option.text }}</span>
              <div v-if="!questions[currentQuestion].multiSelect && isSelected(index)" class="checkmark">✓</div>
            </div>
          </div>
        </div>
      </div>

      <div class="navigation-buttons">
        <button
          v-if="currentQuestion > 0"
          @click="previousQuestion"
          class="nav-btn prev-btn"
        >
          <svg class="button-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(180deg);">
            <path d="M9.71069 18.2929C10.1012 18.6834 10.7344 18.6834 11.1249 18.2929L16.0123 13.4006C16.7927 12.6195 16.7924 11.3537 16.0117 10.5729L11.1213 5.68254C10.7308 5.29202 10.0976 5.29202 9.70708 5.68254C9.31655 6.07307 9.31655 6.70623 9.70708 7.09676L13.8927 11.2824C14.2833 11.6729 14.2833 12.3061 13.8927 12.6966L9.71069 16.8787C9.32016 17.2692 9.32016 17.9023 9.71069 18.2929Z" fill="currentColor"></path>
          </svg>
          Previous
        </button>
        <button
          v-if="canProceed"
          @click="nextQuestion"
          class="nav-btn next-btn"
        >
          <span>{{ currentQuestion === questions.length - 1 ? 'See Results' : 'Next' }}</span>
          <svg v-if="currentQuestion !== questions.length - 1" class="button-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9.71069 18.2929C10.1012 18.6834 10.7344 18.6834 11.1249 18.2929L16.0123 13.4006C16.7927 12.6195 16.7924 11.3537 16.0117 10.5729L11.1213 5.68254C10.7308 5.29202 10.0976 5.29202 9.70708 5.68254C9.31655 6.07307 9.31655 6.70623 9.70708 7.09676L13.8927 11.2824C14.2833 11.6729 14.2833 12.3061 13.8927 12.6966L9.71069 16.8787C9.32016 17.2692 9.32016 17.9023 9.71069 18.2929Z" fill="currentColor"></path>
          </svg>
        </button>
      </div>
    </div>

    <div v-if="showResults" class="results">
      <div class="result-card">
        <!-- Compatibility Score -->
        <div class="compatibility-score">
          <div class="score-label">Compatibility Score</div>
          <div class="score-value" :class="scoreClass">{{ compatibilityScore }}%</div>
          <div class="score-bar">
            <div class="score-fill" :style="{ width: `${compatibilityScore}%` }" :class="scoreClass"></div>
          </div>
        </div>
        
        <h2>{{ resultTitle }}</h2>
        <p class="result-description">{{ resultDescription }}</p>

        <div v-if="dealBreakers.length > 0" class="deal-breakers">
          <h4>⚠️ Important Considerations</h4>
          <ul>
            <li v-for="(item, index) in dealBreakers" :key="index">{{ item }}</li>
          </ul>
        </div>

        <div v-if="keyFeatures.length > 0" class="key-features">
          <h4>✓ What You'll Get</h4>
          <ul>
            <li v-for="(feature, index) in keyFeatures" :key="index">{{ feature }}</li>
          </ul>
        </div>

        <div class="action-buttons">
          <button @click="resetQuiz" class="reset-btn">Retake Quiz</button>
          <router-link v-if="isGoodMatch" to="/signup" class="signup-btn">
            Get Started
            <svg class="button-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.71069 18.2929C10.1012 18.6834 10.7344 18.6834 11.1249 18.2929L16.0123 13.4006C16.7927 12.6195 16.7924 11.3537 16.0117 10.5729L11.1213 5.68254C10.7308 5.29202 10.0976 5.29202 9.70708 5.68254C9.31655 6.07307 9.31655 6.70623 9.70708 7.09676L13.8927 11.2824C14.2833 11.6729 14.2833 12.3061 13.8927 12.6966L9.71069 16.8787C9.32016 17.2692 9.32016 17.9023 9.71069 18.2929Z" fill="currentColor"></path>
            </svg>
          </router-link>
          <router-link v-else to="/about" class="learn-more-btn">Learn More About Us</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const quizStarted = ref(false)
const currentQuestion = ref(0)
const selectedOption = ref<number | null>(null)
const selectedOptions = ref<number[]>([]) // For multi-select questions
const answers = ref<{ single?: number; multi?: number[] }[]>([])
const showResults = ref(false)

const startQuiz = () => {
  quizStarted.value = true
}

interface QuizOption {
  text: string
  value: string // Used for filtering logic
  weight?: number // For scoring
}

interface QuizQuestion {
  question: string
  subtitle?: string
  multiSelect?: boolean
  options: QuizOption[]
  filterKey: string // Key to identify what we're filtering for
}

const questions: QuizQuestion[] = [
  {
    question: "What's your primary investment style?",
    subtitle: "Select the one that best describes you",
    multiSelect: false,
    filterKey: "investmentStyle",
    options: [
      { text: "Day Trading - I trade multiple times per day", value: "dayTrader", weight: 0 },
      { text: "Swing Trading - I hold positions for days to weeks", value: "swingTrader", weight: 7 },
      { text: "Position Trading - I hold for weeks to months", value: "positionTrader", weight: 10 },
      { text: "Long-term Investing - I buy and hold for months to years", value: "longTerm", weight: 10 }
    ]
  },
  {
    question: "Which asset types are you interested in?",
    subtitle: "Select all that apply - we support US-listed securities",
    multiSelect: true,
    filterKey: "assetTypes",
    options: [
      { text: "US Stocks", value: "usStocks", weight: 10 },
      { text: "US ETFs", value: "usEtfs", weight: 10 },
      { text: "US Mutual Funds", value: "usMutualFunds", weight: 10 },
      { text: "International stocks (US-listed ADRs are fine)", value: "international", weight: 7 },
      { text: "Cryptocurrencies", value: "crypto", weight: 0 },
      { text: "Forex / Currency Trading", value: "forex", weight: 0 },
      { text: "Futures & Derivatives", value: "futures", weight: 0 },
      { text: "Non-US markets (Shanghai, Hong Kong, European exchanges)", value: "foreignMarkets", weight: 0 },
      { text: "UCITS ETFs / European Mutual Funds", value: "ucits", weight: 0 }
    ]
  },
  {
    question: "What level of charting tools do you need?",
    subtitle: "Be honest about what you'll actually use",
    multiSelect: false,
    filterKey: "chartingNeeds",
    options: [
      { text: "Basic price charts and simple moving averages are enough", value: "basic", weight: 10 },
      { text: "Moderate - I need some technical indicators (RSI, MACD, Bollinger)", value: "moderate", weight: 8 },
      { text: "Advanced - I need sophisticated indicators like TradingView", value: "advanced", weight: 3 },
      { text: "Professional - I need custom indicators and advanced drawing tools", value: "professional", weight: 0 }
    ]
  },
  {
    question: "Do you require real-time bid/ask (Level 2) data?",
    subtitle: "Full TOPS order book data",
    multiSelect: false,
    filterKey: "level2Data",
    options: [
      { text: "Yes, absolutely essential for my trading", value: "required", weight: 0 },
      { text: "Nice to have, but not critical", value: "niceToHave", weight: 5 },
      { text: "No, delayed quotes and last prices are sufficient", value: "notNeeded", weight: 10 }
    ]
  },
  {
    question: "How important is cost when choosing a platform?",
    subtitle: "Our subscription is €14.99 + VAT per month",
    multiSelect: false,
    filterKey: "costSensitivity",
    options: [
      { text: "Very important - I'm looking to minimize monthly costs", value: "veryImportant", weight: 10 },
      { text: "Somewhat important - I want good value for money", value: "important", weight: 8 },
      { text: "Not very important - I prefer premium features regardless of cost", value: "notImportant", weight: 3 },
      { text: "Cost is no concern - I need the best tools available", value: "noConcern", weight: 0 }
    ]
  },
  {
    question: "What's your main goal with investment research tools?",
    subtitle: "Select all that apply",
    multiSelect: true,
    filterKey: "researchGoals",
    options: [
      { text: "Speed up my fundamental research and analysis", value: "speedResearch", weight: 10 },
      { text: "Access company filings and documents easily", value: "filings", weight: 10 },
      { text: "Track and manage my portfolio", value: "portfolio", weight: 10 },
      { text: "Find new investment opportunities", value: "screening", weight: 10 },
      { text: "Execute quick technical analysis for entries/exits", value: "technicalTrading", weight: 3 },
      { text: "Reduce subscription costs from multiple platforms", value: "consolidate", weight: 10 }
    ]
  },
  {
    question: "Are you comfortable with a platform that focuses on simplicity?",
    subtitle: "We prioritize essential features over extensive complexity",
    multiSelect: false,
    filterKey: "simplicityAcceptance",
    options: [
      { text: "Yes, I prefer simple and efficient over feature-packed", value: "prefer", weight: 10 },
      { text: "Yes, as long as core features are solid", value: "acceptable", weight: 9 },
      { text: "Somewhat - I need a good balance of features", value: "balance", weight: 7 },
      { text: "No, I need comprehensive features and tools", value: "needComprehensive", weight: 3 }
    ]
  },
  {
    question: "How much time do you spend on investment research per week?",
    subtitle: "This helps us understand your usage pattern",
    multiSelect: false,
    filterKey: "timeCommitment",
    options: [
      { text: "Less than 2 hours - I check occasionally", value: "minimal", weight: 8 },
      { text: "2-5 hours - Regular but not intensive", value: "moderate", weight: 10 },
      { text: "5-15 hours - Active research and monitoring", value: "active", weight: 10 },
      { text: "15+ hours - This is a major time commitment", value: "intensive", weight: 7 }
    ]
  }
]

const isSelected = (index: number): boolean => {
  if (questions[currentQuestion.value].multiSelect) {
    return selectedOptions.value.includes(index)
  }
  return selectedOption.value === index
}

const canProceed = computed(() => {
  if (questions[currentQuestion.value].multiSelect) {
    return selectedOptions.value.length > 0
  }
  return selectedOption.value !== null
})

const selectOption = (index: number) => {
  if (questions[currentQuestion.value].multiSelect) {
    const idx = selectedOptions.value.indexOf(index)
    if (idx > -1) {
      selectedOptions.value.splice(idx, 1)
    } else {
      selectedOptions.value.push(index)
    }
  } else {
    selectedOption.value = index
  }
}

const nextQuestion = () => {
  // Save answer
  if (questions[currentQuestion.value].multiSelect) {
    answers.value[currentQuestion.value] = { multi: [...selectedOptions.value] }
  } else if (selectedOption.value !== null) {
    answers.value[currentQuestion.value] = { single: selectedOption.value }
  }

  if (currentQuestion.value < questions.length - 1) {
    currentQuestion.value++
    // Load saved answer if exists
    const savedAnswer = answers.value[currentQuestion.value]
    if (savedAnswer) {
      if (savedAnswer.multi) {
        selectedOptions.value = [...savedAnswer.multi]
        selectedOption.value = null
      } else if (savedAnswer.single !== undefined) {
        selectedOption.value = savedAnswer.single
        selectedOptions.value = []
      }
    } else {
      selectedOption.value = null
      selectedOptions.value = []
    }
  } else {
    showResults.value = true
  }
}

const previousQuestion = () => {
  if (currentQuestion.value > 0) {
    currentQuestion.value--
    const savedAnswer = answers.value[currentQuestion.value]
    if (savedAnswer) {
      if (savedAnswer.multi) {
        selectedOptions.value = [...savedAnswer.multi]
        selectedOption.value = null
      } else if (savedAnswer.single !== undefined) {
        selectedOption.value = savedAnswer.single
        selectedOptions.value = []
      }
    } else {
      selectedOption.value = null
      selectedOptions.value = []
    }
  }
}

// Calculate total score
const totalScore = computed(() => {
  let score = 0
  answers.value.forEach((answer, qIndex) => {
    if (answer.single !== undefined) {
      score += questions[qIndex].options[answer.single].weight || 0
    } else if (answer.multi) {
      answer.multi.forEach(optIndex => {
        score += questions[qIndex].options[optIndex].weight || 0
      })
    }
  })
  return score
})

// Analyze answers for deal breakers and fit
const analysisResult = computed(() => {
  const dealBreakers: string[] = []
  const userSelections: Record<string, any> = {}

  answers.value.forEach((answer, qIndex) => {
    const question = questions[qIndex]
    if (answer.single !== undefined) {
      const option = question.options[answer.single]
      userSelections[question.filterKey] = option.value
      
      // Check for deal breakers - more lenient
      if (question.filterKey === 'investmentStyle' && option.value === 'dayTrader') {
        dealBreakers.push("Our platform works best for swing, position, and long-term traders")
      }
      if (question.filterKey === 'level2Data' && option.value === 'required') {
        dealBreakers.push("We don't currently offer full TOPS (Level 2) bid/ask data")
      }
      if (question.filterKey === 'chartingNeeds' && option.value === 'professional') {
        dealBreakers.push("We don't support custom indicators - our charting is more straightforward")
      }
    } else if (answer.multi) {
      const selectedValues = answer.multi.map(optIndex => question.options[optIndex].value)
      userSelections[question.filterKey] = selectedValues
      
      // Check for deal breakers in multi-select - only hard blockers
      if (question.filterKey === 'assetTypes') {
        const hardBlockers = selectedValues.filter(v => 
          ['crypto', 'forex', 'futures', 'foreignMarkets', 'ucits'].includes(v)
        )
        if (hardBlockers.length > 0) {
          const blockerText = []
          if (hardBlockers.includes('crypto')) blockerText.push('cryptocurrencies')
          if (hardBlockers.includes('forex')) blockerText.push('forex')
          if (hardBlockers.includes('futures')) blockerText.push('futures')
          if (hardBlockers.includes('foreignMarkets')) blockerText.push('non-US exchanges')
          if (hardBlockers.includes('ucits')) blockerText.push('UCITS funds')
          
          if (blockerText.length > 0) {
            dealBreakers.push(`We currently don't support: ${blockerText.join(', ')}. We focus on US-listed securities.`)
          }
        }
      }
    }
  })

  return { dealBreakers, userSelections }
})

// Calculate compatibility score as percentage
const compatibilityScore = computed(() => {
  const maxScore = questions.reduce((sum, q) => {
    if (q.multiSelect) {
      return sum + Math.max(...q.options.map(o => o.weight || 0)) * 3 // Assume avg 3 selections
    }
    return sum + Math.max(...q.options.map(o => o.weight || 0))
  }, 0)
  
  const scorePercentage = Math.round((totalScore.value / maxScore) * 100)
  return Math.min(100, Math.max(0, scorePercentage))
})

// Score class for styling
const scoreClass = computed(() => {
  const score = compatibilityScore.value
  if (score >= 80) return 'excellent'
  if (score >= 65) return 'good'
  if (score >= 50) return 'fair'
  return 'poor'
})

const isGoodMatch = computed(() => {
  // More lenient: 55%+ score and no more than 1 deal breaker
  return compatibilityScore.value >= 55 && analysisResult.value.dealBreakers.length <= 1
})

const resultClass = computed(() => {
  return isGoodMatch.value ? 'good-match' : 'poor-match'
})

const resultTitle = computed(() => {
  const score = compatibilityScore.value
  if (score >= 80) {
    return "Ereuna is an Excellent Fit! 🎯"
  } else if (score >= 65) {
    return "Ereuna is a Great Match! ✓"
  } else if (score >= 50) {
    return "Ereuna Could Work For You"
  } else {
    return "Ereuna May Not Be the Best Fit"
  }
})

const resultDescription = computed(() => {
  const score = compatibilityScore.value
  if (score >= 80) {
    return "Based on your answers, Ereuna aligns excellently with your investment style and needs. You're looking for exactly what we offer: a cost-effective platform for fundamental research on US markets with essential features and no unnecessary complexity."
  } else if (score >= 65) {
    return "Ereuna appears to be a strong match for your needs. Our platform should cover most of what you're looking for in an investment research tool, with a focus on efficiency and value."
  } else if (score >= 50) {
    return "Ereuna could work for your needs, though some features you want might be limited. We recommend reviewing the details below to see if our current offering aligns with your priorities."
  } else {
    return "Based on your requirements, there might be better alternatives that match your specific needs more closely. Consider the points below to make an informed decision."
  }
})

const dealBreakers = computed(() => {
  return analysisResult.value.dealBreakers
})

const keyFeatures = computed(() => {
  if (!isGoodMatch.value) return []
  
  return [
    "€14.99 + VAT per month - significantly cheaper than competitors",
    "Access to 450M+ financial documents and filings",
    "Coverage of 60,000+ US stocks, ETFs, mutual funds, and cryptocurrencies",
    "Portfolio tracking and management tools",
    "Clean, focused interface designed for efficiency",
    "Essential charting with key technical indicators",
    "Fast fundamental research and screening tools"
  ]
})

const resetQuiz = () => {
  quizStarted.value = false
  currentQuestion.value = 0
  selectedOption.value = null
  selectedOptions.value = []
  answers.value = []
  showResults.value = false
}

</script>

<style scoped>
.quiz-container {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--brand-bg-primary) 0%, var(--brand-bg-secondary) 100%);
  color: var(--brand-text-primary);
  position: relative;
  overflow-x: hidden;
  padding: 2rem;
}

.quiz-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 80%, color-mix(in srgb, var(--brand-primary) calc(var(--brand-sphere-opacity) * 100%), transparent) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, color-mix(in srgb, var(--brand-secondary) calc(var(--brand-sphere-opacity) * 100%), transparent) 0%, transparent 50%);
  pointer-events: none;
}

/* Navigation */
.simple-nav {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: transparent;
  padding: 2.5rem 2rem;
}

.nav-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-logo img {
  height: 60px;
  width: auto;
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.nav-logo:hover img {
  opacity: 1;
}

.nav-links {
  display: flex;
  gap: 4rem;
}

.nav-link {
  color: var(--brand-text-secondary);
  text-decoration: none;
  font-size: 1.3rem;
  font-weight: 500;
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.nav-link:hover {
  opacity: 1;
}

.nav-toggle {
  display: none;
}

.nav-toggle-label {
  display: none;
  flex-direction: column;
  justify-content: space-around;
  width: 25px;
  height: 25px;
  cursor: pointer;
  margin-left: auto;
  margin-right: 20px;
  user-select: none;
  gap: 5px;
}

.nav-toggle-label span {
  display: block;
  height: 3px;
  background: var(--brand-text-secondary);
  border-radius: 2px;
  transition: all 0.3s ease;
  transform-origin: 1.5px center;
}

.nav-toggle-label span:nth-child(1),
.nav-toggle-label span:nth-child(2) {
  width: 25px;
}

#nav-toggle:checked + .nav-toggle-label span:nth-child(1) {
  transform: rotate(45deg);
}

#nav-toggle:checked + .nav-toggle-label span:nth-child(2) {
  transform: rotate(-45deg);
}

/* Quiz Header */
.quiz-header {
  text-align: center;
  margin-bottom: 3rem;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  position: relative;
  z-index: 1;
}

.quiz-header h1 {
  font-size: 2.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--brand-text-primary), var(--brand-primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.quiz-header p {
  color: var(--brand-text-secondary);
  font-size: 1.3rem;
  line-height: 1.6;
  opacity: 0.9;
}

/* Start Screen */
.start-screen {
  display: flex;
  justify-content: center;
  padding: 2rem;
  position: relative;
  z-index: 1;
}

.start-card {
  background: var(--brand-bg-secondary);
  border-radius: 12px;
  padding: 3rem 2.5rem;
  max-width: 600px;
  width: 100%;
  border: 1px solid var(--brand-glass-border);
  text-align: center;
}

.start-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  color: var(--brand-bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: bold;
  margin: 0 auto 2rem;
}

.quiz-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2.5rem;
  text-align: left;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--brand-text-secondary);
  font-size: 1rem;
  padding: 0.75rem 1rem;
  background: var(--brand-bg-primary);
  border-radius: 8px;
  border: 1px solid var(--brand-glass-border);
}

.info-item span {
  color: var(--brand-text-primary);
  font-size: 1.5rem;
}

.info-item svg {
  color: var(--brand-primary);
  flex-shrink: 0;
}

.start-btn {
  padding: 1rem 2.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1.5rem;
  font-weight: 600;
  cursor: pointer;
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  color: var(--brand-bg-primary);
  transition: all 0.2s ease;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.start-btn:hover {
  opacity: 0.9;
}

.start-btn:active {
  transform: scale(0.98);
}

.button-arrow {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
}

/* Quiz Content */
.quiz-content {
  position: relative;
  z-index: 1;
  max-width: 800px;
  margin: 0 auto;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--brand-bg-secondary);
  border-radius: 4px;
  margin-bottom: 2rem;
  overflow: hidden;
  border: 1px solid var(--brand-glass-border);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--brand-primary), var(--brand-secondary));
  transition: width 0.4s ease;
}

.question-counter {
  text-align: center;
  color: var(--brand-text-secondary);
  margin-bottom: 2rem;
  font-weight: 500;
  font-size: 1rem;
}

.question-card {
  background: var(--brand-bg-secondary);
  border-radius: 12px;
  padding: 2.5rem;
  margin-bottom: 2rem;
  border: 1px solid var(--brand-glass-border);
}

.question-card h2 {
  color: var(--brand-text-primary);
  margin-bottom: 0.75rem;
  font-size: 1.5rem;
  line-height: 1.4;
  font-weight: 600;
}

.question-subtitle {
  color: var(--brand-text-secondary);
  font-size: 0.95rem;
  margin-bottom: 2rem;
  opacity: 0.85;
  font-style: italic;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option {
  border: 1px solid var(--brand-glass-border);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;
  background: var(--brand-bg-primary);
  min-height: 20px; /* Fixed height to prevent size changes */
}

.option:hover {
  border-color: var(--brand-primary);
  background: var(--brand-bg-secondary);
}

.option.selected {
  border-color: var(--brand-primary);
  background: var(--brand-bg-secondary);
}

.option.multi-select.selected {
  border-color: var(--brand-secondary);
}

.option-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.option-checkbox {
  flex-shrink: 0;
}

.checkbox-box {
  width: 20px;
  height: 20px;
  border: 2px solid var(--brand-glass-border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  background: var(--brand-bg-primary);
}

.checkbox-box.checked {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: var(--brand-bg-primary);
}

.option-text {
  font-size: 1rem;
  color: var(--brand-text-primary);
  flex: 1;
  line-height: 1.4;
}

.checkmark {
  color: var(--brand-primary);
  font-size: 1.25rem;
  font-weight: bold;
  flex-shrink: 0;
}

.navigation-buttons {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 2rem;
}

.nav-btn {
  padding: 0.875rem 1.75rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.prev-btn {
  background: var(--brand-bg-secondary);
  color: var(--brand-text-secondary);
  border: 1px solid var(--brand-glass-border);
}

.prev-btn:hover {
  background: var(--brand-bg-card-hover);
  color: var(--brand-text-primary);
}

.next-btn {
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  color: var(--brand-bg-primary);
}

.next-btn:hover {
  opacity: 0.9;
}

.next-btn:active,
.prev-btn:active {
  transform: scale(0.98);
}

/* Results */
.results {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
  position: relative;
  z-index: 1;
}

.result-card {
  background: var(--brand-bg-secondary);
  border-radius: 12px;
  padding: 3rem 2.5rem;
  text-align: center;
  max-width: 700px;
  width: 100%;
  border: 1px solid var(--brand-glass-border);
}

/* Compatibility Score */
.compatibility-score {
  margin-bottom: 2.5rem;
  padding: 2rem;
  background: var(--base1);
  border-radius: 10px;
  border: 1px solid var(--base3);
}

.score-label {
  font-size: 0.9rem;
  color: var(--text2);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.75rem;
  font-weight: 500;
}

.score-value {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.score-value.excellent {
  color: #9ece6a;
}

.score-value.good {
  color: var(--brand-primary);
}

.score-value.fair {
  color: #e0af68;
}

.score-value.poor {
  color: #f7768e;
}

.score-bar {
  width: 100%;
  height: 12px;
  background: var(--brand-bg-secondary);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--brand-glass-border);
}

.score-fill {
  height: 100%;
  transition: width 0.6s ease;
  border-radius: 6px;
}

.score-fill.excellent {
  background: #9ece6a;
}

.score-fill.good {
  background: var(--brand-primary);
}

.score-fill.fair {
  background: #e0af68;
}

.score-fill.poor {
  background: #f7768e;
}

.result-card h2 {
  color: var(--brand-text-primary);
  margin-bottom: 1.25rem;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
}

.result-description {
  color: var(--brand-text-secondary);
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.deal-breakers,
.key-features {
  text-align: left;
  margin-bottom: 2rem;
  background: var(--brand-bg-primary);
  padding: 1.5rem;
  border-radius: 10px;
  border: 1px solid var(--brand-glass-border);
}

.deal-breakers h4,
.key-features h4 {
  color: var(--brand-text-primary);
  margin-bottom: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.deal-breakers ul,
.key-features ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.deal-breakers li,
.key-features li {
  color: var(--brand-text-secondary);
  margin-bottom: 0.5rem;
  padding-left: 0;
  font-size: 1rem;
  line-height: 1.5;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.reset-btn,
.signup-btn,
.learn-more-btn {
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.reset-btn {
  background: var(--brand-bg-card);
  color: var(--brand-text-primary);
  border: 1px solid var(--brand-glass-border);
}

.reset-btn:hover {
  background: var(--brand-bg-card-hover);
}

.signup-btn {
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  color: var(--brand-bg-primary);
}

.signup-btn:hover {
  opacity: 0.9;
}

.learn-more-btn {
  background: var(--brand-accent);
  color: var(--brand-bg-primary);
}

.learn-more-btn:hover {
  opacity: 0.9;
}

/* Responsive Design */
@media (max-width: 768px) {
  .nav-toggle-label {
    display: flex;
  }

  .nav-links {
    position: absolute;
    top: 60px;
    right: 10px;
    background-color: var(--brand-bg-secondary);
    flex-direction: column;
    width: 120px;
    border-radius: 5px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
    box-shadow: 0 8px 16px rgba(0,0,0,0.2);
    z-index: 1000;
    gap: 0;
    text-align: center;
    padding: 10px 0;
  }

  .nav-link {
    padding: 10px 0;
    font-size: 1.1rem;
    width: 100%;
  }

  #nav-toggle:checked ~ .nav-links {
    opacity: 1;
    pointer-events: auto;
  }

  .quiz-container {
    padding: 1rem;
  }

  .simple-nav {
    padding: 2rem 1.5rem;
  }

  .nav-logo img {
    height: 50px;
  }

  .quiz-header h1 {
    font-size: 2.2rem;
  }

  .quiz-header p {
    font-size: 1.15rem;
  }

  .start-screen {
    padding: 1rem;
  }

  .start-card {
    padding: 2rem 1.5rem;
  }

  .start-icon {
    width: 70px;
    height: 70px;
    font-size: 2rem;
  }

  .question-card {
    padding: 2rem 1.5rem;
  }

  .question-card h2 {
    font-size: 1.35rem;
  }

  .option {
    padding: 1rem 1.25rem;
  }

  .option-text {
    font-size: 1rem;
  }

  .navigation-buttons {
    flex-direction: column;
  }

  .nav-btn {
    width: 100%;
    justify-content: center;
  }

  .result-card {
    padding: 2rem 1.5rem;
  }

  .result-card h2 {
    font-size: 1.75rem;
  }

  .score-value {
    font-size: 2.5rem;
  }

  .action-buttons {
    flex-direction: column;
  }

  .reset-btn,
  .signup-btn,
  .learn-more-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
