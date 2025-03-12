<template>
    <div class="main">
   <div class="logo-container">
  <img class="logo" src="@/assets/icons/owl.png" alt="">
</div>
    <h1>Create a New User</h1>
    <div class="signup-form" style="display: flex; flex-direction: row; justify-content: center; align-items: center;">
      <div style="margin: 3px 15px;"><h3>Type a Username:</h3>
        <input 
  v-model="username" 
  class="form-input" 
  :class="{ 'input-error': username.length > 25 }"
  placeholder="Username" 
  type="username" 
  maxlength="25" 
  required
></div>
    <div style="margin: 3px 15px;"> <h3>Type a Password:</h3>
      <div class="password-container">
    <input 
      v-model="password" 
      class="form-input" 
      :type="showPassword ? 'text' : 'password'" 
      placeholder="Password" 
      minlength="5" 
      maxlength="40" 
      required
    >
    <button 
  type="button" 
  class="toggle-password" 
  @click="showPassword = !showPassword"
>
  <img 
    :src="showPassword ? hideIcon : showIcon" 
    alt="Toggle Password Visibility" 
    class="toggle-icon"
  >
</button>
  </div></div>
   <div style="margin: 3px 15px;"> <h3>Confirm your password:</h3> 
    <div class="password-container">
    <input 
      v-model="confirmPassword" 
      class="form-input" 
      :type="showConfirmPassword ? 'text' : 'password'" 
      placeholder="Confirm Password" 
      required
    >
    <button 
      type="button" 
      class="toggle-password2" 
      @click="showConfirmPassword = !showConfirmPassword"
    >
    <img 
    :src="showConfirmPassword ? hideIcon : showIcon" 
    alt="Toggle Password Visibility" 
    class="toggle-icon"
  >
    </button>
  </div>
  </div>
  <div style="margin: 3px 15px;"> <h3>Promo Code (optional):</h3> 
    <div class="code-container">
    <input 
      v-model="PromoCode" 
      class="form-input" 
      placeholder="PROMO CODE" 
      maxlength="10"
    >
  </div>
  </div>
    <div style="padding: 5px;"></div>
  </div>
    <h1>Select a Subscription Plan</h1>
    <div class="subscription-form">
      <div 
      class="sub-option" 
      :class="{ selected: selectedOption === 1 }"
      @click="selectOption(1)"
    >
      <h3 class="plan">1 Month</h3>
      <p class="price">5.99€ + VAT</p>
    </div>
    <div 
      class="sub-option" 
      :class="{ selected: selectedOption === 2 }"
      @click="selectOption(2)"
    >
      <h3 class="plan">4 Months</h3>
      <p class="price">23.99€ + VAT</p>
    </div>
    <div 
  class="sub-option-disabled" 
>
  <div class="coming-soon-banner">Available Soon</div>
  <h3 style="cursor: default;" class="plan">6 Months</h3>
  <p style="cursor: default;" class="price">35.99€ + VAT</p>
</div>
<div 
  class="sub-option-disabled" 
>
  <div class="coming-soon-banner">Available Soon</div>
  <h3 style="cursor: default;" class="plan">1 Year</h3>
  <p style="cursor: default;" class="price">71.99€ + VAT</p>
</div>
</div>
    <h1>Select a payment method</h1>
    <div class="payment-form">
    <div class="pay-option">
      <div class="square" :class="{ selected: selectedpay === 1 }" @click="selectPaymentMethod('Credit Card'), selectPay(1)">
        <img class="icon" src="@/assets/icons/credit-card.png" alt="credit-card"> 
        <p>Credit Card</p>
    </div>
    <div class="square-disabled">
      <div class="coming-soon-banner2">Available Soon</div>
    <img class="icon" src="@/assets/icons/bitcoin.png" alt="bitcoin"> 
    <p>Bitcoin</p>
</div>
<div class="square-disabled">
  <div class="coming-soon-banner2">Available Soon</div>
    <img class="icon" src="@/assets/icons/ethereum.png" alt="ethereum"> 
    <p>Ethereum</p>
</div>
<div class="square-disabled">
  <div class="coming-soon-banner2">Available Soon</div>
    <img class="icon" src="@/assets/icons/monero.png" alt="monero"> 
    <p>Monero</p>
</div>
<!-- enable in the future, code remains the same to reference when you forget how it looked like
<div class="square" :class="{ selected: selectedpay === 2 }" @click="selectPaymentMethod('Crypto - Bitcoin'), selectPay(2)">
    <img class="icon" src="@/assets/icons/bitcoin.png" alt="bitcoin"> 
    <p>Bitcoin</p>
</div>
<div class="square" :class="{ selected: selectedpay === 3 }" @click="selectPaymentMethod('Crypto - Ethereum'), selectPay(3)">
    <img class="icon" src="@/assets/icons/ethereum.png" alt="ethereum"> 
    <p>Ethereum</p>
</div>
<div class="square" :class="{ selected: selectedpay === 4 }" @click="selectPaymentMethod('Crypto - Monero'), selectPay(4)">
    <img class="icon" src="@/assets/icons/monero.png" alt="monero"> 
    <p>Monero</p>
</div>
-->
        <div v-if="selectedpay === 1" class="card-element-container">
      <div id="card-element"></div>
      <div id="card-errors" role="alert"></div>
        </div>
    </div>
    <div class="final-form">
    <p>
      I acknowledge that I have read and agree to the 
      <a href="#" @click.prevent="showTermsModal">Terms of Service & Privacy Policy</a>
    </p>
    <div 
  class="custom-checkbox" 
  :class="{ checked: agreeToTerms }"
  @click="agreeToTerms = !agreeToTerms"
  style="justify-content: center;" >
  <input type="checkbox" v-model="agreeToTerms" id="terms-checkbox" required style="display: none;">
  <span class="checkmark"></span>
  <label for="terms-checkbox" class="label-text">I agree</label>
</div>
    <br>
    <button class="userbtn" @click="SignUp" :disabled="!isFormValid">Create User</button>
    <br>
    <br>
    <p>Security Notice: A unique Recovery Key will be automatically downloaded upon successful registration. This key is essential for password recovery, so store it securely. If lost, you can generate a new key in your Account Settings. </p>
  <p> 2-Factor Authentication (2FA) is available as an optional security feature. To activate 2FA, navigate to the 'Security' section within your user session. Note that only authentication app-based 2FA is currently supported, with no SMS or email options available. </p>
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
  </div>
</div>
<NotificationPopup ref="notification" />
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { loadStripe } from '@stripe/stripe-js'; 
import NotificationPopup from '@/components/NotificationPopup.vue';
import hideIcon from '@/assets/icons/hide.png';
import showIcon from '@/assets/icons/show.png';

const apiKey = import.meta.env.VITE_EREUNA_KEY;
const showTerms = ref(false);
const showPrivacy = ref(false);
let selectedOption = ref(1);
let selectedpay = ref();
const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const PromoCode = ref('');
const selectedPaymentMethod = ref('');
const agreeToTerms = ref(false);
const router = useRouter();
const stripe = ref(null);
const elements = ref(null);
const card = ref(null);
const processing = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);

// for popup notifications
const notification = ref(null);
const showNotification = () => {
  notification.value.show('This is a custom notification message!');
};

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

watch(selectedpay, (newValue) => {
  if (newValue === 1) { // Credit card selected
    initializeStripe();
  } else {
    // Clean up Stripe elements if needed
    if (card.value) {
      card.value.destroy();
    }
  }
});

// Initialize Stripe elements
function initializeStripe() {
  if (selectedpay.value === 1 && stripe.value && !elements.value) {
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
}

function showTermsModal() {
  showTerms.value = true;
}

function closeTermsModal() {
  showTerms.value = false;
}

function showPrivacyModal() {
  showPrivacy.value = true;
}

function selectOption(option) {
  selectedOption.value = option;
}

function selectPay(option) {
  selectedpay.value = option;
}

function selectPaymentMethod(method) {
  selectedPaymentMethod.value = method;
}

const isFormValid = computed(() => {
  return username.value && 
         password.value && 
         confirmPassword.value && 
         password.value === confirmPassword.value &&
         selectedPaymentMethod.value &&
         agreeToTerms.value;
});

async function SignUp() {
  if (!isFormValid.value) {
    notification.value.show('Please fill in all required fields and agree to the terms.');
    return;
  }

  processing.value = true;

  try {
    let paymentMethodId = null;

    // Only process with Stripe if credit card is selected
    if (selectedpay.value === 1) {
      const { paymentMethod, error: paymentMethodError } = await stripe.value.createPaymentMethod({
        type: 'card',
        card: card.value,
      });

      if (paymentMethodError) {
        throw new Error(paymentMethodError.message);
      }

      paymentMethodId = paymentMethod.id;
    }

    const payload = {
      username: username.value,
      password: password.value,
      subscriptionPlan: selectedOption.value,
      paymentMethodId,
      return_url: `${window.location.origin}/payment-completion`,
    };

    if (PromoCode.value && PromoCode.value.trim() !== '') {
      payload.promoCode = PromoCode.value.trim();
    }

    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json(); // Parse the response as JSON

    if (response.ok) {
      if (responseData.requiresAction) {
        const { error } = await stripe.value.handleCardAction(responseData.clientSecret);
        if (error) {
          throw new Error(error.message);
        }
        notification.value.show('Payment successful!');
        router.push('/login');
      } else if (responseData.message === "User   created successfully") {
        // Download the raw recovery key
        const authKey = responseData.rawAuthKey;
        const blob = new Blob([authKey], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ereuna_recovery_key.txt'; 
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        notification.value.show('Signup successful! Your authentication key has been downloaded.');
        router.push('/login');
      } else {
        throw new Error('Unexpected response from server');
      }
    } else {
      throw new Error(responseData.message || 'Unexpected response from server');
    }
  } catch (error) {
    error.value = error.message;
    notification.value.show('An error occurred during signup. Please try again.');
  } finally {
    processing.value = false;
  }
}

onMounted(() => {
  selectOption(1); // Set default subscription option
  selectPay(4)
});
</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

.main {
  min-width: 1200px; /* Set a minimum width that works for your design */
  padding: 75px; /* Keep your existing padding */
  box-sizing: border-box; /* Ensure padding is included in the width */
}

h3{
    color: whitesmoke;
    text-align: center;
    opacity: 0.80;
}

h1{
    color: whitesmoke;
    text-align: center;
    font-size: 15px;
    opacity: 0.80;
}

p{
    color: whitesmoke;
    opacity: 0.80;
}

.signup-form, .payment-form, .subscription-form{
    text-align: center;
    align-items: center;
    align-self: center;
    padding: 10px;
    margin: 15px;
    border: none;
}

.icon{
    width: 20px;
    height: 20px;
    margin-right: 10px;
}

.square {
    align-items: center;
    display: inline-flex;
    flex-direction: row;
    border: none;
    border-radius: 10px; /* Slightly curved border */
    padding: 10px;
    margin: 5px;
    padding-right: 15px;
    opacity: 0.80;
    width: 100px;
    justify-content: center;
    color: #f5f5f5;
    position: relative; /* Position relative for pseudo-element */
    overflow: hidden; /* Hide overflow */
}

.square-disabled {
    align-items: center;
    display: inline-flex;
    flex-direction: row;
    border: none;
    border-radius: 10px; /* Slightly curved border */
    padding: 10px;
    margin: 5px;
    padding-right: 15px;
    opacity: 0.80;
    width: 100px;
    justify-content: center;
    color: #f5f5f5;
    position: relative; /* Position relative for pseudo-element */
    overflow: hidden; /* Hide overflow */
    cursor: default
}

.square-disabled::before {
    content: '';
    position: absolute; /* Position it absolutely */
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: -1; /* Place it behind the content */
    border-radius: 10px; /* Match the border radius of the parent */
    background: linear-gradient(270deg, #8c8dfe, #4c4d8f, #494bb9); /* Gradient colors */
    padding: 2px; /* Space for the border effect */
    -webkit-mask: linear-gradient(white, white) content-box, linear-gradient(white, white); /* For masking */
    -webkit-mask-composite: source-out; /* For masking */
    animation: border-animation 5s linear infinite; /* Add animation */
    mask-composite: exclude; /* For masking */
    background-size: 300% 300%; 
    cursor: default;
}

.square::before {
    content: '';
    position: absolute; /* Position it absolutely */
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: -1; /* Place it behind the content */
    border-radius: 10px; /* Match the border radius of the parent */
    background: linear-gradient(270deg, #8c8dfe, #4c4d8f, #494bb9); /* Gradient colors */
    padding: 2px; /* Space for the border effect */
    -webkit-mask: linear-gradient(white, white) content-box, linear-gradient(white, white); /* For masking */
    -webkit-mask-composite: source-out; /* For masking */
    animation: border-animation 5s linear infinite; /* Add animation */
    mask-composite: exclude; /* For masking */
    background-size: 300% 300%; 
}

.square:hover{
    opacity: 1;
    cursor: pointer;
}

input{
    padding: 3px;
    border: solid 1px whitesmoke;
    outline: none;
}

input:focus{
    border-color: #8c8dfe;
}

.logo-container {
  display: flex;
  justify-content: center;
}

label{
    color: whitesmoke;
}

.logo {
  width: 70px;
  margin: 10px;
}

.final-form {
  text-align: center;
  align-items: center;
  align-self: center;
  padding: 10px;
  margin: 10px;
}

.final-form p {
  margin-bottom: 10px;
}

.final-form input[type="checkbox"] {
  margin-right: 5px;
}

.final-form button {
  padding: 5px;
  border: solid 2px #8c8dfe;
  background-color: transparent;
  outline: none;
  text-align: center;
  align-self: center;
  color: #f5f5f5b8;
  margin-top: 10px;
}

.final-form button:hover {
  cursor: pointer;
  background-color: #8c8dfe;
}

a{
    color: #8c8dfe;
}

a:hover{
    color: #9d6bff;
    cursor: pointer;
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

.sub-option {
  align-items: center;
  display: inline-flex;
  flex-direction: column;
  border: none;
  border-radius: 5px;
  padding: 10px;
  margin: 5px;
  opacity: 0.80;
  width: 120px;
  height: 70px;
  position: relative; 
  overflow: hidden;
  justify-content: center;
  color: #f5f5f5;
}

.sub-option::before {
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
  -webkit-mask: linear-gradient(white, white) content-box, linear-gradient(white, white); /* For masking */
  -webkit-mask-composite: source-out; /* For masking */
  mask-composite: exclude; /* For masking */
  animation: border-animation 5s linear infinite;
  background-size: 300% 300%; 
}

.sub-option-disabled {
  align-items: center;
  display: inline-flex;
  flex-direction: column;
  border: none;
  border-radius: 5px; /* Rounded corners */
  padding: 10px; /* Inner padding */
  margin: 5px;
  opacity: 0.80;
  width: 120px;
  position: relative; /* Position relative for the pseudo-element */
  height: 70px;
  overflow: hidden; /* Ensure the pseudo-element doesn't overflow */
  justify-content: center;
  color: #f5f5f5;
  cursor: default;
}

.sub-option-disabled::before {
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
  -webkit-mask: linear-gradient(white, white) content-box, linear-gradient(white, white); /* For masking */
  -webkit-mask-composite: source-out; /* For masking */
  animation: border-animation 5s linear infinite;
  mask-composite: exclude; /* For masking */
  background-size: 300% 300%; 
  cursor: default;
}

.sub-option:hover {
  opacity: 1;
  cursor: pointer;
}

.selected {
    border:none;
    background: linear-gradient(270deg, #8c8dfe, #4c4d8f, #494bb9);
    animation: border-animation 5s linear infinite; /* Animation */
    background-size: 300% 300%; /* Allow for smooth animation */
}

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

.coming-soon-banner {
  position: absolute;
  top: 20px;          /* Reduced from 20px */
  right: -25px;       /* Changed from -35px */
  background-color: #8c8dfe;  /* Your purple color */
  color: whitesmoke;
  padding-left: 10px;  /* Reduced padding */
  padding: 1px;
  font-size: 12px;    /* You can make this smaller if needed, like 10px */
  transform: rotate(45deg);
  transform-origin: center;
  width: 120px;       /* Reduced from 150px */
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  z-index: 1;
  cursor: default;
}

.coming-soon-banner2 {
  position: absolute;
  top: 20px;          /* Reduced from 20px */
  right: -35px;       /* Changed from -35px */
  background-color: #8c8dfe;  /* Your purple color */
  color: whitesmoke;
  padding-left: 10px;  /* Reduced padding */
  padding: 1px;
  font-size: 12px;    /* You can make this smaller if needed, like 10px */
  transform: rotate(45deg);
  transform-origin: center;
  width: 120px;       /* Reduced from 150px */
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  z-index: 1;
  cursor: default;
}

.card-element-container {
  background-color: #2c2b3e;
  padding: 20px;
  border-radius: 4px;
  margin: 20px 0;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

#card-element {
  padding: 10px;
  border: 1px solid #201b28;
  border-radius: 4px;
  background-color: #201b28;
}

#card-errors {
  color: #fa755a;
  text-align: left;
  margin-top: 8px;
  min-height: 20px;
}

.price{
  font-size: 12px;
  margin: 2px;
}

.plan{
  font-size: 18px;
  margin: 2px;
}

.password-container {
  position: relative;
}

.toggle-password {
  position: absolute;
  right: -2%;
  top: 55%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  cursor: pointer;
  color: black;
  opacity: 0.40;
}

.toggle-password2 {
  position: absolute;
  right: 2.5%;
  top: 55%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  cursor: pointer;
  color: black;
  opacity: 0.40;
}

.input-error {
  border-color: red !important;
}

.modal-content {
    max-height: 400px; /* Adjust height as needed */
    overflow-y: auto; /* Enable vertical scrolling */
    font-size: 14px; /* Adjust font size as needed */
    color: $text1; /* Ensure text color is readable */
}

.divbtn {
  cursor: pointer;
  background-color: #8c8dfe;
  border:none;
  color: whitesmoke;
}

.custom-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 5px;
}

.checkmark {
  width: 8px; /* Smaller width */
  height: 8px; /* Smaller height */
  background-color: whitesmoke;
  border-radius: 50%; /* Make it circular */
  margin-right: 5px;
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
}

.custom-checkbox.checked .label-text {
  opacity: 1; /* Full opacity when checked */
}

.userbtn {
  background-color: transparent;
  color: whitesmoke;
  border-radius: 10px;
  outline: none;
  border: solid 2px #8c8dfe;
  padding: 5px;
  margin: 5px;
  width: 100px;
  cursor: pointer; /* Pointer cursor on hover */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Subtle shadow for depth */
  transition: all 0.3s ease; /* Smooth transition for hover effects */
}

.userbtn:hover {
    background-color: #8c8dfe; /* Background color on hover */
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2); /* Enhanced shadow on hover */
}

.form-input {
  padding: 6px 7.5px; /* Reduced padding for a smaller size */
  border: solid 1px #171728;
  background-color:#2c2b3e;
  border-radius: 25px; 
  font-size: 8px; /* Reduced font size for a smaller appearance */
  color: whitesmoke; /* Dark text color */
  transition: border-color 0.3s, box-shadow 0.3s; /* Smooth transition for focus effects */
}

.form-input:focus {
  border-color: #8c8dfe; /* Change border color on focus */
  box-shadow: 0 0 5px rgba(140, 141, 254, 0.5); /* Subtle shadow effect */
  outline: none; /* Remove default outline */
}

.form-input::placeholder {
  color: #aaa; /* Placeholder text color */
  opacity: 0.8; /* Slightly transparent placeholder */
}

.form-input:disabled {
  background-color: #e9ecef; /* Light gray background for disabled state */
  color: #6c757d; /* Darker gray text for disabled state */
  cursor: not-allowed; /* Change cursor to indicate disabled state */
}

.toggle-icon {
  width: 15px; /* Adjust the size as needed */
  cursor: pointer; /* Change cursor to pointer on hover */
}

.contract-title{
  text-align: center;
  margin: 25px;
}

</style>