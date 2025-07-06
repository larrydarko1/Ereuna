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
  <img class="bg" src="@/assets/images/bg.png" alt="" draggable="false">
</div>
<div class="login container">
  <div class="login-form" @keydown.enter="login()">
    <div class="logo-container">
      <img class="logo" style="margin-bottom: 30px;" src="@/assets/icons/owl.png" alt="" draggable="false">
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
   <div class="userbtn" @click="login" :disabled="isLoggingIn">
  <span v-if="isLoaderVisible" class="loader4">
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
  {{ isLogged ? 'Welcome!' : 'Log In' }}
</div>
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

const isLogged = ref(false);
const isLoaderVisible = ref(false);

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
  isLogged.value = false;
  isLoaderVisible.value = false;
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
        isLogged.value = true;
        isLoaderVisible.value = true;
        const token = responseBody.token;
        localStorage.setItem('token', token);
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
      isLogged.value = true;
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
  margin-right: 5px;
  color: $text2;
  font-size: 1.2rem;
}

.forgot-password a:hover {
  text-decoration: underline;
}

.custom-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 5px;
  margin-left: 230px;
}

.checkmark {
  width: 8px;
  height: 8px;
  background-color: whitesmoke;
  border-radius: 50%;
  margin-right: 5px;
  display: inline-block;
  transition: background-color 0.3s, border-color 0.3s;
}

.custom-checkbox.checked .checkmark {
  background-color: #8c8dfe;
  border-color: #8c8dfe;
}

.label-text {
  opacity: 0.7;
  transition: opacity 0.3s;
  color: whitesmoke;
  font-size: 12px;
}

.custom-checkbox.checked .label-text {
  opacity: 1;
  color: whitesmoke;
}

.toggle-icon {
  width: 30px;
  cursor: pointer;
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
  outline: none;
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
  background-color:#2c2b3e;
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
  background-color: $accent1;
  text-align: center;
  display: flex;
  flex-direction: row;
  align-items: center;
  align-content: center;
  justify-content: center;
  color: $text1;
  border-radius: 10px;
  outline: none;
  border: none;
  padding: 10px;
  margin: 10px;
  width: 400px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 16px;
  font-weight: 500;
}

.userbtn:hover {
  background-color: $accent2;
  color: $text1;
  transform: scale(1.05);
  transition: all 0.3s ease-in-out;
}

.userbtn:active {
  transform: scale(0.95);
  transition: all 0.1s ease-out;
  background-color: $accent1;
}

.loader4 {
  display: flex;
  justify-content: center;
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
  stroke: linear-gradient(45deg, #e8e8e8, #cdcdcd);
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
  stroke: #e8e8e8;
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

.error{
  border-color: red;
}

.footnote{
  font-weight: bold;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
}

/* Mobile version */
@media (max-width: 1150px) {
  .container {
    grid-template-columns: 1fr;
    height: auto;
    width: 100%;
    min-width: 0;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .footnote{
    display: none;
  }

  .image-background {
   display: none;
  }

  .image-background .quote,
  .image-background .author {
    display: none;
  }

  .bg {
    display: none;
  }

  .logo {
    width: 8rem;
    margin: 1rem auto;
    display: block;
  }

  .login-container {
    height: auto;
    min-height: 0;
    width: 100vw;
    box-sizing: border-box;
    padding: 0;
    margin: 0;
    justify-content: flex-start;
  }

  .login-form {
    position: static;
    top: auto;
    left: auto;
    transform: none;
    width: 100%;
    padding: 1rem 0.5rem;
    box-sizing: border-box;
  }

  .input-group {
    width: 80%;
    padding: 0.5rem 0;
    box-sizing: border-box;
  }

  .form-input {
    width: 100%;
    min-width: 0;
    padding: 1rem;
    font-size: 1.3rem;
    box-sizing: border-box;
  }

  .user-label {
    font-size: 1rem;
    left: 20px;
    bottom: 35px;
  }

  .userbtn {
    width: 70%;
    padding: 1rem;
    font-size: 1.1rem;
    margin: 1rem 0;
    box-sizing: border-box;
  }

  .toggle-password {
    font-size: 1rem;
    right: 10px;
  }

  .toggle-icon {
    width: 2rem;
  }

  .custom-checkbox {
    padding: 0.5rem;
    margin-left: 0;
    width: 70%;
    justify-content: flex-end;
  }

  .checkmark {
    width: 1rem;
    height: 1rem;
  }

  .label-text {
    font-size: 1rem;
  }

  .forgot-password {
    font-size: 1rem;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    margin: 0.5rem 0;
  }

  .forgot-password img {
    width: 1.2rem;
    height: 1.2rem;
  }

  .beta {
    font-size: 1rem;
    width: 10rem;
    margin-top: 7rem;
    left: 50%;
    transform: translateX(-50%) rotate(-5deg);
  }

  .mfa-popup {
    width: 90vw;
    min-width: 0;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 1rem;
  }
}
</style>
