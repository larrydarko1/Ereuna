<template>
  <div class="landing-page">
    <!-- Navbar -->
    <div class="navbar" style="min-width: 900px;">
  <img class="icon" src="@/assets/icons/owl.png" alt="Owl Icon">
  <div class="nav-links">
    <div class="navbtn" @click="scrollToSection('about')">About</div>
    <div class="navbtn" @click="scrollToSection('features')">Features</div>
    <div class="navbtn" @click="scrollToSection('pricing')">Pricing</div>
    <div class="navbtn">
      <router-link to="/signup" style="color: whitesmoke; text-decoration: none; font-size: 12px;">Sign Up</router-link>
    </div>
    <div class="navbtn2" @click="$router.push('/login')">
  <router-link to="/login" style="color: whitesmoke; text-decoration: none; font-size: 12px;">Login</router-link>
</div>
  </div>
</div>

    <!-- Hero Section -->
    <div class="hero-section">
  <video class="hero-video" autoplay muted loop>
    <source src="@/assets/videos/heroAnimation.mp4" type="video/mp4">
    Your browser does not support the video tag.
  </video>
  <div class="hero-text" style="text-align: center;">
    <h1 class="hero-title">
    Unlock Smarter Investing with <span class="hero-title" style="color: #8c8dfe;">Ereuna</span>
</h1>
    <p class="hero-subtitle">Get the insights you need to succeed in the market without breaking the bank. Our platform offers essential features and data for mid-to-long term investors, all at a fraction of the cost of traditional solutions.</p>
    <br>
    <p style="color: #8c8dfe;"> 5.99€ / Month <span style="color: whitesmoke;">- No Commitment, Cancel Anytime</span></p>
  </div>
  </div>

    <!-- About Section -->
     <br>
    <div class="content-section3" id="about">
      <h2 style="text-align: center; font-size: 20px; color: whitesmoke;">ABOUT</h2>
      <p class="text">
        As a seasoned trader with years of experience, I created this stock screener as a personal tool to streamline my own investment research and decision-making process. Initially designed to meet my own needs, I soon realized that the platform had the potential to benefit others who, like me, were looking for a reliable and affordable solution.</p>
<p class="text">
Rather than keeping it exclusive to my own use, I decided to commercialize the platform, making it accessible to fellow traders and investors at a fraction of the cost of similar tools on the market. As a solo developer, I'm committed to providing a high-quality product that is both effective and affordable.
      </p>
    </div>

    <!-- Partner Section -->
      <div class="content-section2" id="partners">
      <h2 style="text-align: center; font-size: 20px; color: whitesmoke;">PARTNERS</h2>
      <br>
      <div style="display: flex; justify-content: center; align-items: center; gap: 70px;">
    <img class="logo" src="@/assets/images/logos/tiingo.png" alt="">
    <img class="logo" src="@/assets/images/logos/tradingview.png" alt="">
</div>
       
    </div>

    <!-- Features Section -->
    <div class="content-section2" id="features">
      <h2 style="text-align: center; font-size: 20px; color: whitesmoke;">FEATURES</h2>
      <div class="feature-cards">
        <div class="feature-card">
          <h3 class="feature">Data, Simplified</h3>
          <p>• Personalized Stock Universe: Our platform allows you to customize your stock universe by hiding or showing irrelevant stocks, tailoring the data to your individual investment needs and preferences.</p>
          <p>• Turbocharged Stock Screening: Our advanced data aggregation tools enable you to combine multiple screeners and remove duplicates and hidden stocks, significantly speeding up your research process and saving you time.</p>
          <p>• One-Click Multi-Screener Analysis: Say goodbye to tedious manual screening and hello to streamlined analysis. Our platform allows you to run multiple screeners simultaneously, providing a comprehensive view of your desired stocks in a single click.</p>
        </div>
        <div class="feature-card">
          <h3 class="feature">Unbeatable Pricing</h3>
          <p>• Unbeatable Value: We are the cheapest / most affordable professional stock screening and research platform on the market, by stripping away expensive features like integrated news APIs and real-time/intraday data, we're able to focus on what's truly important for mid-to-long term investors: EOD and core fundamental data that drives informed decision-making.</p>
          <p>• Up to 90% Cheaper: Our streamlined approach allows us to pass the savings on to you, making us up to 90% cheaper than other platforms. This means you can enjoy professional-grade tools without breaking the bank.</p>
          <p>• No Frills, Just Results: We're committed to providing the essential features and data you need to succeed, without the unnecessary bells and whistles that drive up costs. This approach enables us to deliver exceptional value to our users.</p>
        </div>
        <div class="feature-card">
          <h3 class="feature">Privacy Focused</h3>
          <p>• GDPR Compliant: Our platform is fully compliant with the European Union's General Data Protection Regulation (GDPR), ensuring that we meet the highest standards for data protection and user privacy.</p>
          <p>• Minimal Data Collection: We respect your right to anonymity and do not ask for personal information by default, such as full name, address, email, or phone number. This approach minimizes the amount of data we collect and reduces the risk of data breaches.</p>
          <p>• Bare Minimum Data Storage: We only store the minimal amount of data necessary to provide our services and do not log any information beyond what is necessary to maintain the security and functionality of our platform, reducing the risk of data exposure and protecting your sensitive information.</p>
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
      <div class="table-cell">Price</div>
      <div class="table-cell">5.99€ / Month</div>
      <div class="table-cell">40€ / Month (up to 150€+)</div>
    </div>
    <div class="table-row">
      <div class="table-cell">Intraday / Real Time Data</div>
      <div class="table-cell">EOD Only</div>
      <div class="table-cell">Yes</div>
    </div>
    <div class="table-row">
      <div class="table-cell">Fundamental Data</div>
      <div class="table-cell">Yes</div>
      <div class="table-cell">Yes</div>
    </div>
    <div class="table-row">
      <div class="table-cell">Financial Instruments</div>
      <div class="table-cell">US Equity Only (for now)</div>
      <div class="table-cell">It varies</div>
    </div>
    <div class="table-row">
      <div class="table-cell">Integrated Market News</div>
      <div class="table-cell">No</div>
      <div class="table-cell">It varies</div>
    </div>
  </div>
</div>

    <!-- Pricing Section -->
    <div class="content-section" id="pricing">
      <h2 style="text-align: center; font-size: 20px; color: whitesmoke;">PRICING</h2>
      <div class="pricing-cards">
        <!-- Single Plan -->
        <div class="pricing-card">
          <p class="feature">5.99€ + VAT / Month</p>
            <p>No commitment, it's recharge based, no automatic / recurring charges </p>
            <p>Eligible for refunds the first 15 days</p>
         <div class="payme">
          <img class="icon2" src="@/assets/icons/credit-card.png" alt="credit-card"> 
          <img class="icon2" src="@/assets/icons/bitcoin.png" alt="">
          <img class="icon2" src="@/assets/icons/ethereum.png" alt="">
          <img class="icon2" src="@/assets/icons/monero.png" alt="">
          <p>Payable with Credit Card or major Cryptocurrencies</p>
         </div>
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
        <h3 class="faq-question" @click="toggleAnswer(index)">{{ item.question }}</h3>
        <div class="faq-answer" v-show="item.show">
          <p>{{ item.answer }}</p>
        </div>
      </div>
    </div>
  </div>

    <!-- Footer -->
    <div class="footer">
  <p>&copy; Ereuna Srl 2025. All rights reserved.</p>
  <div class="footer-links">
    <a href="#" @click.prevent="showTermsModal">Terms of Service</a> 
    <a href="#" @click.prevent="showPrivacyModal">Privacy Policy</a>
  </div>
</div>
</div>

  <div v-if="showTerms" class="modal" @click.self="closeTermsModal">
    <h2 style="color: whitesmoke;">Terms of Service</h2>
    <div class="modal-content">
        <p>These Terms of Service ("Terms") govern your access to and use of our web application ("Service"). By subscribing to or using our Service, you agree to these Terms. If you do not agree, please do not use our Service.</p>

        <p><strong>1. Acceptance of Terms</strong></p>
        <p>By creating an account and using our Service, you confirm that you are at least 18 years old or have the consent of a parent or guardian. You agree to comply with all applicable laws and regulations.</p>

        <p><strong>2. Subscription and Payment</strong></p>
        <p><strong>Subscription Plans:</strong> Our Service is offered on a monthly subscription basis. You can choose from various subscription plans, which will be detailed on our website.</p>
        <p><strong>Payment:</strong> By subscribing, you agree to manually recharge your account as needed for continued access to the Service. We do not charge your payment method automatically; you have the flexibility to add funds to your account at your discretion.</p>

        <p><strong>3. Account Responsibilities</strong></p>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account or any other breach of security.</p>

        <p><strong>4. User Conduct</strong></p>
        <p>You agree not to use the Service for any unlawful or prohibited purpose. You will not:</p>
        <ul>
            <li>Violate any applicable laws or regulations.</li>
            <li>Transmit any harmful or malicious code.</li>
            <li>Attempt to gain unauthorized access to our systems or networks.</li>
        </ul>

        <p><strong>5. Termination</strong></p>
        <p>We reserve the right to suspend or terminate your access to the Service at our discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users or our business.</p>

        <p><strong>6. Limitation of Liability</strong></p>
        <p>To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, even if we have been advised of the possibility of such damages.</p>

        <p><strong>7. Changes to Terms</strong></p>
        <p>We may update these Terms from time to time. We will notify you of any changes by posting the new Terms on our website. Your continued use of the Service after any changes constitutes your acceptance of the new Terms.</p>

        <p><strong>8. Contact Us</strong></p>
        <p>If you have any questions or concerns about these Terms, please contact us at: <a href="mailto:support@ereuna.co">support@ereuna.co</a></p>
    </div>
    <button @click="closeTermsModal"><img style="width: 10px;" src="@/assets/icons/close.png" alt=""></button>
</div>

<div v-if="showPrivacy" class="modal" @click.self="closePrivacyModal">
    <h2 style="color: whitesmoke;">Privacy Policy</h2>
    <div class="modal-content">
        <p>Privacy Policy for Account Registration</p>
        <p>We are committed to protecting your privacy. This Privacy Policy outlines how we collect, use, and safeguard your personal information when you register for an account with us.</p>

        <p><strong>1. Information We Collect</strong></p>
        <p>When you register for an account, we may collect the following types of information:</p>
        <ul>
            <li><strong>Personal Information:</strong> This may include your name, email address, phone number, and any other information you provide during the registration process.</li>
            <li><strong>Account Information:</strong> This includes your username, password, and any preferences you set for your account.</li>
            <li><strong>Usage Data:</strong> We may collect information about how you use our services, including your interactions with our website and applications.</li>
        </ul>

        <p><strong>2. How We Use Your Information</strong></p>
        <p>We may use the information we collect for various purposes, including:</p>
        <ul>
            <li>To create and manage your account.</li>
            <li>To communicate with you regarding your account and our services.</li>
            <li>To improve our services and enhance user experience.</li>
            <li>To comply with legal obligations and protect our rights.</li>
        </ul>

        <p><strong>3. Data Security</strong></p>
        <p>We take the security of your personal information seriously. We implement appropriate technical and organizational measures to protect your data from unauthorized access, loss, or misuse. However, please be aware that no method of transmission over the internet or electronic storage is 100% secure.</p>

        <p><strong>4. Sharing Your Information</strong></p>
        <p>We do not sell, trade, or otherwise transfer your personal information to outside parties without your consent, except as required by law or to protect our rights. We may share your information with trusted third-party service providers who assist us in operating our website and conducting our business, provided they agree to keep your information confidential.</p>

        <p><strong>5. Your Rights</strong></p>
        <p>You have the right to access, correct, or delete your personal information at any time.</p>

        <p><strong>6. Changes to This Privacy Policy</strong></p>
        <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on our website. We encourage you to review this Privacy Policy periodically for any updates.</p>
    </div>
    <button @click="closePrivacyModal"><img style="width: 10px;" src="@/assets/icons/close.png" alt=""></button>
</div>
</template>
  
  <script setup>
import { useRouter } from 'vue-router';
import { ref } from 'vue';

const faqs = ref([
  { question: 'What is the payment method?', answer: 'We accept Credit Cards or major Cryptocurrencies. (Bitcoin, Ethereum and Monero), more cryptocurrencies will be added in the future.', show: false },
  { question: 'Is there a refund policy?', answer: 'Yes, you are eligible for refunds the first 15 days. you have to write to support@ereuna.co and provide your Username, refunds will be processed within 5 business days', show: false },
  { question: 'Is there a commitment or contract?', answer: 'No, there is no commitment or contract. It\'s recharge based, no automatic / recurring charges. you can add more days to your subscription in the User session', show: false },
  { 
    question: 'Who is this platform designed for?', 
    answer: 'Our platform is specifically designed for retail traders with mid to long-term investment horizons, including swing traders and position traders, as well as investors seeking to conduct thorough research. We aim to provide a low-cost, professional-grade solution for stock screening and fundamental data analysis, catering to individuals who struggle to afford average monthly subscription fees for features they may not necessarily need. By streamlining our services and focusing on essential tools, we strive to make high-quality research accessible to a wider audience.', 
    show: false 
  },
  { 
    question: 'Will there be more financial instruments added in the future?', 
    answer: 'Yes, as we grow, we plan to add more financial instruments to our platform, including derivatives such as ETFs, stocks from other stock markets beyond the US, and cryptocurrencies. This expansion will provide our users with a more comprehensive suite of investment options and enhance their overall experience.', 
    show: false 
  },
]);

const toggleAnswer = (index) => {
  faqs.value[index].show = !faqs.value[index].show;
};

const router = useRouter();

// Define the scrollToSection function
const scrollToSection = (sectionId) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

const showTerms = ref(false);
const showPrivacy = ref(false);

function showTermsModal() {
  showTerms.value = true;
}

function closeTermsModal() {
  showTerms.value = false;
}

function showPrivacyModal() {
  showPrivacy.value = true;
}

function closePrivacyModal() {
  showPrivacy.value = false;
}

  </script>
  
  <style scoped>

  p {
    color: #D3D3D3;
    font-size: 12px;
  }
  
  .navbar {
  display: flex;
  justify-content: space-between; /* Push logo to the left and buttons to the right */
  align-items: center;
  background-color: #1d1c29;
  border-radius: 10px;
  color: whitesmoke;
  padding: 10px 20px; /* Add horizontal padding for better spacing */
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  position: fixed;
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

  .content-section {
  padding: 40px 20px;
  background-color: transparent; /* Dark background for content sections */
  margin: 10px 0;
  border-radius: 5px;
}

.content-section2 {
  padding: 40px 20px;
  background-color: transparent; 
  margin: 10px 0;
  border-radius: 5px;
}

.pricing-cards{
  text-align: center;
}

.content-section3 {
  padding: 40px 20px;
  background-color: transparent;
  border: 2px solid #8c8dfe; /* Add border style and color */
  margin: 50px;
  border-radius: 10px;
  display: flex; /* Enable flexbox */
  align-items: center; /* Center vertically */
  justify-content: center; /* Center horizontally */
  flex-direction: column; /* Stack child elements vertically (optional) */
}
  
  .icon {
    width: 30px; /* Increased size for better visibility */
    height: 30px; /* Increased size for better visibility */
    opacity: 0.50;
  }
  
  .hero-section {
    color: white;
    height: 650px;
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
}

.hero-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.hero-title {
  z-index: 1;
  color: #D3D3D3;
  text-align: center;
  font-size: 50px;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.2); /* Add a subtle text shadow */
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
  background-color: #1d1c29;
  color: #D3D3D3;
  text-align: center;
  margin-top: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between; /* Add this line */
}

.footer-links {
  margin-left: auto;
  display: flex;
  gap: 20px; 
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
  background-color: #181722;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  flex: 1;
  height: 300px;
}

.cta-section {
  text-align: center;
  padding: 60px 20px;
  border-radius: 10px;
  overflow: hidden;
  background: linear-gradient(to top, #f7f7f7, #f7f7f7);
  background-image: linear-gradient(to bottom, #8c8dfe1a, #8c8efe00);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1), 0 6px 6px rgba(0, 0, 0, 0.05);
  margin-top: 40px;
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
  color: whitesmoke;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
}

.table-header {
  background-color: #181722;
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
  background-color: #181722;
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
  cursor: pointer;
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
  background-color: #2c2b3e;
  padding: 20px;
  border-radius: 15px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  opacity: 0.95;
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
    color: whitesmoke; /* Ensure text color is readable */
}
  
.text{
  font-size: 14px;
  padding: 0 100px;
  text-align: center;
}

  </style>