<template>
  <div class="main">
    <br>
    <br>
    <div class="logo-container">
      <img class="logo" src="@/assets/icons/owl.png" alt="">
    </div>
    <h2 class="gradient-text">Subscription Expired</h2>
    <p style="font-size: 12px; display: flex; align-items: center; justify-content: center;">
      Hi <span class="gradient-text2" style="margin: 0 4px;">{{user}}!</span> It appears that your subscription has expired. 
      To resume using our services and regain access to your account, please renew your subscription by completing the form below:
    </p>
    <br>
    <div>
      <h2>Select a Subscription Plan</h2>
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
    <h2>Select a payment method</h2>
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
        <div v-if="selectedpay === 1" class="card-element-container">
      <div id="card-element"></div>
      <div id="card-errors" role="alert"></div>
          </div>
        </div>
        <br><br>
        <button class="userbtn" @click="Renew()">Renew Subscription</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { ref, onMounted } from 'vue';

const store = useStore();
const user = store.getters.getUser;

let selectedOption = ref(1);
let selectedpay = ref();

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
});

async function Renew() {
  // Logic to renew subscription
}
</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

.main {
  min-width: 1200px; /* Set a minimum width that works for your design */
  box-sizing: border-box; /* Ensure padding is included in the width */
}

h1 {
  color: #b3b3b3;
  font-size: 30px;
  margin-bottom: 0;
  text-align: center;
}

h2 {
  color: rgb(179, 179, 179);
  font-size: 15px;
  text-align: center;
}

p{
color: #b3b3b3;
  font-size: 10px;
  text-align: center;
}

.settingsbtn {
  background-color: transparent;
  color: whitesmoke;
  width: fit-content;
  padding: 10px;
  border: solid 2px #8c8dfe;
  margin-top: 5px;
  font-size: 12px;
}

.settingsbtn:hover {
  background-color: #8c8dfe;
  cursor: pointer;
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
    padding: 10px 20px; /* Increased padding for a better size */
    margin-top: 5px;
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

.square:hover {
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

.logo {
  width: 70px;
  margin: 10px;
}

.logo-container {
  display: flex;
  justify-content: center;
}

.gradient-text {
  font-size: 40px;
  background: linear-gradient(270deg, #8c8dfe, #4c4d8f, #494bb9);
  background-size: 400% 400%;
  background-clip: text; /* Standard property */
  -webkit-background-clip: text; /* Safari */
  -moz-background-clip: text; /* Firefox (not widely supported) */
  -webkit-text-fill-color: transparent; /* Safari */
  animation: gradient-animation 3s ease infinite;
}

.gradient-text2 {
  font-size: 12px;
  background: linear-gradient(270deg, #8c8dfe, #4c4d8f, #494bb9);
  background-size: 400% 400%;
  background-clip: text; /* Standard property */
  -webkit-background-clip: text; /* Safari */
  -moz-background-clip: text; /* Firefox (not widely supported) */
  -webkit-text-fill-color: transparent; /* Safari */
  animation: gradient-animation 3s ease infinite;
}

@keyframes gradient-animation {
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
</style>