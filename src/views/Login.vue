<template>
  <div v-if="mfaRequired" class="mfa-popup">
  <h3>Enter 2FA Code</h3>
  <input placeholder="MFA Code" type="text" :class="error" name="factor" v-model="mfaCode" maxlength="6" style="text-align: center;">
  <button type="button" class="verify-mfa" @click="verifyMfa">Verify</button>
</div>
<div class="container">
<div class="image-background">
  <h3 class="quote">{{ quote.text }}</h3>
<p class="author">— {{ quote.author }}</p>
  <p class="footnote">Developed with 🤬 by <a href="https://github.com/larrydarko1" target="_blank">Lorenzo Mazzola</a><br>
    Crypto Donations: <br>
    BTC: bc1qv7lhtuzcv9k0zktgfetdg43g2ll3jtta0z5x5c
    <br>
    ETH: 0x150b03B3904D877e2399F6302c5Db5f332170304
    <br>
    XMR: 449bkU2MvFh1oiRZGYT72BAfF6uj3kPa1TJfBmPT1agNYFyrifsSW1reEGjrwgG9UujoV4EEEB14PMpDkVGinc3QGFwfVcw</p>
  <img class="bg" src="@/assets/images/bg.png" alt="">
</div>
<div class="login container">
  <div class="login-form" @keydown.enter="login()">
    <div class="logo-container">
      <img class="logo" style="margin-bottom: 30px;" src="@/assets/icons/owl.png" alt="">
      <div class="beta">BETA VERSION</div>
    </div>
    <br>
    <br>
    <div class="input-group">
        <input required type="text" :class="error" name="Username" autocomplete="off" class="form-input">
        <label :class="error" class="user-label">Username</label>
      </div>
      <div class="input-group">
        <input required :type="showPassword ? 'text' : 'password'" :class="error" name="Password" autocomplete="off" class="form-input">
        <label :class="error" class="user-label">Password</label>
    <button 
  type="button" 
  class="toggle-password" 
  @click="showPassword = !showPassword"
>
  <img 
    :src="showPassword ? hideIcon : showIcon" 
    alt="Toggle Password Visibility" 
    class="toggle-icon"
  >
</button>
      </div>
  <div 
  class="custom-checkbox" 
  :class="{ checked: rememberMe }"
  @click="rememberMe = !rememberMe"
  style="justify-content: right;">
  <input type="checkbox" v-model="rememberMe" id="remember-me-checkbox" required style="display: none;">
  <span class="checkmark"></span>
  <label for="remember-me-checkbox" class="label-text">Remember Me</label>
</div>
    <button class="userbtn" @click="login()">Login</button>
    <br>
    <p class="text">Don't have an account? <router-link to="/signup" class="text">Sign Up</router-link></p>
    <p class="text forgot-password">
  <img class="img" src="@/assets/icons/forgot.png" alt="">
  <span>Forgot your Password?</span>
  <router-link to="/recovery" class="text">Click Here</router-link>
</p>
  </div>
  <div v-if="usernameError" class="error-popup">
    <h3>Username doesn't exist</h3>
  </div>
  <div v-if="passwordError" class="error-popup">
    <h3>Password is incorrect</h3>
  </div>
  <div v-if="fieldsError" class="error-popup">
    <h3>Please fill both username and password fields</h3>
  </div>
  <div v-if="welcomePopup"  class="welcome-popup">
    <div class="loader">
      <div class="orbe" style="--index: 0"></div>
      <div class="orbe" style="--index: 1"></div>
      <div class="orbe" style="--index: 2"></div>
      <div class="orbe" style="--index: 3"></div>
      <div class="orbe" style="--index: 4"></div>
  </div>
    <h3>{{ welcomeMessage }}</h3>
  </div>
  </div>
  </div>
  <NotificationPopup ref="notification" />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import hideIcon from '@/assets/icons/hide.png';
import showIcon from '@/assets/icons/show.png';
import NotificationPopup from '@/components/NotificationPopup.vue';

// for popup notifications
const notification = ref(null);
const showNotification = () => {
  notification.value.show('This is a custom notification message!');
};

const quotes = [
  {
    text: "Price is what you pay. Value is what you get.",
    author: "Warren Buffett"
  },
  {
    text: "It's far better to buy a wonderful company at a fair price than a fair company at a wonderful price.",
    author: "Warren Buffett"
  },
  {
    text: "Our favorite holding period is forever.",
    author: "Warren Buffett"
  },
  {
    text: "Invest in what you know.",
    author: "Peter Lynch"
  },
  {
    text: "Go for a business that any idiot can run – because sooner or later, any idiot probably is going to run it.",
    author: "Peter Lynch"
  },
  {
    text: "Know what you own, and know why you own it.",
    author: "Peter Lynch"
  },
  {
    text: "Markets are constantly in a state of uncertainty and flux, and money is made by discounting the obvious and betting on the unexpected.",
    author: "George Soros"
  },
  {
    text: "The financial markets generally are unpredictable. So that one has to have different scenarios... The idea that you can actually predict what's going to happen contradicts my way of looking at the market.",
    author: "George Soros"
  },
  {
    text: "The biggest risk is not taking any risk.",
    author: "Ray Dalio"
  },
  {
    text: "Diversify or die.",
    author: "Ray Dalio"
  },
  {
    text: "The most important thing is to think for yourself and not be influenced by the crowd.",
    author: "Ray Dalio"
  },
  {
    text: "There is nothing new in Wall Street. There can't be because speculation is as old as the hills. Whatever happens in the stock market today has happened before and will happen again.",
    author: "Jesse Livermore"
  },
  {
    text: "The game of speculation is the most uniformly fascinating game in the world. But it is not a game for the stupid, the mentally lazy, the person of inferior emotional balance, or the get-rich-quick adventurer.",
    author: "Jesse Livermore"
  },
  {
    text: "In the short run, the market is a voting machine but in the long run, it is a weighing machine.",
    author: "Benjamin Graham"
  },
  {
    text: "The intelligent investor is a realist who sells to optimists and buys from pessimists.",
    author: "Benjamin Graham"
  },
  {
    text: "The stock investor is neither right nor wrong because others agreed or disagreed with him; he is right because his facts and analysis are right.",
    author: "Benjamin Graham"
  }
];

const quote = ref('');

onMounted(() => {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  quote.value = quotes[randomIndex];
});

const router = useRouter();
const apiKey = import.meta.env.VITE_EREUNA_KEY;
const welcomePopup = ref(false);
const rememberMe = ref(false);
const showPassword = ref(false);
const mfaError = ref(false);
const mfaRequired = ref(false);
const mfaCode = ref('');
const storedUsername = ref('');
const welcomeMessage = ref('');

async function login() {
  const usernameInput = document.querySelector('input[name="Username"]');
  const passwordInput = document.querySelector('input[name="Password"]');

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  // Update the stored username
  storedUsername.value = username;

  // Reset all error states
  welcomePopup.value = false;

  // Check for empty fields first
  if (!username || !password) {
    notification.value.show('Please fill both username and password fields');
    if (!username) usernameInput.classList.add('error');
    if (!password) passwordInput.classList.add('error');
    return;
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        username,
        password,
        rememberMe: rememberMe.value,
      })
    });

    const responseBody = await response.json();

    if (response.ok) {
      if (responseBody.mfaRequired) {
        // MFA verification required, display MFA popup
        mfaRequired.value = true;
      } else {
        // MFA verification not required, proceed with login
        const token = responseBody.token;
        localStorage.setItem('token', token);
        welcomeMessage.value = `Welcome ${username}!`;
        welcomePopup.value = true;
        router.push({ name: 'Charts' });
      }
    } else {
      // Use exact string matching
      if (responseBody.message === 'Username doesn\'t exist') {
        notification.value.show('Username doesn\'t exist');
        usernameInput.classList.add('error');
      } else if (responseBody.message === 'Password is incorrect') {
        notification.value.show('Password is incorrect');
        passwordInput.classList.add('error');
      } else if (responseBody.message === 'Subscription is expired') {
        router.push({ path: '/renew-subscription' });
      } else if (responseBody.message === 'Please fill both username and password fields') {
        notification.value.show('Please fill both username and password fields');
        if (!username) usernameInput.classList.add('error');
        if (!password) passwordInput.classList.add('error');
      } else {
        // Log error
      }
    }
  } catch (error) {
    error.value = error.message;
  }
}

async function verifyMfa() {
  const factor = document.querySelector('input[name="MFA"]');
  try {
    const mfaResponse = await fetch('/api/verify-mfa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        username: storedUsername.value,
        mfaCode: mfaCode.value,
        rememberMe: rememberMe.value
      })
    });

    const mfaResponseBody = await mfaResponse.json();

    if (mfaResponse.ok) {
      // MFA code is valid, proceed with login
      welcomeMessage.value = `Welcome ${username}!`;
      welcomePopup.value = true;
      const token = mfaResponseBody.token;
      localStorage.setItem('token', token);
      router.push({ name: 'Charts' });
    } else {
      notification.value.show('Invalid MFA Code, try again.');
      factor.classList.add('error');
    }
  } catch (error) {
    error.value = error.message;
  }
}

</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

.logo {
  align-items: center;
  justify-content: center;
  width: 90px;
  margin: 10px;
}

.signbtn {
  background-color: transparent;
  color: whitesmoke;
  border-radius: 10px;
  outline: none;
  border: solid 2px $accent1;
  padding: 5px;
  margin: 5px;
  width: 100%;
  cursor: pointer; /* Pointer cursor on hover */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Subtle shadow for depth */
  transition: all 0.3s ease; /* Smooth transition for hover effects */
}

.signbtn:hover {
  background-color: $accent1; /* Background color on hover */
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2); /* Enhanced shadow on hover */
}

.toggle-password {
  position: absolute;
  right: 5%;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 10px;
  color: black;
  opacity: 0.60;
}

.input-with-icon {
  position: relative;
  width: 100%;
  margin-right: 50px;
}

.icon {
  position: absolute;
  top: 30%;
  left: 7%;
  opacity: 0.3;
  border: none;
  width: 12px;
  height: 12px;
  pointer-events: none;
  margin: 0;
  padding: 0;
}

.remember-me {
  display: flex;
  flex-direction: row;
  margin-left: -17px;
  margin-right: auto;
}

.welcome-popup {
  position: absolute;
  bottom: 100px;
  left: 0;
  right: 0;
  margin: auto;
  border: 2px solid green;
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  max-width: 500px;
}

.welcome-popup h3 {
  color: green;
  font-size: 16px;
  margin-left: 20px;
}

.forgot-password {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
}

.forgot-password img {
  width: 14px;
  height: 14px;
  padding-right: 5px;
}

.forgot-password span {
  margin-right: 5px; /* Adds a bit more space before the link */
  color: $text2;
  font-size: 1.2rem;
}

.forgot-password a:hover {
  text-decoration: underline; /* Adds underline on hover */
}

.custom-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 5px;
  margin-left: 230px;
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

.label-text {
  opacity: 0.7; /* Initial opacity */
  transition: opacity 0.3s; /* Smooth transition for opacity */
  color: whitesmoke;
  font-size: 12px;
}

.custom-checkbox.checked .label-text {
  opacity: 1; /* Full opacity when checked */
  color: whitesmoke;
}

.toggle-icon {
  width: 30px; /* Adjust the size as needed */
  cursor: pointer; /* Change cursor to pointer on hover */
}

.mfa-popup {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  background-color: #1d1c29;
  border: 1px solid #dddddd17;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  border-radius: 20px;
  z-index: 10000;
  text-align: center;
}

.mfa-popup h3 {
  margin-top: 0;
  color: #ccc;
}

.mfa-popup input {
  width: 90%;
  padding: 10px;
  margin-bottom: 20px;
  border: 1px solid #ccc;
  border-radius: 10px;
  box-shadow: none;
}

.mfa-popup input:focus {
  border: 1px solid $accent1;
  outline: none; /* Remove the default outline */
}

.mfa-popup button {
  width: 90%;
  padding: 10px;
  background-color: $accent1;
  color: $text1;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.mfa-popup button:hover {
  background-color: $accent2;
}

.logo-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.beta {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%) rotate(-5deg);
  border: solid 2px $accent1;
  width: 160px;
  border-radius: 5px;
  color: $accent1;
  text-align: center;
  letter-spacing: 2px;
  font-weight: bold;
  padding: 3px;
  margin-top: 90px;
  cursor: default;
  font-size: 16px;
}

.loader {
    --size-loader: 20px;
    --size-orbe: 2px;
    width: var(--size-loader);
    height: var(--size-loader);
    position: relative;
    transform: rotate(45deg);
    margin-top: 12px;
  }

  .orbe {
    position: absolute;
    width: 100%;
    height: 100%;
    --delay: calc(var(--index) * 0.1s);
    animation: orbit7456 ease-in-out 1.5s var(--delay) infinite;
    opacity: calc(1 - calc(0.2 * var(--index)));
  }

  .orbe::after {
    position: absolute;
    content: '';
    top: 0;
    left: 0;
    width: var(--size-orbe);
    height: var(--size-orbe);
    background-color: #3ae374;
    box-shadow: 0px 0px 20px 2px #3ae374;
    border-radius: 50%;
  }

  @keyframes orbit7456 {
    0% {
    }

    80% {
      transform: rotate(360deg);
    }

    100% {
      transform: rotate(360deg);
    }
  }

  .container {
  display: grid;
  grid-template-columns: 60% 40%;
  height: 100vh;
}

.image-background{
  background-color: $base4;
  min-width: 600px;
  position: relative;
}

.image-background p {
  position: absolute;
  bottom: 0;
  left: 0;
  margin: 10px;
  color: $text2;
  z-index: 100;
}

.image-background h2 {
  position: absolute;
  top: 0;
  left: 0;
  margin: 10px;
  color: $text2;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  z-index: 100;
}

.image-background .quote {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  font-size: 25px;
  color: $text1;
  z-index: 100;
}

.image-background .author {
  position: absolute;
  bottom: 25%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  font-size: 14px;
  color: $text2;
  z-index: 100;
}

.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  flex-direction: column;
}

.login-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 50%;
  left: 80%;
  transform: translate(-50%, -50%);
}

.input-group {
    position: relative;
    padding: 1rem;
  }

  p{
    color: $text2;
    font-size: 1.2rem;
  }

  .form-input {
    border: solid 2px transparent;
    border-radius: 1.5rem;
    background-color:#2c2b3e;;
    padding: 1.5rem;
    font-size: 1.2rem;
    width: 400px;
    color: #f5f5f5;
    transition: border 150ms cubic-bezier(0.4,0,0.2,1);
  }

  .user-label {
    text-align: center;
    position: absolute;
    left: 30px;
    bottom: 45px;
    color: #cdcdcd;
    pointer-events: none;
    transform: translateY(1.5rem);
    transition: 150ms cubic-bezier(0.4,0,0.2,1);
  }

  .form-input:focus, .form-input:valid {
    outline: none;
    border: 2px solid #8c8dfe;
  }

  .form-input:focus ~ label, .form-input:valid ~ label {
    transform: translateY(-50%) scale(0.8);
    background-color: #212121;
    padding: 0 .4em;
    color: #8c8dfe;
  }

  .userbtn {
  background-color: transparent;
  color: $text1;
  border-radius: 10px;
  outline: none;
  border: solid 3px #8c8dfe;
  padding: 10px;
  margin: 10px;
  width: 400px;
  cursor: pointer;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  font-size: 16px; /* Added font size for better readability */
  font-weight: 500; /* Added font weight for better typography */
}

.userbtn:hover {
  background-color: #8c8dfe;
  color: white;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  transform: scale(1.05); /* New animation: scale up on hover */
  transition: all 0.3s ease-in-out; /* Changed transition timing function for smoother animation */
}

.userbtn:active {
  transform: scale(0.95); /* New animation: scale down on click */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Reduced shadow on click */
  transition: all 0.1s ease-out; /* Faster transition on click */
}

a{
    color: $accent1;
    font-size: 1.2rem;
}

a:hover{
    color: $accent2;
    cursor: pointer;
}

.bg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  overflow: hidden;
  opacity: 0.20;
}

/* Mobile version */
@media (max-width: 1100px) {
  .container {
    grid-template-columns: 100%;
  }

  .login-container {
    height: 100vh;
  }

  .login-form {
    position: relative;
    top: auto;
    left: auto;
    transform: none;
  }

  .image-background .quote  {
    display: none;
  }

  .bg {
    display: none;
  }
}

.error{
    border-color: red;
}

.footnote{
  font-weight: bold;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.2); /* subtle drop shadow */
}
</style>
