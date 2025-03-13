<template>
  <div v-if="mfaRequired" class="mfa-popup">
  <h3>Enter 2FA Code</h3>
  <input placeholder="MFA Code" type="text" v-model="mfaCode" maxlength="6" style="text-align: center;">
  <button type="button" class="verify-mfa" @click="verifyMfa">Verify</button>
</div>
  <div class="login-form" @keydown.enter="login()">
    <div class="logo-container">
      <img class="logo" style="margin-bottom: 30px;" src="@/assets/icons/owl.png" alt="">
      <div class="beta">BETA VERSION</div>
    </div>
    <div class="input-with-icon">
      <input class="form-input" placeholder="Username" type="username">
      <img class="icon" src="@/assets/icons/username2.png" alt="">
    </div>
    <div class="input-with-icon">
    <input class="form-input" placeholder="Password" :type="showPassword ? 'text' : 'password'" >
    <img class="icon" src="@/assets/icons/password2.png" alt="">
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
    <button class="signbtn" @click="login()">Login</button>
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
  <div class="releaseNote" style="display: flex; flex-direction: row; align-items: center;">
  <h3> V1.0.3 // Beta Version </h3> 
  </div>
  <div class="releaseNote2" style="display: flex; flex-direction: row; align-items: center;">
    <h3>Crypto Donations</h3> 
  </div>
  <div class="releaseNote3" style="align-items: center; min-width: 1000px;">
    <h3 style="font-size: 9px;">BTC: 326ZBjc3NcF2tShrXzZzgZSpnoVtXHA4KB  //  ETH: 0x150b03B3904D877e2399F6302c5Db5f332170304  // XMR: 449bkU2MvFh1oiRZGYT72BAfF6uj3kPa1TJfBmPT1agNYFyrifsSW1reEGjrwgG9UujoV4EEEB14PMpDkVGinc3QGFwfVcw</h3> 
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import hideIcon from '@/assets/icons/hide.png';
import showIcon from '@/assets/icons/show.png';

const router = useRouter();
const apiKey = import.meta.env.VITE_EREUNA_KEY;
const usernameError = ref(false);
const passwordError = ref(false);
const fieldsError = ref(false);
const welcomePopup = ref(false);
const rememberMe = ref(false);
const showPassword = ref(false);
const mfaError = ref(false);
const mfaRequired = ref(false);
const mfaCode = ref('');
const storedUsername = ref('');
const welcomeMessage = ref('');

async function login() {
  const usernameInput = document.querySelector('input[placeholder="Username"]');
  const passwordInput = document.querySelector('input[placeholder="Password"]');

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  // Update the stored username
  storedUsername.value = username;

  // Reset all error states
  usernameError.value = false;
  passwordError.value = false;
  fieldsError.value = false;
  welcomePopup.value = false;
  mfaError.value = false;

  // Check for empty fields first
  if (!username || !password) {
    fieldsError.value = true;
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
        usernameError.value = true;
      } else if (responseBody.message === 'Password is incorrect') {
        passwordError.value = true;
      } else if (responseBody.message === 'Subscription is expired') {
        router.push({ path: '/renew-subscription' });
      } else if (responseBody.message === 'Please fill both username and password fields') {
        fieldsError.value = true;
      } else {
        // Log error
      }
    }
  } catch (error) {
    error.value = error.message;
  }
}

async function verifyMfa() {
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
      const token = mfaResponseBody.token;
      localStorage.setItem('token', token);
      router.push({ name: 'Charts' });
    } else {
      // MFA code is invalid, display error message
      mfaError.value = true;
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
  width: 70px;
  margin: 10px;
}

.text {
  color: whitesmoke;
  margin: 2px;
}

.form-input {
  border-radius: 25px;
  padding: 5px;
  margin: 7px;
  width: 100%;
  outline: none;
  color: whitesmoke; /* Dark text color */
  transition: border-color 0.3s, box-shadow 0.3s; /* Smooth transition for focus effects */
  border: solid 1px #171728;
  background-color:#2c2b3e;
}

.form-input:focus {
  border-color: #8c8dfe; /* Change border color on focus */
  box-shadow: 0 0 5px rgba(140, 141, 254, 0.5); /* Subtle shadow effect */
  outline: none; /* Remove default outline */
}
.login-form {
  display: flex;
  flex-direction: column;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%); /* Center the form */
  align-items: center;
  justify-content: center;
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
  right: -16%;
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

.input-with-icon .form-input {
  padding-left: 25px;
}

.remember-me {
  display: flex;
  flex-direction: row;
  margin-left: -17px;
  margin-right: auto;
}

.error-popup {
  position: absolute;
  bottom: 100px;
  left: 0;
  right: 0;
  margin: auto;
  border: 2px solid red;
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  max-width: 500px;
}

.error-popup h3 {
  color: red;
  font-size: 16px;
  margin-left: 20px;
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
}

.forgot-password img {
  width: 12px;
  height: 12px;
  padding-right: 5px;
}

.forgot-password span {
  margin-right: 5px; /* Adds a bit more space before the link */
}

.forgot-password a:hover {
  text-decoration: underline; /* Adds underline on hover */
}

.releaseNote {
  color: whitesmoke;
  position: fixed; /* Change to fixed positioning */
  bottom: 25px; /* Stick to the bottom */
  left: 50%; /* Center horizontally */
  transform: translateX(-50%); /* Adjust for centering */
  text-align: center; /* Center text */
}

.releaseNote2 {
  color: whitesmoke;
  position: fixed; /* Change to fixed positioning */
  bottom:12px; /* Stick to the bottom */
  left: 50%; /* Center horizontally */
  transform: translateX(-50%); /* Adjust for centering */
  text-align: center; /* Center text */
}

.releaseNote3 {
  color: whitesmoke;
  position: fixed; /* Change to fixed positioning */
  bottom:0px; /* Stick to the bottom */
  left: 50%; /* Center horizontally */
  transform: translateX(-50%); /* Adjust for centering */
  text-align: center; /* Center text */
}

.custom-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 5px;
  margin-left: 120px;
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
}

.custom-checkbox.checked .label-text {
  opacity: 1; /* Full opacity when checked */
  color: whitesmoke;
}

.toggle-icon {
  width: 15px; /* Adjust the size as needed */
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
  z-index: 1;
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
  width: 100px;
  border-radius: 5px;
  color: $accent1;
  text-align: center;
  letter-spacing: 2px;
  font-weight: bold;
  padding: 3px;
  margin-top: 72px;
}

.loader {
    --size-loader: 20px;
    --size-orbe: 2px;
    width: var(--size-loader);
    height: var(--size-loader);
    position: relative;
    transform: rotate(45deg);
    margin-top: 10px;
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

</style>
