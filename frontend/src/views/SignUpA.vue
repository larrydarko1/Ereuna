<template>
    <div class="signup-form">
      <div class="logo-c">
  <router-link to="/" class="logo-link">
    <img class="logo" src="@/assets/icons/ereuna.png" alt="Owl Icon" draggable="false">
  </router-link>
  <p style="cursor: default;">Already Registered? <router-link to="/login" class="text">Login Here</router-link></p>
</div>
<div class="subscription-section">
        <h1 style="cursor: default;">Create a New Account</h1>
      <div class="input-group">
        <input required type="text" name="username" autocomplete="off" class="input" aria-label="Username">
        <label class="user-label">Username</label>
      </div>
      <div class="input-group">
        <input required type="password" name="password" autocomplete="new-password" class="input" aria-label="Password">
        <label class="user-label">Password</label>
      </div>
      <div class="input-group">
        <input required type="password" name="confirm-password" autocomplete="new-password" class="input" aria-label="Confirm Password">
        <label class="user-label">Confirm Password</label>
      </div>
      </div>
      <!-- Subscription Selection Section -->
<div class="subscription-section">
  <h2 class="subtitle">Subscription</h2>
  <div class="duration-selection">
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
    <div id="card-element" aria-label="Credit Card Input"></div>
  </div>
<div class="country-select">
  <div class="dropdown" @click="toggleDropdown">
    <div class="dropdown-selected">
      {{ selectedCountryObj.name }} ({{ (selectedCountryObj.vat * 100).toFixed(0)}}% VAT)
      <span class="dropdown-arrow" :class="{ open: dropdownOpen }">&#9662;</span>
    </div>
    <div class="dropdown-list" v-if="dropdownOpen">
      <div
        v-for="country in countries"
        :key="country.code"
        class="dropdown-item"
        @click.stop="selectCountry(country)"
      >
       {{ country.flag }} {{ country.name }} ({{ (country.vat * 100).toFixed(0) }}% VAT )
      </div>
    </div>
  </div>
</div>
  <p>Total: <span>€{{ calculateTotalPrice() }}</span>
  </p>
</div>
</div>
     <div 
  class="custom-checkbox" 
  :class="{ checked: agreeToTerms }"
  @click="agreeToTerms = !agreeToTerms"
  style="justify-content: center;"
  role="checkbox"
  :aria-checked="agreeToTerms"
  tabindex="0"
  @keydown.enter.space="agreeToTerms = !agreeToTerms"
  aria-label="Agree to Terms of Service and Privacy Policy"
>
  <input type="checkbox" v-model="agreeToTerms" id="terms-checkbox" required style="display: none;">
  <span class="checkmark"></span>
  <label for="terms-checkbox" class="label-text"> I acknowledge that I have read and agree to the 
    <a href="#" @click.prevent="showPolicy = true">Terms of Service & Privacy Policy</a></label>
</div>
  <button @click="handleSignupWithPayment" class="userbtn" :disabled="isLoading || vatLoadFailed" type="button" aria-label="Sign up">
        <span class="btn-content-row">
          <span v-if="isLoading" class="loader4">
            <svg class="spinner" viewBox="0 0 50 50">
              <circle
                class="path"
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke-width="5"
              />
            </svg>
          </span>
          <span v-if="!isLoading" style="font-size: 16px; font-weight: bold;">Create</span>
          <span v-else style="font-size: 16px; font-weight: bold; margin-left: 8px;">Processing...</span>
        </span>
      </button>
      <p style="cursor: default;"><label style="color: #8c8dfe; font-size: inherit;">Security Notice:</label> A unique Recovery Key is required for password recovery. You can download this key in the Account section. Please store it securely, as it will be the only means of regaining access to your account in the event of a lost or forgotten password.</p>
      <p style="cursor: default;"> <label style="color: #8c8dfe; font-size: inherit;">2-Factor Authentication (2FA)</label>  is available as an optional security feature. To activate 2FA, navigate to the 'Security' section within your Account settings. Note that only authentication app-based 2FA is currently supported, with no SMS or email options available. </p>
    </div>
   <Policy :visible="showPolicy" @close="showPolicy = false" />
<NotificationPopup ref="notification" />
  </template>

<script setup lang="ts">
import NotificationPopup from '@/components/NotificationPopup.vue';
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { loadStripe } from '@stripe/stripe-js';
import Policy from '@/components/policy.vue';
import type { Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
const apiKey = import.meta.env.VITE_EREUNA_KEY;

const showPolicy = ref(false);
const agreeToTerms = ref(false);
const stripe = ref<Stripe | null>(null);
const elements = ref<StripeElements | null>(null);
const card = ref<StripeCardElement | undefined>(undefined);
const router = useRouter();
const isLoading = ref(false);
const vatLoadFailed = ref(false);

const notification = ref<InstanceType<typeof NotificationPopup> | null>(null);
const showNotification = (msg: string) => {
  if (notification.value) notification.value.show(msg);
};

async function handleSignupWithPayment(): Promise<void> {
  if (isLoading.value) return;
  isLoading.value = true;

  const usernameInput = document.querySelector('input[name="username"]') as HTMLInputElement | null;
  const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement | null;
  const confirmPasswordInput = document.querySelector('input[name="confirm-password"]') as HTMLInputElement | null;
  const agreeToTermsCheckbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement | null;

  // Defensive: check all form elements
  if (!usernameInput || !passwordInput || !confirmPasswordInput || !agreeToTermsCheckbox) {
    showNotification('Form elements not found. Please reload the page.');
    isLoading.value = false;
    return;
  }

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();
  const agreeToTermsChecked = agreeToTermsCheckbox.checked;

  // Reset all error states
  usernameInput.classList.remove('error');
  passwordInput.classList.remove('error');
  confirmPasswordInput.classList.remove('error');
  agreeToTermsCheckbox.classList.remove('error');

  // Validation
  if (!username || !password || !confirmPassword) {
    showNotification('Please fill in all fields.');
    if (!username) usernameInput.classList.add('error');
    if (!password) passwordInput.classList.add('error');
    if (!confirmPassword) confirmPasswordInput.classList.add('error');
    isLoading.value = false;
    return;
  }
  if (!agreeToTermsChecked) {
    showNotification('Please accept the terms and conditions.');
    agreeToTermsCheckbox.classList.add('error');
    isLoading.value = false;
    return;
  }
  if (password !== confirmPassword) {
    showNotification('Passwords do not match.');
    passwordInput.classList.add('error');
    confirmPasswordInput.classList.add('error');
    isLoading.value = false;
    return;
  }
  if (username.length < 3 || username.length > 25) {
    showNotification('Username must be between 3 and 25 characters.');
    usernameInput.classList.add('error');
    isLoading.value = false;
    return;
  }
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    showNotification('Username can only contain letters, numbers, and underscores.');
    usernameInput.classList.add('error');
    isLoading.value = false;
    return;
  }
  if (password.length < 5 || password.length > 40) {
    showNotification('Password must be between 5 and 40 characters.');
    passwordInput.classList.add('error');
    isLoading.value = false;
    return;
  }

  // Stripe payment validation
  if (!stripe.value || !card.value) {
    showNotification('Payment form not ready. Please wait for the payment form to load.');
    isLoading.value = false;
    return;
  }

  // Create payment method
  let paymentMethod, pmError;
  try {
    const result = await stripe.value.createPaymentMethod({
      type: 'card',
      card: card.value,
      billing_details: { name: username }
    });
    paymentMethod = result.paymentMethod;
    pmError = result.error;
  } catch (err) {
    showNotification('Unexpected error creating payment method.');
    isLoading.value = false;
    return;
  }

  if (pmError || !paymentMethod) {
    showNotification(pmError?.message || 'Payment method error.');
    isLoading.value = false;
    return;
  }

  // Call backend to handle payment and registration in one endpoint
  try {
    const response = await fetch('/api/signup-paywall', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        username,
        password,
        payment_method_id: paymentMethod.id,
        duration: selectedDuration.value,
        country: selectedCountry.value,
        vat: (countries.value.find(c => c.code === selectedCountry.value)?.vat || 0),
        total: calculateTotalPriceCents(), // send cents as integer
      }),
    });

    let result;
    try {
      result = await response.json();
    } catch (jsonErr) {
      showNotification('Server error: invalid response.');
      isLoading.value = false;
      return;
    }

    if (response.ok && result.success) {
      showNotification('Signup and payment successful!');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } else {
      // Enhanced error handling for backend errors
      if (result.errors && Array.isArray(result.errors)) {
        // Show the first error message, highlight field if possible
        const firstError = result.errors[0];
        if (firstError && firstError.field && firstError.message) {
          showNotification(firstError.message);
          // Highlight the relevant field if possible
          if (firstError.field === 'username') {
            const usernameInput = document.querySelector('input[name="username"]') as HTMLInputElement | null;
            if (usernameInput) usernameInput.classList.add('error');
          }
        } else {
          // Fallback: show all error messages if present
          const messages = result.errors.map((e: any) => e.message).join(' ');
          showNotification(messages || 'Signup or payment failed.');
        }
      } else {
        showNotification(result.message || 'Signup or payment failed.');
      }
    }
  } catch (error) {
    showNotification('Network or server error. Please check your connection.');
  } finally {
    isLoading.value = false;
  }
}

interface CountryVat {
  code: string;
  name: string;
  vat: number;
  flag: string;
}


const countries = ref<CountryVat[]>([]);

async function fetchVatRates() {
  try {
    const response = await fetch('/api/vat-rates', {
      headers: {
        'X-API-KEY': apiKey,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch VAT rates');
    const data = await response.json();
    countries.value = (data.countries || []).sort((a: CountryVat, b: CountryVat) => a.name.localeCompare(b.name));
    vatLoadFailed.value = false;
  } catch (err) {
    notification.value?.show('Could not load VAT rates. Registration is temporarily disabled.');
    vatLoadFailed.value = true;
  }
}

onMounted(() => {
  fetchVatRates();
});

const dropdownOpen = ref(false);

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value;
}


function selectCountry(country: { code: string }) {
  selectedCountry.value = country.code;
  dropdownOpen.value = false;
}

const selectedCountryObj = computed(() => {
  return countries.value.find(c => c.code === selectedCountry.value) || countries.value[0] || { code: '', name: '', vat: 0 };
});

// Only premium plan is available
const selectedDuration = ref(1);  // Default to 1 month
const selectedCountry = ref('MT'); // Default to Malta



// Returns total in cents as integer (e.g., 7075 for 70.75€)
function calculateTotalPriceCents(): number {
  const basePrice = 14.99;
  let totalMonths = selectedDuration.value;
  let totalPrice = basePrice * totalMonths;
  const country = countries.value.find(c => c.code === selectedCountry.value);
  const vatRate = country ? country.vat : 0;
  const vatAmount = totalPrice * vatRate;
  const totalWithVat = totalPrice + vatAmount;
  return Math.round(totalWithVat * 100);
}

// For display only (euros, 2 decimals)
function calculateTotalPrice(): string {
  return (calculateTotalPriceCents() / 100).toFixed(2);
}

onMounted(async () => {
  // Load Stripe.js
  if (!stripe.value) {
    stripe.value = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  }
  // Create card element
  initializeStripe();
});

// Initialize Stripe elements
function initializeStripe() {
  if (!stripe.value) return;
  elements.value = stripe.value.elements();
  if (!elements.value) return;
  card.value = elements.value.create('card', {
    style: {
      base: {
        color: getComputedStyle(document.documentElement).getPropertyValue('--text1') || '#32325d',
        fontFamily: 'Arial, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a',
      },
    },
  });
  setTimeout(() => {
    const cardElement = document.getElementById('card-element');
    if (cardElement && card.value) {
      card.value.mount('#card-element');
    }
  }, 100);
  if (card.value) {
    card.value.on('change', function(event: any) {
      if (event.error) {
        showNotification(event.error.message);
      }
    });
  }
}

</script>
  
<style lang="scss" scoped>
@use '../style.scss' as *;

.btn-content-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
}
.loader4 {
  display: flex;
  align-items: center;
  height: 20px;
  margin-right: 10px;
}

.spinner {
  animation: rotate 2s linear infinite;
  width: 25px;
  height: 25px;
}

.path {
  stroke: var(--brand-text-primary);
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}

.input-group {
  position: relative;
  padding: 1rem;
}

p {
  color: var(--brand-text-secondary);
  font-size: 1.2rem;
}

.input {
  border: solid 2px transparent;
  border-radius: 5px;
  background-color: var(--brand-bg-secondary);
  padding: 1.5rem;
  font-size: 1.2rem;
  width: 80%;
  color: var(--brand-text-secondary);
  transition: border 150ms cubic-bezier(0.4,0,0.2,1);
}

.user-label {
  position: absolute;
  left: 10%;
  padding-left: 1.5rem;
  bottom: 45px;
  color: var(--brand-text-secondary);
  pointer-events: none;
  transform: translateY(1.5rem);
  transition: 150ms cubic-bezier(0.4,0,0.2,1);
  text-align: left;
}

.input:focus, .input:valid {
  outline: none;
  border: 2px solid var(--brand-primary);
}

.input:focus ~ label, .input:valid ~ label {
  transform: translateY(-50%) scale(0.8);
  background-color: var(--brand-bg-primary);
  padding: 0 .4em;
  color: var(--brand-primary);
}

.userbtn {
  background-color: var(--brand-primary);
  text-align: center;
  align-items: center;
  align-content: center;
  justify-content: center;
  color: var(--brand-bg-primary);
  border-radius: 5px;
  outline: none;
  border: none;
  padding: 10px;
  margin: 10px;
  width: 90%;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 16px;
  font-weight: bold;
}

.userbtn:hover {
  background-color: var(--brand-secondary);
}

.signup-form {
  border: none;
  border-radius: 15px;
  padding: 30px;
  width: 80%;
  margin: 70px auto;
  text-align: center;
  background-color: var(--brand-bg-primary);
  z-index: 1000;
}

.custom-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 10px;
}

.checkmark {
  width: 12px;
  height: 12px;
  background-color: var(--brand-text-primary);
  border-radius: 50%;
  margin-right: 10px;
  display: inline-block;
  transition: background-color 0.3s, border-color 0.3s;
}

.custom-checkbox.checked .checkmark {
  background-color: var(--brand-primary);
  border-color: var(--brand-primary);
}

.label-text {
  opacity: 0.7;
  transition: opacity 0.3s;
  color: var(--brand-text-secondary);
  font-size: 1.1rem;
}

.custom-checkbox.checked .label-text {
  opacity: 1;
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
  background-color: var(--brand-bg-secondary);
  padding: 30px;
  border-radius: 20px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.modal button {
  margin-top: 15px;
  position: absolute;
  top: 0;
  right: 10px;
  background: transparent;
  border: none;
  cursor: pointer;
}

.subtitle {
  color: var(--brand-text-primary);
  margin: 20px 0 10px;
  font-size: 2rem;
  cursor: default;
}

a {
  color: var(--brand-primary);
  font-size: 1.2rem;
}

a:hover {
  color: var(--brand-secondary);
  cursor: pointer;
}

h1 {
  color: var(--brand-text-primary);
  font-size: 20px;
}

.logo {
  height: 70px;
}

.logo-c {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  padding: 0px;
}

.text {
  color: var(--brand-primary);
  font-size: inherit;
}

.error {
  border-color: red;
}

/* Subscription Section Styles */
.subscription-section {
  background-color: var(--brand-bg-secondary);
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
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
  background-color: var(--brand-bg-card);
  color: var(--brand-text-secondary);
  border-radius: 3px;
  padding: 10px 18px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  flex: 1;
  min-width: 80px;
}

.duration-option:hover {
  background-color: var(--brand-bg-card-hover);
}

.duration-option.selected-duration {
  background-color: var(--brand-primary);
  color: var(--brand-bg-primary);
  font-weight: 500;
}

.total-price {
  margin-top: 30px;
  text-align: right;
  padding: 10px;
  border-top: 1px solid var(--brand-bg-card);
}

.total-price p {
  font-size: 18px;
  color: var(--brand-text-secondary);
}

.total-price span {
  font-size: 22px;
  color: var(--brand-primary);
  font-weight: 700;
  margin-left: 8px;
}

.country-select {
  margin-top: 1rem;
  .dropdown {
    position: relative;
    width: 250px;
    cursor: pointer;
    user-select: none;
  }
  .dropdown-selected {
    background: var(--brand-bg-secondary);
    color: var(--brand-text-primary);
    border-radius: 5px;
    padding: 6px 10px;
    border: 1px solid var(--brand-bg-primary);
    font-size: 0.95rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 10px;
  }
  .dropdown-arrow {
    margin-left: 6px;
    font-size: 0.9em;
    transition: transform 0.2s;
    &.open {
      transform: rotate(180deg);
    }
  }
  .dropdown-list {
    position: absolute;
    top: 105%;
    left: 0;
    width: 100%;
    background: var(--brand-bg-secondary);
    border: 1px solid var(--brand-bg-primary);
    border-radius: 5px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.10);
    z-index: 10;
    max-height: 150px;
    overflow-y: auto;
  }
  .dropdown-item {
    padding: 6px 10px;
    color: var(--brand-text-primary);
    text-align: left;
    cursor: pointer;
    font-size: 0.95rem;
    &:hover {
      background: var(--brand-primary);
      color: var(--brand-bg-primary);
    }
  }
}

/* Mobile version */
@media (max-width: 1150px) {
  .signup-form {
    border: none;
    border-radius: 15px;
    padding: 30px;
    width: 80%;
    margin: 50px auto;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
    text-align: center;
    background-color: var(--brand-bg-primary);
    z-index: 1000;
  }

  .input {
    border: solid 2px transparent;
    border-radius: 5px;
    background-color: var(--brand-bg-secondary);
    padding: 1.5rem;
    font-size: 1.2rem;
    width: 80%;
    color: var(--brand-text-secondary);
    transition: border 150ms cubic-bezier(0.4,0,0.2,1);
  }

  .userbtn {
    width: 80%;
  }

  .user-label {
    position: absolute;
    left: 10%;
    padding-left: 1.5rem;
    bottom: 45px;
    color: var(--brand-text-secondary);
    pointer-events: none;
    transform: translateY(1.5rem);
    transition: 150ms cubic-bezier(0.4,0,0.2,1);
    text-align: left;
  }
}

</style>