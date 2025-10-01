<template>
  <div class="recovery-container">
  <img class="logo" style="margin-bottom: 30px;" src="@/assets/icons/ereuna.png" alt="Logo" draggable="false" />
    <br />
  <div class="container" v-if="!isKeyValidated">
      <div class="input-group">
        <input
          id="recoveryKeyInput"
          required
          type="text"
          :class="recoveryKeyError ? 'error' : ''"
          v-model="recoveryKey"
          autocomplete="off"
          class="input"
          maxlength="128"
          aria-label="Recovery Key"
          :aria-invalid="recoveryKeyError ? 'true' : 'false'"
          aria-describedby="recoveryKeyError ? 'recoveryKeyErrorMsg' : null"
        />
        <label :for="'recoveryKeyInput'" :class="recoveryKeyError ? 'error' : ''" class="recovery-label">Paste your Recovery Key</label>
        <span v-if="recoveryKeyError" id="recoveryKeyErrorMsg" class="sr-only">Invalid recovery key</span>
      </div>
      <button class="userbtn" @click="validateRecoveryKey" :disabled="loading">
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
          <span v-if="!loading">Recover Account</span>
          <span v-else style="margin-left: 8px;">Validating...</span>
        </span>
      </button>
    </div>

  <div class="container" v-if="isKeyValidated">
      <div class="input-group">
        <input
          id="newPasswordInput"
          required
          :type="showNewPassword ? 'text' : 'password'"
          :class="newPasswordError ? 'error' : ''"
          v-model="newPassword"
          autocomplete="off"
          class="input"
          maxlength="40"
          aria-label="New Password"
          :aria-invalid="newPasswordError ? 'true' : 'false'"
          aria-describedby="newPasswordError ? 'newPasswordErrorMsg' : null"
        />
        <label :for="'newPasswordInput'" :class="newPasswordError ? 'error' : ''" class="password-label">New Password</label>
        <button
          type="button"
          class="toggle-password"
          @click="showNewPassword = !showNewPassword"
          :aria-pressed="showNewPassword ? 'true' : 'false'"
          aria-label="Toggle new password visibility"
        >
          <img :src="showNewPassword ? hideIcon : showIcon" alt="Toggle Password Visibility" class="toggle-icon" />
        </button>
        <span v-if="newPasswordError" id="newPasswordErrorMsg" class="sr-only">Invalid password</span>
      </div>
      <div class="input-group">
        <input
          id="confirmPasswordInput"
          required
          :type="showConfirmPassword ? 'text' : 'password'"
          :class="confirmPasswordError ? 'error' : ''"
          v-model="confirmPassword"
          autocomplete="off"
          class="input"
          maxlength="40"
          aria-label="Confirm Password"
          :aria-invalid="confirmPasswordError ? 'true' : 'false'"
          aria-describedby="confirmPasswordError ? 'confirmPasswordErrorMsg' : null"
        />
        <label :for="'confirmPasswordInput'" :class="confirmPasswordError ? 'error' : ''" class="password-label">Confirm Password</label>
        <button
          type="button"
          class="toggle-password"
          @click="showConfirmPassword = !showConfirmPassword"
          :aria-pressed="showConfirmPassword ? 'true' : 'false'"
          aria-label="Toggle confirm password visibility"
        >
          <img :src="showConfirmPassword ? hideIcon : showIcon" alt="Toggle Password Visibility" class="toggle-icon" />
        </button>
        <span v-if="confirmPasswordError" id="confirmPasswordErrorMsg" class="sr-only">Passwords do not match</span>
      </div>
      <button class="userbtn" @click="changePassword" :disabled="loading">
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
          <span v-if="!loading">Change Password</span>
          <span v-else style="margin-left: 8px;">Changing...</span>
        </span>
      </button>
    </div>
    <div class="disclaimer">
      <p><strong>Disclaimer:</strong> You can obtain a recovery key from the Account section after logging in. Keep your recovery key safe and do not share it with anyone. If you lose your recovery key, account recovery may not be possible. For further assistance, contact support.</p>
    </div>
  </div>
  <NotificationPopup ref="notification" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import NotificationPopup from '@/components/NotificationPopup.vue';
import hideIcon from '@/assets/icons/hide.png';
import showIcon from '@/assets/icons/show.png';

const notification = ref<InstanceType<typeof NotificationPopup> | null>(null);
const recoveryKey = ref<string>('');
const newPassword = ref<string>('');
const confirmPassword = ref<string>('');
const isKeyValidated = ref<boolean>(false);
const recoveryKeyError = ref<boolean>(false);
const newPasswordError = ref<boolean>(false);
const confirmPasswordError = ref<boolean>(false);
const loading = ref<boolean>(false);
const router = useRouter();
const apiKey: string = import.meta.env.VITE_EREUNA_KEY;

// Password visibility toggles
const showNewPassword = ref<boolean>(false);
const showConfirmPassword = ref<boolean>(false);

function validateRecoveryKeyFormat(key: string): string | null {
  const trimmed = key.trim();
  if (!trimmed) return 'Recovery key is required.';
  if (trimmed.length < 64 || trimmed.length > 128) return 'Invalid recovery key format (length).';
  if (!/^[0-9a-fA-F]+$/.test(trimmed)) return 'Recovery key must be a hexadecimal string.';
  return null;
}

function validatePasswordFormat(password: string): string | null {
  const trimmed = password.trim();
  if (!trimmed) return 'Password is required.';
  if (trimmed.length < 5 || trimmed.length > 40) return 'Password must be between 5 and 40 characters.';
  return null;
}

const validateRecoveryKey = async (): Promise<void> => {
  recoveryKeyError.value = false;
  loading.value = true;
  const errorMsg = validateRecoveryKeyFormat(recoveryKey.value);
  if (errorMsg) {
    notification.value?.show(errorMsg);
    recoveryKeyError.value = true;
    loading.value = false;
    return;
  }

  try {
    const response = await fetch('/api/recover', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ recoveryKey: recoveryKey.value.trim() }),
    });

    if (response.ok) {
      isKeyValidated.value = true;
      notification.value?.show('Recovery key validated. Please set your new password.');
    } else {
      const errorData = await response.json();
      notification.value?.show(errorData.message || 'Invalid recovery key.');
      recoveryKeyError.value = true;
    }
  } catch (e) {
    notification.value?.show('Error validating recovery key.');
    recoveryKeyError.value = true;
  } finally {
    loading.value = false;
  }
};

const changePassword = async (): Promise<void> => {
  newPasswordError.value = false;
  confirmPasswordError.value = false;
  loading.value = true;
  const passwordError = validatePasswordFormat(newPassword.value);
  if (passwordError) {
    notification.value?.show(passwordError);
    newPasswordError.value = true;
    loading.value = false;
    return;
  }
  if (newPassword.value.trim() !== confirmPassword.value.trim()) {
    notification.value?.show('Passwords do not match.');
    confirmPasswordError.value = true;
    loading.value = false;
    return;
  }

  try {
    const response = await fetch('/api/change-password2', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        recoveryKey: recoveryKey.value.trim(),
        newPassword: newPassword.value.trim(),
      }),
    });

    if (response.ok) {
      notification.value?.show('Password changed successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } else {
      const errorData = await response.json();
      notification.value?.show(errorData.message || 'Failed to change password.');
      newPasswordError.value = true;
    }
  } catch (e) {
    notification.value?.show('Error changing password.');
    newPasswordError.value = true;
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped lang="scss">
@use '../style.scss' as *;

.disclaimer {
  margin-top: 30px;
  font-size: 1rem;
  color: $text2;
  text-align: center;
  max-width: 500px;
  padding: 0 10px;
  line-height: 1.5;
}

.recovery-container {
  display: flex;
  flex-direction: column;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  align-items: center;
  justify-content: center;
}

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.input-group {
  position: relative;
  padding: 1rem;
}

.input {
  border: solid 2px transparent;
  border-radius: 5px;
  background-color: $base2;
  padding: 1.5rem;
  font-size: 1.2rem;
  width: 500px;
  color: $text2;
  transition: border 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.input:focus,
.input:valid {
  outline: none;
  border: 2px solid $accent1;
}

.recovery-label,
.password-label {
  text-align: center;
  position: absolute;
  left: 30px;
  bottom: 45px;
  color: $text2;
  pointer-events: none;
  transform: translateY(1.5rem);
  transition: 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.input:focus + .recovery-label,
.input:focus + .password-label {
  transform: translateY(-50%) scale(0.8);
  background-color: $base2;
  padding: 0 0.4em;
  color: $accent1;
}

.input:valid + .recovery-label,
.input:valid + .password-label {
  transform: translateY(-50%) scale(0.8);
  background-color: $base2;
  padding: 0 0.4em;
  color: $accent1;
}

.userbtn {
  background-color: $accent1;
  text-align: center;
  display: flex;
  flex-direction: row;
  align-items: center;
  align-content: center;
  justify-content: center;
  color: $text4;
  border-radius: 5px;
  outline: none;
  border: none;
  padding: 10px;
  height: 40px;
  margin: 10px;
  width: 400px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
}

.userbtn:hover {
  background-color: $accent2;
}

.error {
  color: red;
  border-color: red !important;
}

.logo {
  align-items: center;
  justify-content: center;
  width: 300px;
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
  padding: 0;
}

.toggle-icon {
  width: 28px;
  height: auto;
  opacity: 0.7;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Mobile version */
@media (max-width: 1150px) {

.logo {
  align-items: center;
  justify-content: center;
  width: 300px;
  margin: 10px;
}

.userbtn {
  width: 60%;
}

.input {
  border: solid 2px transparent;
  border-radius: 5px;
  background-color: $base2;
  padding: 1.5rem;
  font-size: 1.2rem;
  width: 300px;
  color: $text1;
  transition: border 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
}
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
    height: 20px;
    margin-right: 10px;
  }
  .spinner {
    animation: rotate 2s linear infinite;
    width: 25px;
    height: 25px;
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