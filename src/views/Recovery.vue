<template>
  <div class="recovery-container">
    <img class="logo" style="margin-bottom: 30px;" src="@/assets/icons/owl.png" alt="Logo" />
    <br />
    <div class="container" v-if="!isKeyValidated">
      <div class="input-group">
        <input
          required
          type="text"
          :class="recoveryKeyError ? 'error' : ''"
          v-model="recoveryKey"
          autocomplete="off"
          class="input"
        />
        <label :class="recoveryKeyError ? 'error' : ''" class="recovery-label">Paste your Recovery Key</label>
      </div>
      <button @click="validateRecoveryKey">Recover Account</button>
    </div>

    <div class="container" v-if="isKeyValidated">
      <div class="input-group">
        <input
          required
          type="password"
          :class="newPasswordError ? 'error' : ''"
          v-model="newPassword"
          autocomplete="off"
          class="input"
        />
        <label :class="newPasswordError ? 'error' : ''" class="password-label">New Password</label>
      </div>
      <button @click="changePassword">Change Password</button>
    </div>
  </div>
  <NotificationPopup ref="notification" />
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import NotificationPopup from '@/components/NotificationPopup.vue';

const notification = ref(null);
const recoveryKey = ref('');
const newPassword = ref('');
const isKeyValidated = ref(false);
const recoveryKeyError = ref(false);
const newPasswordError = ref(false);
const router = useRouter();
const apiKey = import.meta.env.VITE_EREUNA_KEY;

const validateRecoveryKey = async () => {
  recoveryKeyError.value = false;
  if (!recoveryKey.value.trim()) {
    notification.value.show('Please enter your recovery key.');
    recoveryKeyError.value = true;
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
    } else {
      const errorData = await response.json();
      notification.value.show(errorData.message || 'Invalid recovery key.');
      recoveryKeyError.value = true;
    }
  } catch {
    notification.value.show('Error validating recovery key.');
    recoveryKeyError.value = true;
  }
};

const changePassword = async () => {
  newPasswordError.value = false;
  if (!newPassword.value.trim()) {
    notification.value.show('Please enter a new password.');
    newPasswordError.value = true;
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
      notification.value.show('Password changed successfully!');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } else {
      const errorData = await response.json();
      notification.value.show(errorData.message || 'Failed to change password.');
      newPasswordError.value = true;
    }
  } catch {
    notification.value.show('Error changing password.');
    newPasswordError.value = true;
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
  background-color: #2c2b3e;
  padding: 1.5rem;
  font-size: 1.2rem;
  width: 500px;
  color: #f5f5f5;
  transition: border 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.input:focus,
.input:valid {
  outline: none;
  border: 2px solid #8c8dfe;
}

.recovery-label,
.password-label {
  text-align: center;
  position: absolute;
  left: 30px;
  bottom: 45px;
  color: #cdcdcd;
  pointer-events: none;
  transform: translateY(1.5rem);
  transition: 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.input:focus + .recovery-label,
.input:focus + .password-label {
  transform: translateY(-50%) scale(0.8);
  background-color: #212121;
  padding: 0 0.4em;
  color: #8c8dfe;
}

.input:valid + .recovery-label,
.input:valid + .password-label {
  transform: translateY(-50%) scale(0.8);
  background-color: #212121;
  padding: 0 0.4em;
  color: #8c8dfe;
}

button {
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
  font-size: 16px;
  font-weight: 500;
}

button:hover {
  background-color: #8c8dfe;
  color: white;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  transform: scale(1.05);
  transition: all 0.3s ease-in-out;
}

button:active {
  transform: scale(0.95);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.1s ease-out;
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

/* Mobile version */
@media (max-width: 1150px) {
  button {
  background-color: transparent;
  color: $text1;
  border-radius: 10px;
  outline: none;
  border: solid 3px #8c8dfe;
  padding: 10px;
  margin: 10px;
  width: 200px;
  cursor: pointer;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  font-size: 16px;
  font-weight: 500;
}

.logo {
  align-items: center;
  justify-content: center;
  width: 80px;
  margin: 10px;
}

.input {
  border: solid 2px transparent;
  border-radius: 1.5rem;
  background-color: #2c2b3e;
  padding: 1.5rem;
  font-size: 1.2rem;
  width: 300px;
  color: #f5f5f5;
  transition: border 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
}
</style>