<template>
    <div class="signup-form">
      <div class="logo-c">
  <router-link to="/" class="logo-link">
    <img class="logo" src="@/assets/icons/ereuna.png" alt="Owl Icon" draggable="false">
  </router-link>
  <p style="cursor: default;">Already Registered? <router-link to="/login" class="text">Login Here</router-link></p>
</div>
        <h1 style="cursor: default;">Create a New Account</h1>
      <div class="input-group">
        <input required type="text" :class="error" name="username" autocomplete="off" class="input">
        <label :class="error" class="user-label">Username</label>
      </div>
      <div class="input-group">
        <input required type="password" :class="error" name="password" autocomplete="off" class="input">
        <label :class="error" class="user-label">Password</label>
      </div>
      <div class="input-group">
        <input required type="password" :class="error" name="confirm-password" autocomplete="off" class="input">
        <label :class="error" class="user-label">Confirm Password</label>
      </div>
      <br>
      <!-- Subscription Selection Section -->
<div class="subscription-section">
  <h2 class="subtitle">Choose Your Plan</h2>
  
  <div class="plan-options">
  <div class="plan-card" :class="{ 'selected-plan': selectedPlan === 'core' }" @click="selectedPlan = 'core'">
    <div class="plan-header">CORE</div>
    <div class="plan-price">€5.99<span> / month</span></div>
    <ul class="plan-features">
      <li>Coverage of 5000+ Stocks listed on NYSE and Nasdaq</li>
      <li>35+ years of EOD price data (Daily and Weekly)</li>
      <li>One-Click Multi-Screener feature</li>
    </ul>
  </div>
  
  <div class="plan-card" :class="{ 'selected-plan': selectedPlan === 'premium' }" @click="selectedPlan = 'premium'">
    <div class="plan-header">PREMIUM</div>
    <div class="plan-price">€14.99<span> / month</span></div>
    <ul class="plan-features">
      <li>Intraday / Real-time Data Support</li>
      <li>Coverage of 5000+ Stocks listed on NYSE and Nasdaq</li>
      <li>35+ years of price data (Intraday, Daily and Weekly)</li>
      <li>Advanced analytics and predictive tools</li>
    </ul>
  </div>
</div>
  
  <div class="duration-selection">
    <h3 class="subtitle">Subscription Duration</h3>
    <div class="duration-options">
      <div class="duration-option" :class="{ 'selected-duration': selectedDuration === 1 }" @click="selectedDuration = 1">
        1 Month
      </div>
      <div class="duration-option" :class="{ 'selected-duration': selectedDuration === 4 }" @click="selectedDuration = 4">
        4 Months
      </div>
      <div class="duration-option" :class="{ 'selected-duration': selectedDuration === 6 }" @click="selectedDuration = 6">
        6 Months
      </div>
      <div class="duration-option" :class="{ 'selected-duration': selectedDuration === 12 }" @click="selectedDuration = 12">
        1 Year
      </div>
    </div>
  </div>
 <div class="total-price">
  <div class="card-element-container">
    <div id="card-element"></div>
    <div id="card-errors" role="alert"></div>
  </div>
  <p>Total: <span>€{{ calculateTotalPrice() }}</span>
  </p>
</div>
</div>
     <div 
  class="custom-checkbox" 
  :class="{ checked: agreeToTerms }"
  @click="agreeToTerms = !agreeToTerms"
  style="justify-content: center;" >
  <input type="checkbox" v-model="agreeToTerms" id="terms-checkbox" required style="display: none;">
  <span class="checkmark"></span>
  <label for="terms-checkbox" class="label-text"> I acknowledge that I have read and agree to the 
    <a href="#" @click.prevent="showTermsModal">Terms of Service & Privacy Policy</a></label>
</div>
      <button @click="Trial()" class="userbtn">Create</button>
      <p style="cursor: default;"><label style="color: #8c8dfe; font-size: inherit;">Security Notice:</label> A unique Recovery Key is required for password recovery. You can download this key in the Dashboard section of your account. Please store it securely, as it will be the only means of regaining access to your account in the event of a lost or forgotten password.</p>
      <p style="cursor: default;"> <label style="color: #8c8dfe; font-size: inherit;">2-Factor Authentication (2FA)</label>  is available as an optional security feature. To activate 2FA, navigate to the 'Security' section within your user session. Note that only authentication app-based 2FA is currently supported, with no SMS or email options available. </p>
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
<NotificationPopup ref="notification" />
  </template>

<script setup>
import NotificationPopup from '@/components/NotificationPopup.vue';
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { loadStripe } from '@stripe/stripe-js'; 
const apiKey = import.meta.env.VITE_EREUNA_KEY;

const showTerms = ref(false);
const agreeToTerms = ref(false);
const stripe = ref(null);
const elements = ref(null);
const card = ref(null);
const processing = ref(false);
const router = useRouter();

// for popup notifications
const notification = ref(null);
const showNotification = () => {
  notification.value.show('This is a custom notification message!');
};

function showTermsModal() {
  showTerms.value = true;
}

function closeTermsModal() {
  showTerms.value = false;
}

async function Trial() {
  const usernameInput = document.querySelector('input[name="username"]');
  const passwordInput = document.querySelector('input[name="password"]');
  const confirmPasswordInput = document.querySelector('input[name="confirm-password"]');
  const agreeToTermsCheckbox = document.querySelector('input[type="checkbox"]');

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();
  const agreeToTerms = agreeToTermsCheckbox.checked;

  // Reset all error states
  usernameInput.classList.remove('error');
  passwordInput.classList.remove('error');
  confirmPasswordInput.classList.remove('error');
  agreeToTermsCheckbox.classList.remove('error');

  // Check for empty fields first
  if (!username || !password || !confirmPassword) {
    notification.value.show('Please fill in all fields.');
    if (!username) usernameInput.classList.add('error');
    if (!password) passwordInput.classList.add('error');
    if (!confirmPassword) confirmPasswordInput.classList.add('error');
    return;
  }

  // Check if terms and conditions are accepted
  if (!agreeToTerms) {
    notification.value.show('Please accept the terms and conditions.');
    agreeToTermsCheckbox.classList.add('error');
    return;
  }

  // Check if password and confirm password match
  if (password !== confirmPassword) {
    notification.value.show('Passwords do not match.');
    passwordInput.classList.add('error');
    confirmPasswordInput.classList.add('error');
    return;
  }

  // Validate username
  if (username.length < 3 || username.length > 25) {
    notification.value.show('Username must be between 3 and 25 characters.');
    usernameInput.classList.add('error');
    return;
  }
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    notification.value.show('Username can only contain letters, numbers, and underscores.');
    usernameInput.classList.add('error');
    return;
  }

  // Validate password
  if (password.length < 5 || password.length > 40) {
    notification.value.show('Password must be between 5 and 40 characters.');
    passwordInput.classList.add('error');
    return;
  }

  try {
  const response = await fetch('/api/trial', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({
      username,
      password
    }),
  });

  if (response.ok) {
    const responseBody = await response.json();
    notification.value.show('User Created Successfully!');
    setTimeout(() => {
        router.push('/login');
    }, 5000);
  } else {
    const errorResponse = await response.json();
    notification.value.show('Username Already Taken.');
  }
} catch (error) {
  console.error(error);
}
}

// Add these variables at the top of your <script setup> section
const selectedPlan = ref('core'); // Default to core plan
const selectedDuration = ref(1);  // Default to 1 month

// Add this function to calculate the total price
function calculateTotalPrice() {
  // Base monthly prices
  const prices = {
    core: 5.99,
    premium: 14.99
  };
  
  let basePrice = prices[selectedPlan.value];
  let totalMonths = selectedDuration.value;
  let totalPrice = basePrice * totalMonths;
  
  /*
  // Apply discounts for longer durations
  if (selectedDuration.value === 6) {
    // 5% discount for 6-month subscription
    totalPrice = totalPrice * 0.95;
  } else if (selectedDuration.value === 12) {
    // 10% discount for 1-year subscription
    totalPrice = totalPrice * 0.90;
  }
  */
  return totalPrice.toFixed(2);
}

onMounted(async () => {
  // Load Stripe.js
  if (!stripe.value) {
    stripe.value = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  }
  
  // Create card element
  initializeStripe();
  
  // Set default subscription option
  selectOption(1);
});

// Initialize Stripe elements
function initializeStripe() {
    elements.value = stripe.value.elements();
    card.value = elements.value.create('card', {
      style: {
        base: {
          color: '#ffffff',
          fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
          fontSmoothing: 'antialiased',
          fontSize: '16px',
          '::placeholder': {
            color: '#aab7c4'
          }
        },
        invalid: {
          color: '#fa755a',
          iconColor: '#fa755a'
        }
      }
    });
    
    // Wait for DOM to be updated
    setTimeout(() => {
      const cardElement = document.getElementById('card-element');
      if (cardElement) {
        card.value.mount('#card-element');
      }
    }, 100);

    // Handle card element errors
    card.value.on('change', function(event) {
      const displayError = document.getElementById('card-errors');
      if (event.error) {
        displayError.textContent = event.error.message;
      } else {
        displayError.textContent = '';
      }
    });
  }

</script>
  
<style lang="scss" scoped>
@use '../style.scss' as *;

  .input-group {
    position: relative;
    padding: 1rem;
  }

  p{
    color: $text2;
    font-size: 1.2rem;
  }

  .input {
    border: solid 2px transparent;
    border-radius: 1.5rem;
    background-color:#2c2b3e;;
    padding: 1.5rem;
    font-size: 1.2rem;
    width: 400px;
    color: #f5f5f5;
    transition: border 150ms cubic-bezier(0.4,0,0.2,1);
  }

  .user-label {
    text-align: center;
    position: absolute;
    left: 200px;
    bottom: 45px;
    color: #cdcdcd;
    pointer-events: none;
    transform: translateY(1.5rem);
    transition: 150ms cubic-bezier(0.4,0,0.2,1);
  }

  .input:focus, .input:valid {
    outline: none;
    border: 2px solid $accent1;
  }

  .input:focus ~ label, .input:valid ~ label {
    transform: translateY(-50%) scale(0.8);
    background-color: #212121;
    padding: 0 .4em;
    color: $accent1;
  }

  .userbtn {
  background-color: transparent;
  color: $text1;
  border-radius: 10px;
  outline: none;
  border: none;
  background-color: $accent1;
  padding: 10px;
  margin: 10px;
  width: 400px;
  cursor: pointer;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  font-size: 16px; /* Added font size for better readability */
  font-weight: 500; /* Added font weight for better typography */
}

.userbtn:hover {
  background-color: $accent2;
  color: white;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  transform: scale(1.05); /* New animation: scale up on hover */
  transition: all 0.3s ease-in-out; /* Changed transition timing function for smoother animation */
}

.userbtn:active {
  transform: scale(0.95); /* New animation: scale down on click */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Reduced shadow on click */
  transition: all 0.1s ease-out; /* Faster transition on click */
}

  .signup-form {
    border: none;
    border-radius: 15px;
    padding: 30px;
    width: 800px;
    margin: 70px auto;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
    text-align: center;
    background-color: $base4;
    z-index: 1000;
  }

  .custom-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 10px;
}

.checkmark {
  width: 12px; /* Smaller width */
  height: 12px; /* Smaller height */
  background-color: whitesmoke;
  border-radius: 50%; /* Make it circular */
  margin-right: 10px;
  display: inline-block;
  transition: background-color 0.3s, border-color 0.3s; /* Add transition for border color */
}

.custom-checkbox.checked .checkmark {
  background-color: #8c8dfe; /* Change to your desired color */
  border-color: #8c8dfe; /* Change to your desired border color */
}

.label-text {
  opacity: 0.7; /* Initial opacity */
  transition: opacity 0.3s; /* Smooth transition for opacity */
  color: $text2;
  font-size: 1.1rem;
}

.custom-checkbox.checked .label-text {
  opacity: 1; /* Full opacity when checked */
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
  padding: 30px;
  border-radius: 20px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.modal button {
  margin-top: 15px;
  position: absolute;
  top: 0;
  right:10px;
  background: transparent;
  border: none;
  cursor: pointer;
}

.subtitle {
 color: $text1; 
 margin: 20px 0 10px; 
 font-size: 2rem;
 cursor: default;
}

.modal-content {
    max-height: 500px; /* Adjust height as needed */
    overflow-y: auto; /* Enable vertical scrolling */
    font-size: 16px; /* Adjust font size as needed */
    color: $text1; /* Ensure text color is readable */
}

.contract-title{
  text-align: center;
  margin: 35px;
  font-size: 1.5rem;
}

.toggle-icon {
  width: 20px; /* Adjust the size as needed */
  cursor: pointer; /* Change cursor to pointer on hover */
}

a{
    color: $accent1;
    font-size: 1.2rem;
}

a:hover{
    color: $accent2;
    cursor: pointer;
}

h1{
    color: $text1;
    font-size: 20px;
}

.logo{
    height: 70px;
}

.logo-c {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  padding: 0px;
}

.text{
    color: $accent1;
    font-size: inherit;
}

.error{
    border-color: red;
}

.sphere-gradient {
  position: absolute;
  top: 25%;
  left: 0%;
  transform: translate(-50%, -50%);
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, #8c8dfe 0%, 
    #8c8dfe 30%, 
    #a3a4fe 50%, 
    #c5c6fe 70%, 
    #fff 100%);
  filter: blur(500px);
  z-index: -500;
  opacity: 0.20;
}

/* Subscription Section Styles */
.subscription-section {
  background-color: $base1;
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
}

.plan-options {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin: 25px 0;
}

.plan-card {
  background-color: $base2;
  border-radius: 10px;
  padding: 20px;
  flex: 1;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  cursor: pointer;
}

.plan-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.plan-card.selected-plan {
  border-color: $accent2;
}

.plan-header {
  font-size: 22px;
  color: $text1;
  margin-bottom: 10px;
  text-align: center;
  font-weight: 600;
}

.plan-price {
  font-size: 28px;
  color: $accent1;
  text-align: center;
  margin-bottom: 20px;
  font-weight: 700;
}

.plan-price span {
  font-size: 14px;
  color: $text2;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0;
}

.plan-features li {
  color: $text2;
  padding: 8px 0;
  position: relative;
  padding-left: 22px;
}

.plan-features li:before {
  content: "";
  position: absolute;
  left: 0;
  top: 9px;
  width: 14px;
  height: 14px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'%3E%3Ccircle cx='10' cy='10' r='10' fill='%238c8dfe'/%3E%3Cpath d='M6 10.5l2.5 2.5 5-5' stroke='%23fff' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}

.duration-selection {
  margin-top: 30px;
}

.duration-options {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 15px;
}

.duration-option {
  background-color: $base4;
  color: $text2;
  border-radius: 20px;
  padding: 10px 18px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  flex: 1;
  min-width: 80px;
}

.duration-option:hover {
  background-color: $base2;
}

.duration-option.selected-duration {
  background-color: $accent1;
  color: $text4;
  font-weight: 500;
}

.total-price {
  margin-top: 30px;
  text-align: right;
  padding: 10px;
  border-top: 1px solid $base2;
}

.total-price p {
  font-size: 18px;
  color: $text2;
}

.total-price span {
  font-size: 22px;
  color: $accent1;
  font-weight: 700;
  margin-left: 8px;
}

.discount-tag {
  font-size: 1rem;
  background-color: $accent1;
  color: $text1;
  padding: 3px 8px;
  border-radius: 12px;
  margin-left: 8px;
  font-weight: 500;
  display: inline-block;
}

/* Mobile version */
@media (max-width: 1150px) {
  .signup-form {
    border: none;
    border-radius: 15px;
    padding: 30px;
    width: 300px;
    margin: 50px auto;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
    text-align: center;
    background-color: $base4;
    z-index: 1000;
  }

  .input {
    border: solid 2px transparent;
    border-radius: 1.5rem;
    background-color:#2c2b3e;;
    padding: 1.5rem;
    font-size: 1.2rem;
    width: 240px;
    color: #f5f5f5;
    transition: border 150ms cubic-bezier(0.4,0,0.2,1);
  }

  .userbtn {
  background-color: transparent;
  color: $text1;
  border-radius: 10px;
  outline: none;
  border: solid 3px #8c8dfe;
  padding: 10px;
  margin: 10px;
  width: 225px;
  cursor: pointer;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  font-size: 16px; /* Added font size for better readability */
  font-weight: 500; /* Added font weight for better typography */
}

.user-label {
    text-align: center;
    position: absolute;
    left: 37.5px;
    bottom: 45px;
    color: #cdcdcd;
    pointer-events: none;
    transform: translateY(1.5rem);
    transition: 150ms cubic-bezier(0.4,0,0.2,1);
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
  padding: 30px;
  border-radius: 20px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  width: 300px;
}

.checkmark {
  width: 12px; /* Smaller width */
  height: 6px; /* Smaller height */
  background-color: whitesmoke;
  border-radius: 50%; /* Make it circular */
  margin-right: 10px;
  display: inline-block;
  transition: background-color 0.3s, border-color 0.3s; /* Add transition for border color */
}

.plan-options {
    flex-direction: column;
  }
  
  .plan-card {
    margin-bottom: 20px;
  }
  
  .duration-options {
    flex-direction: column;
  }
  
  .duration-option {
    margin-bottom: 10px;
  }
  
  .total-price {
    text-align: center;
  }

}

</style>