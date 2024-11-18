<template>
    <div class="recovery-container">
      <img class="logo" style="margin-bottom: 30px;" src="@/assets/icons/owl.png" alt="">
     <br>
      <div class="container" v-if="!isKeyValidated">
        <input
          type="text"
          v-model="recoveryKey"
          placeholder="Enter your recovery key"
        />
        <button @click="validateRecoveryKey">Recover Account</button>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </div>
  
      <div class="container" v-if="isKeyValidated">
        <input
          type="password"
          v-model="newPassword"
          placeholder="Enter new password"
        />
        <button @click="changePassword">Change Password</button>
      </div>
    </div>
    <div class="message-container">
      <p v-if="successMessage" class="success">{{ successMessage }}</p>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  import axios from 'axios';
  import { useRouter } from 'vue-router';
  
  const recoveryKey = ref('');
  const newPassword = ref('');
  const isKeyValidated = ref(false);
  const errorMessage = ref('');
  const successMessage = ref('');
  const router = useRouter();
  
  const validateRecoveryKey = async () => {
  try {
    const key = recoveryKey.value; // Use a different variable name to avoid confusion

    const response = await axios.post('/api/recover', { recoveryKey: key });

    if (response.status === 200) {
      isKeyValidated.value = true;
      successMessage.value = 'Recovery key validated. Please enter a new password.';
      errorMessage.value = '';
    } 
  } catch (error) {
    console.error('Validation Error:', error);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      errorMessage.value = error.response.data.message || 'Invalid recovery key';
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage.value = 'No response from server';
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage.value = 'Error setting up the request';
    }
    
    successMessage.value = '';
    isKeyValidated.value = false;
  }
};
  
const changePassword = async () => {
  try {
    const response = await axios.patch('/api/change-password2', {
      recoveryKey: recoveryKey.value,
      newPassword: newPassword.value,
    });

    if (response.status === 200 && response.data.success) {
      successMessage.value = 'Password changed successfully! Please use your new credentials to log in. You will be automatically redirected to the login page in 10 seconds. Remember to generate a new Auth key in the user section';
      errorMessage.value = '';
      
      // Wait 5 seconds before redirecting
      setTimeout(() => {
        router.push('/login');
      }, 10000);

      // Reset form values
      recoveryKey.value = '';
      newPassword.value = '';
      isKeyValidated.value = false;
    } else {
      errorMessage.value = response.data.message || 'Failed to change password.';
      successMessage.value = '';
    }
  } catch (error) {
    if (error.response) {
      errorMessage.value = error.response.data.message || 'An error occurred. Please try again.';
    } else if (error.request) {
      errorMessage.value = 'No response from server. Please check your connection.';
    } else {
      errorMessage.value = error.message || 'An unexpected error occurred.';
    }
  }
};

  </script>
  
  <style scoped>
  .recovery-container {
    display: flex;
  flex-direction: column;
  position: absolute;
  align-items: center;
  justify-content: center;
  left: 44%;
  top: 30%;
  }

  .container{
    display: flex;
    flex-direction: column;
    align-items: center;
  }

input {
  border-radius: 25px;
  padding: 5px;
  margin: 7px;
  width: 190%;
  outline: none;
  border: solid 1px #171728;
}

input:focus {
  border-color: #8c8dfe;
}

button {
  background-color: transparent;
  color: whitesmoke;
  border-radius: 10px;
  outline: none;
  border: solid 2px #8c8dfe;
  padding: 5px;
  margin: 5px;
  width: 120%;
}

button:hover {
  cursor: pointer;
  background-color: #8c8dfe;
}
  
  .error {
    color: red;
  }
  
  .success {
    color: green;
  }

  .logo {
  align-items: center;
  justify-content: center;
  width: 70px;
  margin: 10px;
}

.message-container{
 text-align: center;
}

  </style>