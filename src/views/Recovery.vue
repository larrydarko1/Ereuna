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
  import { useRouter } from 'vue-router';
  
  const recoveryKey = ref('');
  const newPassword = ref('');
  const isKeyValidated = ref(false);
  const errorMessage = ref('');
  const successMessage = ref('');
  const router = useRouter();
  const apiKey = import.meta.env.VITE_EREUNA_KEY;
  
  const validateRecoveryKey = async () => {
  try {
    const key = recoveryKey.value; // Use a different variable name to avoid confusion

    const response = await fetch('/api/recover', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ recoveryKey: key }),
    });

    if (response.ok) {
      isKeyValidated.value = true;
      successMessage.value = 'Recovery key validated. Please enter a new password.';
      errorMessage.value = '';
    } else {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Invalid recovery key');
    }
  } catch (error) {
    error.value = error.message;
    
    if (error.message) {
      errorMessage.value = error.message;
    } else {
      errorMessage.value = 'Error setting up the request';
    }
    
    successMessage.value = '';
    isKeyValidated.value = false;
  }
};
  
const changePassword = async () => {
  try {
    const response = await fetch('/api/change-password2', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        recoveryKey: recoveryKey.value,
        newPassword: newPassword.value,
      }),
    });

    if (response.ok) {
      const data = await response.json(); // Parse the response as JSON
      successMessage.value = data.message; // Use the message from the response
      errorMessage.value = '';

      // Wait 3 seconds before redirecting
      setTimeout(() => {
        router.push('/login');
      }, 3000);

      // Reset form values
      recoveryKey.value = '';
      newPassword.value = '';
      isKeyValidated.value = false;
    } else {
      const errorData = await response.json(); // Parse the error response as JSON
      errorMessage.value = errorData.message || 'Failed to change password.';
      successMessage.value = '';
    }
  } catch (error) {
    error.value = error.message;
    
    if (error.message) {
      errorMessage.value = error.message || 'An unexpected error occurred.';
    } else {
      errorMessage.value = 'An error occurred. Please try again.';
    }
    successMessage.value = ''; // Clear success message on error
  }
};

  </script>
  
  <style lang="scss" scoped>
@use '../style.scss' as *;

.recovery-container {
  display: flex;
  flex-direction: column;
  position: absolute;
  left: 50%; /* Center horizontally */
  top: 50%; /* Center vertically */
  transform: translate(-50%, -50%); /* Adjust for centering */
  align-items: center;
  justify-content: center;
}

  .container{
    display: flex;
    flex-direction: column;
    align-items: center;
  }

input {
  border-radius: 25px;
  padding: 5px 5px 5px 15px;
  margin: 7px;
  width: 300px;
  outline: none;
  color: $base3; /* Dark text color */
  transition: border-color 0.3s, box-shadow 0.3s; /* Smooth transition for focus effects */
  border: solid 1px $base4;
  background-color:$base4;
}

input:focus {
  border-color: $accent1; /* Change border color on focus */
  box-shadow: 0 0 5px rgba(140, 141, 254, 0.5); /* Subtle shadow effect */
  outline: none; /* Remove default outline */
}

button {
  background-color: transparent;
  color: $text1;
  border-radius: 10px;
  border: solid 2px $accent1;
  outline: none;
  padding: 5px;
  margin: 5px;
  width: 150px;
  cursor: pointer; /* Pointer cursor on hover */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Subtle shadow for depth */
  transition: all 0.3s ease; /* Smooth transition for hover effects */
}

button:hover {
  background-color: $accent1; /* Background color on hover */
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2); /* Enhanced shadow on hover */
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
  display: flex;
  flex-direction: column;
  position: absolute;
  left: 50%; /* Center horizontally */
  bottom: 25%; /* Center vertically */
  transform: translate(-50%, -50%); /* Adjust for centering */
  align-items: center;
  justify-content: center;
}

  </style>
