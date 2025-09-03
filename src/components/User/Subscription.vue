<template>
  <div style="margin-bottom: 30px; border-bottom: 3px #262435 solid; padding-bottom: 25px;">
    <h1>Subscription Status</h1>
    <div class="subscription-meter">
      <div class="meter-labels">
        <span><strong>Username:</strong> {{ user }}</span>
        <span><strong>Subscription Days left:</strong> {{ expirationDays !== null ? expirationDays : 'Loading...' }}</span>
        <span><strong>Money left:</strong> {{ ((14.99 / 30) * expirationDays).toFixed(2) }}€</span>
      </div>
      <div class="subscription-actions" style="margin-top: 18px;">
        <button class="userbtn">Renew</button>
        <button class="userbtn refund-btn">Ask for Refund</button>
      </div>
    </div>
    <h1>Receipts</h1>
    <div class="receipts">
      <div class="receipt-header">
        <p style="flex:1; font-weight: bold;">Payment Date</p>
        <p style="flex:1; font-weight: bold;">Amount</p>
        <p style="flex:1; font-weight: bold;">Paid with</p>
        <p style="flex:1; font-weight: bold;">Subscription Plan</p>
        <p style="flex:1; font-weight: bold;">Download</p>
      </div>
      <div v-if="loading">Loading receipts...</div>
      <div style="background-color: #262435; padding: 3px;" v-else-if="error">{{ error }}</div>
      <div style="background-color: #262435; padding: 3px;" v-if="receipts.length === 0">
        <p>No receipts found</p>
      </div>
      <div v-else>
        <div v-for="receipt in receipts" :key="receipt._id" class="receipt-item">
          <p style="flex:1; text-align: center;">{{ formatDate(receipt.Date) }}</p>
          <p style="flex:1; text-align: center;">{{ (receipt.Amount) / 100 }}€</p>
          <p style="flex:1; text-align: center;">{{ receipt.Method }}</p>
          <p style="flex:1; text-align: center;">{{ formatSubscription(receipt.Subscription) }}</p>
          <div style="flex:1;"><button class="downloadbtn">
              <svg class="icon3" viewBox="0 0 24.00 24.00" fill="var(--text3)" xmlns="http://www.w3.org/2000/svg"
                stroke="var(--text3)" stroke-width="0.696">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                    d="M12.5535 16.5061C12.4114 16.6615 12.2106 16.75 12 16.75C11.7894 16.75 11.5886 16.6615 11.4465 16.5061L7.44648 12.1311C7.16698 11.8254 7.18822 11.351 7.49392 11.0715C7.79963 10.792 8.27402 10.8132 8.55352 11.1189L11.25 14.0682V3C11.25 2.58579 11.5858 2.25 12 2.25C12.4142 2.25 12.75 2.58579 12.75 3V14.0682L15.4465 11.1189C15.726 10.8132 16.2004 10.792 16.5061 11.0715C16.8118 11.351 16.833 11.8254 16.5535 12.1311L12.5535 16.5061Z"
                    fill="var(--text3)"></path>
                  <path
                    d="M3.75 15C3.75 14.5858 3.41422 14.25 3 14.25C2.58579 14.25 2.25 14.5858 2.25 15V15.0549C2.24998 16.4225 2.24996 17.5248 2.36652 18.3918C2.48754 19.2919 2.74643 20.0497 3.34835 20.6516C3.95027 21.2536 4.70814 21.5125 5.60825 21.6335C6.47522 21.75 7.57754 21.75 8.94513 21.75H15.0549C16.4225 21.75 17.5248 21.75 18.3918 21.6335C19.2919 21.5125 20.0497 21.2536 20.6517 20.6516C21.2536 20.0497 21.5125 19.2919 21.6335 18.3918C21.75 17.5248 21.75 16.4225 21.75 15.0549V15C21.75 14.5858 21.4142 14.25 21 14.25C20.5858 14.25 20.25 14.5858 20.25 15C20.25 16.4354 20.2484 17.4365 20.1469 18.1919C20.0482 18.9257 19.8678 19.3142 19.591 19.591C19.3142 19.8678 18.9257 20.0482 18.1919 20.1469C17.4365 20.2484 16.4354 20.25 15 20.25H9C7.56459 20.25 6.56347 20.2484 5.80812 20.1469C5.07435 20.0482 4.68577 19.8678 4.40901 19.591C4.13225 19.3142 3.9518 18.9257 3.85315 18.1919C3.75159 17.4365 3.75 16.4354 3.75 15Z"
                    fill="var(--text3)"></path>
                </g>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div style="height: 100px"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  user: {
    type: String,
    required: true
  },
  apiKey: {
    type: String,
    required: true
  },
  formatDate: {
    type: Function,
    required: true
  }
});

// Create a ref to store the expiration days
const expirationDays = ref(null);

// Create a function to get the expiration date
async function getExpirationDate() {
  try {
    const response = await fetch(`/api/get-expiration-date/?user=${encodeURIComponent(props.user)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      expirationDays.value = 'Error retrieving expiration date';
      return;
    }

    const data = await response.json();

    if (data.expirationDays !== undefined) {
      expirationDays.value = data.expirationDays; // Set the number of days remaining
    } else {
      expirationDays.value = 'Unexpected response format';
    }
  } catch (error) {
    error.value = error.message;
    expirationDays.value = 'Error retrieving expiration date';
  }
}

let selectedOption = ref(1);
let selectedpay = ref();

function selectOption(option) {
  selectedOption.value = option;
}

function selectPay(option) {
  selectedpay.value = option;
}

onMounted(() => {
  selectOption(1); // Set default subscription option
  selectPay(4);
});

// Add this with the other refs at the top of the script
const receipts = ref([]);
const loading = ref(false);
const error = ref(null);

// Add this function in the script section
async function GetReceipts() {
  loading.value = true;
  error.value = null;
  try {
    const response = await fetch(`/api/get-receipts/${props.user}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch receipts');
    }

    const data = await response.json();
    receipts.value = data.receipts;
  } catch (error) {
    error.value = error.message;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  getExpirationDate();
  GetReceipts();
});

async function Renew() {
  await GetReceipts(); // keep this line to dynamically update receipts 
}

function formatSubscription(subscriptionValue) {
  const subscriptionMap = {
    1: '1 Month',
    2: '4 Months',
    3: '6 Months',
    4: '1 Year'
  };
  return subscriptionMap[subscriptionValue] || 'Unknown';
}

</script>

<style scoped>

.payment-form,
.subscription-form {
  text-align: center;
  align-items: center;
  align-self: center;
  padding: 10px;
  margin: 10px;
  border: none;
}

.subscription-meter {
  margin-bottom: 25px;
  background: var(--base2);
  border-radius: 8px;
  padding: 18px 10px 10px 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.meter-labels {
  display: flex;
  gap: 30px;
  margin-bottom: 10px;
  margin-left: 10px;
  flex-wrap: wrap;
}

.meter-labels span, .meter-labels strong{
  font-size: 1.3rem;
}

.meter-bar-container {
  display: flex;
  align-items: center;
  margin-top: 5px;
}

.subscription-actions {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}

.receipts {
  padding: 20px;
  background: var(--base2);
  border-radius: 10px;
  margin-top: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

h1 {
  font-size: 2rem;
}

.receipt-header {
  background-color: var(--base1);
  padding: 10px 3px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  border-radius: 8px;
  font-size: 15px;
  color: var(--accent1);
  font-weight: bold;
  letter-spacing: 0.5px;
}

.receipt-item {
  background-color: var(--base2);
  padding: 10px 3px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(140,141,254,0.05);
  transition: background 0.2s;
}

.receipt-item:hover {
  background: var(--base3);
}

.receipt-item p {
  margin: 0;
  font-size: 14px;
  color: var(--text1);
  text-align: center;
}

.downloadbtn {
  background-color: var(--accent1);
  border: none;
  border-radius: 5px;
  padding: 6px 10px;
  color: var(--text1);
  opacity: 0.85;
  transition: background 0.2s, opacity 0.2s;
  cursor: pointer;
  display: flex;
}

.downloadbtn:hover {
  background: var(--accent2);
  opacity: 1;
}

.userbtn.refund-btn {
  background: var(--negative);
  color: var(--text3);
}
.userbtn.refund-btn:hover {
  background: var(--negative);
}

.userbtn {
  background-color: var(--accent1);
  color: var(--text3);
  border-radius: 5px;
  border: none;
  outline: none;
  padding: 10px;
  margin: 5px;
  font-weight: bold;
  width: 150px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.userbtn:disabled , .userbtn:disabled:hover {
  cursor: not-allowed;
  background-color: var(--base3);
}

.userbtn:hover {
  background-color: var(--accent2);
}

.icon3 {
  width: 15px;
  height: 15px;
}

</style>