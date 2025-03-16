<template>
  <div class="landing-page">
    <!-- Navbar -->
    <div class="navbar" style="min-width: 1150px;">
  <img class="icon" src="@/assets/icons/owl.png" alt="Owl Icon">
  <div class="nav-links">
    <div class="navbtn" @click="scrollToSection('about')">About</div>
    <div class="navbtn" @click="scrollToSection('features')">Features</div>
    <div class="navbtn" @click="scrollToSection('pricing')">Pricing</div>
    <div class="navbtn">
      <router-link to="/signup" style="color: whitesmoke; text-decoration: none; font-size: 12px;">Sign Up</router-link>
    </div>
    <div class="navbtn2" @click="$router.push('/login')">
  <router-link to="/login" style="color: whitesmoke; text-decoration: none; font-size: 12px; background-color: transparent;">Login</router-link>
</div>
  </div>
</div>

    <!-- Hero Section -->
    <div class="hero-section" id="hero">
  <video class="hero-video" autoplay muted loop>
    <source src="@/assets/videos/heroAnimation.mp4" type="video/mp4">
    Your browser does not support the video tag.
  </video>
  <div class="hero-text" style="text-align: center;">
    <h1 class="hero-title">
    Unlock Smarter Investing <br> with <span class="hero-title" style="color: #8c8dfe;">Ereuna</span>
</h1>
    <p class="hero-subtitle">Get the insights you need to succeed in the market without breaking the bank. Our platform offers essential features and data for mid-to-long term investors, all at a fraction of the cost of traditional solutions.</p>
    <br>
    <p style="color: #8c8dfe; font-size: 14px;"> 5.99€ / Month <span style="color: whitesmoke; font-size: 14px;">- No Commitment, Cancel Anytime</span></p>
  </div>
  <div class="sphere-gradient"></div>
  </div>

    <!-- About Section -->
     <br>
    <div class="content-section3" id="about">
      <h2 style="text-align: center; font-size: 20px; color: whitesmoke;">ABOUT</h2>
      <p class="text">
        Over the years I became fed up with the expensive and cluttered premium stock screeners on the current market. I was paying up to $50 per month for features I didn't need and was stuck sifting through irrelevant stocks and duplicate values.</p>
<p class="text">
  I built an affordable premium stock screening option for mid-long term oriented retail traders. you can hide unwanted stocks that don't meet your criteria, run multiple screeners simultaneously, so that you can remove duplicate value while still allowing you to see how many times a stock appeared and where, this allows you to do everything in 1/5 of the time (by estimate based on my personal screening routine), also by focusing only on core data (EOD price and financial statements), i was able to significantly reduce costs and took price down to just $5.99/month compared to 50-150 $ / month of industry average, i also have plans to expand to include new markets and features in the future.
      </p>
      <p class="text">
        I can create a new market space that's uncontested by traditional premium screeners, because small investors should be able to put as much of their savings as they can in the market to growth their wealth, rather than speding them for the tools for analysing it.
      </p>
    </div>

    <!-- Partner Section -->
      <div class="content-section2" id="partners">
      <h2 style="text-align: center; font-size: 20px; color: whitesmoke;">PARTNERS</h2>
      <br>
      <div style="display: flex; justify-content: center; align-items: center; gap: 120px;">
    <img class="logo" src="@/assets/images/logos/tiingo.png" alt="">
    <img class="logo" src="@/assets/images/logos/tradingview.png" alt="">
    <img class="logo" src="@/assets/images/logos/stripe.png" alt="">
</div>
       
    </div>

    <!-- Features Section -->
    <div class="content-section2" id="features">
      <h2 style="text-align: center; font-size: 20px; color: whitesmoke;">FEATURES</h2>
      <div class="feature-cards">
        <div class="feature-card">
          <h3 class="feature">Data, Simplified</h3>
          <p class="bullet">• Personalized Stock Universe: you can customize your stock universe by hiding stocks that are irrelevant to your workflow and investment criteria, tailoring the data to your individual investment needs and preferences.</p>
          <p class="bullet">• One-Click Multi-Screener Analysis: you can run multiple screeners simultaneously, providing a comprehensive view of your desired stocks in a single click.</p>
        </div>
        <div class="feature-card">
          <h3 class="feature">Unbeatable Pricing</h3>
          <p class="bullet">• Unbeatable Value: the cheapest / most affordable professional stock screening and research platform on the market, by stripping away expensive features like integrated news APIs and real-time/intraday data, we're able to focus on what's truly important for mid-to-long term investors: EOD and core fundamental data that drives informed decision-making.</p>
          <p class="bullet">• Up to 90% Cheaper: Our streamlined approach allows us to pass the savings on to you, making us up to 90% cheaper than other platforms. This means you can enjoy professional-grade tools without breaking the bank.</p>
        </div>
      </div>
    </div>

   <!-- Tradeoff Section -->
<div class="content-section2" id="tradeoff">
  <h2 style="text-align: center; font-size: 20px; color: whitesmoke;">THE TRADEOFF</h2>
  <div class="comparison-table">
    <div class="table-header">
      <div class="table-cell">Feature</div>
      <div class="table-cell">Ereuna</div>
      <div class="table-cell">Other Platforms</div>
    </div>
    <div class="table-row">
      <div class="table-cell" style="font-weight: bold;">Price</div>
      <div class="table-cell">5.99€ / Month</div>
      <div class="table-cell">40€ / Month (up to 150€+)</div>
    </div>
    <div class="table-row">
      <div class="table-cell" style="font-weight: bold;">Intraday / Real Time Data</div>
      <div class="table-cell">EOD Only</div>
      <div class="table-cell">Yes</div>
    </div>
    <div class="table-row">
      <div class="table-cell" style="font-weight: bold;">Fundamental Data</div>
      <div class="table-cell">Yes</div>
      <div class="table-cell">Yes</div>
    </div>
    <div class="table-row">
      <div class="table-cell" style="font-weight: bold;">Financial Instruments</div>
      <div class="table-cell">US Equity Only (for now)</div>
      <div class="table-cell">It varies</div>
    </div>
    <div class="table-row">
      <div class="table-cell" style="font-weight: bold;">Integrated Market News</div>
      <div class="table-cell">No</div>
      <div class="table-cell">It varies</div>
    </div>
  </div>
</div>

    <!-- Pricing Section -->
    <div class="content-section" id="pricing">
      <h2 style="text-align: center; font-size: 20px; color: whitesmoke;">PRICING</h2>
        <div class="pricing-card">
          <h3 style="font-size: 16px;">ALL FEATURES, JUST ONE TIER</h3>
         <div class="price-container">
          <p><span class="feature" style="font-size: 50px;">5.99€</span></p>
         <p class="price-container2">+ VAT / Month</p> 
         </div> 
         <div class="bullet-list">
          <p>&bull; Coverage of 5000+ US stocks, EOD and 20+ years of financial statements</p> 
          <p>&bull; Tradingview Lightweight charts, watchlists, Notes, Summary data </p> 
          <p>&bull; Fast and efficient screening capabilities, saving you time and effort in your investment research</p>
          <p>&bull; Run multiple screeners simultaniously and hide stocks that are irrelevant for you, allowing for a quicker and more efficient way to run blablabla</p> 
          <p>&bull; No commitment, it's recharge based, no automatic / recurring charges</p> 
          <p>&bull; Eligible for refunds the first 15 days</p> 
         </div>
         <div class="payme">
          <img class="icon2" src="@/assets/icons/credit-card.png" alt="credit-card"> 
          <img class="icon2" src="@/assets/icons/bitcoin.png" alt="">
          <img class="icon2" src="@/assets/icons/ethereum.png" alt="">
          <img class="icon2" src="@/assets/icons/monero.png" alt="">
          <p>Payable with Credit Card or major Cryptocurrencies</p>
         </div>
      </div>
    </div>

   <!-- Call-to-Action Section -->
   <div class="cta-section">
    <h2 style="text-align: center; font-size: 20px; color: whitesmoke;">Ready to Get Started?</h2>
      <div class="navbtn3">Sign Up Now</div>
    </div>

<!-- FAQ Section -->
<div class="content-section" id="faq">
    <h2 style="text-align: center; font-size: 20px; color: whitesmoke;">FREQUENTLY ASKED QUESTIONS</h2>
    <div class="faq-cards">
      <div class="faq-card" v-for="(item, index) in faqs" :key="index">
        <h3 class="faq-question">{{ item.question }}</h3>
        <div class="faq-answer" v-show="item.show">
          <p>{{ item.answer }}</p>
        </div>
      </div>
    </div>
  </div>

    <!-- Footer -->
    <div class="footer">
  <p>&copy; Ereuna Srl 2025. All rights reserved.</p>
  <div class="back-to-top" @click="scrollToSection('hero')">Back to Top ↑</div>
  <div class="footer-links">
    <a href="#" @click.prevent="showTermsModal">Terms of Service  & Privacy Policy</a> 
  </div>
</div>
</div>

  <div v-if="showTerms" class="modal" @click.self="closeTermsModal">
    <h2 style="color: whitesmoke; font-size: 16px;">Terms of Service & Privacy Policy</h2>
    <div class="modal-content">
    <h2 class="contract-title">1. INTRODUCTION</h2>
    <p>These Terms and Conditions and Privacy Policy ("Terms") govern the use of the Ereuna platform ("Platform") and the services provided by Dr. Lorenzo Mazzola, trading as Ereuna ("Proprietor"). By using the Platform, you ("User ") agree to be bound by these Terms.</p>
    
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
    <p>For any questions or support, you can contact the Proprietor at the email address contact@ereuna.co. The Proprietor will respond to inquiries and provide assistance to the best of its abilities.</p>
    
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
</template>
  
  <script setup>
import { useRouter } from 'vue-router';
import { ref } from 'vue';

const faqs = ref([
{ 
    question: 'Who is this platform designed for?', 
    answer: 'This platform is specifically designed for retail traders with mid to long-term investment horizons, including swing traders and position traders, as well as investors seeking to conduct thorough research. the aim to provide a low-cost, professional-grade solution for stock screening and fundamental data analysis, catering to individuals who struggle to afford average monthly subscription fees for features they may not necessarily need. By streamlining our services and focusing on essential tools, the mission is to make high-quality research accessible to a wider audience.', 
    show: true 
  },
  { 
    question: 'Will there be more financial instruments added in the future?', 
    answer: 'Yes, as the platform grows, there are plans to add more financial instruments to the platform, including derivatives such as ETFs, stocks from other stock markets beyond the US, and cryptocurrencies. This expansion will provide users with a more comprehensive suite of investment options and enhance their overall experience.', 
    show: true 
  },
  { question: 'What is the payment method?', answer: 'Credit Card via Stripe, cryptocurrencies will be added in the future.', show: true },
  { question: 'Is there a refund policy?', answer: 'Yes, you are eligible for refunds the first 15 days of registration. you have to write to support@ereuna.co and provide your Username and invoice id, refunds will be processed within 5 business days', show: true },
  { question: 'Is there a commitment or contract?', answer: 'No, there is no commitment or contract. It\'s recharge based, no automatic / recurring charges. you can add more days to your subscription in the Dashboard session', show: true },
]);

const router = useRouter();

// Define the scrollToSection function
const scrollToSection = (sectionId) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

const showTerms = ref(false);

function showTermsModal() {
  showTerms.value = true;
}

function closeTermsModal() {
  showTerms.value = false;
}

  </script>
  
  <style lang="scss" scoped>
@use '../style.scss' as *;

  p {
    color: #D3D3D3;
    font-size: 12px;
  }
  
  .navbar {
  display: flex;
  justify-content: space-between; /* Push logo to the left and buttons to the right */
  align-items: center;
  background-color: rgba($base4, 0.5); /* Reduced opacity for glass effect */
  border-radius: 10px;
  color: #f5f5f5;
  padding: 10px 20px; /* Add horizontal padding for better spacing */
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  position: fixed;
  top: 2%;
  left: 2%;
  right: 2%;
  z-index: 1000;
  backdrop-filter: blur(10px); /* Blur the background for glass effect */
  opacity: 0.90;
  background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2)); /* Add a subtle gradient for depth */
}

.nav-links {
  display: flex;
  gap: 80px; /* Space between buttons */
  align-items: center;
}

  .content-section {
  padding: 40px 20px;
  background-color: transparent; /* Dark background for content sections */
  margin: 10px 0;
  border-radius: 5px;
  min-width: 1200px;
}

.content-section2 {
  padding: 40px 20px;
  background-color: transparent; 
  margin: 10px 0;
  border-radius: 5px;
  min-width: 1200px;
}

.pricing-cards{
  text-align: center;
}

.content-section3 {
  padding: 40px 0px;
  background-color: transparent;
  border: 2px solid $accent1; /* Add border style and color */
  margin: 20px;
  border-radius: 10px;
  display: flex; /* Enable flexbox */
  align-items: center; /* Center vertically */
  justify-content: center; /* Center horizontally */
  flex-direction: column; /* Stack child elements vertically (optional) */
  min-width: 1200px;
}
  
  .icon {
    width: 30px; /* Increased size for better visibility */
    height: 30px; /* Increased size for better visibility */
    opacity: 0.50;
  }
  
  .hero-section {
    color: $text1;
    height: 650px;
    min-width: 1200px;
  }

  .hero-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.20;
  z-index: -1;
  min-width: 1200px;
}

.hero-text {
  position: relative;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.hero-title {
  z-index: 1;
  color: #D3D3D3;
  text-align: center;
  font-size: 70px;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.2); /* Add a subtle text shadow */
  letter-spacing: 1.5px;
}

.hero-subtitle {
  max-width: 500px; /* Adjust the width to create a reverse pyramid effect */
  margin: 0 auto; /* Center the subtitle */
  font-size: 17px;
  color: #D3D3D3;
  text-align: center;
}
  
.footer {
  padding: 20px;
  background-color: $base4;
  color: $text2;
  text-align: center;
  margin-top: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-width: 1200px;
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

.back-to-top:hover {
  opacity: 1;
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
    font-size: 12px;
  }

  .navbtn:hover{
     background-color: transparent;
     opacity: 1;
     cursor: pointer;
  }

  .navbtn2 {
  border: none; /* Remove default border */
  border-radius: 25px; /* Rounded corners */
  background-color: #1d1c29; /* Button background color */
  color: whitesmoke; /* Text color */
  padding: 10px 20px; /* Padding for better spacing */
  font-size: 16px; /* Font size */
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
  border-radius: 25px; /* Match the border radius of the parent */
  background: linear-gradient(270deg, #8c8dfe, #4c4d8f, #494bb9); /* Gradient colors */
  padding: 2px; /* Space for the border effect */
  -webkit-mask: linear-gradient(white, white) content-box, linear-gradient(white, white); /* For masking */
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

/* New styles for added sections */
.feature-cards {
  display: flex;
  justify-content: space-around;
  gap: 20px;
  margin-top: 20px;
}

.feature-card {
  background-color: $base4;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  flex: 1;
  height: 300px;
  max-width: 550px;
  border: solid 1px $accent2
}

.cta-section {
  text-align: center;
  padding: 60px 20px;
  overflow: hidden;
  background-color: $base4;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1), 0 6px 6px rgba(0, 0, 0, 0.05);
  margin-top: 40px;
  min-width: 1200px;
}

.logo{
  height: 30px;
}

.navbtn3 {
  border: none; /* Remove default border */
  border-radius: 25px; /* Rounded corners */
  background-color: transparent; /* Button background color */
  color: whitesmoke; /* Text color */
  padding: 10px 20px; /* Padding for better spacing */
  font-size: 16px; /* Font size */
  cursor: pointer; /* Pointer cursor on hover */
  position: relative; /* For pseudo-element positioning */
  overflow: hidden; /* Hide overflow for pseudo-element */
  z-index: 100; /* Ensure text is above the gradient */
  transition: color 0.3s ease; /* Smooth text color transition */
  display: inline-flex; /* Use flexbox for centering */
  align-items: center; /* Center vertically */
  justify-content: center; /* Center horizontally */
}

/* Gradient border animation */
.navbtn3::before {
  content: '';
  position: absolute; /* Position it absolutely */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1; /* Place it behind the content */
  border-radius: 25px; /* Match the border radius of the parent */
  background: linear-gradient(270deg, #8c8dfe, #4c4d8f, #494bb9); /* Gradient colors */
  padding: 2px; /* Space for the border effect */
  -webkit-mask: linear-gradient(white, white) content-box, linear-gradient(white, white); /* For masking */
  -webkit-mask-composite: source-out; /* For masking */
  animation: border-animation 5s linear infinite;
  mask-composite: exclude; /* For masking */
  background-size: 300% 300%; 
}

.navbtn3:hover::before {
  -webkit-mask: none; /* Remove the mask on hover */
  mask: none; /* Remove the mask on hover */
  padding: 0; /* Remove padding to fill the entire button */
}

.feature{
  font-size: 20px;
  background: linear-gradient(270deg, #8c8dfe, #7273b8, #5557b7);
  background-size: 400% 400%;
  background-clip: text; /* Standard property */
  -webkit-background-clip: text; /* Safari */
  -moz-background-clip: text; /* Firefox (not widely supported) */
  -webkit-text-fill-color: transparent; /* Safari */
  animation: border-animation 2s ease infinite;
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
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
  opacity: 1;
}

.faq-answer {
  font-size: 16px;
  color: #666;
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
  display: flexbox;
  border-radius: 10px;
  align-items: center;
  text-align: center;
  padding: 10px;
  max-width: 400px;
  color: $text1;
  align-items: center;
  margin: 0 auto;
  border: solid 1px $accent3;
}

.price-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.price-container2 {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%) rotate(-5deg);
  font-size: 20px;
  margin-top: 55px;
  margin-left: 25px;
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
}

.contract-title{
  text-align: center;
  margin: 25px;
}

.sphere-gradient {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, #8c8dfe 0%, #8c8dfe 50%, #fff 100%);
  filter: blur(50px);
  z-index: 0;
  opacity: 0.15;
}
  </style>