<template>
    <div class="main" style="padding: 75px;">
   <div class="logo-container">
  <img class="logo" src="@/assets/icons/owl.png" alt="">
</div>
    <h1>Create a New User</h1>
    <div class="signup-form" style="display: flex; flex-direction: row; justify-content: center; align-items: center;">
      <div style="margin: 3px"><h3>Type a Username:</h3>
        <input 
  v-model="username" 
  class="form-input" 
  :class="{ 'input-error': username.length > 25 }"
  placeholder="Username" 
  type="username" 
  maxlength="25" 
  required
></div>
    <div style="margin: 3px"> <h3>Type a Password:</h3>
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
      {{ showPassword ? 'hide' : 'show' }}
    </button>
  </div></div>
   <div style="margin: 3px"> <h3>Confirm your password:</h3> 
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
      class="toggle-password" 
      @click="showConfirmPassword = !showConfirmPassword"
    >
      {{ showConfirmPassword ? 'hide' : 'show' }}
    </button>
  </div>
  </div>
  <div style="margin: 3px"> <h3>Promo Code (optional)</h3> 
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
  <h3 class="plan">6 Months</h3>
  <p class="price">35.99€ + VAT</p>
</div>
<div 
  class="sub-option-disabled" 
>
  <div class="coming-soon-banner">Available Soon</div>
  <h3 class="plan">1 Year</h3>
  <p class="price">71.99€ + VAT</p>
</div>
</div>
    <h1>Select a payment method</h1>
    <div class="payment-form">
    <div class="pay-option">
      <div class="square" :class="{ selected: selectedpay === 1 }" @click="selectPaymentMethod('Credit Card'), selectPay(1)">
        <img class="icon" src="@/assets/icons/credit-card.png" alt="credit-card"> 
        <p>Credit Card</p>
    </div>
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
        <div v-if="selectedpay === 1" class="card-element-container">
      <div id="card-element"></div>
      <div id="card-errors" role="alert"></div>
        </div>
    </div>
    <div class="final-form">
    <p>
      I acknowledge that I have read and agree to the 
      <a href="#" @click.prevent="showTermsModal">Terms of Service</a> and 
      <a href="#" @click.prevent="showPrivacyModal">Privacy Policy</a>.
    </p>
    <div 
  class="custom-checkbox" 
  :class="{ checked: agreeToTerms }"
  @click="agreeToTerms = !agreeToTerms"
style="justify-content: center;" >
  <input type="checkbox" v-model="agreeToTerms" id="terms-checkbox" required style="display: none;">
  <span class="checkmark"></span>
  <label for="terms-checkbox">I agree</label>
</div>
    <br>
    <button @click="SignUp" :disabled="!isFormValid">Create User</button>
    <br>
    <br>
    <p>Security Notice: A unique Recovery Key will be automatically downloaded upon successful registration. This key is essential for account recovery, so store it securely. If lost, you can generate a new key in your Account Settings. </p>
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
    <button class="divbtn"  @click="closeTermsModal">Close</button>
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
    <button class="divbtn" @click="closePrivacyModal">Close</button>
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

function closePrivacyModal() {
  showPrivacy.value = false;
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
      } else if (responseData.message === "User  created successfully") {
        // Download the raw authentication key
        const authKey = responseData.rawAuthKey;
        const blob = new Blob([authKey], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ereuna_authentication_key.txt'; 
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
    console.error('Error during signup:', error);
    notification.value.show('An error occurred during signup. Please try again.');
  } finally {
    processing.value = false;
  }
}

onMounted(() => {
  selectOption(1); // Set default subscription option
});
</script>

<style scoped>
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
    margin: 10px;
    border: none;
}

.icon{
    width: 20px;
    height: 20px;
    margin-right: 10px;
}

.square{
    align-items: center;
    display: inline-flex;
    flex-direction: row;
    border: 2px solid #8c8dfe;
    border-radius: 5px;
    padding: 5px;
    margin: 5px;
    padding-right: 15px;
    opacity: 0.80;
    width: 100px;
    justify-content: center;
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
  background-color: #2c2b3e;
  padding: 20px;
  border: none;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.modal button {
  margin-top: 10px;
}

.sub-option {
  align-items: center;
  display: inline-flex;
  flex-direction: column;
  border: 2px solid #8c8dfe;
  border-radius: 5px;
  padding: 10px;
  margin: 5px;
  opacity: 0.80;
  width: 120px;
  height: 70px;
  position: relative; 
  overflow: hidden;
  justify-content: center;
}

.sub-option-disabled {
  align-items: center;
  display: inline-flex;
  flex-direction: column;
  border: 2px solid #8c8dfe;
  border-radius: 5px;
  padding: 10px;
  margin: 5px;
  opacity: 0.80;
  width: 120px;
  position: relative; 
  height: 70px;
  overflow: hidden;
  justify-content: center;
}

.sub-option:hover {
  opacity: 1;
  cursor: pointer;
}

.sub-option.selected {
  background-color: #8c8dfe;
  color: #f5f5f5b8;
}

.selected {
  background-color: #8c8dfe;
  color: #f5f5f5b8;
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
  right: -1%;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  cursor: pointer;
  color: black;
  opacity: 0.60;
}

.input-error {
  border-color: red !important;
}

.modal-content {
    max-height: 400px; /* Adjust height as needed */
    overflow-y: auto; /* Enable vertical scrolling */
    font-size: 14px; /* Adjust font size as needed */
    color: whitesmoke; /* Ensure text color is readable */
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

</style>