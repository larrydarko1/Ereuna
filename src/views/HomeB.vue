<template>
  <Policy :visible="showPolicy" @close="showPolicy = false" />
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
  <!--rest of the content goes inside this div-->
  <div class="features">
    <div id="features">
      <br>
      <h2 style="cursor: default;">FEATURES</h2>
      <div class="feature-cards-modern">
        <div class="feature-card-modern">
          <div class="feature-icon-modern">
            <img src="@/assets/icons/settings.png" alt="" draggable="false" />
          </div>
          <div class="feature-title-modern">Personalized Database</div>
          <div class="feature-desc-modern">
            You can customize your financial instruments database by hiding assets that are irrelevant to your workflow and investment criteria, tailoring the data to your individual investment needs and preferences.
          </div>
        </div>
        <div class="feature-card-modern">
          <div class="feature-icon-modern">
            <img src="@/assets/icons/intersect.png" alt="" draggable="false" />
          </div>
          <div class="feature-title-modern">One-Click Multi-Screener</div>
          <div class="feature-desc-modern">
            You can run multiple screeners simultaneously, providing a comprehensive view of your desired results in a single click. Duplicate values are highlighted and sorted automatically.
          </div>
        </div>
        <div class="feature-card-modern">
          <div class="feature-icon-modern">
            <svg width="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M6.22209 4.60105C6.66665 4.304 7.13344 4.04636 7.6171 3.82976C8.98898 3.21539 9.67491 2.9082 10.5875 3.4994C11.5 4.09061 11.5 5.06041 11.5 7.00001V8.50001C11.5 10.3856 11.5 11.3284 12.0858 11.9142C12.6716 12.5 13.6144 12.5 15.5 12.5H17C18.9396 12.5 19.9094 12.5 20.5006 13.4125C21.0918 14.3251 20.7846 15.011 20.1702 16.3829C19.9536 16.8666 19.696 17.3334 19.399 17.7779C18.3551 19.3402 16.8714 20.5578 15.1355 21.2769C13.3996 21.9959 11.4895 22.184 9.64665 21.8175C7.80383 21.4509 6.11109 20.5461 4.78249 19.2175C3.45389 17.8889 2.5491 16.1962 2.18254 14.3534C1.81598 12.5105 2.00412 10.6004 2.72315 8.86451C3.44218 7.12861 4.65982 5.64492 6.22209 4.60105Z" fill="currentColor"></path> <path d="M21.446 7.06901C20.6342 5.00831 18.9917 3.36579 16.931 2.55398C15.3895 1.94669 14 3.34316 14 5.00002V9.00002C14 9.5523 14.4477 10 15 10H19C20.6569 10 22.0533 8.61055 21.446 7.06901Z" fill="currentColor"></path> </g></svg>
          </div>
          <div class="feature-title-modern">Portfolio Simulations</div>
          <div class="feature-desc-modern">
            Simulate different portfolios to discover which strategies work best for you, or simply track your progress over time. Test allocations, compare outcomes, and refine your investment approach with powerful, easy-to-use simulation tools.
          </div>
        </div>
        <div class="feature-card-modern">
          <div class="feature-icon-modern">
            <svg width="32" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" stroke-width="3" stroke="currentColor" fill="none"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><circle cx="34.52" cy="11.43" r="5.82"></circle><circle cx="53.63" cy="31.6" r="5.82"></circle><circle cx="34.52" cy="50.57" r="5.82"></circle><circle cx="15.16" cy="42.03" r="5.82"></circle><circle cx="15.16" cy="19.27" r="5.82"></circle><circle cx="34.51" cy="29.27" r="4.7"></circle><line x1="20.17" y1="16.3" x2="28.9" y2="12.93"></line><line x1="38.6" y1="15.59" x2="49.48" y2="27.52"></line><line x1="50.07" y1="36.2" x2="38.67" y2="46.49"></line><line x1="18.36" y1="24.13" x2="30.91" y2="46.01"></line><line x1="20.31" y1="44.74" x2="28.7" y2="48.63"></line><line x1="17.34" y1="36.63" x2="31.37" y2="16.32"></line><line x1="20.52" y1="21.55" x2="30.34" y2="27.1"></line><line x1="39.22" y1="29.8" x2="47.81" y2="30.45"></line><line x1="34.51" y1="33.98" x2="34.52" y2="44.74"></line></g></svg>
          </div>
          <div class="feature-title-modern">Archie: AI Trading Assistant</div>
          <div class="feature-desc-modern">
            Meet Archie, your AI-powered trading assistant. Trained on millions of financial market documents, Archie suggests trades tailored to your preferred style, recognizes patterns to help predict outcomes, and adapts to your needs by learning from your simulated portfolios. Get personalized, data-driven insights and smarter trading decisions—instantly.
          </div>
        </div>
      </div>
    <!-- Pricing Section -->
     <div class="division"></div>
    
    </div>
    <div style="padding: 30px">

    </div>
    <div class="sphere-gradient2"></div>
<!-- FAQ Section -->
<div class="content-section" id="faq">
    <h2 style="text-align: center; font-size: 20px; color: whitesmoke; cursor: default;">FREQUENTLY ASKED QUESTIONS</h2>
    <div class="faq-cards">
      <div class="faq-card" v-for="(item, index) in faqs" :key="index">
        <h3 class="faq-question">{{ item.question }}</h3>
        <div v-show="item.show">
          <p class="faq-answer">{{ item.answer }}</p>
        </div>
      </div>
    </div>
  </div>
    </div>
  </div>
    <!-- Footer -->
  <div class="footer">
     <div class="footer-bottom">
    <p>&copy; Ereuna Ltd 2025. All rights reserved.</p>  <a @click="scrollToSection('navbar')">Back to Top ↑</a>
  </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ref, onMounted } from 'vue';
import Policy from '@/components/policy.vue';

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
    answer: 'Yes, as the platform grows, there are plans to add more financial instruments to the platform, such as European Stocks, Asian Stocks, Forex and Cryptocurrencies.', 
    show: true 
  },
  { question: 'What is the payment method?', answer: 'Credit Card via Stripe, cryptocurrencies will be added in the future.', show: true },
  { question: 'Is there a refund policy?', answer: 'Yes, you are eligible for refunds the first 15 days of registration. you have to write to contact@ereuna.io and provide your Username and invoice id, refunds will be processed within 5 business days', show: true },
  { question: 'Can I use Ereuna on mobile?', answer: 'Yes, Ereuna has a mobile version available. However, please note that while we strive to make our website accessible and usable on all devices, the mobile experience is not yet as optimized as the desktop version. Some features may not work properly or may behave differently due to the smaller screen size and touch input. We are actively working on improving and refining the mobile experience, so some issues will be addressed in future updates.', show: true },
  { question: 'Is there a commitment or contract?', answer: 'No, there is no commitment or contract. It\'s recharge based, no automatic / recurring charges. you can add more days to your subscription in the Dashboard session', show: true },
]);

const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }

  // Update the position of the .sphere-gradient element
  const sphereGradient = document.querySelector('.sphere-gradient') as HTMLElement | null;
  const scrollY = window.scrollY;
  const heroElement = document.querySelector('.hero') as HTMLElement | null;
  const heroHeight = heroElement ? heroElement.offsetHeight : 0;

  if (sphereGradient) {
    if (scrollY > heroHeight) {
      sphereGradient.style.position = 'absolute';
      sphereGradient.style.top = `${scrollY + 110}px`;
    } else {
      sphereGradient.style.position = 'fixed';
      sphereGradient.style.top = '110%';
    }
  }
};

const showPolicy = ref(false)

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

.pricing-cards {
  display: flex;
  flex-direction: row;
  gap: 30px;
  padding: 30px;
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
  z-index: 500;
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
    height: 60px; /* Increased size for better visibility */
    opacity: 0.50;
  }

  .navbar {
  display: flex;
  justify-content: space-between; /* Push logo to the left and buttons to the right */
  align-items: center;
  background-color: transparent;
  border-radius: 10px;
  color: $text2;
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
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  width: 80%;
  color: $text2;
}

.faq-question {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 10px;
  opacity: 1;
}

.faq-answer {
  font-size: 1.5rem;
  color: $text2;
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
  background: $base2;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(30,41,59,0.08);
  padding: 2rem 1.5rem;
  width: 270px;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  transition: box-shadow 0.2s, transform 0.15s;
  color: $text1;
  border: 1px solid $accent3;
}
.feature-card-modern:hover {
  box-shadow: 0 6px 24px rgba(99,102,241,0.10);
  transform: translateY(-4px) scale(1.02);
}
.feature-icon-modern {
  margin-bottom: 1rem;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.feature-icon-modern img, .feature-icon-modern svg {
  width: 32px;
  height: 32px;
}
.feature-title-modern {
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: $accent2;
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
  color: $accent3;
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
  color: $accent2;
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

}
</style>