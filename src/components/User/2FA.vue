<template>
  <div class="twofa-container">
    <h1 class="twofa-title">Two-Factor Authentication</h1>
    <p class="twofa-instruction">
      To enable two-factor authentication, toggle the switch below. After scanning the generated QR code with your authenticator app, enter the 6-digit code from your app and click "Confirm 2FA" to complete setup.
    </p>
    <div class="twofa-toggle">
      <label>
        <div class="twofa-toggle-switch" :class="{ 'twofa-toggle-switch-checked': isTwoFaEnabled }"
          @click="toggleTwoFa()"
          role="switch"
          :aria-checked="isTwoFaEnabled ? 'true' : 'false'"
          aria-label="Enable two-factor authentication toggle"
        ></div>
        <span class="twofa-toggle-label">Enable 2FA</span>
      </label>
    </div>
    <div v-if="isTwoFaEnabled">
      <div class="qr">
        <qrcode-vue v-if="qrCode" :value="qrCode"></qrcode-vue>
      </div>
      <br><br>
      <div v-if="showVerificationInput">
        <div class="twofa-row">
          <input v-model="mfaCode" placeholder="Enter verification code" class="twofa-input" maxlength="6" inputmode="numeric" pattern="[0-9]*" />
          <button class="twofa-btn" @click="confirmTwoFa" :disabled="loading">
            <span class="btn-content-row">
              <span v-if="loading" class="loader4">
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
              <span v-if="!loading">Confirm 2FA</span>
              <span v-else style="margin-left: 8px;">Processing...</span>
            </span>
          </button>
        </div>
        <div v-if="error" class="error">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import QrcodeVue from 'qrcode.vue'
import { ref, onMounted, defineEmits } from 'vue';

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

const emit = defineEmits(['notify']);

const isTwoFaEnabled = ref(false);
const qrCode = ref('');
const secret = ref('');
const mfaCode = ref('');
const showVerificationInput = ref(false);
const error = ref('');
const loading = ref(false);

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
        let errorMsg = 'Unknown error';
        if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string') {
          errorMsg = (err as any).message;
        } else if (typeof err === 'string') {
          errorMsg = err;
        }
        error.value = errorMsg;
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
      let errorMsg = 'Unknown error';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string') {
        errorMsg = (err as any).message;
      } else if (typeof err === 'string') {
        errorMsg = err;
      }
      error.value = errorMsg;
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
        emit('notify', 'Two-factor authentication disabled.');
      } else {
        error.value = data.message || 'Failed to disable 2FA';
        emit('notify', error.value);
      }
    } catch (err) {
      let errorMsg = 'Unknown error';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string') {
        errorMsg = (err as any).message;
      } else if (typeof err === 'string') {
        errorMsg = err;
      }
      error.value = errorMsg;
    }
  }
}

async function confirmTwoFa() {
  const username = props.user;
  loading.value = true;
  error.value = '';
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
      emit('notify', 'Two-factor authentication enabled!');
    } else {
      error.value = data.message && typeof data.message === 'string' ? data.message : 'Verification failed';
      emit('notify', error.value);
    }
  } catch (err) {
    error.value = 'Something went wrong. Please try again.';
    emit('notify', error.value);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.twofa-container {
  padding: 20px;
  margin-left: 5px;
  background-color: var(--base2);
}

.twofa-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
  color: var(--text1);
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
  padding: 0 16px;
  margin: 5px;
  width: 150px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
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
  padding: 0 16px;
  margin: 7px;
  width: 160px;
  height: 40px;
  font-weight: bold;
  outline: none;
  color: var(--base3);
  transition: border-color 0.3s, box-shadow 0.3s;
  border: solid 1px var(--base4);
  background-color: var(--base4);
  color: var(--text1);
}
.error {
  color: #e74c3c;
  margin-top: 8px;
  font-size: 13px;
}

.twofa-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}

/* Spinner and loader4 styles from Renew.vue */
.btn-content-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.loader4 {
  display: flex;
  align-items: center;
  height: 24px;
  margin-right: 10px;
}
.spinner {
  animation: rotate 2s linear infinite;
  width: 24px;
  height: 24px;
}
.path {
  stroke: #000000;
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
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
</style>