<template>
 <div>
          <div class="userdiv">
            <h2 class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="24" height="24"
                aria-hidden="true" focusable="false">
                <path
                  d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              Change Username
            </h2>
              <div style="display: flex; justify-content: center;">
                <div class="solo-wrapper">
                  <input class="userinput solo-input" type="text" maxlength="25" placeholder="Type New Username" v-model="newUsername"
                    :class="{ 'error-input': usernameError }" aria-label="New Username" />
                </div>
              </div>
            <br>
            <button class="userbtn" @click="changeUsername()" :disabled="loading.username" aria-label="Change Username">
              <span class="btn-content-row">
                <span v-if="loading.username" class="loader4">
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
                <span v-if="!loading.username">Change Username</span>
                <span v-else style="margin-left: 8px;">Processing...</span>
              </span>
            </button>
          </div>
        </div>
        <div>
          <div class="userdiv">
            <h2 class="section-title">
              <svg width='24px' height='24px' version="1.0" id="Layer_1" xmlns="http://www.w3.org/2000/svg"
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
                    v-model="oldPassword" :class="{ 'error-input': oldPasswordError }" aria-label="Old Password"/>
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
                    v-model="newPassword" :class="{ 'error-input': newPasswordError }" aria-label="New Password"/>
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
                    :class="{ 'error-input': confirmPasswordError }" aria-label="Confirm New Password"/>
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
            <br>
            <button class="userbtn" @click="changePassword()" :disabled="loading.password" aria-label="Change Password">
              <span class="btn-content-row">
                <span v-if="loading.password" class="loader4">
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
                <span v-if="!loading.password">Change Password</span>
                <span v-else style="margin-left: 8px;">Processing...</span>
              </span>
            </button>
          </div>
        </div>
        <div>
          <div class="userdiv">
            <h2 class="section-title">
              <svg viewBox="0 0 1024.00 1024.00" height="24" width="24" version="1.1" xmlns="http://www.w3.org/2000/svg"
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
              <div class="solo-wrapper" style="position: relative;">
                <input class="userinput solo-input" :type="showPswauth ? 'text' : 'password'" v-model="Pswauth" aria-label="Password for Recovery Key"/>
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
            <br>
            <div>
              <button class="userbtn" @click="GenerateNewKey()" :disabled="loading.key" aria-label="Generate New Recovery Key">
                <span class="btn-content-row">
                  <span v-if="loading.key" class="loader4">
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
                  <span v-if="!loading.key">Generate New Key</span>
                  <span v-else style="margin-left: 8px;">Processing...</span>
                </span>
              </button>
            </div>

          </div>
          <div class="userdiv">
            <h2 class="section-title">
              <svg width="24" height="24" fill="currentColor" viewBox="-1.7 0 20.4 20.4"
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
            <div class="solo-wrapper" style="position: relative;">
              <input class="userinput solo-input" :type="showPswDelete ? 'text' : 'password'" v-model="PswDelete" aria-label="Password for Account Deletion"/>
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
            <div class="disclaimer">
              <p><strong>Warning — this action is irreversible.</strong> Deleting your account will permanently remove your access and all associated data, including personal information, settings, and any content you have created or stored. This data cannot be recovered or restored.</p>

              <p><strong>Before you proceed, we strongly recommend:</strong></p>
              <ul>
                <li>Download any important documents (for example, receipts or invoices).</li>
                <li>Request refunds for eligible purchases — refunds may be difficult or impossible to process after deletion.</li>
              </ul>

              <p>Please review the above carefully. If you are unsure or wish to retain your data, do not proceed with deletion.</p>
            </div>
            <br>
            <button class="userbtn" @click="deleteAccount()" :disabled="loading.delete" aria-label="Delete Account">
              <span class="btn-content-row">
                <span v-if="loading.delete" class="loader4">
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
                <span v-if="!loading.delete">Delete Account</span>
                <span v-else style="margin-left: 8px;">Processing...</span>
              </span>
            </button>
          </div>
        </div>
        <div style="height: 100px"></div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ref } from 'vue';
import { defineEmits } from 'vue';

// Notification system (assume a notification component is available)
const emit = defineEmits(['notify']);

// Username change state
const usernameError = ref(false);

// Password change state
const oldPasswordError = ref(false);
const newPasswordError = ref(false);
const confirmPasswordError = ref(false);

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

const loading = ref({
  username: false,
  password: false,
  key: false,
  delete: false
});

async function changePassword() {
  oldPasswordError.value = false;
  newPasswordError.value = false;
  confirmPasswordError.value = false;
  if (oldPassword.value === '') {
    oldPasswordError.value = true;
    emit('notify', 'Please enter your old password');
    return;
  }

  if (newPassword.value === '') {
    newPasswordError.value = true;
    emit('notify', 'Please enter a new password');
    return;
  }

  if (confirmPassword.value !== newPassword.value) {
    confirmPasswordError.value = true;
    emit('notify', 'Passwords do not match');
    return;
  }
  loading.value.password = true;
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

    // Enhanced error handling for backend errors
    if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      // Highlight fields based on error field
      for (const err of data.errors) {
        if (err.field === 'oldPassword') oldPasswordError.value = true;
        if (err.field === 'newPassword') newPasswordError.value = true;
        if (err.field === 'confirmPassword') confirmPasswordError.value = true;
      }
      emit('notify', data.errors[0].message || 'Failed to change password');
    } else if (data.error === 'old_password_incorrect' || data.message === 'Current password is incorrect') {
      oldPasswordError.value = true;
      emit('notify', 'Old password is incorrect');
    } else if (data.message === 'New password must be different from the current password') {
      newPasswordError.value = true;
      emit('notify', 'New password must be different from the current password');
    } else if (data.confirm) {
      emit('notify', 'Password changed successfully');
      // Password changed successfully
    } else {
      emit('notify', 'Failed to change password');
    }
  } catch (error) {
    emit('notify', 'Failed to change password');
  } finally {
    loading.value.password = false;
  }
}

let newUsername = ref('');

async function changeUsername() {
  usernameError.value = false;
  if (newUsername.value === '') {
    usernameError.value = true;
    emit('notify', 'Please enter a new username');
    return;
  }

  if (newUsername.value === props.user) {
    usernameError.value = true;
    emit('notify', 'Current username and new username cannot be the same');
    return;
  }
  loading.value.username = true;
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

    // Enhanced error handling for backend errors
    if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      if (data.errors[0].field === 'newUsername') {
        usernameError.value = true;
      }
      emit('notify', data.errors[0].message || 'Failed to change username');
    } else if (data.error === 'username_taken') {
      usernameError.value = true;
      emit('notify', 'Username already taken');
    } else if (data.error === 'current username and new username cannot be the same') {
      usernameError.value = true;
      emit('notify', 'Current username and new username cannot be the same');
    } else if (data.confirm) {
      emit('notify', 'Username changed successfully!');
      setTimeout(() => {
        LogOut();
      }, 3000);
    } else {
      emit('notify', 'Failed to change username');
    }
  } catch (error) {
    emit('notify', 'Failed to change username');
  } finally {
    loading.value.username = false;
  }
}

let PswDelete = ref('');

async function deleteAccount() {
  if (PswDelete.value === '') {
    emit('notify', 'Please enter your password');
    return;
  }
  loading.value.delete = true;
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
      emit('notify', 'Password is incorrect');
    } else if (data.confirm) {
      emit('notify', 'Account deleted successfully!');
      await LogOut();
    } else {
      emit('notify', 'Failed to delete account');
    }
  } catch (error) {
    emit('notify', 'Failed to delete account');
  } finally {
    loading.value.delete = false;
  }
}

const Pswauth = ref('');

async function GenerateNewKey() {
  // Validate password input
  if (!Pswauth.value.trim()) {
    emit('notify', 'Please enter your password');
    return;
  }
  loading.value.key = true;
  try {
    // Call the generate-key endpoint
    const response = await fetch('/api/generate-key', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify({
        user: props.user,
        password: Pswauth.value
      }),
    });

    const data = await response.json();

    if (response.ok) {
      if (data.confirm) {
        emit('notify', 'New key generated successfully!');

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
        emit('notify', 'An unexpected error occurred');
      }
    } else {
      // Handle API errors
      // Custom notification for incorrect password
      if (data.errors && Array.isArray(data.errors)) {
        const passwordError = data.errors.find((e: { field?: string }) => e.field === 'password');
        if (passwordError) {
          emit('notify', 'Incorrect password. Please try again.');
        } else {
          emit('notify', data.errors[0]?.message || 'An error occurred');
        }
      } else {
        emit('notify', data.message || 'An error occurred');
      }
    }
  } catch (error) {
    emit('notify', 'Network error. Please try again.');
  } finally {
    loading.value.key = false;
  }
}
</script>

<style scoped>
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
  height: 10px;
  margin-right: 10px;
}
.spinner {
  animation: rotate 2s linear infinite;
  width: 20px;
  height: 20px;
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

.userbtn {
  background-color: var(--accent1);
  color: var(--text3);
  border-radius: 8px;
  border: none;
  font-weight: 600;
  outline: none;
  padding: 12px 16px;
  margin: 10px 5px;
  width: auto;
  min-width: 150px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 1rem;
}

.userbtn:disabled , .userbtn:disabled:hover {
  cursor: not-allowed;
  background-color: var(--base3);
  box-shadow: none;
}

.userbtn:hover:not(:disabled) {
  background-color: var(--accent2);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.userinput {
  border-radius: 8px;
  padding: 12px max(36px, 8%) 12px 15px;
  margin: 7px;
  box-sizing: border-box;
  width: 100%;
  min-width: 120px;
  max-width: 100%;
  outline: none;
  color: var(--text2);
  transition: border-color 0.3s, box-shadow 0.3s, background-color 0.3s;
  border: solid 1px var(--base4);
  background-color: var(--base1);
  font-size: 1rem;
  font-family: inherit;
}

.userinput:focus {
  border-color: var(--accent1);
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--accent1-rgb), 0.1);
  background-color: var(--base2);
}

.password-toggle {
  position: absolute;
  right: max(6px, 3%);
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 10px;
  color: var(--text1);
  opacity: 0.75;
  padding: 4px;
}

.password-toggle2 {
  position: absolute;
  right: max(6px, 3%);
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 10px;
  color: var(--text1);
  opacity: 0.75;
  padding: 4px;
}

.password-toggle3 {
  position: absolute;
  right: max(6px, 3%);
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 10px;
  color: var(--text1);
  opacity: 0.75;
  padding: 4px;
}

.userdiv {
  background-color: var(--base2);
  width: 99%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 15px;
  margin: 0 auto;
  margin-bottom: 5px;
  margin-left: 5px;
  overflow-x: hidden;
  color: var(--text1);
}

.toggle-icon {
  width: 15px;
  cursor: pointer;
}

.changepassword {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.changepassword > div {
  box-sizing: border-box;
  flex: 1 1 30%;
  max-width: 33%;
  padding: 0 3px;
}

.changepassword > div > div {
  position: relative;
  width: 100%;
}

.changepassword .userinput {
  width: 100%;
  margin: 7px 0;
  padding-right: max(40px, 10%);
}

.password-toggle .toggle-icon,
.password-toggle2 .toggle-icon,
.password-toggle3 .toggle-icon {
  width: 18px;
  height: 18px;
  display: block;
}

.solo-wrapper {
  position: relative;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--text1);
  padding: 10px 15px;
  background: var(--base1);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.disclaimer {
  font-size: 1.2rem;
  color: var(--text2);
}

p {
  font-size: 1rem;
  color: var(--text2);
  line-height: 1.5;
  margin-bottom: 15px;
  font-weight: 400;
}

@media (min-width: 1151px) {
  .solo-wrapper { max-width: 420px; }
}

@media (max-width: 1150px) {
  .changepassword {
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .changepassword > div {
    flex: 0 0 100%;
    width: 500px;
    max-width: 100%;
    padding: 0;
  }

  .userdiv {
    background-color: var(--base2);
    width: 97%;
    padding: 15px;
    margin: 0 auto;
    margin-bottom: 5px;
    margin-left: 5px;
  }
}
</style>