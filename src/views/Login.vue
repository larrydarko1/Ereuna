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
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import store from '../store/store';

const router = useRouter();

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

  usernameError.value = false;
  passwordError.value = false;
  fieldsError.value = false;
  welcomePopup.value = false;

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

    if (response.ok) {
      const responseBody = await response.json();
      const token = responseBody.token;
      // receive token (no vuex?)
      localStorage.setItem('token', token);
      router.push({ name: 'Charts' });
    } else {
      const responseBody = await response.json();
      if (response.status === 402) {
        // Handle subscription expired error
        router.push({ path: '/renew-subscription' });
      } else if (responseBody.message === 'Username doesn\'t exist') {
        usernameError.value = true;
      } else if (responseBody.message === 'Password is incorrect') {
        passwordError.value = true;
      }
    }
  } catch (error) {
    console.error(error);
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
  align-items: center;
  justify-content: center;
  left: 44%;
  top: 30%;
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
}

.signbtn:hover {
  cursor: pointer;
  background-color: #8c8dfe;
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
</style>