<template>
  <Policy :visible="showPolicy" @close="showPolicy = false" />
  <div>
    <div id="navbar" class="navbar">
      <img class="icon" src="@/assets/icons/ereuna.png" alt="Owl Icon" draggable="false">
      <!-- Hidden checkbox toggler for mobile dropdown -->
      <input type="checkbox" id="nav-toggle" class="nav-toggle" />
      <label for="nav-toggle" class="nav-toggle-label" aria-label="Toggle navigation menu">
        <span></span>
        <span></span>
      </label>
      <div class="nav-links">
         <div class="navbtn">
      <router-link class="navbtn" to="/about" style="opacity: 1; text-decoration: none;">About</router-link>
    </div>
        <div class="navbtn" @click="scrollToSection('features')">Features</div>
        <div class="navbtn">
          <router-link class="navbtn" to="/documentation" style="opacity: 1; text-decoration: none;">Docs</router-link>
        </div>
        <div class="navbtn">
          <router-link class="navbtn" to="/signup" style=" opacity: 1; text-decoration: none;">Sign Up</router-link>
        </div>
        <router-link class="navbtn" to="/login" style=" opacity: 1;text-decoration: none; background-color: transparent;">
          <div class="navbtn2" @click="$router.push('/login')"> Login</div>
        </router-link>
        <div class="navbtn-mobile" @click="$router.push('/about')">
          <router-link to="/about" style="color: whitesmoke; text-decoration: none; font-size: 14px;">About</router-link>
        </div>
        <div class="navbtn-mobile" @click="scrollToSection('features')">Features</div>
        <div class="navbtn-mobile" @click="$router.push('/documentation')">
          <router-link to="/documentation" style="color: whitesmoke; text-decoration: none; font-size: 14px;">Docs</router-link>
        </div>
        <div class="navbtn-mobile" @click="$router.push('/signup')">
          <router-link to="/signup" style="color: whitesmoke; text-decoration: none; font-size: 14px;">Sign Up</router-link>
        </div>
        <div class="navbtn-mobile" @click="$router.push('/login')">
          <router-link to="/login" style="color: whitesmoke; text-decoration: none; font-size: 14px;">Login</router-link>
        </div>
      </div>
    </div>
    <div class="hero">
      <div class="content">
        <div class="beta-badge">OPEN BETA</div>
        <p style="cursor: default;" class="description">Unlock Smarter Investing with <span style="color: #8c8dfe; font-size: inherit ;">Ereuna</span></p>
        <p style="cursor: default;" class="call-to-action">Cut your research time and costs—invest with confidence.</p>
        <br>
        <br>
        <div style="display: flex; flex-direction: row ;gap: 20px;">
          <div style="flex-direction: column;">
            <span style="cursor: default;" class="join">Create your account</span>
            <button class="sign-button" @click="redirectToSign">Get Started</button>
          </div>
          <div>
            <span style="cursor: default;" class="already-have-invite">Already have an account?</span>
            <button class="login-button" @click="redirectToLogin">
              Login Now
              <svg xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-left: 8px;" width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path d="M15.75 15.25L19 12m0 0l-3.25-3.25M19 12H8.5M12 19.25A7.25 7.25 0 1 1 12 4.75" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div class="video-container">
        <img class="hero-video" src="@/assets/videos/heroAnimation.gif" alt="Hero Animation" draggable="false">
      </div>
    </div>
    <div class="sphere-gradient"></div>
    <!-- Features Section -->
    <div class="features">
      <div id="features">
        <br>
        <h2 style="cursor: default; color: var(--text1)">FEATURES</h2>
        <!-- Department Cards -->
        <div class="feature-cards-modern">
          <div
            v-for="dept in departments"
            :key="dept.name"
            class="department-card"
            :class="{ selected: selectedDepartment === dept.name }"
            @click="selectDepartment(dept.name)"
            style="cursor: pointer; align-items: center; text-align: center;"
          >
            <span style="display: inline-flex; align-items: center; gap: 8px;">
              <span v-if="dept.name === 'Dashboard'">
                <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g><rect x="2" y="2" width="9" height="11" rx="2" fill="currentColor"/><rect x="13" y="2" width="9" height="7" rx="2" fill="currentColor"/><rect x="2" y="15" width="9" height="7" rx="2" fill="currentColor"/><rect x="13" y="11" width="9" height="11" rx="2" fill="currentColor"/></g></svg>
              </span>
              <span v-else-if="dept.name === 'Portfolio'">
                <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g><path d="M21.6702 6.94942C21.0302 4.77942 19.2202 2.96942 17.0502 2.32942C15.4002 1.84942 14.2602 1.88942 13.4702 2.47942C12.5202 3.18942 12.4102 4.46942 12.4102 5.37942V7.86942C12.4102 10.3294 13.5302 11.5794 15.7302 11.5794H18.6002C19.5002 11.5794 20.7902 11.4694 21.5002 10.5194C22.1102 9.73942 22.1602 8.59942 21.6702 6.94942Z" fill="currentColor"/><path d="M18.9094 13.3611C18.6494 13.0611 18.2694 12.8911 17.8794 12.8911H14.2994C12.5394 12.8911 11.1094 11.4611 11.1094 9.70113V6.12113C11.1094 5.73113 10.9394 5.35113 10.6394 5.09113C10.3494 4.83113 9.94941 4.71113 9.56941 4.76113C7.21941 5.06113 5.05941 6.35113 3.64941 8.29113C2.22941 10.2411 1.70941 12.6211 2.15941 15.0011C2.80941 18.4411 5.55941 21.1911 9.00941 21.8411C9.55941 21.9511 10.1094 22.0011 10.6594 22.0011C12.4694 22.0011 14.2194 21.4411 15.7094 20.3511C17.6494 18.9411 18.9394 16.7811 19.2394 14.4311C19.2894 14.0411 19.1694 13.6511 18.9094 13.3611Z" fill="currentColor"/></g></svg>
              </span>
              <span v-else-if="dept.name === 'Charts'">
                <svg width="28" height="28" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g><path d="M29.5 7c-1.381 0-2.5 1.12-2.5 2.5 0 0.284 0.058 0.551 0.144 0.805l-6.094 5.247c-0.427-0.341-0.961-0.553-1.55-0.553-0.68 0-1.294 0.273-1.744 0.713l-4.774-2.39c-0.093-1.296-1.162-2.323-2.482-2.323-1.38 0-2.5 1.12-2.5 2.5 0 0.378 0.09 0.732 0.24 1.053l-4.867 5.612c-0.273-0.102-0.564-0.166-0.873-0.166-1.381 0-2.5 1.119-2.5 2.5s1.119 2.5 2.5 2.5c1.381 0 2.5-1.119 2.5-2.5 0-0.332-0.068-0.649-0.186-0.939l4.946-5.685c0.236 0.073 0.48 0.124 0.74 0.124 0.727 0 1.377-0.316 1.834-0.813l4.669 2.341c0.017 1.367 1.127 2.471 2.497 2.471 1.381 0 2.5-1.119 2.5-2.5 0-0.044-0.011-0.086-0.013-0.13l6.503-5.587c0.309 0.137 0.649 0.216 1.010 0.216 1.381 0 2.5-1.119 2.5-2.5s-1.119-2.5-2.5-2.5z" fill="currentColor"/></g></svg>
              </span>
              <span v-else-if="dept.name === 'Screener'">
                <svg width="28" height="28" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><g><path d="M256,256c-13.47,0-26.94-2.39-37.44-7.17l-148-67.49C63.79,178.26,48,169.25,48,152.24s15.79-26,22.58-29.12L219.86,55.05c20.57-9.4,51.61-9.4,72.19,0l149.37,68.07c6.79,3.09,22.58,12.1,22.58,29.12s-15.79,26-22.58,29.11l-148,67.48C282.94,253.61,269.47,256,256,256ZM432.76,155.14h0Z" fill="currentColor"/><path d="M441.36,226.81,426.27,220,387.5,237.74l-94,43c-10.5,4.8-24,7.19-37.44,7.19s-26.93-2.39-37.42-7.19l-94.07-43L85.79,220l-15.22,6.84C63.79,229.93,48,239,48,256s15.79,26.08,22.56,29.17l148,67.63C229,357.6,242.49,360,256,360s26.94-2.4,37.44-7.19L441.31,285.2C448.12,282.11,464,273.09,464,256S448.23,229.93,441.36,226.81Z" fill="currentColor"/><path d="M441.36,330.8,426.27,324,387.5,341.73l-94,42.95c-10.5,4.78-24,7.18-37.44,7.18s-26.93-2.39-37.42-7.18l-94.07-43L85.79,324l-15.22,6.84C63.79,333.93,48,343,48,360s15.79,26.07,22.56,29.15l148,67.59C229,461.52,242.54,464,256,464s26.88-2.48,37.38-7.27l147.92-67.57C448.12,386.08,464,377.06,464,360S448.23,333.93,441.36,330.8Z" fill="currentColor"/></g></svg>
              </span>
              <span>{{ dept.name }}</span>
            </span>
          </div>
        </div>
        <!-- Department Features -->
        <div v-if="selectedDepartment" class="feature-cards-modern" style="margin-top: 2rem;">
          <div
            v-for="feature in departmentFeatures[selectedDepartment]"
            :key="feature.title"
            class="feature-card-modern"
          >
            <div class="feature-title-modern">{{ feature.title }}</div>
            <div class="feature-desc-modern">{{ feature.desc }}</div>
          </div>
        </div>
        <!-- Documentation Message -->
        <div style="text-align: center; margin-top: 2rem;">
          <span style="font-size: 1.5rem; color: var(--text1);">
            Want to see all features?
            <router-link to="/documentation" style="color: var(--text1); font-size: 1.5rem; text-decoration: underline;">Check the documentation</router-link>
          </span>
        </div>
        <div class="division"></div>
      </div>
      <div style="padding: 30px"></div>
      <div class="sphere-gradient2"></div>
      <!-- FAQ Section -->
      <div class="content-section" id="faq">
        <h2 style="text-align: center; font-size: 20px; color: whitesmoke; cursor: default;">FREQUENTLY ASKED QUESTIONS</h2>
        <div class="faq-cards">
          <div class="faq-card" v-for="(item, index) in faqs" :key="index">
            <h3 class="faq-question" @click="toggleFAQ(index)" :class="{ 'open': item.show }">
              {{ item.question }}
              <svg class="chevron" :class="{ 'rotated': item.show }" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6,9 12,15 18,9"></polyline>
              </svg>
            </h3>
            <div class="faq-answer" :class="{ 'open': item.show }">
              <p>{{ item.answer }}</p>
            </div>
          </div>
        </div>
      </div>
      <div style="height: 100px;"></div>
      <div class="sphere-gradient3"></div>
      <footer>
        <div class="footer">
          <div class="footer-main">
            <div style="display: flex; align-items: center; gap: 12px;">
              <img src="@/assets/icons/ereuna.png" alt="Ereuna Logo" class="icon" style="height: 60px; opacity: 0.7;" draggable="false" />
            </div>
            <div class="footer-links" style="display: flex; gap: 24px; align-items: center;">
              <a href="/documentation" style="text-decoration: none;">Docs</a>
              <a href="mailto:contact@ereuna.io" style=" text-decoration: none;">Contact</a>
              <a href="/communications" style=" text-decoration: none;">Communications</a>
              <a href="#faq" style="text-decoration: none;">FAQ</a>
            </div>
          </div>
          <!-- Second row of legal links -->
          <div class="footer-legal-links">
            <a href="#" style="text-decoration: none;" @click.prevent="showPolicy = true">Terms Of Service & Privacy Policy</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span style="font-size: 1.2rem">&copy; {{ new Date().getFullYear() }} Ereuna by Lorenzo Mazzola. All rights reserved.</span>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ref, onMounted } from 'vue';
import Policy from '@/components/policy.vue';

// Department cards and features (no icons)
const departments = [
  { name: 'Dashboard' },
  { name: 'Portfolio' },
  { name: 'Charts' },
  { name: 'Screener' },
];

const departmentFeatures: Record<string, Array<{ title: string; desc: string }>> = {
  Dashboard: [
      {
        title: 'Market Indexes Table',
        desc: 'View real-time prices and performance for major market indexes (SPY, QQQ, DIA, etc.) with daily, monthly, and yearly returns.',
      },
      {
        title: 'SMA Distribution',
        desc: 'Visualize the percentage of stocks above or below key Simple Moving Averages (5, 10, 20, 50, 100, 150, 200-day).',
      },
      {
        title: 'Sector & Industry Strength',
        desc: 'Instantly see the strongest and weakest sectors and industries for the current quarter, with average returns and counts.',
      },
      {
        title: 'Top Movers',
        desc: 'Track the top 10 daily gainers and losers in the market, updated every trading day.',
      },
    ],
  Portfolio: [
      {
        title: 'Comprehensive Performance Analytics',
        desc: 'Instantly see base value, total value, active positions, cash, and detailed P/L (total, realized, unrealized, and percentages) of up to 10 simulated portfolios.',
      },
      {
        title: 'Advanced Trade Statistics',
        desc: 'Access metrics like average position size, hold times, average gain/loss, gain/loss ratio, risk/reward ratio, profit factor, and Sortino ratio.',
      },
      {
        title: 'Interactive Charts',
        desc: 'Visualize your portfolio allocation (pie chart), value over time (line chart), and trade returns (bar chart) for deeper insights.',
      },
      {
        title: 'Full Transaction & Position Management',
        desc: 'Add trades, cash, set base value, import/export, reset, and view sortable tables for positions and transaction history.',
      },
    ],
  Charts: [
      {
        title: 'Multi-Panel Layout',
        desc: 'Analyze assets with a flexible layout—left for fundamentals/news/notes, center for interactive charts, right for watchlists and search.',
      },
      {
        title: 'Customizable Charting',
        desc: 'Use the main chart to view price, volume, and technical indicators for any symbol, with fast switching and mobile support.',
      },
      {
        title: 'Fundamental Data Integration',
        desc: 'Instantly access earnings, sales, dividends, splits, and full financials statements in side panels, all linked to the selected symbol.',
      },
      {
        title: 'Watchlists & Symbol Search',
        desc: 'Manage multiple watchlists, search and select symbols, and set your default asset for quick charting and research.',
      },
    ],
  Screener: [
      {
        title: 'Extensive Filter Set',
        desc: 'Screen assets using dozens of customizable filters—price, market cap, IPO, sector, exchange, valuation ratios, growth, profitability, technicals, and more.',
      },
      {
        title: 'Multi-Screener & Combined Results',
        desc: 'Run multiple screeners simultaneously, view combined results, and highlight duplicates or unique matches across your strategies.',
      },
      {
        title: 'Hidden List Mode',
        desc: 'Each user can customize the visibility of specific assets they do not want to see in results, hiding them from search and screener output.',
      },
      {
        title: 'Save, Rename, Reset, and Download',
        desc: 'Create, save, rename, reset, and download your custom screeners and results for future use and sharing.',
      },
    ],
};

const selectedDepartment = ref<string | null>('Screener');
function selectDepartment(dept: string) {
  selectedDepartment.value = dept;
}

const router = useRouter();

function redirectToLogin() {
  router.push('/login');
}

function redirectToSign() {
  router.push('/signup');
}

const faqs = ref([
  {
    question: 'Will there be more financial instruments added in the future?',
    answer: 'Of Course! as the platform grows, there are plans to add more financial instruments to the platform, such as European Stocks, Asian Stocks, and Forex.',
    show: false
  },
  {
    question: 'Is the service free?',
    answer: 'Yes! Ereuna is currently in open beta and completely free to use. All features are accessible without any payment or commitment during this period. No payment information is collected, and there will be no charges in the future without prior notice. Users are free to leave at any time.',
    show: false
  },
  {
    question: 'How long will the open beta last?',
    answer: 'The open beta will continue until the platform is ready for a full launch and a sufficient user base is reached. Users will be notified in advance before any changes to pricing or access.',
    show: false
  },
  {
    question: 'Who is this platform designed for?',
    answer: 'Ereuna is designed primarily for retail traders and investors, especially those with a mid- to long-term investment horizon. The aim is to make advanced research tools more accessible and affordable, offering unique aggregation features that save time and help users make smarter decisions. The platform is built to be more cost-effective than the competition, with ongoing development of AI-enhanced research tools to assist and speed up the research process without compromising quality—making workflows more efficient and insightful.',
    show: false
  },
  {
    question: 'Can I use Ereuna on mobile?',
    answer: 'Yes, a mobile version of Ereuna is available. While the website is intended to be accessible and usable on all devices, the mobile experience is not yet as optimized as the desktop version. Some features may not work properly or may behave differently due to the smaller screen size and touch input. Improvements and refinements to the mobile experience are ongoing, and issues will be addressed in future updates.',
    show: false
  },
  {
    question: 'How can I give feedback or report bugs?',
    answer: 'Feedback and bug reports are welcome. Suggestions or issues can be sent to contact@ereuna.io',
    show: false
  },
  {
    question: 'Is my data private and secure?',
    answer: 'Absolutely, no information that could deanonymize users is stored. Ereuna does not collect emails, payment information, or any personal data that might compromise user security. Privacy is a top priority, and no user data is shared or sold to third parties.',
    show: false
  },
  {
    question: 'What will be the price at launch?',
    answer: 'At launch, Ereuna will offer a single, all-inclusive subscription tier for 14.99€ + VAT per month. All features are included—no hidden fees, no upsells. The service is recharge-based, so there are no automatic or recurring charges: renewal is always user-controlled.',
    show: false
  },
]);

const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

function toggleFAQ(index: number) {
  faqs.value[index].show = !faqs.value[index].show;
}

const showPolicy = ref(false);

// Add these for scroll animations
onMounted(() => {
  // Wait for DOM to be ready
  setTimeout(() => {
    setupCardAnimations();
  }, 100);
});

function setupCardAnimations() {
  const cards = document.querySelectorAll('.feature-card');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Add class without invalid characters
        entry.target.classList.add('animate-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  
  cards.forEach(card => {
    observer.observe(card);
  });
}
</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

.hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: absolute;
  width: 100%;
  background-color: transparent;
  color: $text1;
}

.video-container {
  position: relative;
  padding: 5%;
}

.hero-video {
  width: 450px;
  border-radius: 10px;
  border: solid 1px $accent3;
}

.department-card {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 5px;
  padding: 5px 8px;
  cursor: pointer;
  text-decoration: none;
  color: var(--text1);
  font-size: 2rem;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.department-card span {
  font-size: 2rem;
}

.department-card.selected,
.department-card:hover {
  background-color: var(--base2);
}

.sphere-gradient {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, #8c8dfe 0%, 
    #8c8dfe 30%, 
    #a3a4fe 50%, 
    #c5c6fe 70%, 
    #fff 100%);
  filter: blur(100px);
  z-index: 0;
  opacity: 0.20;
}

.sphere-gradient2 {
  position: absolute;
  top: 40%;
  right: -35%;
  transform: translate(-50%, -50%);
  width: 500px;
  max-width: 100vw;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, #8c8dfe 0%, 
    #8c8dfe 30%, 
    #a3a4fe 50%, 
    #c5c6fe 70%, 
    #fff 100%);
  filter: blur(100px);
  z-index: 0;
  opacity: 0.20;
  pointer-events: none;
}

.sphere-gradient3 {
  position: absolute;
  top: 85%;
  right: 65%;
  transform: translate(-50%, -50%);
  width: 500px;
  max-width: 100vw;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, #8c8dfe 0%, 
    #8c8dfe 30%, 
    #a3a4fe 50%, 
    #c5c6fe 70%, 
    #fff 100%);
  filter: blur(100px);
  z-index: 0; // Lower z-index so it appears behind the footer
  opacity: 0.20;
  pointer-events: none;
}

/* Prevent horizontal overflow for sphere-gradient2 on all screens */
.features, .content-section {
  overflow-x: hidden;
}

@media (max-width: 700px) {
  .sphere-gradient2 {
    right: -50%;
    width: 100vw;
    max-width: 100vw;
    min-width: 0;
    left: 0;
  }
}

.content {
  text-align: left;
  z-index: 1;
  padding: 5%;
  width: 100%;
}

.title {
  font-size: 18px;
  margin: 0;
}

.description {
  font-size: 5rem;
  font-weight: bold;
  margin: 0;
}

.beta-badge {
  background: var(--text2);
  color: $text4;
  padding: 10px 20px;
  border-radius: 30px;
  font-size: 0.85rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 15px;
  display: inline-block;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.pricing-card h3 {
  color: $accent2;
  margin-bottom: 10px;
}

.call-to-action {
  font-size: 18px;
  color: $text2;
  a {
    color: $accent1;
    text-decoration: none;
    &:hover {
      color: $accent2;
    }
  }
}

.already-have-invite {
  font-size: 12px;
  margin-bottom: 10px;
  display: block;
  color: $text2;
}

.login-button {
  background-color: $accent1;
  color: $text4;
  border: solid 2px $accent1;
  padding: 10px 20px;
  font-size: 18px;
  cursor: pointer;
  border-radius: 5px;
  transition: 
    background-color 0.3s cubic-bezier(0.4,0,0.2,1),
    color 0.3s cubic-bezier(0.4,0,0.2,1),
    box-shadow 0.3s cubic-bezier(0.4,0,0.2,1),
    transform 0.2s cubic-bezier(0.4,0,0.2,1);

  &:hover {
    background-color: $accent2;
    color: $text4;
    transform: scale(1.04);
    border-color: $accent2;
  }
}

.join {
  font-size: 12px;
  margin-bottom: 10px;
  display: block;
  color: $text2;
}

.sign-button {
  background-color: $text2;
  color: $text4;
  border: solid 2px $text2;
  padding: 10px 20px;
  font-size: 18px;
  cursor: pointer;
  border-radius: 5px;
  transition: background-color 0.3s ease;

   &:hover {
    background-color: $text1;
    border: solid 2px $text1;
    color: $text4;
    transform: scale(1.04);
  }
}

.icon {
    height: 80px; 
    opacity: 0.8;
  }

  .navbar {
  display: flex;
  justify-content: space-between; 
  align-items: center;
  background-color: transparent;
  border-radius: 10px;
  color: $text2;
  padding: 15px 30px;
  position: sticky;
  top: 2%;
  left: 2%;
  right: 2%;
  z-index: 1000;
  opacity: 0.90;
}

.nav-links {
  display: flex;
  gap: 80px; 
  align-items: center;
}

a{
  color: $text2;
  opacity: 0.90;
  cursor: pointer;
}

a:hover{
  opacity: 1;
}
  
  .navbtn{
    border: none;
    background-color: transparent;
    color: $text2;
    opacity: 0.70;
    font-size: 1.5rem;
  }

  .navbtn:hover{
     background-color: transparent;
     opacity: 1;
     cursor: pointer;
  }

.navbtn2 {
  border: none;
  border-radius: 5px;
  background-color: $accent1;
  font-size: 1.5rem;
  color: $text4;
  padding: 15px 30px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  z-index: 100;
  transition: 
    background 0.25s cubic-bezier(0.4,0,0.2,1),
    color 0.25s cubic-bezier(0.4,0,0.2,1),
    transform 0.18s cubic-bezier(0.4,0,0.2,1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.navbtn2:hover {
  background-color: $accent2;
  color: $text4;
  transform: scale(1.04);
  box-shadow: 0 4px 16px 0 rgba(140,141,254,0.10);
}

.logo{
  max-height: 30px;
}

.logo2{
  max-height: 80px;
  margin-bottom: 20px;
}

.features{
  background-color: $base1;
  width: 100%;
  z-index: 2px;
  position: absolute;
  top: 100%;
}

#partners{
  background-color: $base4;
  padding-bottom: 40px;
  padding-top: 30px;
}

.division{
  margin-top: 5%;
  margin-bottom: 5%;
  border-bottom: 2px solid $accent3;
  width: 100%;
  background: transparent;
}

#tradeoff{
  padding: 60px;
}

.navbtn3 {
  border: none; /* Remove default border */
  border-radius: 25px; /* Rounded corners */
  background-color: transparent; /* Button background color */
  color: whitesmoke; /* Text color */
  padding: 15px 30px; /* Increased padding for better spacing */
  font-size: 18px; /* Increased font size */
  cursor: pointer; /* Pointer cursor on hover */
  position: relative; /* For pseudo-element positioning */
  overflow: hidden; /* Hide overflow for pseudo-element */
  z-index: 100; /* Ensure text is above the gradient */
  transition: color 0.3s ease; /* Smooth text color transition */
  display: inline-flex; /* Use flexbox for centering */
  align-items: center; /* Center vertically */
  justify-content: center; /* Center horizontally */
}

/* New animation */
.navbtn3:hover {
  background-color: #8c8dfe;
  color: white;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  transform: scale(1.05); /* Scale up on hover */
  transition: all 0.3s ease-in-out; /* Changed transition timing function for smoother animation */
}

.navbtn3:active {
  transform: scale(0.95); /* Scale down on click */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Reduced shadow on click */
  transition: all 0.1s ease-out; /* Faster transition on click */
}

.navbtn3::before {
  content: '';
  position: absolute; /* Position it absolutely */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1; /* Place it behind the content */
  border-radius: 25px; /* Match the border radius of the parent */
  background: transparent; /* Background color */
  padding: 2px; /* Space for the border effect */
  transition: all 0.3s ease; /* Smooth transition */
  border: 2px solid $accent1;
}

.navbtn3:hover::before {
  padding: 0; /* Remove padding to fill the entire button */
}

.feature2{
  font-size: 25px;
  background: linear-gradient(270deg, #8c8dfe, #7273b8, #5557b7);
  background-size: 400% 400%;
  background-clip: text; /* Standard property */
  -webkit-background-clip: text; /* Safari */
  -moz-background-clip: text; /* Firefox (not widely supported) */
  -webkit-text-fill-color: transparent; /* Safari */
  animation: border-animation 3s ease infinite;
}

.icon2{
  width: 20px;
  height: 20px;
}

.payme{
  display: flex;
  flex-direction: row;
  text-align: center;
  align-items: center;
  gap: 5px;
  justify-content: center;
}

.faq-cards {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  cursor: default;
}

.faq-card {
  background-color: $base2;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 80%;
  color: $text2;
  transition: all 0.3s ease, box-shadow 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
   z-index: 1000;
}

.faq-card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.faq-question {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 10px;
  opacity: 1;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: color 0.3s ease;
  color: $text1;
}

.faq-question:hover {
  color: $accent1;
}

.faq-question.open {
  color: $accent1;
}

.chevron {
  transition: transform 0.3s ease, color 0.3s ease;
  color: $text1;
}

.faq-question.open .chevron {
  color: $accent1;
}

.chevron.rotated {
  transform: rotate(180deg);
}

.faq-answer {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s ease, opacity 0.4s ease;
  opacity: 0;
  color: $text2;
}

.faq-answer.open {
  max-height: 1000px;
  opacity: 1;
}

.faq-answer p {
  font-size: 1.2rem;
  margin: 10px 0 0 0;
  line-height: 1.6;
}

.modal {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: $base2;
  padding: 20px;
  border-radius: 15px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.modal button {
  margin-top: 10px;
  position: absolute;
  top: 0;
  right:5px;
  background: transparent;
  border: none;
  cursor: pointer;
}


.modal-content {
    max-height: 400px; /* Adjust height as needed */
    overflow-y: auto; /* Enable vertical scrolling */
    font-size: 14px; /* Adjust font size as needed */
    color: $text1; /* Ensure text color is readable */
}
  
.text{
  font-size: 14px;
  padding: 0 100px;
  text-align: left;
}

.pricing-card{
  background-color: $base2;
  border-radius: 10px;
  align-items: center;
  text-align: center;
  padding: 20px;
  color: $text1;
  align-items: center;
  margin: 0 auto;
  border: solid 1px $accent3;
}

.bullet-list{
  text-align: left;
  padding: 10px;
  margin-top: 25px;
  letter-spacing: 0.5px;
  opacity: 0.90;
}

.bullet{
  text-align: left;
  font-size: 14px;
  color: #dcdcdc;
}

.contract-title{
  text-align: center;
  margin: 25px;
}


@media (max-width: 700px) {
  .comparison-table, .table-header, .table-row {
    flex-direction: column;
    display: block;
  }
  .table-cell {
    border-right: none;
    border-bottom: 1px solid #232946;
    text-align: left;
    padding: 0.8rem 1rem;
  }
  .table-cell:last-child {
    border-bottom: none;
  }
}

/* Simplified & Elegant Feature Cards Modern */
.feature-cards-modern {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2rem;
  margin: 3rem 0 2rem 0;
}
.feature-card-modern {
  display: flex;
   flex-direction: column;
  align-items: flex-start;
  background: $base2;
  width: 270px;
  min-height: 70px;
  align-items: center;
  gap: 5px;
  margin: 5px;
  padding: 8px 12px;
  cursor: pointer;
  text-decoration: none;
  color: var(--text1);
  font-size: 2rem;
  border-radius: 4px;
  transition: background-color 0.3s ease, transform 0.7s ease;
}
.feature-card-modern:hover {
  transform: translateY(-8px) scale(1.02);
}

.feature-title-modern {
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: $text1;
  text-align: left;
}
.feature-desc-modern {
  font-size: 1rem;
  color: $text2;
  margin: 0;
  text-align: left;
}

.cta-section {
  text-align: center;
  padding: 60px 20px;
  overflow: hidden;
  background-color: $base2;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1), 0 6px 6px rgba(0, 0, 0, 0.05);
  margin-top: 40px;
}

h2{
  color: $text1;
  text-align: center;
  font-size: 22px;
  margin-bottom: 50px;
}

.footer {
  background: $base2;
  color: $text2;
  padding: 2rem 8rem 8rem 8rem; /* top right bottom left */
  border-top: 1px solid $accent3;
  margin-top: 4rem;
  position: relative;
  z-index: 1; // Ensure footer is above the gradient
}

.footer-legal-links {
  display: flex;
  gap: 24px;
  align-items: right;
  justify-content: right;
  margin-top: 10px;
  color: $text2;
  font-size: 1.1rem;
}
.footer-legal-links a {
  color: $text2;
  opacity: 0.85;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s;
}
.footer-legal-links a:hover {
  color: $text1;
  opacity: 1;
  text-decoration: underline;
}

.footer h4{
  font-size: 1.5rem;
}

.footer p{
  font-size: 1.3rem;
}

.footer strong{
  font-size: inherit;
}

.footer-main {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.footer a {
  color: $text2;
  font-size: 1.3rem;
  text-decoration: none;
  transition: color 0.2s;
}

.footer-social {
  display: flex;
  flex-direction: column;;
  gap: 10px;
}

.footer a:hover {
  color: $text1;
}

.footer-bottom {
  text-align: center;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  font-size: 1rem;
  padding: 1rem 0;
  color: $text2;
  gap: 20px;
  background: $base4;
}

.footer-bottom p, .footer-bottom a{
  font-size: 1.5rem;
}


/* Add this to your CSS file */
a.social {
  display: inline-flex;
  align-items: center;
  gap: 8px; /* space between icon and text */
  text-decoration: none;
  color: inherit;
}

.social-icon {
  width: 15px;
  display: block;
}

.back-to-top {
  margin-top: 12px;
  cursor: pointer;
  color: $accent1;
}

.pricing-header {
  display: flex;
  flex-direction: column; // stack vertically
  align-items: flex-start; // align left
  justify-content: flex-start;
  margin-bottom: 20px;
  padding: 0; // remove extra padding
}

.feature{
  color: $text1;
  font-size: 5rem;
}

.mini-title {
  color: $text2;
  font-size: 1.5rem;
}

.pricing-header h3 {
  margin: 0 0 8px 0; // bottom margin for spacing
  font-size: 2rem;
  color: $accent2;
  float: none; // remove float
  text-align: left;
}

.price-container {
  margin: 0;
  text-align: left; // ensure left alignment
  padding: 0;
  width: 100%;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 25px;
}

.feature-item {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: $text2;
  gap: 10px;
  text-align: left;
}

.verified-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.pricebtn.full-width {
  width: 100%;
  display: block;
  margin-top: 20px;
  font-size: 18px;
  padding: 12px 0;
  border-radius: 8px;
  background: $accent1;
  color: $text4;
  border: none;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
}

.pricebtn.full-width:hover {
  background: $accent2;
}

.back-to-top:hover {
  opacity: 1;
}

.contract-title{
  text-align: center;
  margin: 25px;
  font-size: 12px;
}

#about {
  padding: 40px 0px;
  color: #dcdcdc;
  background-color: transparent;
  border: 2px solid $accent1; /* Add border style and color */
  margin: 20px;
  border-radius: 10px;
  display: flex; /* Enable flexbox */
  align-items: center; /* Center vertically */
  justify-content: center; /* Center horizontally */
  flex-direction: column; /* Stack child elements vertically (optional) */
  margin: 60px;
  display: none; //temporary disable 
}

.social-links {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.social-links img {
  width: 20px;
  height: 20px;
  opacity: 0.5;
}

.social-links img:hover {
  opacity: 1;
}

/* Hide the checkbox input */
.nav-toggle {
  display: none;
}

/* Label styling */
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

/* The two bars */
.nav-toggle-label span {
  display: block;
  height: 3px;
  background: whitesmoke;
  border-radius: 2px;
  transition: all 0.3s ease;
  /* Set transform origin near the left edge for better rotation pivot */
  transform-origin: 1.5px center;
}

/* Each bar full width */
.nav-toggle-label span:nth-child(1),
.nav-toggle-label span:nth-child(2) {
  width: 25px;
}

/* Show the toggle on mobile (max-width 600px) */
@media (max-width: 600px) {
  .nav-toggle-label {
    display: flex;
  }
}

/* Toggle to cross when checked */
#nav-toggle:checked + .nav-toggle-label span:nth-child(1) {
  transform: rotate(45deg);
}

#nav-toggle:checked + .nav-toggle-label span:nth-child(2) {
  transform: rotate(-45deg);
}
//hide second set of button from desktop
  @media (min-width: 950px) {
  .navbtn-mobile{
  display: none;
}}

/* Mobile version */
@media (max-width: 950px) {

  .navbar {
  display: flex;
  justify-content: space-between; /* Push logo to the left and buttons to the right */
  align-items: center;
  background-color: transparent;
  border-radius: 10px;
  color: #f5f5f5;
  padding: 15px 0px; /* Add horizontal padding for better spacing */
  position: sticky;
  top: 2%;
  left: 2%;
  right: 2%;
  z-index: 1000;
  opacity: 0.90;
}

.join {
  font-size: 12px;
  margin-bottom: 20px;
  display: block;
  color: #dcdcdc;
}

.features{
  background-color: transparent;
  width: 100%;
  z-index: 2px;
  position: absolute;
  top: 100%;
  margin-top: 40%;
}

.nav-links {
    position: absolute;
    top: 60px; /* below navbar */
    right: 10px;
    background-color: #25273a;
    flex-direction: column;
    width: 120px; /* reduced width */
    border-radius: 5px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
    box-shadow: 0 8px 16px rgba(0,0,0,0.2);
    z-index: 1000;
    gap: 0;
    text-align: center; /* center links */
  }

  .navbtn {
    padding: 10px 0px;
    margin: 0px 50px;
    opacity: 1;
    font-size: 14px;
    border-radius: 10px;
    background-color: #25273a;;
    color: whitesmoke;
    transition: background-color 0.3s ease;
    width: 100%; /* take full width */
  }

    .navbar {
  opacity: 1;
}

  .navbtn-mobile{
    padding: 10px 0px;
    margin: 0px 50px;
    opacity: 1;
    font-size: 14px;
    border-radius: 10px;
    background-color: #25273a;;
    color: whitesmoke;
    transition: background-color 0.3s ease;
    width: 100%; /* take full width */
    cursor: pointer;
}

  .navbtn-mobile:hover {
    background-color: #8c8dfe;
  }

  /* Show hamburger menu */
  .nav-toggle-label {
    display: flex;
  }


  /* Hide original nav-links by default */
  .nav-links {
    pointer-events: none;
  }

  /* If nav-toggle checked, show nav-links */
  .nav-toggle:checked ~ .nav-links {
    opacity: 1;
    pointer-events: auto;
  }

  .navbtn2 {
    display: none;
  }

  .navbtn {
    display: none;
  }

  .hero {
    display: flex;
    flex-direction: column;
    align-items: center; /* Center content horizontally */
    margin-bottom: 10%;
  }

  .content {
    display: flex;
    flex-direction: column;
    align-items: center; /* Center content horizontally */
    text-align: center; /* Center text horizontally */
  }

  .description {
    font-size: 4rem; /* Adjust font size for better readability on mobile */
    font-weight: bold;
    margin: 0;
    word-wrap: break-word; /* Break text if it overflows the screen */
    padding-left: 5%;
    padding-right: 5%;
  }

  .beta-badge {
    font-size: 0.8rem;
    padding: 6px 12px;
    margin-bottom: 10px;
  }

  .call-to-action {
    font-size: 1.5rem; /* Adjust font size for better readability on mobile */
    color: #dcdcdc;
    margin-top: 10px; /* Add some margin for better readability */
    word-wrap: break-word; /* Break text if it overflows the screen */
    padding-left: 12%;
    padding-right: 12%;
    a {
      color: $accent1;
      text-decoration: none;
      &:hover {
        color: $accent2;
      }
    }
  }

  .already-have-invite {
    font-size: 12px;
    margin-bottom: 10px;
    display: block;
    color: #dcdcdc;
  }

  .sign-button {
  background-color: $text2;
  color: $text4;
  border: none;
  padding: 10px 20px;
  font-size: 18px;
  cursor: pointer;
  border-radius: 5px;
  transition: background-color 0.3s ease;
}

  .login-button {
    background-color: $accent1;
    color: $text4;
    border: none;
    padding: 10px 20px;
    font-size: 16px; /* Adjust font size for better readability on mobile */
    cursor: pointer;
    border-radius: 5px;
    transition: background-color 0.3s ease;
    margin-top: 10px; /* Add some margin for better readability */

    &:hover {
      background-color: $accent1;
    }
  }

  .video-container {
    margin-top: 0px; /* Add some margin for better readability */
  }

  .hero-video {
    width: 100%; /* Make the video responsive */
    border-radius: 10px;
    border: solid 1px $accent3;
    max-width: 300px; /* Set a maximum width for the video */
  }

  .beta-tag-on-video {
  display: none;
  }

  h2{
  color: $text1;
  text-align: center;
  font-size: 2rem;
  margin-bottom: 50px;
}

.logo{
  height: 25px;
  padding-left: 0;
  padding-right: 0;
}

.icon {
    height: 60px; /* Increased size for better visibility */
    opacity: 1;
  }

.feature-cards {
  display: grid;
  grid-template-columns: repeat(1, minmax(300px, 1fr));
  gap: 30px;
  margin-top: 20px;
  justify-content: center;
}

#about {
  color: #dcdcdc;
  padding: 2%;
  margin: 5%;
  background-color: transparent;
  border: 2px solid $accent1; /* Add border style and color */
  border-radius: 10px;
  display: flex; /* Enable flexbox */
  align-items: center; /* Center vertically */
  justify-content: center; /* Center horizontally */
  flex-direction: column; /* Stack child elements vertically (optional) */
  display: none;
}

.text{
  font-size: 14px;
  padding: 0 10%;
  text-align: left;
}

.back-to-top{
  display: none;
}

.modal {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: $base2;
  padding: 20px;
  width: 70%;
  border-radius: 15px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.navbtn3 {
  background-color: $accent1; 
}

#tradeoff{
  padding: 20px;
}

.pricing-cards {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.footer {
  padding: 10px;
  background-color: $base4;
  color: $text2;
  text-align: center;
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.footer-links {
  margin-left: 0;
  display: flex;
}

.footer-main {
  justify-content: center;
  align-items: center;
}

.footer-legal-links {
  justify-content: center;
  align-items: center;
}

.footer-main {
  flex-direction: column;
}

}
</style>