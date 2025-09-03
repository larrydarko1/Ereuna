<template>
  <div class="twofa-container">
    <h1 class="twofa-title">Two-Factor Authentication</h1>
    <p class="twofa-instruction">
      To enable two-factor authentication, toggle the switch below. After scanning the generated QR code with your authenticator app, enter the 6-digit code from your app and click "Confirm 2FA" to complete setup.
    </p>
    <div class="twofa-toggle">
      <label>
        <div class="twofa-toggle-switch" :class="{ 'twofa-toggle-switch-checked': isTwoFaEnabled }"
          @click="toggleTwoFa()"></div>
        <span class="twofa-toggle-label">Enable 2FA</span>
      </label>
    </div>
    <div v-if="isTwoFaEnabled">
      <div class="qr">
        <qrcode-vue v-if="qrCode" :value="qrCode"></qrcode-vue>
      </div>
      <br><br>
      <div v-if="showVerificationInput">
        <input v-model="mfaCode" placeholder="Enter verification code" class="twofa-input" />
        <button class="twofa-btn" @click="confirmTwoFa">Confirm 2FA</button>
        <div v-if="error" class="error">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import QrcodeVue from 'qrcode.vue'
import { ref, onMounted } from 'vue';

const props = defineProps({
  user: {
    type: String,
    required: true
  },
  apiKey: {
    type: String,
    required: true
  }
});

const isTwoFaEnabled = ref(false);
const qrCode = ref('');
const secret = ref('');
const mfaCode = ref('');
const showVerificationInput = ref(false);
const error = ref('');

onMounted(async () => {
  const username = props.user;
  try {
    const response = await fetch('/api/twofa-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify({ username }),
    });
    const data = await response.json();
    if (data.enabled) {
      isTwoFaEnabled.value = true;
      if (data.qrCode) {
        qrCode.value = data.qrCode;
      }
    } else {
      isTwoFaEnabled.value = false;
      qrCode.value = '';
    }
  } catch (err) {
    // Optionally handle error
  }
});

async function toggleTwoFa() {
  const enabled = !isTwoFaEnabled.value;
  const username = props.user;

  if (enabled) {
    // If already enabled, just fetch the current QR code
    if (isTwoFaEnabled.value) {
      try {
        const response = await fetch('/api/twofa-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': props.apiKey,
          },
          body: JSON.stringify({ username }),
        });
        const data = await response.json();
        if (data.qrCode) {
          qrCode.value = data.qrCode;
          showVerificationInput.value = false;
          error.value = '';
        } else {
          error.value = data.message || 'No QR code found.';
        }
      } catch (err) {
        error.value = err.message;
      }
      return;
    }
    // Otherwise, initiate 2FA
    try {
      const response = await fetch('/api/twofa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': props.apiKey,
        },
        body: JSON.stringify({ username, enabled, mode: 'initiate' }),
      });
      const data = await response.json();
      if (data.qrCode && data.secret) {
        qrCode.value = data.qrCode;
        secret.value = data.secret;
        showVerificationInput.value = true;
        isTwoFaEnabled.value = true;
        error.value = '';
      } else {
        error.value = data.message || 'Failed to initiate 2FA';
      }
    } catch (err) {
      error.value = err.message;
    }
  } else {
    // Disable 2FA
    try {
      const response = await fetch('/api/twofa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': props.apiKey,
        },
        body: JSON.stringify({ username, enabled }),
      });
      const data = await response.json();
      if (data.message === '2FA disabled') {
        isTwoFaEnabled.value = false;
        qrCode.value = '';
        secret.value = '';
        showVerificationInput.value = false;
        mfaCode.value = '';
        error.value = '';
      } else {
        error.value = data.message || 'Failed to disable 2FA';
      }
    } catch (err) {
      error.value = err.message;
    }
  }
}

async function confirmTwoFa() {
  const username = props.user;
  try {
    const response = await fetch('/api/twofa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify({
        username,
        enabled: true,
        mode: 'confirm',
        mfaCode: mfaCode.value,
        secret: secret.value,
      }),
    });
    const data = await response.json();
    if (data.message === '2FA enabled') {
      showVerificationInput.value = false;
      error.value = '';
      // Optionally show a success message
    } else {
      error.value = data.message || 'Verification failed';
    }
  } catch (err) {
    error.value = err.message;
  }
}
</script>

<style scoped>
.twofa-container {
  max-width: 400px;
  margin: 40px auto;
  padding: 20px;
  background-color: var(--base2);
  border: 1px solid var(--text2);
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
  color: var(--text1);
  margin-bottom: 20px;
}

.twofa-toggle {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.twofa-toggle-switch,
.twofa-toggle-label {
  display: inline-block;
  vertical-align: middle;
}

.twofa-toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
  background-color: var(--text1);
  border-radius: 10px;
  transition: background-color 0.3s;
  cursor: pointer;
}

.twofa-toggle-switch::before {
  content: "";
  position: absolute;
  width: 18px;
  height: 18px;
  background-color: var(--base1);
  border-radius: 50%;
  top: 1px;
  left: 1px;
  transition: transform 0.3s;
}

.twofa-toggle-switch-checked {
  background-color: var(--accent1);
}

.twofa-toggle-switch-checked::before {
  transform: translateX(20px);
}

.twofa-toggle-label {
  font-size: 14px;
  margin-left: 10px;
  margin-bottom: 2px;
  color: var(--accent1);
  font-weight: bold;
}

.qr {
  background-color: var(--base2);
  padding: 10px;
}
.twofa-btn {
  background-color: var(--accent1);
  color: var(--text3);
  border-radius: 5px;
  font-weight: bold;
  border: none;
  outline: none;
  padding: 10px;
  margin: 5px;
  width: 150px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.twofa-btn:hover {
  background-color: var(--accent2);
}

.twofa-input:focus {
  border-color: var(--accent1);
  outline: none;
}
.twofa-input {
  border-radius: 5px;
  padding: 10px 10px 10px 15px;
  margin: 7px;
  width: 160px;
  font-weight: bold;
  outline: none;
  color: var(--base3);
  transition: border-color 0.3s, box-shadow 0.3s;
  border: solid 1px var(--base4);
  background-color: var(--base4);
}
.error {
  color: #e74c3c;
  margin-top: 8px;
  font-size: 13px;
}
</style>