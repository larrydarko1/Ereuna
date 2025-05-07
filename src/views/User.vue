<template>
  <Header />
  <div id="main">
    <div class="sidebar">
      <div class="inner">
         <div class="user-wrapper">
        <h1 class="user">{{ user }}</h1>
      <h2 class="subscription-remaining">{{ expirationDays !== null ? expirationDays + ' subscription days remaining' : 'Loading...' }}</h2> 
      </div>
      <div class="menu-wrapper">
        <div class="menu selected" @click="selectMenu($event, 0)">
        <img src="@/assets/icons/username2.png" alt="Icon" class="icon">Account Settings
      </div>
      <div class="menu" @click="selectMenu($event, 1)">
        <img src="@/assets/icons/payment.png" alt="Icon" class="icon">Subscription
      </div>
      <div class="menu" @click="selectMenu($event, 2)">
        <img src="@/assets/icons/password2.png" alt="Icon" class="icon">Security / 2FA
      </div>
      </div>
      </div>
    </div>
    <div class="content">
      <div v-if="selectedIndex === 0">
        <div>
        <div class="userdiv">
          <h2 style="display: flex; align-items: center; justify-content: center;">
            <img src="@/assets/icons/username2.png" alt="Icon" style="width:15px; height: 15px; margin-right: 7px;">
      Change Username
    </h2>
        <div style="display: flex; justify-content: center;">
  <input class="userinput" type="text" maxlength="25" placeholder="Type New Username" v-model="newUsername" :class="{ 'error-input': usernameError }" />
</div>
<div style="display: flex; justify-content: center;"> 
  <p v-if="usernameError" class="error-text">{{ usernameErrorMessage }}</p>
  <p v-if="usernameSuccess" class="success-text">{{ usernameSuccessMessage }}</p>
</div>
<br>
<button class="userbtn" @click="changeUsername()">Change Username</button>
</div>
</div>
<div>
  <div class="userdiv">
    <h2 style="display: flex; align-items: center; justify-content: center;">
            <img src="@/assets/icons/password2.png" alt="Icon" style="width:15px; height: 15px; margin-right: 7px;">
      Change Password
    </h2>
  <div style="display: flex; justify-content: center; ">
  <div style="margin-right: 3px;">
    <div style="position: relative;">
  <input 
    class="userinput" placeholder="Type Old Password"
    :type="showOldPassword ? 'text' : 'password'"
    v-model="oldPassword"
    :class="{ 'error-input': oldPasswordError }"
  />
  <button 
    @click="showOldPassword = !showOldPassword" 
    type="button"
    class="password-toggle"
  >
    <img class="toggle-icon"
      :src="showOldPassword ? hideIcon : showIcon" 
      alt="Toggle Password Visibility"
    />
  </button>
</div>
</div>
  <div style="margin-right: 3px;" >
    <div style="position: relative;">
  <input 
    class="userinput"
    :type="showNewPassword ? 'text' : 'password'" placeholder="Type New Password"
    v-model="newPassword"
    :class="{ 'error-input': newPasswordError }"
  />
  <button 
    @click="showNewPassword = !showNewPassword" 
    type="button"
    class="password-toggle"
  >
    <img class="toggle-icon"
      :src="showNewPassword ? hideIcon : showIcon" 
      alt="Toggle Password Visibility"
    />
  </button>
</div>
</div>
    <div style="margin-right: 3px;" >
      <div style="position: relative;">
  <input 
    class="userinput"
    :type="showConfirmPassword ? 'text' : 'password'" placeholder="Confirm New Password"
    v-model="confirmPassword"
    :class="{ 'error-input': confirmPasswordError }"
  />
  <button 
    @click="showConfirmPassword = !showConfirmPassword" 
    type="button"
    class="password-toggle"
  >
    <img class="toggle-icon"
      :src="showConfirmPassword ? hideIcon : showIcon" 
      alt="Toggle Password Visibility"
    />
  </button>
</div>
</div>
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
  <div class="userdiv">
    <h2 style="display: flex; align-items: center; justify-content: center;">
            <img src="@/assets/icons/forgot.png" alt="Icon" style="width:15px; height: 15px; margin-right: 7px;">
     Recovery / Authentication Key
    </h2>
         <div style="position: relative;">
          <p>To generate a new recovery key, type your password</p>
          <div style="position: relative;">
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
    <img class="toggle-icon"
      :src="showPswauth ? hideIcon : showIcon" 
      alt="Toggle Password Visibility"
    />
  </button>
</div>
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
      <div class="userdiv">
    <h2 style="display: flex; align-items: center; justify-content: center;">
            <img src="@/assets/icons/delete-account.png" alt="Icon" style="width:15px; height: 15px; margin-right: 7px;">
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
    class="password-toggle3"
  >
    <img class="toggle-icon"
      :src="showPswDelete ? hideIcon : showIcon" 
      alt="Toggle Password Visibility"
    />
  </button>
</div>
         <p>By proceeding with the deletion of your account, you acknowledge and understand that this action is irreversible. Once your account is deleted, you will permanently lose access to your account and all associated data, including but not limited to personal information, settings, and any content you have created or stored.

Please be aware that we will not be able to recover any data or restore your account after it has been deleted. If you have any doubts or wish to retain your data, we strongly encourage you to reconsider before proceeding with the deletion.

Thank you for your understanding.</p>
         <br>
         <button class="userbtn" @click="deleteAccount()">Delete Account</button>
      </div>
</div>
<div style="height: 100px"></div>
</div>
      <div v-if="selectedIndex === 1">
        <div style="margin-bottom: 30px; border-bottom: 3px #262435 solid; padding-bottom: 25px;">
          <h1>Select a Subscription Plan</h1>
    <div class="subscription-form">
      <div 
      class="sub-option" 
      :class="{ select: selectedOption === 1 }"
      @click="selectOption(1)"
    >
      <h3 class="plan">1 Month</h3>
      <p class="price">5.99€ + VAT</p>
    </div>
    <div 
      class="sub-option" 
      :class="{ select: selectedOption === 2 }"
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
      <div class="square" :class="{ select: selectedpay === 1 }" @click="selectPaymentMethod('Credit Card'), selectPay(1)">
        <img class="icon-op" src="@/assets/icons/credit-card.png" alt="credit-card"> 
        <p>Credit Card</p>
    </div>
    <div class="square-disabled">
      <div class="coming-soon-banner2">Available Soon</div>
    <img class="icon-op" src="@/assets/icons/bitcoin.png" alt="bitcoin"> 
    <p>Bitcoin</p>
</div>
<div class="square-disabled">
  <div class="coming-soon-banner2">Available Soon</div>
    <img class="icon-op" src="@/assets/icons/ethereum.png" alt="ethereum"> 
    <p>Ethereum</p>
</div>
<div class="square-disabled">
  <div class="coming-soon-banner2">Available Soon</div>
    <img class="icon-op" src="@/assets/icons/monero.png" alt="monero"> 
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
        <div style="height: 100px"></div>
      </div>
      <div v-if="selectedIndex === 2">
  <div class="twofa-container">
    <h1 class="twofa-title">Two-Factor Authentication</h1>
    <p class="twofa-instruction">
      To enable two-factor authentication, toggle the switch below and scan the generated QR code with your authenticator app.
    </p>
    <div class="twofa-toggle">
      <label>
        <div class="twofa-toggle-switch" :class="{ 'twofa-toggle-switch-checked': isTwoFaEnabled }" @click="toggleTwoFa()"></div>
        <span class="twofa-toggle-label">Enable 2FA</span>
      </label>
    </div>
    <div v-if="isTwoFaEnabled">
      <div class="qr">
        <qrcode-vue v-if="qrCode" :value="qrCode"></qrcode-vue>
      </div>
<br><br>
  <p class="twofa-instruction">
  IMPORTANT: If you start the pairing process but don't complete it by scanning the QR code, please make sure to toggle the switch back to the "off" position before logging out to avoid being locked out of your account.
    </p></div>
  </div>
</div>
    </div>
  </div>
  <NotificationPopup ref="notification" />
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
import QrcodeVue from 'qrcode.vue'
import hideIcon from '@/assets/icons/hide.png';
import showIcon from '@/assets/icons/show.png';
import NotificationPopup from '@/components/NotificationPopup.vue';

const store = useStore();
const user = store.getters.getUser;
const apiKey = import.meta.env.VITE_EREUNA_KEY;

// for popup notifications
const notification = ref(null);
const showNotification = () => {
  notification.value.show('This is a custom notification message!');
};

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
const showPswDelete = ref(false);
const showPswauth = ref(false);

async function changePassword() {
  if (oldPassword.value === '') {
    notification.value.show('Please enter your old password');
    return;
  }

  if (newPassword.value === '') {
    notification.value.show('Please enter a new password');
    return;
  }

  if (confirmPassword.value !== newPassword.value) {
    notification.value.show('Passwords do not match');
    return;
  }

  try {
    const response = await fetch('/api/password-change', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ oldPassword: oldPassword.value, newPassword: newPassword.value, user: user }),
    });

    const data = await response.json();

    if (data.confirm) {
      notification.value.show('Password changed successfully');
      // Password changed successfully
    } else if (data.error === 'old_password_incorrect') {
      notification.value.show('Old password is incorrect');
    } else {
      notification.value.show('Failed to change password');
    }
  } catch (error) {
    notification.value.show('Failed to change password');
  }
}

let newUsername = ref('');

async function changeUsername() {
  if (newUsername.value === '') {
    notification.value.show('Please enter a new username');
    return;
  }

  if (newUsername.value === user) {
    notification.value.show('Current username and new username cannot be the same');
    return;
  }

  try {
    const response = await fetch('/api/change-username', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ newUsername: newUsername.value, user: user }),
    });

    const data = await response.json();

    if (data.error === 'username_taken') {
      notification.value.show('Username already taken');
    } else if (data.error === 'current username and new username cannot be the same') {
      notification.value.show('Current username and new username cannot be the same');
    } else if (data.confirm) {
      // Username changed successfully
      notification.value.show('Username changed successfully!');
      setTimeout(() => {
        LogOut();
      }, 3000);
    } else {
      notification.value.show('Failed to change username');
    }
  } catch (error) {
    notification.value.show('Failed to change username');
  }
}

let PswDelete = ref('');

async function deleteAccount() {
  if (PswDelete.value === '') {
    notification.value.show('Please enter your password');
    return;
  }

  try {
    const response = await fetch('/api/account-delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ user: user, password: PswDelete.value }),
    });

    const data = await response.json();

    if (data.error === 'password_incorrect') {
      notification.value.show('Password is incorrect');
    } else if (data.confirm) {
      // Account deleted successfully
      notification.value.show('Account deleted successfully!');
      await LogOut(); // Call LogOut function after successful deletion
    } else {
      notification.value.show('Failed to delete account');
    }
  } catch (error) {
    notification.value.show('Failed to delete account');
  }
}

const Pswauth = ref('');

async function GenerateNewKey() {

// Validate password input
if (!Pswauth.value.trim()) {
  notification.value.show('Please enter your password');
  return;
}

try {
  // Call the generate-key endpoint
  const response = await fetch('/api/generate-key', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({ 
      user: user, // Use .value if user is a ref
      password: Pswauth.value // Send the password
    }),
  });

  const data = await response.json();

  if (response.ok) {
    if (data.confirm) {
      // Key generation successful
      notification.value.show('New key generated successfully!');

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
      notification.value.show('An unexpected error occurred');
    }
  } else {
    // Handle API errors
    notification.value.show(data.message || 'An error occurred');
  }
} catch (error) {
  notification.value.show('Network error. Please try again.');
}
}

// Create a ref to store the expiration days
const expirationDays = ref(null);

// Create a function to get the expiration date
async function getExpirationDate() {
  try {
    const response = await fetch(`/api/get-expiration-date/?user=${encodeURIComponent(user)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
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
    const response = await fetch(`/api/get-receipts/${user}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
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

const isTwoFaEnabled = ref(false);
const qrCode = ref('');

async function toggleTwoFa() {
  const enabled = !isTwoFaEnabled.value;
  const username = user

  try {
    const response = await fetch('/api/twofa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ username, enabled }),
    });

    const data = await response.json();

    if (data.message === '2FA enabled') {
      isTwoFaEnabled.value = enabled;
      qrCode.value = data.qrCode;
    } else if (data.message === '2FA disabled') {
      isTwoFaEnabled.value = enabled;
      qrCode.value = '';
    } else {
      error.value = error.message;
    }
  } catch (error) {
    error.value = error.message;
  }
}

</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

#main {
  display: flex;
  flex-direction: row;
  height: 100vh; 
  overflow: hidden;
  width: 100% ;
  //min-width: 1250px;
}

.sidebar {
  display: flex;
  flex-direction: column;
  width: 15%;
  padding: 20px;
  background-color: $base2;
  overflow-y: auto; 
}

.content {
  display: flex;
  flex-direction: column;
  width: 85%;
  background-color: $base4;
  padding: 20px;
  text-align: center;
  overflow-y: auto; 
}

h1 {
  color: $accent3;
  font-size: 30px;
  margin-bottom: 0;
}

.user {
  color: $accent3;
  font-size: 23px;
  margin-bottom: 0;
}

.subscription-remaining{
  color: $text2;
  font-size: 12px;
  margin-bottom: 30px;
}

h2 {
  color: $text1;
  font-size: 15px;
}

.menu-wrapper{
 display: flex;
 flex-direction: column;
 gap: 5px;
}

.menu{
  margin-top: 5px;
  display: flex;
  align-items: center;
  width: 90%;
  background-color: rgba($base4, 0.9);
  padding: 10px;
  color: $text1;
  font-size: 15px;
  cursor: pointer;
  border-radius: 5px;
  transition: background-color 0.3s ease-in-out;
  opacity: 0.80;
}

.menu:hover{
  cursor: pointer;
  background-color: $accent1;
  opacity: 1;
}

.menu.selected {
  background-color: $accent1;
  opacity: 1;
}

.icon {
  width: 20px;
  height: 20px;
  margin-right: 10px;
}

.icon3 {
  width: 15px;
  height: 15px;
}

.icon-op{
  width: 15px;
  height: 15px;
  cursor: default;
  padding-right: 7px;
}

p{
  color: $text1;
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

/* buttons for settings */
.userbtn {
  background-color: $accent1;;
  color: $text1;
  border-radius: 5px;
  border: none;
  outline: none;
  padding: 5px;
  margin: 5px;
  width: 150px;
  cursor: pointer; /* Pointer cursor on hover */
  transition: all 0.3s ease; /* Smooth transition for hover effects */
}

.userbtn:hover {
    background-color: $accent2; /* Background color on hover */
}

/* inputs for settings */
.userinput{
  border-radius: 5px;
  padding: 5px 5px 5px 15px;
  margin: 7px;
  width: 160px;
  outline: none;
  color: $base3; /* Dark text color */
  transition: border-color 0.3s, box-shadow 0.3s; /* Smooth transition for focus effects */
  border: solid 1px $base4;
  background-color:$base4;
}

.userinput:focus{
  border-color: $accent1; /* Change border color on focus */
  box-shadow: 0 0 5px rgba(140, 141, 254, 0.5); /* Subtle shadow effect */
  outline: none; /* Remove default outline */
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
    color: $text1;
    position: relative; /* Position relative for pseudo-element */
    overflow: hidden; /* Hide overflow */
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
    background: linear-gradient(270deg, $accent1, #4c4d8f, #494bb9); /* Gradient colors */
    padding: 2px; /* Space for the border effect */
    -webkit-mask: linear-gradient(white, white) content-box, linear-gradient(white, white); 
    mask: linear-gradient(white, white) content-box, linear-gradient(white, white);/* For masking */
    -webkit-mask-composite: source-out; /* For masking */
    animation: border-animation 5s linear infinite; /* Add animation */
    mask-composite: exclude; /* For masking */
    background-size: 300% 300%; 
}

.square:hover{
    opacity: 1;
    cursor: pointer;
    background: linear-gradient(270deg, $accent1, #4c4d8f, #494bb9); /* Gradient colors */
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
    color: $text1;
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
    -webkit-mask: linear-gradient(white, white) content-box, linear-gradient(white, white); 
    mask: linear-gradient(white, white) content-box, linear-gradient(white, white);/* For masking */
    -webkit-mask-composite: source-out; /* For masking */
    animation: border-animation 5s linear infinite; /* Add animation */
    mask-composite: exclude; /* For masking */
    background-size: 300% 300%; 
    cursor: default;
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
  color: $text1;
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
  -webkit-mask: linear-gradient(white, white) content-box, linear-gradient(white, white);
  mask: linear-gradient(white, white) content-box, linear-gradient(white, white); /* For masking */
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
  -webkit-mask: linear-gradient(white, white) content-box, linear-gradient(white, white); 
  mask: linear-gradient(white, white) content-box, linear-gradient(white, white);/* For masking */
  -webkit-mask-composite: source-out; /* For masking */
  animation: border-animation 5s linear infinite;
  mask-composite: exclude; /* For masking */
  background-size: 300% 300%; 
}

.sub-option:hover {
  opacity: 1;
  cursor: pointer;
  background: linear-gradient(270deg, #8c8dfe, #4c4d8f, #494bb9); /* Gradient colors */
}

.select {
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
  background-color: $accent1;  /* Your purple color */
  color: $text1;
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

.coming-soon-banner2 {
  position: absolute;
  top: 20px;          /* Reduced from 20px */
  right: -35px;       /* Changed from -35px */
  background-color: $accent1;  /* Your purple color */
  color: $text1;
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
  background-color: $base2;
  padding: 20px;
  border-radius: 4px;
  margin: 20px 0;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

#card-element {
  padding: 10px;
  border: 1px solid $base4;
  border-radius: 4px;
  background-color: $base4;
}

#card-errors {
  color: #fa755a;
  text-align: left;
  margin-top: 8px;
  min-height: 20px;
}

p{
  color: $text1;
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
  background-color: $base2; 
  padding: 3px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.receipt-header {
  background-color: $base1; 
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
  right: 5%;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 10px;
  color: $text1;
  opacity: 0.60;
}

.password-toggle2 {
  position: absolute;
  right: 42%;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 10px;
  color: $text1;
  opacity: 0.60;
}

.password-toggle3 {
  position: absolute;
  left: 56%;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 10px;
  color: $text1;
  opacity: 0.60;
}

.twofa-container {
  max-width: 400px;
  margin: 40px auto;
  padding: 20px;
  background-color: $base2;
  border: 1px solid #ddd;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.twofa-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
}

.twofa-instruction {
  font-size: 14px;
  color: $text1;
  margin-bottom: 20px;
}

.twofa-toggle {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.twofa-toggle-switch, .twofa-toggle-label {
  display: inline-block;
  vertical-align: middle;
}

.twofa-toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
  background-color: rgba($text1, 0.50);
  border-radius: 10px;
  transition: background-color 0.3s;
  cursor: pointer;
}

.twofa-toggle-switch::before {
  content: "";
  position: absolute;
  width: 18px;
  height: 18px;
  background-color: $text1;
  border-radius: 50%;
  top: 1px;
  left: 1px;
  transition: transform 0.3s;
}

.twofa-toggle-switch-checked {
  background-color: $accent1;
}

.twofa-toggle-switch-checked::before {
  transform: translateX(20px);
}

.twofa-toggle-label {
  font-size: 14px;
  margin-left: 10px;
  margin-bottom: 2px;
  color: $text2;
}

.qr{
  background-color: $text1;
  padding: 10px;
}

.userdiv{
  background-color: $base2;
  width: 80%;
  border-radius: 10px;
  padding: 15px;
  margin: 0 auto;
  margin-bottom: 20px;
}

.toggle-icon {
  width: 15px; /* Adjust the size as needed */
  cursor: pointer; /* Change cursor to pointer on hover */
}


/* Mobile version */
@media (max-width: 1150px) {
  .settingsbtn{
    display: none;
  }

  #main {
  display: flex;
  flex-direction: column;
  width: 100% ;
}

.sidebar {
  display: flex;
  flex-direction: row;
  justify-content: center;
  height: 15%;
  width: 100%;
  background-color: $base2;
  padding: 0;
}

.content {
  display: flex;
  flex-direction: row;
  height: 85%;
  width: 100%;
  background-color: $base4;
  padding: 20px;
  text-align: center;
}

.user-wrapper {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  align-content: center;
  width: 90vw; /* 70% of the viewport width */
  margin: 0 auto;
}

.user {
  color: $accent3;
  font-size: 2.5rem;
  margin: 0;
  padding:0;
}

.subscription-remaining{
  color: $text2;
  font-size: 1.2rem;
  margin: 0;
  padding:0;
}

.menu-wrapper{
  display: flex;
  flex-direction: row;
  gap: 1rem;
  width: 90vw; /* 70% of the viewport width */
  margin: 0 auto;
}

.menu{
  margin-top: 5px;
  display: flex;
  justify-content: center; /* added justify-content: center */
  align-items: center; /* already present */
  background-color: rgba($base4, 0.9);
  padding: 10px;
  color: $text1;
  font-size: 1rem;
  cursor: pointer;
  border-radius: 5px;
  transition: background-color 0.3s ease-in-out;
  opacity: 0.80;
  height: 3rem;
}

.menu:hover{
  background-color: $accent1;
  opacity: 1;
}

.menu.selected {
  background-color: $accent1;
  opacity: 1;
}

.inner{display: flex;
flex-direction: column;}

.icon {
  width: 15px;
  height: 15px;
  margin-right: 7px;
}

}

</style>