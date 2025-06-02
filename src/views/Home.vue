<template>
  <div class="landingPage">
    <div id="navbar" class="navbar">
  <img class="icon" src="@/assets/icons/ereuna.png" alt="Owl Icon" draggable="false">

  <!-- Hidden checkbox toggler for mobile dropdown -->
  <input type="checkbox" id="nav-toggle" class="nav-toggle" />
  <label for="nav-toggle" class="nav-toggle-label" aria-label="Toggle navigation menu">
    <span></span>
    <span></span>
  </label>

  <div class="nav-links">
    <div class="navbtn" @click="scrollToSection('features')">Features</div>
    <div class="navbtn" @click="scrollToSection('pricing')">Pricing</div>
   <div class="navbtn">
      <router-link class="navbtn" to="/documentation" style="opacity: 1; text-decoration: none;">Documentation</router-link>
    </div>
    <div class="navbtn">
      <router-link class="navbtn" to="/signup" style=" opacity: 1; text-decoration: none;">Sign Up</router-link>
    </div>
   
      <router-link class="navbtn" to="/login" style=" opacity: 1;text-decoration: none; background-color: transparent;">
        <div class="navbtn2" @click="$router.push('/login')"> Login</div>
      </router-link>
    
    <div class="navbtn-mobile" @click="scrollToSection('features')">Features</div>
    <div class="navbtn-mobile" @click="scrollToSection('pricing')">Pricing</div>
     <div class="navbtn-mobile" @click="$router.push('/documentation')">
  <router-link to="/signup" style="color: whitesmoke; text-decoration: none; font-size: 14px;">Docs</router-link>
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
      <p style="cursor: default;" class="description">Unlock Smarter Investing with <span style="color: #8c8dfe; font-size: inherit ;">Ereuna</span></p> 
      <p style="cursor: default;" class="call-to-action">Essential features and data for mid-to-long term investors, all at a fraction of the cost of traditional solutions.</p>
      <br>
      <br>
      <div style="display: flex; flex-direction: row ;gap: 20px;">
        <div style="flex-direction: column;">
          <span style="cursor: default;" class="join">Join the beta program</span>
      <button class="sign-button" @click="redirectToSign">Free Trial</button>
        </div>
 <div>
      <span style="cursor: default;" class="already-have-invite">Already have an account?</span>
      <button class="login-button" @click="redirectToLogin">Login Now &rarr;</button>
 </div>
      </div>
    </div>
    <div class="video-container">
      <img class="hero-video" src="@/assets/videos/heroAnimation.gif" alt="Hero Animation" draggable="false">
      <div style="cursor: default;" class="beta-tag-on-video">
        <span class="title">Beta Now Available</span>
      </div>
    </div>
  </div>
  <div class="sphere-gradient"></div>
  <!--rest of the content goes inside this div-->
  <div class="features">
    <div id="partners">
      <h2 style="cursor: default;">PARTNERS</h2>
      <div style="display: flex; justify-content: center; align-items: center; gap: 10%;">
    <img class="logo" src="@/assets/images/logos/tiingo.png" alt="" draggable="false">
    <img class="logo" src="@/assets/images/logos/tradingview.png" alt="" draggable="false">
</div>
    </div>
    <!-- Features Section -->
    <div id="features">
      <br>
      <h2 style="cursor: default;">FEATURES</h2>
      <div class="feature-cards">
   <div class="feature-card">
    <img style="width: 32px; margin-bottom: 10px;" src="@/assets/icons/settings.png" alt="" draggable="false">
    <div class="feature-title">Personalized Stock Universe</div>
    <div class="feature-desc">
      You can customize your stock universe by hiding stocks that are irrelevant to your workflow and investment criteria, tailoring the data to your individual investment needs and preferences.
    </div>
  </div>
  <div class="feature-card">
    <img style="width: 32px; margin-bottom: 10px;" src="@/assets/icons/intersect.png" alt="" draggable="false">
    <div class="feature-title">One-Click Multi-Screener</div>
    <div class="feature-desc">
      You can run multiple screeners simultaneously, providing a comprehensive view of your desired stocks in a single click.
    </div>
  </div>
  <div class="feature-card">
    <img style="width: 32px; margin-bottom: 10px;" src="@/assets/icons/savings.png" alt="" draggable="false">
    <div class="feature-title">Unbeatable Value</div>
    <div class="feature-desc">
      This platform offers one of the cheapest and most affordable professional stock screening and research solution on the market, focusing on essential EOD and core fundamental data that drives informed decision-making.
    </div>
  </div>
  <div class="feature-card">
    <img style="width: 32px; margin-bottom: 10px;" src="@/assets/icons/discount.png" alt="" draggable="false">
    <div class="feature-title">Up to 96% Cost Savings</div>
    <div class="feature-desc">
      By stripping away expensive features like integrated news APIs and real-time/intraday data, this platform provides professional-grade tools at a significantly lower cost, making it up to 96% cheaper than other platforms.
    </div>
  </div>
</div>
   <!-- Tradeoff Section -->
   <div id="tradeoff">
  <h2 style="cursor: default;">THE TRADEOFF</h2>
  <div class="comparison-table" style="cursor: default;">
    <div class="table-header">
      <div class="table-cell" style="font-size: 16px;">Feature</div>
      <div class="table-cell" style="font-size: 16px;">Ereuna (Core)</div>
      <div class="table-cell" style="font-size: 16px;">Ereuna (Premium)</div>
      <div class="table-cell" style="font-size: 16px;">Other Platforms</div>
    </div>
    <div class="table-row">
      <div class="table-cell" style="font-weight: bold; font-size: 14px;">Price</div>
      <div class="table-cell" style="font-size: 12px;">5.99€ / Month</div>
      <div class="table-cell" style="font-size: 12px;">14.99€ / Month</div>
      <div class="table-cell" style="font-size: 12px;">40€ / Month (up to 150€+)</div>
    </div>
    <div class="table-row">
      <div class="table-cell" style="font-weight: bold; font-size: 14px;">Intraday / Real Time Data</div>
      <div class="table-cell" style="font-size: 12px;">EOD Only</div>
      <div class="table-cell" style="font-size: 12px;">Yes</div>
      <div class="table-cell" style="font-size: 12px;">Yes</div>
    </div>
    <div class="table-row">
      <div class="table-cell" style="font-weight: bold; font-size: 14px;">Fundamental Data</div>
      <div class="table-cell" style="font-size: 12px;">Yes</div>
      <div class="table-cell" style="font-size: 12px;">Yes</div>
      <div class="table-cell" style="font-size: 12px;">Yes</div>
    </div>
    <div class="table-row">
      <div class="table-cell" style="font-weight: bold; font-size: 14px;">Financial Instruments / Coverage </div>
      <div class="table-cell" style="font-size: 12px;">US Equity Only (for now)</div>
      <div class="table-cell" style="font-size: 12px;">US Equity Only (for now)</div>
      <div class="table-cell" style="font-size: 12px;">It varies</div>
    </div>
    <div class="table-row">
      <div class="table-cell" style="font-weight: bold; font-size: 14px;">Integrated Market News</div>
      <div class="table-cell" style="font-size: 12px;">No</div>
      <div class="table-cell" style="font-size: 12px;">No</div>
      <div class="table-cell" style="font-size: 12px;">It varies</div>
    </div>
    <div class="table-row">
      <div class="table-cell" style="font-weight: bold; font-size: 14px;">Alerts</div>
      <div class="table-cell" style="font-size: 12px;">No</div>
      <div class="table-cell" style="font-size: 12px;">No</div>
      <div class="table-cell" style="font-size: 12px;">Yes</div>
    </div>
  </div>
</div>

    <!-- Pricing Section -->
    <div class="content-section" id="pricing" style="cursor: default;">
      <h2 style="text-align: center; font-size: 20px; color: whitesmoke;">PRICING</h2>
       <div class="pricing-cards">
     <div class="pricing-card">
<div class="pricing-header">
  <h3>CORE</h3>
  <div class="price-container">
    <span class="feature">5.99€</span>
    <span class="mini-title"> / month (VAT Excluded)</span>
  </div>
</div>
  <div class="feature-list">
    <div class="feature-item">
      <svg class="verified-icon" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="10" fill="#8c8dfe"/><path d="M6 10.5l2.5 2.5 5-5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
      Coverage of 5000+ Stocks listed on NYSE and Nasdaq
    </div>
    <div class="feature-item">
      <svg class="verified-icon" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="10" fill="#8c8dfe"/><path d="M6 10.5l2.5 2.5 5-5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
      35+ years of EOD price data (Daily and Weekly), 20+ years of financial statements
    </div>
    <div class="feature-item">
      <svg class="verified-icon" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="10" fill="#8c8dfe"/><path d="M6 10.5l2.5 2.5 5-5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
      One-Click Multi-Screener and other time saving features, 50+ screening parameters
    </div>
    <div class="feature-item">
      <svg class="verified-icon" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="10" fill="#8c8dfe"/><path d="M6 10.5l2.5 2.5 5-5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
      No commitment, it's recharge based, no automatic / recurring charges, Eligible for refunds the first 15 days
    </div>
  </div>
<!--<button class="pricebtn full-width">Get Started</button>-->  
</div>
      <div class="pricing-card">
<div class="pricing-header">
  <h3>PREMIUM</h3>
  <div class="price-container">
    <span class="feature">14.99€</span>
    <span class="mini-title"> / month (VAT Excluded)</span>
  </div>
</div>
  <div class="feature-list">
     <div class="feature-item">
      <svg class="verified-icon" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="10" fill="#8c8dfe"/><path d="M6 10.5l2.5 2.5 5-5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
      Intraday / Real-time Data Support
    </div>
    <div class="feature-item">
      <svg class="verified-icon" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="10" fill="#8c8dfe"/><path d="M6 10.5l2.5 2.5 5-5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
      Coverage of 5000+ Stocks listed on NYSE and Nasdaq
    </div>
    <div class="feature-item">
      <svg class="verified-icon" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="10" fill="#8c8dfe"/><path d="M6 10.5l2.5 2.5 5-5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
      35+ years of price data (Intraday, Daily and Weekly), 20+ years of financial statements
    </div>
    <div class="feature-item">
      <svg class="verified-icon" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="10" fill="#8c8dfe"/><path d="M6 10.5l2.5 2.5 5-5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
      One-Click Multi-Screener and other time saving features, 50+ screening parameters
    </div>
    <div class="feature-item">
      <svg class="verified-icon" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="10" fill="#8c8dfe"/><path d="M6 10.5l2.5 2.5 5-5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
      No commitment, it's recharge based, no automatic / recurring charges, Eligible for refunds the first 15 days
    </div>
  </div>
 
</div>
</div>
    </div>

   <!-- Call-to-Action Section -->
   <div class="cta-section" >
    <h2 style="text-align: center; font-size: 30px; color: whitesmoke;cursor: default;">Ready to Get Started?</h2>
     <div class="navbtn3" @click="$router.push('/signup')">Join Now</div> 
    </div>
  
    <div style="padding: 30px">

    </div>
<!-- FAQ Section -->
<div class="content-section" id="faq">
    <h2 style="text-align: center; font-size: 20px; color: whitesmoke; cursor: default;">FREQUENTLY ASKED QUESTIONS</h2>
    <div class="faq-cards">
      <div class="faq-card" v-for="(item, index) in faqs" :key="index">
        <h3 class="faq-question">{{ item.question }}</h3>
        <div class="faq-answer" v-show="item.show">
          <p>{{ item.answer }}</p>
        </div>
      </div>
    </div>
  </div>


  <div id="about">
      <h2 style="text-align: center; font-size: 20px; color: whitesmoke;">ABOUT</h2>
      <p class="text">
        Over the years I became fed up with the expensive and cluttered premium stock screeners on the current market. I was paying up to $50 per month for features I didn't need and was stuck sifting through irrelevant stocks and duplicate values.</p>
<p class="text">
  I built an affordable stock screening option for mid-long term oriented retail traders. you can hide unwanted stocks that don't meet your criteria, run multiple screeners simultaneously, so that you can remove duplicate value while still allowing you to see how many times a stock appeared and where, this allows you to do everything in 1/5 of the time (by estimate based on my personal screening routine), also by focusing only on core data (EOD price and financial statements), i was able to significantly reduce costs and took price down to just $5.99/month compared to 50-150 $ / month of industry average, i also have plans to expand to include new markets and features in the future.
      </p>
      <p class="text">
        I can create a new market space that's uncontested by traditional premium screeners, because small investors should be able to put as much of their savings as they can in the market to growth their wealth, rather than spending them on tools for analysing it.
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
  <p>&copy; Lorenzo Mazzola 2025. All rights reserved.</p>
  <div class="back-to-top" @click="scrollToSection('navbar')">Back to Top ↑</div>
  <div class="footer-links">
    <a href="#" @click.prevent="showTermsModal">Terms of Service  & Privacy Policy</a> 
  </div>
</div>
    </div>
  </div>
  <div v-if="showTerms" class="modal" @click.self="closeTermsModal">
    <h2 style="color: whitesmoke; font-size: 14px;">Terms of Service & Privacy Policy</h2>
    <div class="modal-content">
    <h2 class="contract-title">1. INTRODUCTION</h2>
    <p>These Terms and Conditions and Privacy Policy ("Terms") govern the use of the Ereuna platform ("Platform") and the services provided by Lorenzo Mazzola, trading as Ereuna ("Proprietor"). By using the Platform, you ("User ") agree to be bound by these Terms.</p>
    
    <h2 class="contract-title">2. DATA AGGREGATION SERVICES</h2>
    <p>The Proprietor provides financial data aggregation services using data supplied by Tiingo.com, as well as internally calculated formulas using the data provided by Tiingo. Core data, including End-of-Day (EOD) and financial data, is provided by Tiingo and their third-party providers. The Proprietor does not assume any responsibility for inaccuracies in the core data. The responsibility for any inaccuracies lies with Tiingo and their third-party partners.</p>
    
    <h2 class="contract-title">3. USER INFORMATION AND PRIVACY</h2>
    <p>The Proprietor is committed to collecting the minimum amount of user information necessary to anonymize users to the greatest extent possible and to store only the information that is essential for the functioning of the application. The Proprietor does not implement any tracking systems, except for those necessary to authenticate user sessions or for minimal logging purposes to ensure the platform's functionality and security. IP addresses and fingerprints may be logged. The Proprietor does not sell user information to third parties, and does not store payment informations, full legal names, email addresses, or phone numbers in its database.</p>
    
    <h2 class="contract-title">4. PAYMENT TERMS</h2>
    <p>Payment can be made using a credit card through Stripe. Credit card information will not be stored in the Proprietor's database. The Proprietor offers a subscription with four tiers: 1 month, 4 months, 6 months, and 1 year. The amount will be €5.99 per month, plus any applicable value-added taxes based on the client's location.</p>
    
    <h2 class="contract-title">5. REFUND POLICY</h2>
    <p>The client can request a refund within the first 15 days of their initial subscription. For subsequent recharge payments, the client can request a refund within the first 48 hours. Please note that this refund policy only applies to the initial subscription and subsequent recharge payments, and not to any other circumstances.</p>
    
    <h2 class="contract-title">6. SECURITY AND ACCESS</h2>
    <p>Users are strictly prohibited from attempting to access the server, API, or other services reserved for the Proprietor, regardless of their intentions. Additionally, users are not permitted to resell data or scrape the platform in any way. Any attempts to bypass security measures or exploit the platform for unauthorized purposes will be considered a serious breach of these Terms.</p>
    
    <h2 class="contract-title">7. RECOVERY METHODS</h2>
    <p>The Proprietor offers a two-factor authentication verification using an authenticator app with a QR code. For password recovery, a code can be entered to reset the password. The recovery code can be downloaded during the registration process or regenerated and downloaded during a user's session. No other recovery methods will be used. It is the user's responsibility to securely store their recovery code, as it will be the only means of regaining access to their account in the event of a lost or forgotten password.</p>
    
    <h2 class="contract-title">8. MODIFICATION OF TERMS</h2>
    <p>The Proprietor reserves the right to modify these Terms, provided that it notifies all users on the platform and they must re-accept the new conditions or terminate their use of the service. Users will be informed of any changes to these Terms, and it is their responsibility to review and agree to the updated Terms. If a user does not agree to the new Terms, they must cancel their subscription and cease using the service.</p>
    
    <h2 class="contract-title">9. DATA UPDATE AND MAINTENANCE</h2>
    <p>New data and formulas will be updated approximately 2 hours after the US markets close on each business day (due to the provider's schedule) and there will be a maintenance period during which the platform will be temporarily unavailable to allow new data to be uploaded into the platform. This maintenance period typically lasts around 20 minutes, after which the platform will be available again.</p>
    
    <h2 class="contract-title">10. SUPPORT AND CONTACT</h2>
    <p>For any questions or support, you can contact the Proprietor at the email address contact@ereuna.io. The Proprietor will respond to inquiries and provide assistance to the best of its abilities.</p>
    
    <h2 class="contract-title">11. LEGAL BASIS AND JURISDICTION</h2>
    <p>The Platform is legally based in Italy and is subject to the laws and regulations of Italy. As required by applicable laws, logs will be kept for a period of up to 18 months. After this period, the logs will be deleted. The Platform will comply with all applicable requirements, including those related to data retention and privacy.</p>
    
    <h2 class="contract-title">12. ACCOUNT CANCELLATION</h2>
    <p>The user can cancel their account at any time through the dashboard session on the platform. Upon account cancellation, all user data will be deleted within 48 hours (except for logs, which will be retained for 18 months as previously mentioned). A refund can be applicable, taking into account the remaining time, calculated on the basis of remaining subscriptions days, where 30 days equal 5.99€.</p>
    
    <h2 class="contract-title">13. DATA BREACH NOTIFICATION</h2>
    <p>The Proprietor is obligated to notify users in the event of a data breach. As previously stated, no sensitive data is stored on the platform, and data minimization is implemented. All data is encrypted to ensure its confidentiality and security. In the event of a data breach, the Proprietor will notify affected users promptly and provide them with information on the measures being taken to mitigate the breach and prevent future incidents.</p>
    
    <h2 class="contract-title">14. LIMITATION OF LIABILITY</h2>
    <p>In no event shall the Proprietor be liable for any damages, including but not limited to incidental, consequential, or punitive damages, arising out of or in connection with the use of the Platform. The User agrees to hold harmless the Proprietor, from any claims, demands, or actions arising out of or in connection with the use of the Platform.</p>

    <p style="text-align: center; margin-top: 60px">By using the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms.</p>
    </div>
    <button @click="closeTermsModal"><img style="width: 10px;" src="@/assets/icons/close.png" alt=""></button>
</div>
</div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { ref, onMounted } from 'vue';

const router = useRouter();

function redirectToLogin() {
  router.push('/login');
}

function redirectToSign() {
  router.push('/signup');
}


const faqs = ref([
{ 
    question: 'Who is this platform designed for?', 
    answer: 'This platform is specifically designed for retail traders with mid to long-term investment horizons, including swing traders and position traders, as well as investors seeking to conduct thorough research. the aim to provide a low-cost, professional-grade solution for stock screening and fundamental data analysis, catering to individuals who struggle to afford average monthly subscription fees for features they may not necessarily need. By streamlining services and focusing on essential tools, the mission is to make high-quality research accessible to a wider audience.', 
    show: true 
  },
  { 
    question: 'Will there be more financial instruments added in the future?', 
    answer: 'Yes, as the platform grows, there are plans to add more financial instruments to the platform, including derivatives such as ETFs, stocks from other stock markets beyond the US, and cryptocurrencies. This expansion will provide users with a more comprehensive suite of investment options and enhance their overall experience.', 
    show: true 
  },
  { question: 'What is the payment method?', answer: 'Credit Card via Stripe, cryptocurrencies will be added in the future.', show: true },
  { question: 'Is there a refund policy?', answer: 'Yes, you are eligible for refunds the first 15 days of registration. you have to write to contact@ereuna.io and provide your Username and invoice id, refunds will be processed within 5 business days', show: true },
  { question: 'Can I use Ereuna on mobile?', answer: 'Yes, Ereuna has a mobile version available. However, please note that while we strive to make our website accessible and usable on all devices, the mobile experience is not yet as optimized as the desktop version. Some features may not work properly or may behave differently due to the smaller screen size and touch input. We are actively working on improving and refining the mobile experience, so some issues will be addressed in future updates.', show: true },
  { question: 'Is there a commitment or contract?', answer: 'No, there is no commitment or contract. It\'s recharge based, no automatic / recurring charges. you can add more days to your subscription in the Dashboard session', show: true },
]);

const scrollToSection = (sectionId) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }

  // Update the position of the .sphere-gradient element
  const sphereGradient = document.querySelector('.sphere-gradient');
  const scrollY = window.scrollY;
  const heroHeight = document.querySelector('.hero').offsetHeight;

  if (scrollY > heroHeight) {
    sphereGradient.style.position = 'absolute';
    sphereGradient.style.top = `${scrollY + 110}px`;
  } else {
    sphereGradient.style.position = 'fixed';
    sphereGradient.style.top = '110%';
  }
};

const showTerms = ref(false);

function showTermsModal() {
  showTerms.value = true;
}

function closeTermsModal() {
  showTerms.value = false;
}

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

.beta-tag-on-video {
  position: absolute;
  top: 70%;
  left: 50%;
  transform: translateX(-50%) rotate(-5deg);
  border: solid 2px $accent1;
  width: 150px;
  border-radius: 5px;
  color: $accent1;
  text-align: center;
  letter-spacing: 2px;
  font-weight: bold;
  padding: 3px;
  margin-top: 20px;
  font-size: 20px;
}

.pricing-cards {
  display: flex;
  flex-direction: row;
  gap: 30px;
  padding: 30px;
}

.sphere-gradient {
  position: fixed;
  top: 110%;
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
  font-size: 40px;
  font-weight: bold;
  margin: 0;
}

.pricing-card h3 {
  color: $accent2;
  margin-bottom: 10px;
}

.call-to-action {
  font-size: 18px;
  color: #dcdcdc;
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

.login-button {
  background-color: transparent;
  color: $text1;
  border: solid 2px $accent1;
  padding: 10px 20px;
  font-size: 18px;
  cursor: pointer;
  border-radius: 5px;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: $accent1;
  }
}

.join {
  font-size: 12px;
  margin-bottom: 10px;
  display: block;
  color: #dcdcdc;
}

.sign-button {
  background-color: transparent;
  color: $text1;
  border: solid 2px $text2;
  padding: 10px 20px;
  font-size: 18px;
  cursor: pointer;
  border-radius: 5px;
  transition: background-color 0.3s ease;
}

.icon {
    height: 60px; /* Increased size for better visibility */
    opacity: 0.50;
  }

  .navbar {
  display: flex;
  justify-content: space-between; /* Push logo to the left and buttons to the right */
  align-items: center;
  background-color: transparent;
  border-radius: 10px;
  color: #f5f5f5;
  padding: 15px 30px; /* Add horizontal padding for better spacing */
  position: sticky;
  top: 2%;
  left: 2%;
  right: 2%;
  z-index: 1000;
  opacity: 0.90;
}

.nav-links {
  display: flex;
  gap: 80px; /* Space between buttons */
  align-items: center;
}

a{
  color: whitesmoke;
  opacity: 0.90;
  cursor: pointer;
}

a:hover{
  opacity: 1;
}
  
  .navbtn{
    border: none;
    background-color: transparent;
    color: whitesmoke;
    opacity: 0.70;
    font-size: 1.5rem;
  }

  .navbtn:hover{
     background-color: transparent;
     opacity: 1;
     cursor: pointer;
  }

  .navbtn2 {
  border: none; /* Remove default border */
  border-radius: 5px; /* Rounded corners */
  background-color: transparent; /* Button background color */
  color: whitesmoke; /* Text color */
  padding: 10px 20px; /* Padding for better spacing */
  font-size: 1.5rem; /* Font size */
  cursor: pointer; /* Pointer cursor on hover */
  position: relative; /* For pseudo-element positioning */
  overflow: hidden; /* Hide overflow for pseudo-element */
  z-index: 100; /* Ensure text is above the gradient */
  transition: color 0.3s ease; /* Smooth text color transition */
  display: flex; /* Use flexbox for centering */
  align-items: center; /* Center vertically */
  justify-content: center; /* Center horizontally */
}

/* Gradient border animation */
.navbtn2::before {
  content: '';
  position: absolute; /* Position it absolutely */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1; /* Place it behind the content */
  border-radius: 5px; /* Match the border radius of the parent */
  background: linear-gradient(270deg, #8c8dfe, #4c4d8f, #494bb9); /* Gradient colors */
  padding: 2px; /* Space for the border effect */
  mask: linear-gradient(white, white) content-box, linear-gradient(white, white);
  -webkit-mask: linear-gradient(white, white) content-box, linear-gradient(white, white);
  -webkit-mask-composite: source-out; /* For masking */
  animation: border-animation 5s linear infinite;
  mask-composite: exclude; /* For masking */
  background-size: 300% 300%; 
}

.navbtn2:hover::before {
  -webkit-mask: none; /* Remove the mask on hover */
  mask: none; /* Remove the mask on hover */
  padding: 0; /* Remove padding to fill the entire button */
}

/* Keyframes for gradient animation */
@keyframes border-animation {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.logo{
  height: 30px;
}

.features{
  background-color: transparent;
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

.comparison-table {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  overflow: hidden;
  background: linear-gradient(to top, #f7f7f7, #f7f7f7);
  background-image: linear-gradient(to bottom, #8c8dfe1a, #8c8efe09);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1), 0 6px 6px rgba(0, 0, 0, 0.05);
}

.table-header, .table-row {
  display: flex;
  color: $text1;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
}

.table-header {
  background-color: $base2;
  font-weight: bold;
}

.table-cell {
  flex: 1;
  padding: 10px;
  color: #dcdcdc;
}

.table-cell:first-child {
  flex: 2;
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
  background-color: $base4;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  width: 80%;
  color: whitesmoke;
}

.faq-question {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 10px;
  opacity: 1;
}

.faq-answer {
  font-size: 1rem;
  color: #dcdcdc;
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
  background-color: $base4;
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

/* New styles for added sections */
.feature-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(300px, 1fr));
  gap: 15px;
  margin-top: 20px;
  justify-content: center;
}

.feature-card {
  background-color: $base4;
  padding: 20px;
  margin: 5%;
  border-radius: 10px;
  text-align: center;
  border: solid 1px $accent2;
  color: #dcdcdc;
  cursor: default;
  
  /* Animation properties */
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}

/* Class applied when card becomes visible */
.feature-card.animate-visible {
  opacity: 1;
  transform: translateY(0);
}

.feature-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 8px;
}

.feature-desc {
  font-size: 14px;
  color: #dcdcdc;
  text-align: left;
}

.cta-section {
  text-align: center;
  padding: 60px 20px;
  overflow: hidden;
  background-color: $base4;
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
  padding: 40px;
  background-color: rgba($base4, 0.40);
  color: $text2;
  text-align: center;
  margin-top: 40px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.footer-links {
  margin-left: auto;
  display: flex;
  gap: 20px;
}

.back-to-top {
  cursor: pointer;
  color: whitesmoke;
  opacity: 0.90;
  margin: 0 auto;
  flex: 1;
  text-align: center;
}

// ...existing code...

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
  transition: background 0.2s;
}

.pricebtn.full-width:hover {
  background: $accent2;
}

// ...existing code...

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

  .login-button {
    background-color: transparent;
    color: $text1;
    border: solid 2px $accent1;
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

}



</style>