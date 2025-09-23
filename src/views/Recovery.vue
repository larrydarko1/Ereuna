<template>
  <div class="recovery-container">
    <img class="logo" style="margin-bottom: 30px;" src="@/assets/icons/owl.png" alt="Logo" draggable="false" />
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
        <span v-if="loading">Validating...</span>
        <span v-else>Recover Account</span>
      </button>
    </div>

    <div class="container" v-if="isKeyValidated">
      <div class="input-group">
        <input
          id="newPasswordInput"
          required
          type="password"
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
        <span v-if="newPasswordError" id="newPasswordErrorMsg" class="sr-only">Invalid password</span>
      </div>
      <div class="input-group">
        <input
          id="confirmPasswordInput"
          required
          type="password"
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
        <span v-if="confirmPasswordError" id="confirmPasswordErrorMsg" class="sr-only">Passwords do not match</span>
      </div>
      <button class="userbtn" @click="changePassword" :disabled="loading">
        <span v-if="loading">Changing...</span>
        <span v-else>Change Password</span>
      </button>
    </div>
  </div>
  <NotificationPopup ref="notification" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import NotificationPopup from '@/components/NotificationPopup.vue';

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
  border-radius: 1.5rem;
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
  color: #8c8dfe;
}

.input:valid + .recovery-label,
.input:valid + .password-label {
  transform: translateY(-50%) scale(0.8);
  background-color: $base2;
  padding: 0 0.4em;
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
  color: $text4;
  border-radius: 10px;
  outline: none;
  border: none;
  padding: 10px;
  margin: 10px;
  width: 400px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 16px;
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
  width: 90px;
  margin: 10px;
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
  width: 80px;
  margin: 10px;
}

.userbtn {
  width: 60%;
}

.input {
  border: solid 2px transparent;
  border-radius: 1.5rem;
  background-color: $base2;
  padding: 1.5rem;
  font-size: 1.2rem;
  width: 300px;
  color: $text1;
  transition: border 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
}
</style>