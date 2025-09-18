<template>
 <div>
          <div class="userdiv">
            <h2 style="display: flex; align-items: center; justify-content: center; gap: 5px;">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="20" height="20"
                aria-hidden="true" focusable="false">
                <path
                  d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              Change Username
            </h2>
            <div style="display: flex; justify-content: center;">
              <input class="userinput" type="text" maxlength="25" placeholder="Type New Username" v-model="newUsername"
                :class="{ 'error-input': usernameError }" />
            </div>
            <div style="display: flex; justify-content: center;">
              <p v-if="usernameError" class="error-text">{{ usernameErrorMessage }}</p>
              <p v-if="usernameSuccess" class="success-text">{{ usernameSuccessMessage }}</p>
            </div>
            <br>
            <button class="userbtn" @click="changeUsername()">Change Username</button>
          </div>
        </div>
        <div>
          <div class="userdiv">
            <h2 style="display: flex; align-items: center; justify-content: center; gap: 5px;">
              <svg width='15px' height='15px' version="1.0" id="Layer_1" xmlns="http://www.w3.org/2000/svg"
                xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64" enable-background="new 0 0 64 64"
                xml:space="preserve" fill="currentColor">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path fill="currentColor"
                    d="M52,24h-4v-8c0-8.836-7.164-16-16-16S16,7.164,16,16v8h-4c-2.211,0-4,1.789-4,4v32c0,2.211,1.789,4,4,4h40 c2.211,0,4-1.789,4-4V28C56,25.789,54.211,24,52,24z M32,48c-2.211,0-4-1.789-4-4s1.789-4,4-4s4,1.789,4,4S34.211,48,32,48z M40,24 H24v-8c0-4.418,3.582-8,8-8s8,3.582,8,8V24z">
                  </path>
                </g>
              </svg>
              Change Password
            </h2>
            <div class="changepassword">
              <div style="margin-right: 3px;">
                <div style="position: relative;">
                  <input class="userinput" placeholder="Type Old Password" :type="showOldPassword ? 'text' : 'password'"
                    v-model="oldPassword" :class="{ 'error-input': oldPasswordError }" />
                  <button @click="showOldPassword = !showOldPassword" type="button" class="password-toggle">
                    <svg v-if="showOldPassword" class="toggle-icon" viewBox="0 0 48 48"
                      xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                      <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                      <g id="SVGRepo_iconCarrier">
                        <path d="M0 0h48v48H0z" fill="none"></path>
                        <g id="Shopicon">
                          <circle cx="24" cy="24" r="4"></circle>
                          <path
                            d="M24,38c12,0,20-14,20-14s-8-14-20-14S4,24,4,24S12,38,24,38z M24,16c4.418,0,8,3.582,8,8s-3.582,8-8,8s-8-3.582-8-8 S19.582,16,24,16z">
                          </path>
                        </g>
                      </g>
                    </svg>
                    <svg v-else class="toggle-icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor">
                      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                      <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                      <g id="SVGRepo_iconCarrier">
                        <path d="M0 0h48v48H0z" fill="none"></path>
                        <g id="Shopicon">
                          <path
                            d="M11.957,33.214L7.171,38L10,40.828l5.305-5.305C17.867,36.992,20.788,38,24,38c12,0,20-14,20-14s-2.953-5.159-7.957-9.214 L40.829,10L38,7.172l-5.305,5.305C30.133,11.008,27.212,10,24,10C12,10,4,24,4,24S6.953,29.159,11.957,33.214z M16,24 c0-4.418,3.582-8,8-8c1.483,0,2.867,0.411,4.058,1.114l-3.035,3.035C24.694,20.062,24.356,20,24,20c-2.206,0-4,1.794-4,4 c0,0.356,0.062,0.694,0.149,1.023l-3.035,3.035C16.411,26.867,16,25.483,16,24z M32,24c0,4.418-3.582,8-8,8 c-1.483,0-2.867-0.411-4.058-1.114l3.035-3.035C23.306,27.938,23.644,28,24,28c2.206,0,4-1.794,4-4 c0-0.356-0.062-0.694-0.149-1.023l3.035-3.035C31.589,21.133,32,22.517,32,24z">
                          </path>
                        </g>
                      </g>
                    </svg>
                  </button>
                </div>
              </div>
              <div style="margin-right: 3px;">
                <div style="position: relative;">
                  <input class="userinput" :type="showNewPassword ? 'text' : 'password'" placeholder="Type New Password"
                    v-model="newPassword" :class="{ 'error-input': newPasswordError }" />
                  <button @click="showNewPassword = !showNewPassword" type="button" class="password-toggle">
                    <svg v-if="showNewPassword" class="toggle-icon" viewBox="0 0 48 48"
                      xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                      <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                      <g id="SVGRepo_iconCarrier">
                        <path d="M0 0h48v48H0z" fill="none"></path>
                        <g id="Shopicon">
                          <circle cx="24" cy="24" r="4"></circle>
                          <path
                            d="M24,38c12,0,20-14,20-14s-8-14-20-14S4,24,4,24S12,38,24,38z M24,16c4.418,0,8,3.582,8,8s-3.582,8-8,8s-8-3.582-8-8 S19.582,16,24,16z">
                          </path>
                        </g>
                      </g>
                    </svg>
                    <svg v-else class="toggle-icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor">
                      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                      <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                      <g id="SVGRepo_iconCarrier">
                        <path d="M0 0h48v48H0z" fill="none"></path>
                        <g id="Shopicon">
                          <path
                            d="M11.957,33.214L7.171,38L10,40.828l5.305-5.305C17.867,36.992,20.788,38,24,38c12,0,20-14,20-14s-2.953-5.159-7.957-9.214 L40.829,10L38,7.172l-5.305,5.305C30.133,11.008,27.212,10,24,10C12,10,4,24,4,24S6.953,29.159,11.957,33.214z M16,24 c0-4.418,3.582-8,8-8c1.483,0,2.867,0.411,4.058,1.114l-3.035,3.035C24.694,20.062,24.356,20,24,20c-2.206,0-4,1.794-4,4 c0,0.356,0.062,0.694,0.149,1.023l-3.035,3.035C16.411,26.867,16,25.483,16,24z M32,24c0,4.418-3.582,8-8,8 c-1.483,0-2.867-0.411-4.058-1.114l3.035-3.035C23.306,27.938,23.644,28,24,28c2.206,0,4-1.794,4-4 c0-0.356-0.062-0.694-0.149-1.023l3.035-3.035C31.589,21.133,32,22.517,32,24z">
                          </path>
                        </g>
                      </g>
                    </svg>
                  </button>
                </div>
              </div>
              <div style="margin-right: 3px;">
                <div style="position: relative;">
                  <input class="userinput" :type="showConfirmPassword ? 'text' : 'password'"
                    placeholder="Confirm New Password" v-model="confirmPassword"
                    :class="{ 'error-input': confirmPasswordError }" />
                  <button @click="showConfirmPassword = !showConfirmPassword" type="button" class="password-toggle">
                    <svg v-if="showConfirmPassword" class="toggle-icon" viewBox="0 0 48 48"
                      xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                      <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                      <g id="SVGRepo_iconCarrier">
                        <path d="M0 0h48v48H0z" fill="none"></path>
                        <g id="Shopicon">
                          <circle cx="24" cy="24" r="4"></circle>
                          <path
                            d="M24,38c12,0,20-14,20-14s-8-14-20-14S4,24,4,24S12,38,24,38z M24,16c4.418,0,8,3.582,8,8s-3.582,8-8,8s-8-3.582-8-8 S19.582,16,24,16z">
                          </path>
                        </g>
                      </g>
                    </svg>
                    <svg v-else class="toggle-icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor">
                      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                      <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                      <g id="SVGRepo_iconCarrier">
                        <path d="M0 0h48v48H0z" fill="none"></path>
                        <g id="Shopicon">
                          <path
                            d="M11.957,33.214L7.171,38L10,40.828l5.305-5.305C17.867,36.992,20.788,38,24,38c12,0,20-14,20-14s-2.953-5.159-7.957-9.214 L40.829,10L38,7.172l-5.305,5.305C30.133,11.008,27.212,10,24,10C12,10,4,24,4,24S6.953,29.159,11.957,33.214z M16,24 c0-4.418,3.582-8,8-8c1.483,0,2.867,0.411,4.058,1.114l-3.035,3.035C24.694,20.062,24.356,20,24,20c-2.206,0-4,1.794-4,4 c0,0.356,0.062,0.694,0.149,1.023l-3.035,3.035C16.411,26.867,16,25.483,16,24z M32,24c0,4.418-3.582,8-8,8 c-1.483,0-2.867-0.411-4.058-1.114l3.035-3.035C23.306,27.938,23.644,28,24,28c2.206,0,4-1.794,4-4 c0-0.356-0.062-0.694-0.149-1.023l3.035-3.035C31.589,21.133,32,22.517,32,24z">
                          </path>
                        </g>
                      </g>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div style="display: flex; justify-content: center; ">
              <p v-if="confirmPasswordError" class="error-text">Password doesn't match</p>
              <p v-if="passwordSuccess" class="success-text">Password changed successfully!</p>
              <p v-if="oldPasswordError" class="error-text">Password is incorrect</p>
            </div>
            <br>
            <button class="userbtn" @click="changePassword()">Change Password</button>
          </div>
        </div>
        <div>
          <div class="userdiv">
            <h2 style="display: flex; align-items: center; justify-content: center; gap: 3px;">
              <svg viewBox="0 0 1024.00 1024.00" height="20" width="20" version="1.1" xmlns="http://www.w3.org/2000/svg"
                fill="currentColor" stroke="currentColor" stroke-width="17.408"
                transform="matrix(1, 0, 0, 1, 0, 0)rotate(45)">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"
                  stroke-width="2.048"></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                    d="M529.216 481.664V315.648H593.28a32.832 32.832 0 0 0 0-65.6H529.216v-48.96H593.28a32.832 32.832 0 0 0 0-65.6H529.216v-38.656a32.832 32.832 0 0 0-65.6 0v384.832A240.704 240.704 0 0 0 256 719.616 240.512 240.512 0 0 0 496.384 960a240.512 240.512 0 0 0 240.448-240.384 240.704 240.704 0 0 0-207.616-237.952z m-32.832 412.736a174.912 174.912 0 0 1-174.72-174.784 174.912 174.912 0 0 1 174.72-174.784 174.912 174.912 0 0 1 174.784 174.72 174.592 174.592 0 0 1-174.72 174.848z"
                    fill="currentColor"></path>
                </g>
              </svg>
              Recovery / Authentication Key
            </h2>
            <div style="position: relative;">
              <p>To generate a new recovery key, type your password</p>
              <div style="position: relative;">
                <input class="userinput" :type="showPswauth ? 'text' : 'password'" v-model="Pswauth" />
                <button @click="showPswauth = !showPswauth" type="button" class="password-toggle3">
                  <svg v-if="showPswauth" class="toggle-icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor">
                    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                    <g id="SVGRepo_iconCarrier">
                      <path d="M0 0h48v48H0z" fill="none"></path>
                      <g id="Shopicon">
                        <circle cx="24" cy="24" r="4"></circle>
                        <path
                          d="M24,38c12,0,20-14,20-14s-8-14-20-14S4,24,4,24S12,38,24,38z M24,16c4.418,0,8,3.582,8,8s-3.582,8-8,8s-8-3.582-8-8 S19.582,16,24,16z">
                        </path>
                      </g>
                    </g>
                  </svg>
                  <svg v-else class="toggle-icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor">
                    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                    <g id="SVGRepo_iconCarrier">
                      <path d="M0 0h48v48H0z" fill="none"></path>
                      <g id="Shopicon">
                        <path
                          d="M11.957,33.214L7.171,38L10,40.828l5.305-5.305C17.867,36.992,20.788,38,24,38c12,0,20-14,20-14s-2.953-5.159-7.957-9.214 L40.829,10L38,7.172l-5.305,5.305C30.133,11.008,27.212,10,24,10C12,10,4,24,4,24S6.953,29.159,11.957,33.214z M16,24 c0-4.418,3.582-8,8-8c1.483,0,2.867,0.411,4.058,1.114l-3.035,3.035C24.694,20.062,24.356,20,24,20c-2.206,0-4,1.794-4,4 c0,0.356,0.062,0.694,0.149,1.023l-3.035,3.035C16.411,26.867,16,25.483,16,24z M32,24c0,4.418-3.582,8-8,8 c-1.483,0-2.867-0.411-4.058-1.114l3.035-3.035C23.306,27.938,23.644,28,24,28c2.206,0,4-1.794,4-4 c0-0.356-0.062-0.694-0.149-1.023l3.035-3.035C31.589,21.133,32,22.517,32,24z">
                        </path>
                      </g>
                    </g>
                  </svg>
                </button>
              </div>
            </div>
            <div style="display: flex; justify-content: center; ">
              <p v-if="keyError" class="error-text">{{ keyErrorMessage }}</p>
              <p v-if="keySuccess" class="success-text">{{ keySuccessMessage }}</p>
            </div>
            <br>
            <div>
              <button class="userbtn" @click="GenerateNewKey()">Generate New Key</button>
            </div>

          </div>
          <div class="userdiv">
            <h2 style="display: flex; align-items: center; justify-content: center; gap: 5px;">
              <svg width="20" height="20" fill="currentColor" viewBox="-1.7 0 20.4 20.4"
                xmlns="http://www.w3.org/2000/svg" class="cf-icon-svg" transform="rotate(0)">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                    d="M16.417 10.283A7.917 7.917 0 1 1 8.5 2.366a7.916 7.916 0 0 1 7.917 7.917zm-6.804.01 3.032-3.033a.792.792 0 0 0-1.12-1.12L8.494 9.173 5.46 6.14a.792.792 0 0 0-1.12 1.12l3.034 3.033-3.033 3.033a.792.792 0 0 0 1.12 1.119l3.032-3.033 3.033 3.033a.792.792 0 0 0 1.12-1.12z">
                  </path>
                </g>
              </svg>
              Delete Account
            </h2>
            <p>To delete your account, type your Password</p>
            <div style="position: relative;">
              <input class="userinput" :type="showPswDelete ? 'text' : 'password'" v-model="PswDelete" />
              <button @click="showPswDelete = !showPswDelete" type="button" class="password-toggle3">
                <svg v-if="showPswDelete" class="toggle-icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor">
                  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                  <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                  <g id="SVGRepo_iconCarrier">
                    <path d="M0 0h48v48H0z" fill="none"></path>
                    <g id="Shopicon">
                      <circle cx="24" cy="24" r="4"></circle>
                      <path
                        d="M24,38c12,0,20-14,20-14s-8-14-20-14S4,24,4,24S12,38,24,38z M24,16c4.418,0,8,3.582,8,8s-3.582,8-8,8s-8-3.582-8-8 S19.582,16,24,16z">
                      </path>
                    </g>
                  </g>
                </svg>
                <svg v-else class="toggle-icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor">
                  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                  <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                  <g id="SVGRepo_iconCarrier">
                    <path d="M0 0h48v48H0z" fill="none"></path>
                    <g id="Shopicon">
                      <path
                        d="M11.957,33.214L7.171,38L10,40.828l5.305-5.305C17.867,36.992,20.788,38,24,38c12,0,20-14,20-14s-2.953-5.159-7.957-9.214 L40.829,10L38,7.172l-5.305,5.305C30.133,11.008,27.212,10,24,10C12,10,4,24,4,24S6.953,29.159,11.957,33.214z M16,24 c0-4.418,3.582-8,8-8c1.483,0,2.867,0.411,4.058,1.114l-3.035,3.035C24.694,20.062,24.356,20,24,20c-2.206,0-4,1.794-4,4 c0,0.356,0.062,0.694,0.149,1.023l-3.035,3.035C16.411,26.867,16,25.483,16,24z M32,24c0,4.418-3.582,8-8,8 c-1.483,0-2.867-0.411-4.058-1.114l3.035-3.035C23.306,27.938,23.644,28,24,28c2.206,0,4-1.794,4-4 c0-0.356-0.062-0.694-0.149-1.023l3.035-3.035C31.589,21.133,32,22.517,32,24z">
                      </path>
                    </g>
                  </g>
                </svg>
              </button>
            </div>
            <p>By proceeding with the deletion of your account, you acknowledge and understand that this action is
              irreversible. Once your account is deleted, you will permanently lose access to your account and all
              associated data, including but not limited to personal information, settings, and any content you have
              created or stored.

              Please be aware that we will not be able to recover any data or restore your account after it has been
              deleted. If you have any doubts or wish to retain your data, we strongly encourage you to reconsider
              before proceeding with the deletion.

              Thank you for your understanding.</p>
            <br>
            <button class="userbtn" @click="deleteAccount()">Delete Account</button>
          </div>
        </div>
        <div style="height: 100px"></div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ref } from 'vue';

// Notification system (assume a notification component is available)
const notification = ref({ show: (msg: string) => { alert(msg); } });

// Username change state
const usernameError = ref(false);
const usernameErrorMessage = ref('');
const usernameSuccess = ref(false);
const usernameSuccessMessage = ref('');

// Password change state
const oldPasswordError = ref(false);
const newPasswordError = ref(false);
const confirmPasswordError = ref(false);
const passwordSuccess = ref(false);

// Key generation state
const keyError = ref(false);
const keyErrorMessage = ref('');
const keySuccess = ref(false);
const keySuccessMessage = ref('');

const props = defineProps({
  user: {
    type: String,
    required: true
  },
  apiKey: {
    type: String,
    required: true
  },
  formatDate: {
    type: Function,
    required: true
  }
});

async function LogOut() {
  try {
    localStorage.clear();
    router.push({ name: 'Login' });
    setTimeout(function () {
      location.reload();
    }, 100);
  } catch (error) {
    console.error('Error logging out:', error);
  }
}
const router = useRouter();

let oldPassword = ref('');
let newPassword = ref('');
let confirmPassword = ref('');
const showOldPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);
const showPswDelete = ref(false);
const showPswauth = ref(false);

async function changePassword() {
  if (oldPassword.value === '') {
    notification.value.show('Please enter your old password');
    return;
  }

  if (newPassword.value === '') {
    notification.value.show('Please enter a new password');
    return;
  }

  if (confirmPassword.value !== newPassword.value) {
    notification.value.show('Passwords do not match');
    return;
  }

  try {
    const response = await fetch('/api/password-change', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify({ oldPassword: oldPassword.value, newPassword: newPassword.value, user: props.user }),
    });

    const data = await response.json();

    if (data.confirm) {
      notification.value.show('Password changed successfully');
      // Password changed successfully
    } else if (data.error === 'old_password_incorrect') {
      notification.value.show('Old password is incorrect');
    } else {
      notification.value.show('Failed to change password');
    }
  } catch (error) {
    notification.value.show('Failed to change password');
  }
}

let newUsername = ref('');

async function changeUsername() {
  if (newUsername.value === '') {
    notification.value.show('Please enter a new username');
    return;
  }

  if (newUsername.value === props.user) {
    notification.value.show('Current username and new username cannot be the same');
    return;
  }

  try {
    const response = await fetch('/api/change-username', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify({ newUsername: newUsername.value, user: props.user }),
    });

    const data = await response.json();

    if (data.error === 'username_taken') {
      notification.value.show('Username already taken');
    } else if (data.error === 'current username and new username cannot be the same') {
      notification.value.show('Current username and new username cannot be the same');
    } else if (data.confirm) {
      // Username changed successfully
      notification.value.show('Username changed successfully!');
      setTimeout(() => {
        LogOut();
      }, 3000);
    } else {
      notification.value.show('Failed to change username');
    }
  } catch (error) {
    notification.value.show('Failed to change username');
  }
}

let PswDelete = ref('');

async function deleteAccount() {
  if (PswDelete.value === '') {
    notification.value.show('Please enter your password');
    return;
  }

  try {
    const response = await fetch('/api/account-delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify({ user: props.user, password: PswDelete.value }),
    });

    const data = await response.json();

    if (data.error === 'password_incorrect') {
      notification.value.show('Password is incorrect');
    } else if (data.confirm) {
      // Account deleted successfully
      notification.value.show('Account deleted successfully!');
      await LogOut(); // Call LogOut function after successful deletion
    } else {
      notification.value.show('Failed to delete account');
    }
  } catch (error) {
    notification.value.show('Failed to delete account');
  }
}

const Pswauth = ref('');

async function GenerateNewKey() {

  // Validate password input
  if (!Pswauth.value.trim()) {
    notification.value.show('Please enter your password');
    return;
  }

  try {
    // Call the generate-key endpoint
    const response = await fetch('/api/generate-key', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify({
        user: props.user, // Use .value if user is a ref
        password: Pswauth.value // Send the password
      }),
    });

    const data = await response.json();

    if (response.ok) {
      if (data.confirm) {
        // Key generation successful
        notification.value.show('New key generated successfully!');

        // Trigger download of the raw key
        const rawAuthKey = data.rawAuthKey; // Raw key returned from the endpoint
        if (rawAuthKey) {
          // Create and trigger file download
          const blob = new Blob([rawAuthKey], { type: 'text/plain' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `${props.user}_recovery_key.txt`; // Use the username for the filename
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
        }

        // Clear password
        Pswauth.value = '';
      } else {
        // Handle unexpected response
        notification.value.show('An unexpected error occurred');
      }
    } else {
      // Handle API errors
      notification.value.show(data.message || 'An error occurred');
    }
  } catch (error) {
    notification.value.show('Network error. Please try again.');
  }
}
</script>

<style scoped>
.error-input {
  border: 1px solid red;
}

.error-text {
  color: red;
  border: 1px solid red;
  font-size: 12px;
  margin-bottom: 10px;
  padding: 4px;
}

.success-text {
  color: green;
  border: 1px solid green;
  font-size: 12px;
  margin-bottom: 10px;
  padding: 4px;
}

.userbtn {
  background-color: var(--accent1);
  color: var(--text3);
  border-radius: 5px;
  border: none;
  font-weight: bold;
  outline: none;
  padding: 10px;
  margin: 5px;
  width: 150px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.userbtn:disabled , .userbtn:disabled:hover {
  cursor: not-allowed;
  background-color: var(--base3);
}

.userbtn:hover {
  background-color: var(--accent2);
}

/* inputs for settings */
.userinput {
  border-radius: 5px;
  padding: 10px 10px 10px 15px;
  margin: 7px;
  width: 160px;
  outline: none;
  color: var(--text2);
  transition: border-color 0.3s, box-shadow 0.3s;
  border: solid 1px var(--base4);
  background-color: var(--base4);
}

.userinput:focus {
  border-color: var(--accent1);
  outline: none;
}

.password-toggle {
  position: absolute;
  right: 5%;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 10px;
  color: var(--text1);
  opacity: 0.60;
}

.password-toggle2 {
  position: absolute;
  right: 42%;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 10px;
  color: var(--text1);
  opacity: 0.60;
}

.password-toggle3 {
  position: absolute;
  left: 56%;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 10px;
  color: var(--text1);
  opacity: 0.60;
}

.userdiv {
  background-color: var(--base2);
  width: 100%;
  padding: 15px;
  margin: 0 auto;
  margin-bottom: 5px;
  margin-left: 5px;
}

.toggle-icon {
  width: 15px;
  cursor: pointer;
}

.changepassword {
  display: flex;
  justify-content: center;
}
</style>