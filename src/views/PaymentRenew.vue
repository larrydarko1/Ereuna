<template>
  <div class="renewal-container">
    <div class="expired-message">
      <h1>Subscription Expired</h1>
      <p>Your subscription has expired. Please renew to resume access to all features.</p>
    </div>
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
        <p class="total-text">Total: <span>€{{ calculateTotalPrice() }}</span></p>
      </div>
      <button class="renew-button">Renew Subscription</button>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { loadStripe } from '@stripe/stripe-js';

// Stripe refs
const stripe = ref(null);
const elements = ref(null);
const card = ref(null);

// Plan, duration, country
const selectedPlan = ref('core');
const selectedDuration = ref(1);
const selectedCountry = ref('MT'); // Default Malta
const dropdownOpen = ref(false);

// Country list (full, sorted)
const countries = [
  { code: 'IT', name: 'Italy', flag: '🇮🇹', vat: 0.22 },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', vat: 0.19 },
  { code: 'FR', name: 'France', flag: '🇫🇷', vat: 0.20 },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', vat: 0.21 },
  { code: 'US', name: 'United States', flag: '🇺🇸', vat: 0.00 },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', vat: 0.18 },
  // ...add more as needed
];
countries.sort((a, b) => a.name.localeCompare(b.name));

const selectedCountryObj = computed(() =>
  countries.find(c => c.code === selectedCountry.value) || countries[0]
);

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value;
}
function selectCountry(country) {
  selectedCountry.value = country.code;
  dropdownOpen.value = false;
}

function calculateTotalPrice() {
  const prices = {
    core: 5.99,
    premium: 14.99
  };
  let basePrice = prices[selectedPlan.value];
  let totalMonths = selectedDuration.value;
  let totalPrice = basePrice * totalMonths;
  const country = countries.find(c => c.code === selectedCountry.value);
  const vatRate = country ? country.vat : 0;
  const vatAmount = totalPrice * vatRate;
  const totalWithVat = totalPrice + vatAmount;
  return totalWithVat.toFixed(2);
}

// Stripe card element logic
onMounted(async () => {
  if (!stripe.value) {
    stripe.value = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  }
  initializeStripe();
});

function initializeStripe() {
  elements.value = stripe.value.elements();
  card.value = elements.value.create('card', {
    style: {
      base: {
        color: '#ffffff',
        fontFamily: 'Helvetica Neue, Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': { color: '#aab7c4' }
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a'
      }
    }
  });
  setTimeout(() => {
    const cardElement = document.getElementById('card-element');
    if (cardElement) {
      card.value.mount('#card-element');
    }
  }, 100);
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
.plan-options {
  display: flex;
  gap: 5rem;
  justify-content: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}
.plan-card {
  background: $base2;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(99, 102, 241, 0.08);
  padding: 1.2rem 1rem 1rem 1rem;
  width: 400px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border 0.2s, box-shadow 0.2s, transform 0.18s;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 260px;
}
.plan-card.selected-plan {
  border: 2px solid $accent1;
  box-shadow: 0 4px 24px rgba(99, 102, 241, 0.18);
  transform: scale(1.04);
}
.plan-header {
  font-size: 2rem;
  font-weight: 700;
  color: $accent1;
  margin-bottom: 0.4rem;
  letter-spacing: 0.04em;
}
.plan-price {
  font-size: 1.70rem;
  font-weight: 700;
  margin-bottom: 0.6rem;
  color: $text1;
}
.plan-price span {
  font-size: 0.98rem;
  color: $text2;
}
.plan-features {
  list-style: none;
  color: $text2;
  font-size: 0.97rem;
  margin: 0;
  padding-left: 0;
  text-align: left;
}
.plan-features li {
  padding: 7px 0 7px 22px;
  position: relative;
}
.plan-features li:before {
  content: "";
  position: absolute;
  left: 0;
  top: 13px;
  width: 12px;
  height: 12px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'%3E%3Ccircle cx='10' cy='10' r='10' fill='%238c8dfe'/%3E%3Cpath d='M6 10.5l2.5 2.5 5-5' stroke='%23fff' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}
.duration-selection {
  margin-top: 18px;
  margin-bottom: 1.2rem;
}
.duration-options {
  display: flex;
  gap: 0.7rem;
  justify-content: center;
  flex-wrap: wrap;
}
.duration-option {
  background: $base2;
  color: $text2;
  border-radius: 18px;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  border: 2px solid transparent;
  font-size: 1rem;
  min-width: 80px;
}
.duration-option:hover {
  background: $base3;
}
.duration-option.selected-duration {
  background: $accent1;
  color: $text4;
  font-weight: 500;
  border: 2px solid $accent1;
}
.total-price {
  margin-top: 1.7rem;
  text-align: right;
  padding: 10px 0 0 0;
  border-top: 1px solid $base2;
}
.total-price p {
  font-size: 2rem;
  color: $text2;
}
.total-price span {
  font-size: 2rem;
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
#card-errors {
  color: #ff6b6b;
  font-size: 0.98rem;
  margin-top: 6px;
  min-height: 18px;
}
.country-select {
  margin-top: 1rem;
  display: flex;
  justify-content: left;
}
.dropdown {
  position: relative;
  width: 220px;
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
}
.dropdown-arrow.open {
  transform: rotate(180deg);
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
  text-align: left;
  cursor: pointer;
  font-size: 0.95rem;
  &:hover {
    background: $accent1;
    color: $text4;
  }
}

.renew-button{
  width: 100%;
  background: $accent1;
  color: $text4;
  border: none;
  border-radius: 5px;
  padding: 12px 16px;
  font-size: 2rem;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: $accent2;
  }
}

@media (max-width: 600px) {
  .renewal-container {
    padding: 1.1rem 0.2rem;
    max-width: 99vw;
  }
  .plan-options {
    flex-direction: column;
    align-items: center;
  }
  .plan-card {
    width: 100%;
    min-width: 0;
    margin-bottom: 18px;
  }
  .duration-options {
    flex-direction: column;
    gap: 0.5rem;
  }
  .duration-option {
    min-width: 0;
    width: 100%;
  }
  .total-price {
    text-align: center;
  }
  .country-select {
    width: 100%;
  }
  .dropdown {
    width: 100%;
  }
}
</style>