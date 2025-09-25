<template>
  <div class="renewal-container">
     <img class="logo" src="@/assets/icons/ereuna.png" alt="Owl Icon" draggable="false">
    <div class="expired-message">
      <h1>Subscription Expired</h1>
      <p>Hi {{ username}}, your subscription has expired. Please renew to resume access to all features.</p>
    </div>
    <div class="subscription-section">
      <div class="duration-selection">
        <h3 class="subtitle">Subscription Duration</h3>
        <div class="duration-options">
          <div class="duration-option" :class="{ 'selected-duration': selectedDuration === 1 }" @click="selectedDuration = 1">1 Month</div>
          <div class="duration-option" :class="{ 'selected-duration': selectedDuration === 4 }" @click="selectedDuration = 4">4 Months</div>
          <div class="duration-option" :class="{ 'selected-duration': selectedDuration === 6 }" @click="selectedDuration = 6">6 Months</div>
          <div class="duration-option" :class="{ 'selected-duration': selectedDuration === 12 }" @click="selectedDuration = 12">1 Year</div>
        </div>
      </div>
      <div class="total-price">
        <div class="card-element-container">
          <div id="card-element" aria-label="Credit Card Input"></div>
        </div>
        <div class="total-row">
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
                  {{ country.flag }} {{ country.name }} ({{ (country.vat * 100) }}% VAT )
                </div>
              </div>
            </div>
          </div>
          <p class="total-text">Total: <span>€{{ calculateTotalPrice() }}</span></p>
        </div>
      </div>
      <button @click="handleRenewal" class="userbtn" :disabled="isLoading || vatLoadFailed" type="button" aria-label="Renew Subscription">
        <span class="btn-content-row">
          <span v-if="isLoading" class="loader4">
            <svg class="spinner" viewBox="0 0 50 50">
              <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5" />
            </svg>
          </span>
          <span :style="{ 'font-size': '12px' }" v-if="!isLoading">Renew Subscription</span>
          <span :style="{ 'font-size': '12px' }" v-else style="margin-left: 8px;">Processing...</span>
        </span>
      </button>
      <NotificationPopup ref="notification" role="alert" aria-live="polite" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/store/store';
import { loadStripe } from '@stripe/stripe-js';
import NotificationPopup from '@/components/NotificationPopup.vue';

const userStore = useUserStore();
const username = computed(() => userStore.getUser?.Username ?? '');

const stripe = ref<any>(null);
const elements = ref<any>(null);
const card = ref<any>(null);
const isLoading = ref(false);
const vatLoadFailed = ref(false);
const notification = ref<InstanceType<typeof NotificationPopup> | null>(null);
const showNotification = (msg: string) => {
  if (notification.value) notification.value.show(msg);
};

interface CountryVat {
  code: string;
  name: string;
  vat: number;
  flag: string;
}

const countries = ref<CountryVat[]>([]);
const selectedCountry = ref('MT');
const selectedDuration = ref(1);
const dropdownOpen = ref(false);

const selectedCountryObj = computed(() => {
  return countries.value.find((c: CountryVat) => c.code === selectedCountry.value) || countries.value[0] || { code: '', name: '', vat: 0 };
});

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value;
}

function selectCountry(country: { code: string }) {
  selectedCountry.value = country.code;
  dropdownOpen.value = false;
}

function calculateTotalPrice(): string {
  const basePrice = 14.99;
  let totalMonths = selectedDuration.value;
  let totalPrice = basePrice * totalMonths;
  const country = countries.value.find((c: CountryVat) => c.code === selectedCountry.value);
  const vatRate = country ? country.vat : 0;
  const vatAmount = totalPrice * vatRate;
  const totalWithVat = totalPrice + vatAmount;
  return totalWithVat.toFixed(2);
}

function calculateTotalPriceCents(): number {
  const basePrice = 14.99;
  let totalMonths = selectedDuration.value;
  let totalPrice = basePrice * totalMonths;
  const country = countries.value.find((c: CountryVat) => c.code === selectedCountry.value);
  const vatRate = country ? country.vat : 0;
  const vatAmount = totalPrice * vatRate;
  const totalWithVat = totalPrice + vatAmount;
  return Math.round(totalWithVat * 100);
}

async function fetchVatRates() {
  try {
    const response = await fetch('/api/vat-rates', {
      headers: {
        'X-API-KEY': import.meta.env.VITE_EREUNA_KEY,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch VAT rates');
    const data = await response.json();
    countries.value = (data.countries || []).sort((a: CountryVat, b: CountryVat) => a.name.localeCompare(b.name));
    vatLoadFailed.value = false;
  } catch (err) {
    notification.value?.show('Could not load VAT rates. Renewal is temporarily disabled.');
    vatLoadFailed.value = true;
  }
}

onMounted(async () => {
  await fetchVatRates();
  if (!stripe.value) {
    stripe.value = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  }
  initializeStripe();
});

function initializeStripe() {
  if (!stripe.value) return;
  elements.value = stripe.value.elements();
  if (!elements.value) return;
  const text1 = getComputedStyle(document.documentElement).getPropertyValue('--text1') || '#32325d';
  card.value = elements.value.create('card', {
    style: {
      base: {
        color: text1.trim(),
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

async function handleRenewal() {
  if (isLoading.value) return;
  isLoading.value = true;
  if (!stripe.value || !card.value) {
    showNotification('Payment form not ready. Please wait for the payment form to load.');
    isLoading.value = false;
    return;
  }
  let paymentMethod, pmError;
  try {
    const result = await stripe.value.createPaymentMethod({
      type: 'card',
      card: card.value,
      billing_details: { name: username.value || 'User' }
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
  try {
    const response = await fetch('/api/renew-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': import.meta.env.VITE_EREUNA_KEY,
      },
      body: JSON.stringify({
        user: username.value,
        payment_method_id: paymentMethod.id,
        duration: selectedDuration.value,
        country: selectedCountry.value,
  vat: (countries.value.find((c: CountryVat) => c.code === selectedCountry.value)?.vat || 0),
        total: calculateTotalPriceCents(),
        return_url: window.location.origin
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
      showNotification('Renewal and payment successful!');
      if (result.token) {
        localStorage.setItem('token', result.token);
        userStore.loadUserFromToken();
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    } else {
      showNotification(result.message || 'Renewal or payment failed.');
    }
  } catch (error) {
    showNotification('Network or server error. Please check your connection.');
  } finally {
    isLoading.value = false;
  }
}
</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

.logo {
  display: block;
  margin: 0 auto 1.5rem auto;
  height: 100px;
  user-select: none;
}

.renewal-container {
  max-width: 1000px;
  margin: 3.5rem auto 2rem auto;
  background: $base4;
  border-radius: 1.5rem;
  box-shadow: 0 8px 32px rgba(30, 41, 59, 0.13), 0 2px 8px rgba(30, 41, 59, 0.10);
  padding: 2.5rem 1.5rem 2rem 1.5rem;
  color: $text1;
  position: relative;
}
.expired-message {
  text-align: center;
  margin-bottom: 2.2rem;
}
.expired-message h1 {
  color: $accent1;
  font-size: 4rem;
  margin-bottom: 0.5rem;
  font-weight: 700;
}
.expired-message p {
  color: $text2;
  font-size: 2rem;
}
.subscription-section {
  margin-top: 1.2rem;
}
.subtitle {
  color: $accent1;
  font-size: 2rem;
  margin-bottom: 2rem;
  text-align: center;
  font-weight: 600;
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
  background-color: $base2;
  color: $text2;
  border-radius: 7px;
  padding: 10px 18px;
  cursor: pointer;
  transition: all 0.18s;
  text-align: center;
  flex: 1;
  min-width: 80px;
  border: 1.5px solid $base3;
  font-weight: 600;
}
.duration-option:hover {
  background-color: $base3;
}
.duration-option.selected-duration {
  background-color: $accent1;
  color: $text4;
  border-color: $accent1;
}
.total-price {
  margin-top: 30px;
  text-align: right;
  padding: 10px 0 0 0;
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
.card-element-container {
  margin-bottom: 1.1rem;
}
#card-element {
  background: $base4;
  border-radius: 8px;
  padding: 16px;
  color: $text1;
  border: 1.5px solid $base2;
  margin-bottom: 10px;
  font-size: 1.1rem;
  transition: border 0.2s;
}
#card-element.StripeElement--focus {
  border-color: $accent1;
}
.country-select {
  margin-top: 1rem;
}
.country-select .dropdown {
  position: relative;
  width: 250px;
  cursor: pointer;
  user-select: none;
}
.country-select .dropdown-selected {
  background: $base2;
  color: $text1;
  border-radius: 7px;
  padding: 10px 12px;
  border: 1.5px solid $base3;
  font-size: 0.98rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 10px;
  transition: border-color 0.18s;
}
.country-select .dropdown-selected:focus {
  border-color: $accent1;
}
.country-select .dropdown-arrow {
  margin-left: 6px;
  font-size: 0.9em;
  transition: transform 0.2s;
}
.country-select .dropdown-arrow.open {
  transform: rotate(180deg);
}
.country-select .dropdown-list {
  position: absolute;
  top: 105%;
  left: 0;
  width: 100%;
  background: $base2;
  border: 1.5px solid $base3;
  border-radius: 7px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  z-index: 10;
  max-height: 150px;
  overflow-y: auto;
}
.country-select .dropdown-item {
  padding: 10px 12px;
  color: $text1;
  text-align: left;
  cursor: pointer;
  font-size: 0.98rem;
  border-radius: 7px;
  transition: background 0.18s, color 0.18s;
}
.country-select .dropdown-item:hover {
  background: $accent1;
  color: $text4;
}
.userbtn {
  background: $accent1;
  text-align: center;
  align-items: center;
  align-content: center;
  justify-content: center;
  color: $text4;
  border-radius: 10px;
  outline: none;
  border: none;
  padding: 15px;
  margin: 10px 0 0 0;
  width: 100%;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1.2rem;
  font-weight: bold;
}
.userbtn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.userbtn:hover:not(:disabled) {
  background: $accent2;
}
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
  stroke: #000000;
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
@media (max-width: 1150px) {
  .renewal-container {
    padding: 1.1rem 0.2rem;
    max-width: 99vw;
    border-radius: 12px;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
  }
  .logo {
    height: 60px;
    margin-bottom: 1rem;
  }
  .expired-message h1 {
    font-size: 2.2rem;
  }
  .expired-message p {
    font-size: 1.1rem;
  }
  .subscription-section {
    padding: 10px;
    margin-top: 0.5rem;
    border-radius: 10px;
  }
  .subtitle {
    font-size: 1.3rem;
    margin-bottom: 1rem;
  }
  .duration-selection {
    margin-top: 18px;
  }
  .duration-options {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 10px;
    max-width: 340px;
    margin-left: auto;
    margin-right: auto;
  }
  .duration-option {
    min-width: 0;
    width: 100%;
    max-width: 320px;
    font-size: 1rem;
    padding: 10px 10px;
    box-sizing: border-box;
  }
  .total-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 10px;
    width: 100%;
  }
  .total-row .country-select {
    width: auto;
    margin-top: 0;
    flex: 0 0 auto;
  }
  .country-select .dropdown {
    width: auto;
    min-width: 120px;
  }
  .country-select .dropdown-selected {
    font-size: 1.35rem;
    padding: 12px 16px;
  }
  .country-select .dropdown-list {
    font-size: 1.15rem;
  }
  .country-select .dropdown-item {
    padding: 12px 16px;
  }
  .total-row .total-text {
    font-size: 1.45rem;
    margin: 0;
    flex: 0 0 auto;
    white-space: nowrap;
  }
  .total-row span {
    font-size: 1.55rem;
  }
  .card-element-container {
    margin-bottom: 0.7rem;
  }
  #card-element {
    padding: 10px;
    font-size: 1rem;
  }
  .country-select {
    width: 100%;
    margin-top: 0.7rem;
  }
  .country-select .dropdown {
    width: 100%;
  }
  .country-select .dropdown-selected {
    font-size: 0.95rem;
    padding: 8px 10px;
  }
  .country-select .dropdown-list {
    font-size: 0.95rem;
  }
  .country-select .dropdown-item {
    padding: 8px 10px;
  }
  .userbtn {
    width: 100%;
    font-size: 1rem;
    padding: 10px;
    margin: 10px 0 0 0;
    border-radius: 8px;
  }
  .btn-content-row {
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 100%;
  }
  .loader4 {
    height: 18px;
    margin-right: 8px;
  }
  .spinner {
    width: 20px;
    height: 20px;
  }
}
</style>