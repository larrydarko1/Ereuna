<template>
  <div class="modal-backdrop" @click.self="$emit('close')" role="dialog" aria-modal="true" aria-labelledby="renew-title">
    <div class="modal-content">
      <button class="close-x" @click="$emit('close')" :aria-label="t('common.close')">&times;</button>
      <h2 id="renew-title">{{ t('renew.title') }}</h2>
    <div class="subscription-section">
      <div class="duration-selection">
        <div class="duration-options">
          <div class="duration-option" :class="{ 'selected-duration': selectedDuration === 1 }" @click="selectedDuration = 1">
            {{ t('subscription.duration.oneMonth') }}
          </div>
          <div class="duration-option" :class="{ 'selected-duration': selectedDuration === 4 }" @click="selectedDuration = 4">
            {{ t('subscription.duration.fourMonths') }}
          </div>
          <div class="duration-option" :class="{ 'selected-duration': selectedDuration === 6 }" @click="selectedDuration = 6">
            {{ t('subscription.duration.sixMonths') }}
          </div>
          <div class="duration-option" :class="{ 'selected-duration': selectedDuration === 12 }" @click="selectedDuration = 12">
            {{ t('subscription.duration.oneYear') }}
          </div>
        </div>
      </div>
      <div class="total-price">
        <div class="card-element-container">
          <div id="renew-card-element" aria-label="Credit Card Input"></div>
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
        <p>{{ t('renew.total') }}: <span>€{{ calculateTotalPrice() }}</span></p>
      </div>
    </div>
  <button @click="handleRenewal" class="userbtn" :disabled="isLoading || vatLoadFailed" type="button" :aria-label="t('renew.renewButton')">
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
        <span v-if="!isLoading">{{ t('renew.renewButton') }}</span>
        <span v-else style="margin-left: 8px;">{{ t('renew.processing') }}</span>
      </span>
    </button>
  <NotificationPopup ref="notification" role="alert" aria-live="polite" />
  </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { loadStripe } from '@stripe/stripe-js';
import NotificationPopup from '@/components/NotificationPopup.vue';

const { t } = useI18n();

const props = defineProps({
  apiKey: { type: String, required: true },
  user: { type: String, required: true },
});

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
  return countries.value.find(c => c.code === selectedCountry.value) || countries.value[0] || { code: '', name: '', vat: 0 };
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
  const country = countries.value.find(c => c.code === selectedCountry.value);
  const vatRate = country ? country.vat : 0;
  const vatAmount = totalPrice * vatRate;
  const totalWithVat = totalPrice + vatAmount;
  return totalWithVat.toFixed(2);
}

// Returns total price in integer cents (for Stripe/backend)
function calculateTotalPriceCents(): number {
  const basePrice = 14.99;
  let totalMonths = selectedDuration.value;
  let totalPrice = basePrice * totalMonths;
  const country = countries.value.find(c => c.code === selectedCountry.value);
  const vatRate = country ? country.vat : 0;
  const vatAmount = totalPrice * vatRate;
  const totalWithVat = totalPrice + vatAmount;
  // Convert to cents and round to nearest integer
  return Math.round(totalWithVat * 100);
}

async function fetchVatRates() {
  try {
    const response = await fetch('/api/vat-rates', {
      headers: {
        'X-API-KEY': props.apiKey,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch VAT rates');
    const data = await response.json();
    countries.value = (data.countries || []).sort((a: CountryVat, b: CountryVat) => a.name.localeCompare(b.name));
    vatLoadFailed.value = false;
  } catch (err) {
    notification.value?.show(t('renew.vatLoadFailed'));
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
  // Get the CSS variable for text1
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
    const cardElement = document.getElementById('renew-card-element');
    if (cardElement && card.value) {
      card.value.mount('#renew-card-element');
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
    showNotification(t('renew.paymentFormNotReady'));
    isLoading.value = false;
    return;
  }
  let paymentMethod, pmError;
  try {
    const result = await stripe.value.createPaymentMethod({
      type: 'card',
      card: card.value,
      billing_details: { name: props.user }
    });
    paymentMethod = result.paymentMethod;
    pmError = result.error;
  } catch (err) {
    showNotification(t('errors.unexpectedError'));
    isLoading.value = false;
    return;
  }
  if (pmError || !paymentMethod) {
    showNotification(pmError?.message || t('renew.paymentMethodError'));
    isLoading.value = false;
    return;
  }
  try {
    const response = await fetch('/api/renew-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify({
        user: props.user,
        payment_method_id: paymentMethod.id,
        duration: selectedDuration.value,
        country: selectedCountry.value,
        vat: (countries.value.find(c => c.code === selectedCountry.value)?.vat || 0),
        total: calculateTotalPriceCents(),
      }),
    });
    let result;
    try {
      result = await response.json();
    } catch (jsonErr) {
      showNotification(t('renew.serverError'));
      isLoading.value = false;
      return;
    }
    if (response.ok && result.success) {
      showNotification(t('renew.success'));
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } else {
      showNotification(result.message || t('renew.failed'));
    }
  } catch (error) {
    showNotification(t('renew.networkError'));
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(24, 25, 38, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}

.modal-content {
  position: relative;
  background: var(--base2);
  color: var(--text1);
  border-radius: 18px;
  padding: 36px 32px 28px 32px;
  min-width: 340px;
  box-shadow: 0 8px 32px 0 rgba(0,0,0,0.18), 0 1.5px 8px 0 var(--accent4);
  display: flex;
  flex-direction: column;
  gap: 18px;
  animation: popup-in 0.18s cubic-bezier(.4,1.4,.6,1) backwards;
}

@keyframes popup-in {
  from { transform: translateY(30px) scale(0.98); opacity: 0; }
  to   { transform: none; opacity: 1; }
}

.close-x {
  position: absolute;
  top: 18px;
  right: 18px;
  background: none;
  border: none;
  color: var(--text2);
  font-size: 1.7rem;
  cursor: pointer;
  transition: color 0.15s;
  line-height: 1;
  padding: 0;
}
.close-x:hover {
  color: var(--accent1);
}

h2 {
  margin: 0 0 12px 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--accent1);
  letter-spacing: 0.01em;
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

/* Consistent input and label styling */
.input-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-size: 1rem;
  color: var(--text2);
  font-weight: 500;
  letter-spacing: 0.01em;
}

input, select {
  padding: 10px 12px;
  border-radius: 7px;
  border: 1.5px solid var(--base3);
  background: var(--base1);
  color: var(--text1);
  font-size: 1.08rem;
  outline: none;
  transition: border-color 0.18s;
}
input:focus, select:focus {
  border-color: var(--accent1);
  background: var(--base4);
}

/* Duration and country select styling */
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
  background-color: var(--base2);
  color: var(--text2);
  border-radius: 7px;
  padding: 10px 18px;
  cursor: pointer;
  transition: all 0.18s;
  text-align: center;
  flex: 1;
  min-width: 80px;
  border: 1.5px solid var(--base3);
  font-weight: 600;
}
.duration-option:hover {
  background-color: var(--base3);
}
.duration-option.selected-duration {
  background-color: var(--accent1);
  color: var(--text3);
  border-color: var(--accent1);
}

.subscription-section {
  background-color: var(--base1);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.total-price {
  margin-top: 30px;
  text-align: right;
  padding: 10px 0 0 0;
  border-top: 1px solid var(--base2);
}
.total-price p {
  font-size: 18px;
  color: var(--text2);
}
.total-price span {
  font-size: 22px;
  color: var(--accent1);
  font-weight: 700;
  margin-left: 8px;
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
  background: var(--base2);
  color: var(--text1);
  border-radius: 7px;
  padding: 10px 12px;
  border: 1.5px solid var(--base3);
  font-size: 0.98rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 10px;
  transition: border-color 0.18s;
}
.country-select .dropdown-selected:focus {
  border-color: var(--accent1);
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
  background: var(--base2);
  border: 1.5px solid var(--base3);
  border-radius: 7px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  z-index: 10;
  max-height: 150px;
  overflow-y: auto;
}
.country-select .dropdown-item {
  padding: 10px 12px;
  color: var(--text1);
  text-align: left;
  cursor: pointer;
  font-size: 0.98rem;
  border-radius: 7px;
  transition: background 0.18s, color 0.18s;
}
.country-select .dropdown-item:hover {
  background: var(--accent1);
  color: var(--text4);
}

button.userbtn {
  background: var(--accent1);
  color: var(--text3);
  border: none;
  border-radius: 7px;
  padding: 10px 24px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.18s;
  margin-top: 18px;
}
button.userbtn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
button.userbtn:hover:not(:disabled) {
  background: var(--accent2);
}

</style>
