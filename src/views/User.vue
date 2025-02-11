<template>
  <Header />
  <div id="main">
    <div class="sidebar">
      <h1>Welcome, {{ user }}</h1>
      <h2>{{ expirationDays !== null ? expirationDays + ' subscription days remaining' : 'Loading...' }}</h2>
      <div class="menu selected" @click="selectMenu($event, 0)">
        <img src="@/assets/icons/username2.png" alt="Icon" class="icon">Account Settings
      </div>
      <div class="menu" @click="selectMenu($event, 1)">
        <img src="@/assets/icons/payment.png" alt="Icon" class="icon">Payment / Subscription
      </div>
      <button class="settingsbtn" @click="LogOut()">Log Out</button>
    </div>
    <div class="content">
      <div v-if="selectedIndex === 0">
        <div style="margin-bottom: 30px; border-bottom: 3px #262435 solid; padding-bottom: 25px;">
          <h2 style="display: flex; align-items: center; justify-content: center;">
            <img src="@/assets/icons/username2.png" alt="Icon" class="icon2">
      Change Username
    </h2>
        <p>Type new Username</p>
        <div style="display: flex; justify-content: center;">
  <input class="userinput" type="text" maxlength="25" v-model="newUsername" :class="{ 'error-input': usernameError }" />
</div>
<div style="display: flex; justify-content: center;"> 
  <p v-if="usernameError" class="error-text">{{ usernameErrorMessage }}</p>
  <p v-if="usernameSuccess" class="success-text">{{ usernameSuccessMessage }}</p>
</div>
<br>
<button class="userbtn" @click="changeUsername()">Change Username</button>
</div>
<div>
  <div style="margin-bottom: 30px; border-bottom: 3px #262435 solid; padding-bottom: 25px;">
    <h2 style="display: flex; align-items: center; justify-content: center;">
            <img src="@/assets/icons/password2.png" alt="Icon" class="icon2">
      Change Password
    </h2>
  <div style="display: flex; justify-content: center; ">
  <div style="margin-right: 3px;"><p>Type Old Password</p>
    <div style="position: relative;">
  <input 
    class="userinput"
    :type="showOldPassword ? 'text' : 'password'"
    v-model="oldPassword"
    :class="{ 'error-input': oldPasswordError }"
  />
  <button 
    @click="showOldPassword = !showOldPassword" 
    type="button"
    class="password-toggle"
  >
    {{ showOldPassword ? 'Hide' : 'Show' }}
  </button>
</div>
</div>
  <div style="margin-right: 3px;" ><p>Type New Password</p>
    <div style="position: relative;">
  <input 
    class="userinput"
    :type="showNewPassword ? 'text' : 'password'"
    v-model="newPassword"
    :class="{ 'error-input': newPasswordError }"
  />
  <button 
    @click="showNewPassword = !showNewPassword" 
    type="button"
    class="password-toggle"
  >
    {{ showNewPassword ? 'Hide' : 'Show' }}
  </button>
</div></div>
    <div style="margin-right: 3px;" ><p>Confirm New Password</p>
      <div style="position: relative;">
  <input 
    class="userinput"
    :type="showConfirmPassword ? 'text' : 'password'"
    v-model="confirmPassword"
    :class="{ 'error-input': confirmPasswordError }"
  />
  <button 
    @click="showConfirmPassword = !showConfirmPassword" 
    type="button"
    class="password-toggle"
  >
    {{ showConfirmPassword ? 'Hide' : 'Show' }}
  </button>
</div></div>
</div>
<div style="display: flex; justify-content: center; ">
  <p v-if="confirmPasswordError" class="error-text">Password doesn't match</p>
  <p v-if="passwordSuccess" class="success-text">Password changed successfully!</p>
  <p v-if="oldPasswordError" class="error-text">Password is incorrect</p>
</div>
<br>
<button class="userbtn" @click="changePassword()">Change Password</button>
</div>
</div>
<div>
  <div style="margin-bottom: 30px; border-bottom: 3px #262435 solid; padding-bottom: 25px;">
    <h2 style="display: flex; align-items: center; justify-content: center;">
            <img src="@/assets/icons/forgot.png" alt="Icon" class="icon2">
     Recovery / Authentication Key
    </h2>
         <br>
         <div style="position: relative;">
          <p>To generate a new recovery key, type your password</p>
  <input 
    class="userinput"
    :type="showPswauth ? 'text' : 'password'"
    v-model="Pswauth"
  />
  <button 
    @click="showPswauth = !showPswauth" 
    type="button"
    class="password-toggle3"
  >
    {{ showPswauth ? 'Hide' : 'Show' }}
  </button>
</div>
<div style="display: flex; justify-content: center; ">
     <p v-if="keyError" class="error-text">{{ keyErrorMessage }}</p>
  <p v-if="keySuccess" class="success-text">{{ keySuccessMessage }}</p>
  </div>
<br>
<div>
  <button class="userbtn" @click="GenerateNewKey()">Generate New Key</button>
</div>

      </div>
  <div style="margin-bottom: 30px; border-bottom: 3px #262435 solid; padding-bottom: 25px;">
    <h2 style="display: flex; align-items: center; justify-content: center;">
            <img src="@/assets/icons/delete-account.png" alt="Icon" class="icon2">
      Delete Account
    </h2>
         <p>To delete your account, type your Password</p>
         <div style="position: relative;">
  <input 
    class="userinput"
    :type="showPswDelete ? 'text' : 'password'"
    v-model="PswDelete"
  />
  <button 
    @click="showPswDelete = !showPswDelete" 
    type="button"
    class="password-toggle2"
  >
    {{ showPswDelete ? 'Hide' : 'Show' }}
  </button>
</div>
         <p>By proceeding with the deletion of your account, you acknowledge and understand that this action is irreversible. Once your account is deleted, you will permanently lose access to your account and all associated data, including but not limited to personal information, settings, and any content you have created or stored.

Please be aware that we will not be able to recover any data or restore your account after it has been deleted. If you have any doubts or wish to retain your data, we strongly encourage you to reconsider before proceeding with the deletion.

Thank you for your understanding.</p>
         <br>
         <button class="userbtn" @click="deleteAccount()">Delete Account</button>
      </div>
    </div>
</div>
      <div v-if="selectedIndex === 1">
        <div style="margin-bottom: 30px; border-bottom: 3px #262435 solid; padding-bottom: 25px;">
        <h2>Select a Subscription Plan</h2>
    <div class="subscription-form">
      <div 
      class="sub-option" 
      :class="{ selected: selectedOption === 1 }"
      @click="selectOption(1)"
    >
      <h3 class="offer">1 Month</h3>
      <p class="price">5.99€ + VAT</p>
    </div>
    <div 
      class="sub-option" 
      :class="{ selected: selectedOption === 2 }"
      @click="selectOption(2)"
    >
      <h3 class="offer">4 Months</h3>
      <p class="price">23.99€ + VAT</p>
    </div>
    <div 
  class="sub-option-disabled" 
>
  <div class="coming-soon-banner">Available Soon</div>
  <h3 class="offer">6 Months</h3>
  <p class="price">35.99€ + VAT</p>
</div>
<div 
  class="sub-option-disabled" 
>
  <div class="coming-soon-banner">Available Soon</div>
  <h3 class="offer">1 Year</h3>
  <p class="price">71.99€ + VAT</p>
</div>
</div>
    <h2>Select a payment method</h2>
    <div class="payment-form">
    <div class="pay-option">
      <div class="square" :class="{ selected: selectedpay === 1 }" @click="selectPaymentMethod('credit-card'), selectPay(1)">
        <img class="icon" src="@/assets/icons/credit-card.png" alt="credit-card"> 
        <p>Credit Card</p>
    </div>
        <div class="square" :class="{ selected: selectedpay === 2 }" @click="selectPaymentMethod('crypto - Bitcoin'), selectPay(2)">
        <img class="icon" src="@/assets/icons/bitcoin.png" alt="bitcoin"> 
        <p>Bitcoin</p>
        </div>
        <div class="square" :class="{ selected: selectedpay === 3 }" @click="selectPaymentMethod('crypto - Ethereum'), selectPay(3)">
        <img class="icon" src="@/assets/icons/ethereum.png" alt="ethereum"> 
        <p>Ethereum</p>
        </div>
        <div class="square" :class="{ selected: selectedpay === 4 }" @click="selectPaymentMethod('crypto - Monero'), selectPay(4)">
        <img class="icon" src="@/assets/icons/monero.png" alt="monero"> 
        <p>Monero</p>
        </div>
        <div v-if="selectedpay === 1" class="card-element-container">
      <div id="card-element"></div>
      <div id="card-errors" role="alert"></div>
        </div>
    </div>
    <br><br>
    <button class="userbtn" @click="Renew()">Renew Subscription</button>
    </div>
        </div>
        <div>
          <h2>Receipts</h2>
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
  <div style="background-color: #262435; padding: 3px;" v-if="receipts.length === 0"><p>No receipts found</p></div>
  <div v-else>
    <div v-for="receipt in receipts" :key="receipt._id" class="receipt-item">
  <p style="flex:1; text-align: center;">{{ formatDate(receipt.Date) }}</p>
  <p style="flex:1; text-align: center;">{{ (receipt.Amount) / 100 }}€</p>
  <p style="flex:1; text-align: center;">{{ receipt.Method }}</p>
  <p style="flex:1; text-align: center;">{{ formatSubscription(receipt.Subscription) }}</p>
  <div style="flex:1;"><button @click="Download(receipt)" class="downloadbtn"> <img src="@/assets/icons/download.png" alt="Download" class="icon3"></button></div>
</div>
  </div>
</div>
        </div>
      </div>
    </div>
  </div>
  <Footer />
</template>

<script setup>
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import {ref, onMounted} from 'vue';
import { jsPDF } from "jspdf";
import owlImage from '@/assets/icons/owl3.png';

const store = useStore();
const user = store.getters.getUser;
const apiKey = import.meta.env.VITE_EREUNA_KEY;

const router = useRouter();

async function LogOut() {
    try {
        localStorage.clear();
        router.push({ name: 'Login' });
        setTimeout(function() {
                location.reload();
            }, 100);
    } catch (error) {
        console.error('Error logging out:', error);
    }
}

let selectedIndex = ref(0);

function selectMenu(event, index) {
  const menus = document.querySelectorAll('.menu');
  menus.forEach((menu, i) => {
    if (i === index) {
      menu.classList.add('selected');
    } else {
      menu.classList.remove('selected');
    }
  });
  selectedIndex.value = index;
}

let oldPassword = ref('');
let newPassword = ref('');
let confirmPassword = ref('');
let oldPasswordError = ref(false);
let newPasswordError = ref(false);
let confirmPasswordError = ref(false);
let passwordSuccess = ref(false);
const showOldPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);
const showPswDelete = ref(false);
const showPswauth = ref(false);

async function changePassword() {
  oldPasswordError.value = false;
  newPasswordError.value = false;
  confirmPasswordError.value = false;
  passwordSuccess.value = false;

  if (oldPassword.value === '') {
    oldPasswordError.value = true;
    return;
  }

  if (newPassword.value === '') {
    newPasswordError.value = true;
    return;
  }

  if (confirmPassword.value !== newPassword.value) {
    confirmPasswordError.value = true;
    return;
  }

  try {
    const response = await fetch(`/api/password-change/${apiKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: oldPassword.value, newPassword: newPassword.value, user: user }),
    });

    const data = await response.json();

    if (data.confirm) {
      passwordSuccess.value = true;
      // Password changed successfully
      console.log('Password changed successfully');
    } else if (data.error === 'old_password_incorrect') {
      oldPasswordError.value = true;
    } else {
      console.error('Error changing password:', data.error);
    }
  } catch (error) {
    console.error('Error changing password:', error);
  }
}

let newUsername = ref('');
let usernameError = ref(false);
let usernameErrorMessage = ref('');
let usernameSuccess = ref(false);
let usernameSuccessMessage = ref('');

async function changeUsername() {
  usernameError.value = false;
  usernameErrorMessage.value = '';
  usernameSuccess.value = false;
  usernameSuccessMessage.value = '';

  if (newUsername.value === '') {
    usernameError.value = true;
    usernameErrorMessage.value = 'Please enter a new username';
    return;
  }

  if (newUsername.value === user) {
    usernameError.value = true;
    usernameErrorMessage.value = 'Current username and new username cannot be the same';
    return;
  }

  try {
    const response = await fetch(`/api/change-username/${apiKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newUsername: newUsername.value, user: user }),
    });

    const data = await response.json();

    if (data.error === 'username_taken') {
      usernameError.value = true;
      usernameErrorMessage.value = 'Username already taken';
    } else if (data.error === 'current username and new username cannot be the same') {
      usernameError.value = true;
      usernameErrorMessage.value = 'Current username and new username cannot be the same';
    } else if (data.confirm) {
      // Username changed successfully
      console.log('Username changed successfully');
      usernameSuccess.value = true;
      usernameSuccessMessage.value = 'Username changed successfully!';
      setTimeout(() => {
        LogOut();
      }, 3000);
    } else {
      console.error('Error changing username:', data.error);
    }
  } catch (error) {
    console.error('Error changing username:', error);
  }
}

let PswDelete = ref('');
let deleteError = ref(false);
let deleteErrorMessage = ref('');

async function deleteAccount() {
  deleteError.value = false;
  deleteErrorMessage.value = '';

  if (PswDelete.value === '') {
    deleteError.value = true;
    deleteErrorMessage.value = 'Please enter your password';
    return;
  }

  try {
    const response = await fetch(`/api/account-delete/${apiKey}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: user, password: PswDelete.value }),
    });

    const data = await response.json();

    if (data.error === 'password_incorrect') {
      deleteError.value = true;
      deleteErrorMessage.value = 'Password is incorrect';
    } else if (data.confirm) {
      // Account deleted successfully
      console.log('Account deleted successfully');
      await LogOut(); // Call LogOut function after successful deletion
    } else {
      console.error('Error deleting account:', data.error);
    }
  } catch (error) {
    console.error('Error deleting account:', error);
  }
}

const keyError = ref(false);
const keyErrorMessage = ref('');
const keySuccess = ref(false);
const keySuccessMessage = ref('');
const Pswauth = ref('');

async function GenerateNewKey() {
  // Reset states
  keyError.value = false;
  keyErrorMessage.value = '';
  keySuccess.value = false;
  keySuccessMessage.value = '';

  // Validate password input
  if (!Pswauth.value.trim()) {
    keyError.value = true;
    keyErrorMessage.value = 'Please enter your password';
    return;
  }

  try {
    // Call the generate-key endpoint
    const response = await fetch(`/api/generate-key/${apiKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        user: user, // Use .value if user is a ref
        password: Pswauth.value // Send the password
      }),
    });

    const data = await response.json();

    if (response.ok) {
      if (data.confirm) {
        // Key generation successful
        keySuccess.value = true;
        keySuccessMessage.value = 'New key generated successfully!';

        // Trigger download of the raw key
        const rawAuthKey = data.rawAuthKey; // Raw key returned from the endpoint
        if (rawAuthKey) {
          // Create and trigger file download
          const blob = new Blob([rawAuthKey], { type: 'text/plain' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `${user}_recovery_key.txt`; // Use the username for the filename
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
        }

        // Clear password
        Pswauth.value = '';
      } else {
        // Handle unexpected response
        keyError.value = true;
        keyErrorMessage.value = 'An unexpected error occurred';
      }
    } else {
      // Handle API errors
      keyError.value = true;
      keyErrorMessage.value = data.message || 'An error occurred';
    }
  } catch (error) {
    console.error('Error generating new key:', error);
    keyError.value = true;
    keyErrorMessage.value = 'Network error. Please try again.';
  }
}

// Create a ref to store the expiration days
const expirationDays = ref(null);

// Create a function to get the expiration date
async function getExpirationDate() {
  try {
    const response = await fetch(`/api/get-expiration-date?user=${encodeURIComponent(user)}/${apiKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error retrieving expiration date:', errorData.error);
      expirationDays.value = 'Error retrieving expiration date';
      return;
    }

    const data = await response.json();

    if (data.expirationDays !== undefined) {
      expirationDays.value = data.expirationDays; // Set the number of days remaining
    } else {
      console.error('Unexpected response format:', data);
      expirationDays.value = 'Unexpected response format';
    }
  } catch (error) {
    console.error('Error retrieving expiration date:', error);
    expirationDays.value = 'Error retrieving expiration date';
  }
}

let selectedOption = ref(1);
let selectedpay = ref();
const selectedPaymentMethod = ref('');

function selectOption(option) {
  selectedOption.value = option;
}

function selectPay(option) {
  selectedpay.value = option;
}

function selectPaymentMethod(method) {
  selectedPaymentMethod.value = method;
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
    const response = await fetch(`/api/get-receipts/${user}/${apiKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch receipts');
    }

    const data = await response.json();
    receipts.value = data.receipts;
  } catch (error) {
    error.value = 'Failed to load receipts';
    console.error(error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  getExpirationDate();
  GetReceipts();
});

async function Renew(){
  await GetReceipts(); // keep this line to dynamically update receipts 
}

function formatDate(bsonDate) {
  const date = new Date(bsonDate);
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
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

const Download = async (receipt) => {
  const doc = new jsPDF();

  // Get the document width
  const pageWidth = doc.internal.pageSize.getWidth();

  // Add the owl image
  try {
    // Adjust image dimensions as needed
    const imgWidth = 25; // Adjust this value to resize the image
    const imgHeight = 25; // Adjust this value to resize the image
    
    // Calculate x position to center the image
    const imgX = (pageWidth - imgWidth) / 2;
    
    doc.addImage(owlImage, 'PNG', imgX, 20, imgWidth, imgHeight);

    // Set text color to the specified RGB for title
    doc.setTextColor(140, 141, 254);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);

    // Calculate x position to center the title
    const title = "Receipt";
    const titleWidth = doc.getTextDimensions(title).w;
    const titleX = (pageWidth - titleWidth) / 2;

    // Place the title centered below the image
    doc.text(title, titleX, 80);

    // Set text color to black for receipt details
    doc.setTextColor(0, 0, 0);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(12);

    // Prepare receipt details
    const details = [
      `Payment Date: ${formatDate(receipt.Date)}`,
      `Amount: ${(receipt.Amount) / 100}€`,
      `Paid with: ${receipt.Method}`,
      `Subscription Plan: ${formatSubscription(receipt.Subscription)}`
    ];

    // Place each detail centered
    details.forEach((detail, index) => {
      const detailWidth = doc.getTextDimensions(detail).w;
      const detailX = (pageWidth - detailWidth) / 2;
      doc.text(detail, detailX, 100 + (index * 10));
    });

    // Save the PDF
    doc.save(`receipt_${receipt._id}.pdf`);

  } catch (error) {
    console.error("Error adding image to PDF:", error);
  }
};

</script>

<style scoped>
#main {
  display: flex;
  flex-direction: row;
  height: 100vh; 
  overflow: hidden;
  width: 100% ;
  min-width: 1250px;
}

.sidebar {
  display: flex;
  flex-direction: column;
  width: 20%;
  padding: 20px;
  background-color: #2c2b3e;
  overflow-y: auto; 
}

.content {
  display: flex;
  flex-direction: column;
  width: 80%;
  background-color: #1b1a26;
  padding: 20px;
  text-align: center;
  overflow-y: auto; 
}

h1 {
  color: #b3b3b3;
  font-size: 30px;
  margin-bottom: 0;
}

h2 {
  color: rgb(179, 179, 179);
  font-size: 15px;
}

.settingsbtn {
  background-color: transparent;
    border: solid 2px #8c8dfe; /* Border color */
    color: #f5f5f5; /* Text color */
    padding: 10px 20px; /* Increased padding for a better size */
    margin-top: 15px;
    border-radius: 5px; /* Rounded corners */
    font-size: 12px; /* Font size */
    font-weight: 500; /* Slightly bolder text */
    text-align: center; /* Center text */
    transition: all 0.3s ease; /* Smooth transition for hover effects */
    cursor: pointer; /* Pointer cursor on hover */
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Subtle shadow for depth */
}

.settingsbtn:hover {
  background-color: #8c8dfe; /* Background color on hover */
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2); /* Enhanced shadow on hover */
}



.menu{
  margin-top: 5px;
  display: flex;
  align-items: center;
  width: 100%;
  background-color: #262435;
  padding: 10px;
  color: whitesmoke;
  font-size: 15px;
  cursor: pointer;
}

.menu:hover{
  cursor: pointer;
  background-color: #1f1d2b;
}

.menu.selected {
  background-color: #1b1a26;
}

.icon {
  width: 20px;
  height: 20px;
  margin-right: 10px;
}

.icon2 {
  width: 15px;
  height: 15px;
}

.icon3 {
  width: 15px;
  height: 15px;
}

p{
  color: whitesmoke;
}

.error-input {
  border: 1px solid red;
}

.error-text {
  color: red;
  border: 1px solid red;
  font-size: 12px;
  margin-bottom: 10px;
  padding: 4px;
}

.success-text {
  color: green;
  border: 1px solid green;
  font-size: 12px;
  margin-bottom: 10px;
  padding: 4px;
}

.userbtn {
    background-color: transparent;
    border: solid 2px #8c8dfe; /* Border color */
    color: #f5f5f5; /* Text color */
    padding: 5px 10px; /* Increased padding for a better size */
    margin: 5px;
    border-radius: 5px; /* Rounded corners */
    font-size: 12px; /* Font size */
    font-weight: 500; /* Slightly bolder text */
    text-align: center; /* Center text */
    transition: all 0.3s ease; /* Smooth transition for hover effects */
    cursor: pointer; /* Pointer cursor on hover */
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Subtle shadow for depth */
}

.userbtn:hover {
    background-color: #8c8dfe; /* Background color on hover */
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2); /* Enhanced shadow on hover */
}

.userinput{
 outline: none;
 padding: 4px;
 border: solid 1px white;
}

.userinput:focus{
 border-color: #8c8dfe;
}

.title{
 margin:0;
 padding: 0;
}

.payment-form, .subscription-form{
    text-align: center;
    align-items: center;
    align-self: center;
    padding: 10px;
    margin: 10px;
    border: none;
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
    color: #f5f5f5;
}

.square:hover{
    opacity: 1;
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
  color: #f5f5f5;
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
  color: #f5f5f5;
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

p{
  color: #f5f5f5;
}

.price{
  font-size: 12px;
  margin: 2px;
}

.offer{
  font-size: 18px;
  margin: 2px;
}

.receipts {
  padding: 20px;
}

.receipt-item {
  background-color: #262435; 
  padding: 3px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.receipt-header {
  background-color: #322f45; 
  padding: 3px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.receipt-item p {
  margin: 5px 0;
}

.downloadbtn{
  background-color: transparent; 
  border: none;
  opacity: 0.60;
}

.downloadbtn:hover{
  cursor: pointer;
  opacity: 1;
}

.password-toggle {
  position: absolute;
  right: -1%;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 10px;
  color: black;
  opacity: 0.60;
}

.password-toggle2 {
  position: absolute;
  left: 52.5%;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 10px;
  color: black;
  opacity: 0.60;
}

.password-toggle3 {
  position: absolute;
  left: 52.5%;
  top: 75%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 10px;
  color: black;
  opacity: 0.60;
}


</style>