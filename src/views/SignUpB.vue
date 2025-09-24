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
        <input required type="text" name="username" autocomplete="off" class="input">
        <label class="user-label">Username</label>
      </div>
      <div class="input-group">
        <input required type="password" name="password" autocomplete="off" class="input">
        <label class="user-label">Password</label>
      </div>
      <div class="input-group">
        <input required type="password" name="confirm-password" autocomplete="off" class="input">
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
    <div id="card-element"></div>
    <div id="card-errors" role="alert"></div>
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
  style="justify-content: center;" >
  <input type="checkbox" v-model="agreeToTerms" id="terms-checkbox" required style="display: none;">
  <span class="checkmark"></span>
  <label for="terms-checkbox" class="label-text"> I acknowledge that I have read and agree to the 
    <a href="#" @click.prevent="showPolicy = true">Terms of Service & Privacy Policy</a></label>
</div>
      <button @click="Trial()" class="userbtn">Create</button>
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

const showPolicy = ref(false)
const agreeToTerms = ref(false);
const stripe = ref<Stripe | null>(null);
const elements = ref<StripeElements | null>(null);
const card = ref<StripeCardElement | undefined>(undefined);
const router = useRouter();

// for popup notifications
const notification = ref<InstanceType<typeof NotificationPopup> | null>(null);
const showNotification = () => {
  if (notification.value) notification.value.show('This is a custom notification message!');
};

async function Trial(): Promise<void> {
  const usernameInput = document.querySelector('input[name="username"]') as HTMLInputElement | null;
  const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement | null;
  const confirmPasswordInput = document.querySelector('input[name="confirm-password"]') as HTMLInputElement | null;
  const agreeToTermsCheckbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement | null;

  if (!usernameInput || !passwordInput || !confirmPasswordInput || !agreeToTermsCheckbox) {
    notification.value?.show('Form elements not found.');
    return;
  }

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
    notification.value?.show('Please fill in all fields.');
    if (!username) usernameInput.classList.add('error');
    if (!password) passwordInput.classList.add('error');
    if (!confirmPassword) confirmPasswordInput.classList.add('error');
    return;
  }

  // Check if terms and conditions are accepted
  if (!agreeToTerms) {
    notification.value?.show('Please accept the terms and conditions.');
    agreeToTermsCheckbox.classList.add('error');
    return;
  }

  // Check if password and confirm password match
  if (password !== confirmPassword) {
    notification.value?.show('Passwords do not match.');
    passwordInput.classList.add('error');
    confirmPasswordInput.classList.add('error');
    return;
  }

  // Validate username
  if (username.length < 3 || username.length > 25) {
    notification.value?.show('Username must be between 3 and 25 characters.');
    usernameInput.classList.add('error');
    return;
  }
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    notification.value?.show('Username can only contain letters, numbers, and underscores.');
    usernameInput.classList.add('error');
    return;
  }

  // Validate password
  if (password.length < 5 || password.length > 40) {
    notification.value?.show('Password must be between 5 and 40 characters.');
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
      notification.value?.show('User Created Successfully!');
      setTimeout(() => {
        router.push('/login');
      }, 5000);
    } else {
      const errorResponse = await response.json();
      notification.value?.show('Username Already Taken.');
    }
  } catch (error) {
    console.error(error);
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
    countries.value = data.sort((a: CountryVat, b: CountryVat) => a.name.localeCompare(b.name));
  } catch (err) {
    notification.value?.show('Could not load VAT rates, using defaults.');
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


function calculateTotalPrice(): string {
  const basePrice = 14.99;
  let totalMonths = selectedDuration.value;
  let totalPrice = basePrice * totalMonths;
  const country = countries.value.find(c => c.code === selectedCountry.value);
  const vatRate = country ? country.vat : 0;
  const vatAmount = totalPrice * vatRate;
  const totalWithVat = totalPrice + vatAmount;
  return totalWithVat.toFixed(2);
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
        color: '#32325d',
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
      const displayError = document.getElementById('card-errors');
      if (displayError) {
        if (event.error) {
          displayError.textContent = event.error.message;
        } else {
          displayError.textContent = '';
        }
      }
    });
  }
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
    background-color:$base2;;
    padding: 1.5rem;
    font-size: 1.2rem;
    width: 80%;
    color: $text2;
    transition: border 150ms cubic-bezier(0.4,0,0.2,1);
  }


.user-label {
  position: absolute;
  left: 10%;
  padding-left: 1.5rem; // match input's padding
  bottom: 45px;
  color: $text2;
  pointer-events: none;
  transform: translateY(1.5rem);
  transition: 150ms cubic-bezier(0.4,0,0.2,1);
  text-align: left;
}

  .input:focus, .input:valid {
    outline: none;
    border: 2px solid $accent1;
  }

  .input:focus ~ label, .input:valid ~ label {
    transform: translateY(-50%) scale(0.8);
    background-color: $base1;
    padding: 0 .4em;
    color: $accent1;
  }

.userbtn {
  background-color: $accent1;
  text-align: center;
  align-items: center;
  align-content: center;
  justify-content: center;
  color: $text4;
  border-radius: 10px;
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
  background-color: $accent2;
}

  .signup-form {
    border: none;
    border-radius: 15px;
    padding: 30px;
    width: 80%;
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
  text-align: left;
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

.country-select {
  margin-top: 1rem;
  .dropdown {
    position: relative;
    width: 250px;
    cursor: pointer;
    user-select: none;
  }
  .dropdown-selected {
    background: $base2;
    color: $text1;
    border-radius: 5px;
    padding: 6px 10px;
    border: 1px solid $base1;
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
    background: $base2;
    border: 1px solid $base1;
    border-radius: 5px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.10);
    z-index: 10;
    max-height: 150px;
    overflow-y: auto;
  }
  .dropdown-item {
    padding: 6px 10px;
    color: $text1;
    text-align: left;;
    cursor: pointer;
    font-size: 0.95rem;
    &:hover {
      background: $accent1;
      color: $text4;
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
    background-color: $base4;
    z-index: 1000;
  }

  .input {
    border: solid 2px transparent;
    border-radius: 1.5rem;
    background-color:$base2;;
    padding: 1.5rem;
    font-size: 1.2rem;
    width: 80%;
    color: $text2;
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
    color: $text2;
    pointer-events: none;
    transform: translateY(1.5rem);
    transition: 150ms cubic-bezier(0.4,0,0.2,1);
    text-align: left;
  }
}

</style>