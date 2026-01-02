<template>
 <div>
          <!-- Language Preference Section -->
          <div class="userdiv">
            <h2 class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="24" height="24"
                aria-hidden="true" focusable="false">
                <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
              </svg>
              {{ t('user.changeLanguage') }}
            </h2>
            <div style="display: flex; justify-content: center;">
              <div class="solo-wrapper" ref="languageSelectWrapper">
                <div 
                  class="custom-select"
                  @click="toggleLanguageDropdown"
                  tabindex="0"
                  @keydown.enter="toggleLanguageDropdown"
                  @keydown.space.prevent="toggleLanguageDropdown"
                  @keydown.escape="showLanguageDropdown = false"
                  role="button"
                  aria-label="Select Language">
                  <span class="selected-language">{{ getLanguageName(selectedLanguage) }}</span>
                  <svg class="dropdown-arrow" :class="{ 'open': showLanguageDropdown }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
                <Teleport to="body">
                  <div 
                    v-if="showLanguageDropdown" 
                    class="language-dropdown"
                    :style="dropdownPosition"
                    ref="languageDropdown">
                    <div 
                      v-for="lang in languages" 
                      :key="lang.value"
                      class="language-option"
                      :class="{ 'selected': selectedLanguage === lang.value }"
                      @click="selectLanguage(lang.value)"
                      role="option"
                      :aria-selected="selectedLanguage === lang.value">
                      {{ lang.label }}
                    </div>
                  </div>
                </Teleport>
              </div>
            </div>
            <p class="translation-disclaimer">
              {{ t('user.translationDisclaimer') }}
            </p>
          </div>
        </div>
        <div>
          <div class="userdiv">
            <h2 class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="24" height="24"
                aria-hidden="true" focusable="false">
                <path
                  d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              {{ t('user.changeUsername') }}
            </h2>
              <div style="display: flex; justify-content: center;">
                <div class="solo-wrapper">
                  <input class="userinput solo-input" type="text" maxlength="25" :placeholder="t('user.newUsername')" v-model="newUsername"
                    :class="{ 'error-input': usernameError }" :aria-label="t('user.newUsername')" />
                </div>
              </div>
            <br>
            <button class="userbtn" @click="changeUsername()" :disabled="loading.username" :aria-label="t('user.changeUsername')">
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
                <span v-if="!loading.username">{{ t('user.changeUsername') }}</span>
                <span v-else style="margin-left: 8px;">{{ t('common.processing') }}</span>
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
              {{ t('user.changePassword') }}
            </h2>
            <div class="changepassword">
              <div style="margin-right: 3px;">
                <div style="position: relative;">
                  <input class="userinput" :placeholder="t('user.oldPassword')" :type="showOldPassword ? 'text' : 'password'"
                    v-model="oldPassword" :class="{ 'error-input': oldPasswordError }" :aria-label="t('user.oldPassword')"/>
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
                  <input class="userinput" :type="showNewPassword ? 'text' : 'password'" :placeholder="t('user.newPassword')"
                    v-model="newPassword" :class="{ 'error-input': newPasswordError }" :aria-label="t('user.newPassword')"/>
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
                    :placeholder="t('user.confirmPassword')" v-model="confirmPassword"
                    :class="{ 'error-input': confirmPasswordError }" :aria-label="t('user.confirmPassword')"/>
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
            <button class="userbtn" @click="changePassword()" :disabled="loading.password" :aria-label="t('user.changePassword')">
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
                <span v-if="!loading.password">{{ t('user.changePassword') }}</span>
                <span v-else style="margin-left: 8px;">{{ t('common.processing') }}</span>
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
              {{ t('user.recoveryKey') }}
            </h2>
            <div style="position: relative;">
              <p>{{ t('user.recoveryKeyInstruction') }}</p>
              <div class="solo-wrapper" style="position: relative;">
                <input class="userinput solo-input" :type="showPswauth ? 'text' : 'password'" v-model="Pswauth" :aria-label="t('user.password')"/>
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
              <button class="userbtn" @click="GenerateNewKey()" :disabled="loading.key" :aria-label="t('user.generateNewKey')">
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
                  <span v-if="!loading.key">{{ t('user.generateNewKey') }}</span>
                  <span v-else style="margin-left: 8px;">{{ t('common.processing') }}</span>
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
              {{ t('user.deleteAccount') }}
            </h2>
            <p>{{ t('user.deleteAccountInstruction') }}</p>
            <div class="solo-wrapper" style="position: relative;">
              <input class="userinput solo-input" :type="showPswDelete ? 'text' : 'password'" v-model="PswDelete" :aria-label="t('user.password')"/>
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
              <p><strong>{{ t('user.deleteWarning') }}</strong> {{ t('user.deleteWarningDetails') }}</p>

              <p><strong>{{ t('user.deleteRecommendation') }}</strong></p>
              <ul>
                <li>{{ t('user.deleteRecommendation1') }}</li>
                <li>{{ t('user.deleteRecommendation2') }}</li>
              </ul>

              <p>{{ t('user.deleteReview') }}</p>
            </div>
            <br>
            <button class="userbtn" @click="deleteAccount()" :disabled="loading.delete" :aria-label="t('user.deleteAccount')">
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
                <span v-if="!loading.delete">{{ t('user.deleteAccount') }}</span>
                <span v-else style="margin-left: 8px;">{{ t('common.processing') }}</span>
              </span>
            </button>
          </div>
        </div>
        <div style="height: 100px"></div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '../../store/store';

// Notification system (assume a notification component is available)
const emit = defineEmits(['notify']);

// i18n and user store
const { t } = useI18n();
const userStore = useUserStore();

// Language state
const selectedLanguage = ref(userStore.currentLanguage || 'en');
const showLanguageDropdown = ref(false);
const languageSelectWrapper = ref<HTMLElement | null>(null);
const languageDropdown = ref<HTMLElement | null>(null);

const languages = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'in', label: 'हिन्दी' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'ar', label: 'العربية' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
  { value: 'de', label: 'Deutsch' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'jp', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'it', label: 'Italiano' },
  { value: 'gr', label: 'Ελληνικά' },
  { value: 'he', label: 'עברית' },
  { value: 'ep', label: 'Esperanto' },
  { value: 'mt', label: 'Malti' },
  { value: 'la', label: 'Latina' },
];

const dropdownPosition = computed(() => {
  if (!languageSelectWrapper.value) return {};
  const rect = languageSelectWrapper.value.getBoundingClientRect();
  return {
    position: 'fixed' as const,
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`
  };
});

function getLanguageName(value: string): string {
  return languages.find(lang => lang.value === value)?.label || 'English';
}

function toggleLanguageDropdown() {
  showLanguageDropdown.value = !showLanguageDropdown.value;
}

function selectLanguage(value: string) {
  selectedLanguage.value = value;
  showLanguageDropdown.value = false;
  changeLanguage();
}

// Click outside handler
function handleClickOutside(event: MouseEvent) {
  if (showLanguageDropdown.value && 
      languageSelectWrapper.value && 
      !languageSelectWrapper.value.contains(event.target as Node) &&
      languageDropdown.value &&
      !languageDropdown.value.contains(event.target as Node)) {
    showLanguageDropdown.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

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

// Language change function
async function changeLanguage() {
  const newLang = selectedLanguage.value;
  
  try {
    // Update local state and localStorage immediately
    userStore.setLanguage(newLang);
    
    // Send to backend to update user's language preference
    const response = await fetch('/api/user/language', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify({ 
        user: props.user, 
        language: newLang.charAt(0).toUpperCase() + newLang.slice(1) // Capitalize first letter
      }),
    });

    const data = await response.json();

    if (data.confirm || response.ok) {
      emit('notify', t('messages.languageChanged'));
    } else {
      emit('notify', t('messages.languageSavedLocally'));
    }
  } catch (error) {
    // Even if API fails, language is already changed locally
    emit('notify', t('messages.languageSavedLocally'));
  }
}

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
    emit('notify', t('errors.oldPasswordRequired'));
    return;
  }

  if (newPassword.value === '') {
    newPasswordError.value = true;
    emit('notify', t('errors.newPasswordRequired'));
    return;
  }

  if (confirmPassword.value !== newPassword.value) {
    confirmPasswordError.value = true;
    emit('notify', t('errors.passwordsNotMatch'));
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
      emit('notify', data.errors[0].message || t('errors.passwordChangeFailed'));
    } else if (data.error === 'old_password_incorrect' || data.message === 'Current password is incorrect') {
      oldPasswordError.value = true;
      emit('notify', t('errors.oldPasswordIncorrect'));
    } else if (data.message === 'New password must be different from the current password') {
      newPasswordError.value = true;
      emit('notify', t('errors.passwordMustBeDifferent'));
    } else if (data.confirm) {
      emit('notify', t('messages.passwordChanged'));
      // Password changed successfully
    } else {
      emit('notify', t('errors.passwordChangeFailed'));
    }
  } catch (error) {
    emit('notify', t('errors.passwordChangeFailed'));
  } finally {
    loading.value.password = false;
  }
}

let newUsername = ref('');

async function changeUsername() {
  usernameError.value = false;
  if (newUsername.value === '') {
    usernameError.value = true;
    emit('notify', t('errors.usernameRequired'));
    return;
  }

  if (newUsername.value === props.user) {
    usernameError.value = true;
    emit('notify', t('errors.usernameSameAsCurrent'));
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
      emit('notify', data.errors[0].message || t('errors.usernameChangeFailed'));
    } else if (data.error === 'username_taken') {
      usernameError.value = true;
      emit('notify', t('errors.usernameTaken'));
    } else if (data.error === 'current username and new username cannot be the same') {
      usernameError.value = true;
      emit('notify', t('errors.usernameSameAsCurrent'));
    } else if (data.confirm) {
      emit('notify', t('messages.usernameChanged'));
      setTimeout(() => {
        LogOut();
      }, 3000);
    } else {
      emit('notify', t('errors.usernameChangeFailed'));
    }
  } catch (error) {
    emit('notify', t('errors.usernameChangeFailed'));
  } finally {
    loading.value.username = false;
  }
}

let PswDelete = ref('');

async function deleteAccount() {
  if (PswDelete.value === '') {
    emit('notify', t('errors.passwordRequired'));
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
      emit('notify', t('errors.passwordIncorrect'));
    } else if (data.confirm) {
      emit('notify', t('messages.accountDeleted'));
      await LogOut();
    } else {
      emit('notify', t('errors.accountDeleteFailed'));
    }
  } catch (error) {
    emit('notify', t('errors.accountDeleteFailed'));
  } finally {
    loading.value.delete = false;
  }
}

const Pswauth = ref('');

async function GenerateNewKey() {
  // Validate password input
  if (!Pswauth.value.trim()) {
    emit('notify', t('errors.passwordRequired'));
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
        emit('notify', t('messages.keyGenerated'));

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
        emit('notify', t('errors.unexpectedError'));
      }
    } else {
      // Handle API errors
      // Custom notification for incorrect password
      if (data.errors && Array.isArray(data.errors)) {
        const passwordError = data.errors.find((e: { field?: string }) => e.field === 'password');
        if (passwordError) {
          emit('notify', t('errors.passwordIncorrect'));
        } else {
          emit('notify', data.errors[0]?.message || t('errors.unexpectedError'));
        }
      } else {
        emit('notify', data.message || t('errors.unexpectedError'));
      }
    }
  } catch (error) {
    emit('notify', t('errors.networkError'));
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

.translation-disclaimer {
  font-size: 1rem;
  color: var(--text2);
  text-align: center;
  margin-top: 12px;
  margin-bottom: 0;
  font-style: italic;
  opacity: 0.85;
  line-height: 1.4;
}

.solo-wrapper {
  position: relative;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}

.custom-select {
  border-radius: 7px;
  padding: 8px 40px 8px 10px;
  border: 1.5px solid var(--base3);
  background-color: var(--base1);
  color: var(--text1);
  font-size: 1rem;
  outline: none;
  cursor: pointer;
  transition: border-color 0.18s, background 0.18s;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
  position: relative;
}

.custom-select:hover {
  background-color: var(--base3);
  border-color: var(--base4);
}

.custom-select:focus {
  border-color: var(--accent1);
  background-color: var(--base4);
}

.selected-language {
  flex: 1;
  font-weight: 500;
}

.dropdown-arrow {
  width: 18px;
  height: 18px;
  transition: transform 0.2s ease;
  color: var(--text2);
  position: absolute;
  right: 12px;
  pointer-events: none;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.language-dropdown {
  background: var(--base2);
  border-radius: 12px;
  border: 1.5px solid var(--base3);
  padding: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  max-height: 300px;
  overflow-y: auto;
  animation: dropdown-appear 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes dropdown-appear {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.language-option {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.18s;
  color: var(--text1);
  font-size: 0.95rem;
  font-weight: 400;
}

.language-option:hover {
  background: var(--base3);
  color: var(--accent1);
}

.language-option.selected {
  background: var(--accent1);
  color: var(--text3);
  font-weight: 600;
}

.language-option.selected:hover {
  background: var(--accent2);
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