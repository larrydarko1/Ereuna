<template>
  <div class="login-form" @keydown.enter="login()">
    <img class="logo" style="margin-bottom: 30px;" src="@/assets/icons/owl.png" alt="">

    <div class="input-with-icon">
      <input class="form-input" placeholder="Username" type="username">
      <img class="icon" src="@/assets/icons/username.png" alt="">
    </div>
    <div class="input-with-icon">
    <input class="form-input" placeholder="Password" :type="passwordFieldType">
    <img class="icon" src="@/assets/icons/password.png" alt="">
    <button class="toggle-password" @click="togglePasswordVisibility">
      {{ passwordFieldType === 'password' ? 'Show' : 'Hide' }}
    </button>
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
  <div v-if="welcomePopup" class="welcome-popup">
    <h3>{{ welcomeMessage }}</h3>
  </div>
  <div class="donation">
    <a :href="donationLink" target="_blank" rel="noreferrer noopener">
      <img class="donationimg" src="https://nowpayments.io/images/embeds/donation-button-black.svg" alt="Crypto donation button by NOWPayments">
    </a>
  </div>
  <h3 class="releaseNote"> V1.0.1 // ALPHA TEST </h3>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const donationLink = ref('');

onMounted(async () => {
  const response = await fetch('/api/donation-link');
  const data = await response.json();
  donationLink.value = data.donationLink;
});

const usernameError = ref(false);
const passwordError = ref(false);
const fieldsError = ref(false);
const welcomePopup = ref(false);
const welcomeMessage = ref('');

async function login() {
  const usernameInput = document.querySelector('input[placeholder="Username"]');
  const passwordInput = document.querySelector('input[placeholder="Password"]');

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  // Reset all error states
  usernameError.value = false;
  passwordError.value = false;
  fieldsError.value = false;
  welcomePopup.value = false;

  // Check for empty fields first
  if (!username || !password) {
    fieldsError.value = true;
    return;
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        password,
      })
    });
    
    const responseBody = await response.json();

    if (response.ok) {
      const token = responseBody.token;
      localStorage.setItem('token', token);
      router.push({ name: 'Charts' });
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
      }
    }
  } catch (error) {
  }
}

const passwordFieldType = ref('password');

function togglePasswordVisibility() {
  passwordFieldType.value = passwordFieldType.value === 'password' ? 'text' : 'password';
}

</script>

<style scoped>
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
  border: solid 1px #171728;
}

.form-input:focus {
  border-color: #8c8dfe;
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
  border: solid 2px #8c8dfe;
  padding: 5px;
  margin: 5px;
  width: 100%;
  cursor: pointer; /* Pointer cursor on hover */
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Subtle shadow for depth */
    transition: all 0.3s ease; /* Smooth transition for hover effects */
}

.signbtn:hover {
  background-color: #8c8dfe; /* Background color on hover */
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
  bottom: 30px;
  left: 0;
  right: 0;
  border: 1px solid red;
  padding: 10px;
  text-align: center;
}

.error-popup h3 {
  color: red;
}

.welcome-popup {
  position: absolute;
  bottom: 30px;
  left: 0;
  right: 0;
  border: 1px solid green;
  padding: 10px;
  text-align: center;
}

.welcome-popup h3 {
  color: green;
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
  bottom: 0; /* Stick to the bottom */
  left: 50%; /* Center horizontally */
  transform: translateX(-50%); /* Adjust for centering */
  text-align: center; /* Center text */
}

.donation{
  position: fixed;
  bottom: 2%;
  right: 1%;
}

.donationimg{
height: 70px;
}
</style>