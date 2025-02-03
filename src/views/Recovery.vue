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
  
  const validateRecoveryKey = async () => {
  try {
    const key = recoveryKey.value; // Use a different variable name to avoid confusion

    const response = await fetch('/api/recover', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    console.error('Validation Error:', error);
    
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
    console.error('Change Password Error:', error);
    
    if (error.message) {
      errorMessage.value = error.message || 'An unexpected error occurred.';
    } else {
      errorMessage.value = 'An error occurred. Please try again.';
    }
    successMessage.value = ''; // Clear success message on error
  }
};

  </script>
  
  <style scoped>
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