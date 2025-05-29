<template>
  <Header />
  <div id="main">
    <div class="sidebar">
      <div class="inner2">
        <div class="user-wrapper">
          <div class="user-wrapper2">
 <h1 class="user">{{ user }}</h1>
          <h2 class="tier">{{ Tier }}</h2>
          </div>
          <h2 class="subscription-remaining">{{ expirationDays !== null ? expirationDays + ' subscription days remaining' : 'Loading...' }}</h2>
        </div>
        <div class="menu-wrapper">
          <div class="menu selected" @click="selectMenu($event, 0)">
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="20"
              height="20" aria-hidden="true" focusable="false">
              <path
                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            Account
          </div>
          <div class="menu" @click="selectMenu($event, 1)">
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="20"
              height="20" aria-hidden="true" focusable="false">
              <path
                d="M20 4H4c-1.1 0-2 .9-2 2v2h20V6c0-1.1-.9-2-2-2zM2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-6H2v6zm4-3h4v2H6v-2z" />
            </svg>
            Subscription
          </div>
          <div class="menu" @click="selectMenu($event, 2)">
            <svg class="icon" version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve" fill="currentColor">
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <g>
                  <path class="st0"
                    d="M101.242,211.431l46.048-46.052c6.289-22.429,0.634-47.502-17.009-65.136 c-28.05-28.055-64.667-32.42-96.856-53.894c-11.61-7.742-15.107-12.099-15.107-12.099c-28.569,39.99-24.516,117.869,17.788,160.173 C53.744,212.057,78.817,217.723,101.242,211.431z">
                  </path>
                  <path class="st0"
                    d="M127.019,208.218c-5.296,5.304-7.29,17.973-3.278,32.668c3.727,13.689,15.25,30.196,31.646,48.029 c10.605-11.902,20.777-23.005,29.957-32.56c13.348-15.32,25.703-28.269,37.14-38.911c-16.956-15.288-32.643-25.996-45.731-29.562 c-14.699-4.012-27.375-2.018-32.672,3.278L127.019,208.218z">
                  </path>
                  <path class="st0"
                    d="M309.292,310.421c-10.057,10.543-22.009,21.844-35.921,33.969c-8.681,8.343-18.656,17.511-29.335,27.074 c51.55,45.047,111.362,93.381,125.768,104.806c21.375,17.372,41.542,22.578,53.226,10.898c11.684-11.68,6.466-31.844-10.901-53.227 C400.869,419.748,353.766,361.456,309.292,310.421z">
                  </path>
                  <path class="st0"
                    d="M333.228,248.2l-51.707-51.694c-22.664,6.177-53.276,34.265-84.695,70.359 C146.985,318.658,66.923,417.615,51.941,436.51c-16.943,20.848-22.026,40.517-10.634,51.908c11.4,11.4,31.065,6.31,51.917-10.625 c18.89-14.992,117.848-95.054,169.641-144.886C298.959,301.483,327.046,270.868,333.228,248.2z">
                  </path>
                  <polygon class="st0" points="371.2,211.406 318.056,158.27 291.48,184.842 344.623,237.986 "></polygon>
                  <path class="st0"
                    d="M507.503,96.296l-74.342-74.329c-6-6.004-15.728-6.004-21.725,0L370.31,63.085l96.066,96.066l41.126-41.126 C513.499,112.028,513.499,102.301,507.503,96.296z">
                  </path>
                  <path class="st0"
                    d="M349.734,83.66c-32.194,32.198-6.132,49.06-21.46,64.388l53.14,53.144 c15.332-15.329,32.194,10.733,64.383-21.456l9.715-9.72L359.446,73.95L349.734,83.66z">
                  </path>
                </g>
              </g>
            </svg>
            Themes
          </div>
          <div class="menu" @click="selectMenu($event, 3)">
            <svg class="icon" version="1.0" id="Layer_1" xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64" enable-background="new 0 0 64 64"
              xml:space="preserve" fill="currentColor">
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <path fill="currentColor"
                  d="M52,24h-4v-8c0-8.836-7.164-16-16-16S16,7.164,16,16v8h-4c-2.211,0-4,1.789-4,4v32c0,2.211,1.789,4,4,4h40 c2.211,0,4-1.789,4-4V28C56,25.789,54.211,24,52,24z M32,48c-2.211,0-4-1.789-4-4s1.789-4,4-4s4,1.789,4,4S34.211,48,32,48z M40,24 H24v-8c0-4.418,3.582-8,8-8s8,3.582,8,8V24z">
                </path>
              </g>
            </svg>Security
          </div>
        </div>
      </div>
    </div>
    <div class="content">
      <div v-if="selectedIndex === 0">
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
      </div>
      <div v-if="selectedIndex === 1">
        <div style="margin-bottom: 30px; border-bottom: 3px #262435 solid; padding-bottom: 25px;">
          <h1>Select a Subscription Plan</h1>
          <div class="subscription-form">
            <div class="sub-option" :class="{ select: selectedOption === 1 }" @click="selectOption(1)">
              <h3 class="plan">1 Month</h3>
              <p class="price">5.99€ + VAT</p>
            </div>
            <div class="sub-option" :class="{ select: selectedOption === 2 }" @click="selectOption(2)">
              <h3 class="plan">4 Months</h3>
              <p class="price">23.99€ + VAT</p>
            </div>
            <div class="sub-option-disabled">
              <div class="coming-soon-banner">Available Soon</div>
              <h3 style="cursor: default;" class="plan">6 Months</h3>
              <p style="cursor: default;" class="price">35.99€ + VAT</p>
            </div>
            <div class="sub-option-disabled">
              <div class="coming-soon-banner">Available Soon</div>
              <h3 style="cursor: default;" class="plan">1 Year</h3>
              <p style="cursor: default;" class="price">71.99€ + VAT</p>
            </div>
          </div>
          <h1>Select a payment method</h1>
          <div class="payment-form">
            <div class="pay-option">
              <div class="square" :class="{ select: selectedpay === 1 }"
                @click="selectPaymentMethod('Credit Card'), selectPay(1)">
                <img class="icon-op" src="@/assets/icons/credit-card.png" alt="credit-card">
                <p>Credit Card</p>
              </div>
              <div class="square-disabled">
                <div class="coming-soon-banner2">Available Soon</div>
                <img class="icon-op" src="@/assets/icons/bitcoin.png" alt="bitcoin">
                <p>Bitcoin</p>
              </div>
              <div class="square-disabled">
                <div class="coming-soon-banner2">Available Soon</div>
                <img class="icon-op" src="@/assets/icons/ethereum.png" alt="ethereum">
                <p>Ethereum</p>
              </div>
              <div class="square-disabled">
                <div class="coming-soon-banner2">Available Soon</div>
                <img class="icon-op" src="@/assets/icons/monero.png" alt="monero">
                <p>Monero</p>
              </div>
              <div v-if="selectedpay === 1" class="card-element-container">
                <div id="card-element"></div>
                <div id="card-errors" role="alert"></div>
              </div>
            </div>
            <br><br>
            <button class="userbtn" @click="Renew()">Renew Subscription</button>
          </div>
        </div>
        <div>
          <h2>Receipts</h2>
          <div class="receipts">
            <div class="receipt-header">
              <p style="flex:1; font-weight: bold;">Payment Date</p>
              <p style="flex:1; font-weight: bold;">Amount</p>
              <p style="flex:1; font-weight: bold;">Paid with</p>
              <p style="flex:1; font-weight: bold;">Subscription Plan</p>
              <p style="flex:1; font-weight: bold;">Download</p>
            </div>
            <div v-if="loading">Loading receipts...</div>
            <div style="background-color: #262435; padding: 3px;" v-else-if="error">{{ error }}</div>
            <div style="background-color: #262435; padding: 3px;" v-if="receipts.length === 0">
              <p>No receipts found</p>
            </div>
            <div v-else>
              <div v-for="receipt in receipts" :key="receipt._id" class="receipt-item">
                <p style="flex:1; text-align: center;">{{ formatDate(receipt.Date) }}</p>
                <p style="flex:1; text-align: center;">{{ (receipt.Amount) / 100 }}€</p>
                <p style="flex:1; text-align: center;">{{ receipt.Method }}</p>
                <p style="flex:1; text-align: center;">{{ formatSubscription(receipt.Subscription) }}</p>
                <div style="flex:1;"><button class="downloadbtn">
                    <svg class="icon3" viewBox="0 0 24.00 24.00" fill="var(--text1)" xmlns="http://www.w3.org/2000/svg"
                      stroke="var(--text1)" stroke-width="0.696">
                      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                      <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                      <g id="SVGRepo_iconCarrier">
                        <path
                          d="M12.5535 16.5061C12.4114 16.6615 12.2106 16.75 12 16.75C11.7894 16.75 11.5886 16.6615 11.4465 16.5061L7.44648 12.1311C7.16698 11.8254 7.18822 11.351 7.49392 11.0715C7.79963 10.792 8.27402 10.8132 8.55352 11.1189L11.25 14.0682V3C11.25 2.58579 11.5858 2.25 12 2.25C12.4142 2.25 12.75 2.58579 12.75 3V14.0682L15.4465 11.1189C15.726 10.8132 16.2004 10.792 16.5061 11.0715C16.8118 11.351 16.833 11.8254 16.5535 12.1311L12.5535 16.5061Z"
                          fill="var(--text1)"></path>
                        <path
                          d="M3.75 15C3.75 14.5858 3.41422 14.25 3 14.25C2.58579 14.25 2.25 14.5858 2.25 15V15.0549C2.24998 16.4225 2.24996 17.5248 2.36652 18.3918C2.48754 19.2919 2.74643 20.0497 3.34835 20.6516C3.95027 21.2536 4.70814 21.5125 5.60825 21.6335C6.47522 21.75 7.57754 21.75 8.94513 21.75H15.0549C16.4225 21.75 17.5248 21.75 18.3918 21.6335C19.2919 21.5125 20.0497 21.2536 20.6517 20.6516C21.2536 20.0497 21.5125 19.2919 21.6335 18.3918C21.75 17.5248 21.75 16.4225 21.75 15.0549V15C21.75 14.5858 21.4142 14.25 21 14.25C20.5858 14.25 20.25 14.5858 20.25 15C20.25 16.4354 20.2484 17.4365 20.1469 18.1919C20.0482 18.9257 19.8678 19.3142 19.591 19.591C19.3142 19.8678 18.9257 20.0482 18.1919 20.1469C17.4365 20.2484 16.4354 20.25 15 20.25H9C7.56459 20.25 6.56347 20.2484 5.80812 20.1469C5.07435 20.0482 4.68577 19.8678 4.40901 19.591C4.13225 19.3142 3.9518 18.9257 3.85315 18.1919C3.75159 17.4365 3.75 16.4354 3.75 15Z"
                          fill="var(--text1)"></path>
                      </g>
                    </svg>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
        <div style="height: 100px"></div>
      </div>
      <div v-if="selectedIndex === 2">
        <div class="theme-buttons">
          <button v-for="(theme, index) in themes" :key="index" @click="setTheme(theme)"
            :class="{ active: currentTheme === theme }">
            {{ themeDisplayNames[theme] }}
          </button>
        </div>
      </div>
      <div v-if="selectedIndex === 3">
        <div class="twofa-container">
          <h1 class="twofa-title">Two-Factor Authentication</h1>
          <p class="twofa-instruction">
            To enable two-factor authentication, toggle the switch below and scan the generated QR code with your
            authenticator app.
          </p>
          <div class="twofa-toggle">
            <label>
              <div class="twofa-toggle-switch" :class="{ 'twofa-toggle-switch-checked': isTwoFaEnabled }"
                @click="toggleTwoFa()"></div>
              <span class="twofa-toggle-label">Enable 2FA</span>
            </label>
          </div>
          <div v-if="isTwoFaEnabled">
            <div class="qr">
              <qrcode-vue v-if="qrCode" :value="qrCode"></qrcode-vue>
            </div>
            <br><br>
            <p class="twofa-instruction">
              IMPORTANT: If you start the pairing process but don't complete it by scanning the QR code, please make
              sure to toggle the switch back to the "off" position before logging out to avoid being locked out of your
              account.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
  <NotificationPopup ref="notification" />
  <Footer />
</template>

<script setup>
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { ref, onMounted } from 'vue';
import owlImage from '@/assets/icons/owl3.png';
import QrcodeVue from 'qrcode.vue'
import hideIcon from '@/assets/icons/hide.png';
import showIcon from '@/assets/icons/show.png';
import NotificationPopup from '@/components/NotificationPopup.vue';

const store = useStore();
const user = store.getters.getUser;
const apiKey = import.meta.env.VITE_EREUNA_KEY;

// for popup notifications
const notification = ref(null);
const showNotification = () => {
  notification.value.show('This is a custom notification message!');
};

const router = useRouter();

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

let selectedIndex = ref(0);

function selectMenu(event, index) {
  const menus = document.querySelectorAll('.menu');
  menus.forEach((menu, i) => {
    if (i === index) {
      menu.classList.add('selected');
    } else {
      menu.classList.remove('selected');
    }
  });
  selectedIndex.value = index;
}

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
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ oldPassword: oldPassword.value, newPassword: newPassword.value, user: user }),
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

  if (newUsername.value === user) {
    notification.value.show('Current username and new username cannot be the same');
    return;
  }

  try {
    const response = await fetch('/api/change-username', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ newUsername: newUsername.value, user: user }),
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
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ user: user, password: PswDelete.value }),
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
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        user: user, // Use .value if user is a ref
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
          a.download = `${user}_recovery_key.txt`; // Use the username for the filename
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

// Create a ref to store the expiration days
const expirationDays = ref(null);

// Create a function to get the expiration date
async function getExpirationDate() {
  try {
    const response = await fetch(`/api/get-expiration-date/?user=${encodeURIComponent(user)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      expirationDays.value = 'Error retrieving expiration date';
      return;
    }

    const data = await response.json();

    if (data.expirationDays !== undefined) {
      expirationDays.value = data.expirationDays; // Set the number of days remaining
    } else {
      expirationDays.value = 'Unexpected response format';
    }
  } catch (error) {
    error.value = error.message;
    expirationDays.value = 'Error retrieving expiration date';
  }
}

let selectedOption = ref(1);
let selectedpay = ref();
const selectedPaymentMethod = ref('');

function selectOption(option) {
  selectedOption.value = option;
}

function selectPay(option) {
  selectedpay.value = option;
}

function selectPaymentMethod(method) {
  selectedPaymentMethod.value = method;
}

onMounted(() => {
  selectOption(1); // Set default subscription option
  selectPay(4);
});

// Add this with the other refs at the top of the script
const receipts = ref([]);
const loading = ref(false);
const error = ref(null);

// Add this function in the script section
async function GetReceipts() {
  loading.value = true;
  error.value = null;
  try {
    const response = await fetch(`/api/get-receipts/${user}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch receipts');
    }

    const data = await response.json();
    receipts.value = data.receipts;
  } catch (error) {
    error.value = error.message;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  getExpirationDate();
  GetReceipts();
});

async function Renew() {
  await GetReceipts(); // keep this line to dynamically update receipts 
}

function formatDate(bsonDate) {
  const date = new Date(bsonDate);
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function formatSubscription(subscriptionValue) {
  const subscriptionMap = {
    1: '1 Month',
    2: '4 Months',
    3: '6 Months',
    4: '1 Year'
  };
  return subscriptionMap[subscriptionValue] || 'Unknown';
}

/*
const Download = async (receipt) => {
  const doc = new jsPDF();

  // Get the document width
  const pageWidth = doc.internal.pageSize.getWidth();

  // Add the owl image
  try {
    // Adjust image dimensions as needed
    const imgWidth = 25; // Adjust this value to resize the image
    const imgHeight = 25; // Adjust this value to resize the image

    // Calculate x position to center the image
    const imgX = (pageWidth - imgWidth) / 2;

    doc.addImage(owlImage, 'PNG', imgX, 20, imgWidth, imgHeight);

    // Set text color to the specified RGB for title
    doc.setTextColor(140, 141, 254);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);

    // Calculate x position to center the title
    const title = "Receipt";
    const titleWidth = doc.getTextDimensions(title).w;
    const titleX = (pageWidth - titleWidth) / 2;

    // Place the title centered below the image
    doc.text(title, titleX, 80);

    // Set text color to black for receipt details
    doc.setTextColor(0, 0, 0);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(12);

    // Prepare receipt details
    const details = [
      `Payment Date: ${formatDate(receipt.Date)}`,
      `Amount: ${(receipt.Amount) / 100}€`,
      `Paid with: ${receipt.Method}`,
      `Subscription Plan: ${formatSubscription(receipt.Subscription)}`
    ];

    // Place each detail centered
    details.forEach((detail, index) => {
      const detailWidth = doc.getTextDimensions(detail).w;
      const detailX = (pageWidth - detailWidth) / 2;
      doc.text(detail, detailX, 100 + (index * 10));
    });

    // Save the PDF
    doc.save(`receipt_${receipt._id}.pdf`);

  } catch (error) {
    console.error("Error adding image to PDF:", error);
  }
};

*/

const isTwoFaEnabled = ref(false);
const qrCode = ref('');

async function toggleTwoFa() {
  const enabled = !isTwoFaEnabled.value;
  const username = user

  try {
    const response = await fetch('/api/twofa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ username, enabled }),
    });

    const data = await response.json();

    if (data.message === '2FA enabled') {
      isTwoFaEnabled.value = enabled;
      qrCode.value = data.qrCode;
    } else if (data.message === '2FA disabled') {
      isTwoFaEnabled.value = enabled;
      qrCode.value = '';
    } else {
      error.value = error.message;
    }
  } catch (error) {
    error.value = error.message;
  }
}

const themes = ['default', 'ihatemyeyes', 'colorblind', 'catpuccin'];
const currentTheme = ref('default');

const themeDisplayNames = {
  default: 'Default Theme (Dark)',
  ihatemyeyes: 'I Hate My Eyes (light-mode)',
  colorblind: "I'm Colorblind",
  catpuccin: 'Catpuccin',
};

async function setTheme(newTheme) {
  const root = document.documentElement;
  root.classList.remove(...themes);
  root.classList.add(newTheme);
  localStorage.setItem('user-theme', newTheme);
  try {
    const response = await fetch('/api/theme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ theme: newTheme, username: user }),
    });
    const data = await response.json();
    if (data.message === 'Theme updated') {
      currentTheme.value = newTheme;
    } else {
      error.value = data.message;
    }
  } catch (error) {
    error.value = error.message;
  }
}

async function loadTheme() {
  try {
    const response = await fetch('/api/load-theme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ username: user }),
    });
    const data = await response.json();
    if (data.theme) {
      setTheme(data.theme);
    } else {
      setTheme('default');
    }
  } catch (error) {
    setTheme('default');
  }
}

loadTheme()

defineExpose({
  loadTheme,
});

let Tier = ref(); // user tier

// function to retrieve tier for each user
async function fetchTier() {
  try {
    const headers = {
      'x-api-key': apiKey
    };

    const response = await fetch(`/api/tier?username=${user}`, {
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const newTier = await response.json();
    Tier.value = newTier.Tier;

  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    console.error('Error fetching tier:', error);
  }
}

fetchTier()

</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

#main {
  display: flex;
  flex-direction: row;
  height: 100vh;
  overflow: hidden;
  width: 100%;
  //min-width: 1250px;
}

.sidebar {
  display: flex;
  flex-direction: column;
  width: 15%;
  padding: 20px;
  background-color: var(--base2);
  overflow-y: auto;
}

.content {
  display: flex;
  position: relative;
  flex-direction: column;
  width: 85%;
  background-color: var(--base4);
  padding: 20px;
  text-align: center;
  overflow-y: auto;
}

h1 {
  color: var(--accent3);
  font-size: 30px;
  margin-bottom: 0;
}

.user {
  color: var(--accent3);
  font-size: 23px;
  margin-bottom: 0;
}

.subscription-remaining {
  color: var(--text2);
  font-size: 12px;
  margin-bottom: 30px;
}

h2 {
  color: var(--text1);
  font-size: 15px;
}

.menu-wrapper {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.menu {
  margin-top: 5px;
  display: flex;
  align-items: center;
  width: 90%;
  background-color: rgba(var(--base4), 0.9);
  padding: 10px;
  color: var(--text1);
  font-size: 15px;
  cursor: pointer;
  border-radius: 5px;
  transition: background-color 0.3s ease-in-out;
  opacity: 0.80;
}

.menu:hover {
  cursor: pointer;
  background-color: var(--accent1);
  opacity: 1;
}

.menu.selected {
  background-color: var(--accent1);
  opacity: 1;
}

.icon {
  width: 20px;
  height: 20px;
  margin-right: 10px;
}

.icon3 {
  width: 15px;
  height: 15px;
}

.icon-op {
  width: 15px;
  height: 15px;
  cursor: default;
  padding-right: 7px;
}

p {
  color: var(--text1);
}

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

/* buttons for settings */
.userbtn {
  background-color: var(--accent1);
  color: var(--text1);
  border-radius: 5px;
  border: none;
  outline: none;
  padding: 10px;
  margin: 5px;
  width: 150px;
  cursor: pointer;
  /* Pointer cursor on hover */
  transition: all 0.3s ease;
  /* Smooth transition for hover effects */
}

.userbtn:hover {
  background-color: var(--accent2);
  /* Background color on hover */
}

/* inputs for settings */
.userinput {
  border-radius: 5px;
  padding: 10px 10px 10px 15px;
  margin: 7px;
  width: 160px;
  outline: none;
  color: var(--base3);
  /* Dark text color */
  transition: border-color 0.3s, box-shadow 0.3s;
  /* Smooth transition for focus effects */
  border: solid 1px var(--base4);
  background-color: var(--base4);
}

.userinput:focus {
  border-color: var(--accent1);
  outline: none;
}

.title {
  margin: 0;
  padding: 0;
}

.payment-form,
.subscription-form {
  text-align: center;
  align-items: center;
  align-self: center;
  padding: 10px;
  margin: 10px;
  border: none;
}

.changepassword {
  display: flex;
  justify-content: center;
}

.square {
  align-items: center;
  display: inline-flex;
  flex-direction: row;
  border: none;
  border-radius: 10px;
  /* Slightly curved border */
  padding: 10px;
  margin: 5px;
  padding-right: 15px;
  opacity: 0.80;
  width: 100px;
  justify-content: center;
  color: var(--text1);
  position: relative;
  /* Position relative for pseudo-element */
  overflow: hidden;
  /* Hide overflow */
}

.square::before {
  content: '';
  position: absolute;
  /* Position it absolutely */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  /* Place it behind the content */
  border-radius: 10px;
  /* Match the border radius of the parent */
  background: linear-gradient(270deg, $accent1, #4c4d8f, #494bb9);
  /* Gradient colors */
  padding: 2px;
  /* Space for the border effect */
  -webkit-mask: linear-gradient(white, white) content-box, linear-gradient(white, white);
  mask: linear-gradient(white, white) content-box, linear-gradient(white, white);
  /* For masking */
  -webkit-mask-composite: source-out;
  /* For masking */
  animation: border-animation 5s linear infinite;
  /* Add animation */
  mask-composite: exclude;
  /* For masking */
  background-size: 300% 300%;
}

.square:hover {
  opacity: 1;
  cursor: pointer;
  background: linear-gradient(270deg, $accent1, #4c4d8f, #494bb9);
  /* Gradient colors */
}

.square-disabled {
  align-items: center;
  display: inline-flex;
  flex-direction: row;
  border: none;
  border-radius: 10px;
  /* Slightly curved border */
  padding: 10px;
  margin: 5px;
  padding-right: 15px;
  opacity: 0.80;
  width: 100px;
  justify-content: center;
  color: var(--text1);
  position: relative;
  /* Position relative for pseudo-element */
  overflow: hidden;
  /* Hide overflow */
  cursor: default
}

.square-disabled::before {
  content: '';
  position: absolute;
  /* Position it absolutely */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  /* Place it behind the content */
  border-radius: 10px;
  /* Match the border radius of the parent */
  background: linear-gradient(270deg, #8c8dfe, #4c4d8f, #494bb9);
  /* Gradient colors */
  padding: 2px;
  /* Space for the border effect */
  -webkit-mask: linear-gradient(white, white) content-box, linear-gradient(white, white);
  mask: linear-gradient(white, white) content-box, linear-gradient(white, white);
  /* For masking */
  -webkit-mask-composite: source-out;
  /* For masking */
  animation: border-animation 5s linear infinite;
  /* Add animation */
  mask-composite: exclude;
  /* For masking */
  background-size: 300% 300%;
  cursor: default;
}

.modal {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: var(--base2);
  padding: 20px;
  border: none;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.modal button {
  margin-top: 10px;
}

.sub-option {
  align-items: center;
  display: inline-flex;
  flex-direction: column;
  border: none;
  border-radius: 5px;
  padding: 10px;
  margin: 5px;
  opacity: 0.80;
  width: 120px;
  height: 70px;
  position: relative;
  overflow: hidden;
  justify-content: center;
  color: var(--text1);
}

.sub-option::before {
  content: '';
  position: absolute;
  /* Position it absolutely */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  /* Place it behind the content */
  border-radius: 5px;
  /* Match the border radius of the parent */
  background: linear-gradient(270deg, #8c8dfe, #4c4d8f, #494bb9);
  /* Gradient colors */
  padding: 2px;
  /* Space for the border effect */
  -webkit-mask: linear-gradient(white, white) content-box, linear-gradient(white, white);
  mask: linear-gradient(white, white) content-box, linear-gradient(white, white);
  /* For masking */
  -webkit-mask-composite: source-out;
  /* For masking */
  mask-composite: exclude;
  /* For masking */
  animation: border-animation 5s linear infinite;
  background-size: 300% 300%;
}

.sub-option-disabled {
  align-items: center;
  display: inline-flex;
  flex-direction: column;
  border: none;
  border-radius: 5px;
  /* Rounded corners */
  padding: 10px;
  /* Inner padding */
  margin: 5px;
  opacity: 0.80;
  width: 120px;
  position: relative;
  /* Position relative for the pseudo-element */
  height: 70px;
  overflow: hidden;
  /* Ensure the pseudo-element doesn't overflow */
  justify-content: center;
  color: #f5f5f5;
}

.sub-option-disabled::before {
  content: '';
  position: absolute;
  /* Position it absolutely */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  /* Place it behind the content */
  border-radius: 5px;
  /* Match the border radius of the parent */
  background: linear-gradient(270deg, #8c8dfe, #4c4d8f, #494bb9);
  /* Gradient colors */
  padding: 2px;
  /* Space for the border effect */
  -webkit-mask: linear-gradient(white, white) content-box, linear-gradient(white, white);
  mask: linear-gradient(white, white) content-box, linear-gradient(white, white);
  /* For masking */
  -webkit-mask-composite: source-out;
  /* For masking */
  animation: border-animation 5s linear infinite;
  mask-composite: exclude;
  /* For masking */
  background-size: 300% 300%;
}

.sub-option:hover {
  opacity: 1;
  cursor: pointer;
  background: var(--accent1);
}

.select {
  border: none;
  background: var(--accent1);
  animation: border-animation 5s linear infinite;
  /* Animation */
  background-size: 300% 300%;
  /* Allow for smooth animation */
}

@keyframes border-animation {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

.coming-soon-banner {
  position: absolute;
  top: 20px;
  /* Reduced from 20px */
  right: -25px;
  /* Changed from -35px */
  background-color: var(--accent1);
  /* Your purple color */
  color: var(--text1);
  padding-left: 10px;
  /* Reduced padding */
  padding: 1px;
  font-size: 12px;
  /* You can make this smaller if needed, like 10px */
  transform: rotate(45deg);
  transform-origin: center;
  width: 120px;
  /* Reduced from 150px */
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 1;
}

.coming-soon-banner2 {
  position: absolute;
  top: 20px;
  /* Reduced from 20px */
  right: -35px;
  /* Changed from -35px */
  background-color: var(--accent1);
  /* Your purple color */
  color: var(--text1);
  padding-left: 10px;
  /* Reduced padding */
  padding: 1px;
  font-size: 12px;
  /* You can make this smaller if needed, like 10px */
  transform: rotate(45deg);
  transform-origin: center;
  width: 120px;
  /* Reduced from 150px */
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 1;
  cursor: default;
}

.card-element-container {
  background-color: var(--base2);
  padding: 20px;
  border-radius: 4px;
  margin: 20px 0;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

#card-element {
  padding: 10px;
  border: 1px solid var(--base4);
  border-radius: 4px;
  background-color: var(--base4);
}

#card-errors {
  color: #fa755a;
  text-align: left;
  margin-top: 8px;
  min-height: 20px;
}

p {
  color: var(--text1);
}

.price {
  font-size: 12px;
  margin: 2px;
}

.offer {
  font-size: 18px;
  margin: 2px;
}

.receipts {
  padding: 20px;
}

.receipt-item {
  background-color: var(--base2);
  padding: 3px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.receipt-header {
  background-color: var(--base1);
  padding: 3px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.receipt-item p {
  margin: 5px 0;
}

.downloadbtn {
  background-color: transparent;
  border: none;
  opacity: 0.60;
}

.downloadbtn:hover {
  cursor: pointer;
  opacity: 1;
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

.twofa-container {
  max-width: 400px;
  margin: 40px auto;
  padding: 20px;
  background-color: var(--base2);
  border: 1px solid var(--text2);
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.twofa-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
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
}

.qr {
  background-color: $text1;
  padding: 10px;
}

.userdiv {
  background-color: var(--base2);
  width: 80%;
  border-radius: 10px;
  padding: 15px;
  margin: 0 auto;
  margin-bottom: 20px;
}

.toggle-icon {
  width: 15px;
  /* Adjust the size as needed */
  cursor: pointer;
  /* Change cursor to pointer on hover */
}

.theme-buttons {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 70%;
}

.theme-buttons button {
  height: 100px;
  font-size: 1.5rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  background-color: var(--base2);
}

.theme-buttons button.active {
  background-color: var(--accent1);
  color: var(--text1);
}

.theme-buttons button:hover {
  background-color: var(--accent2);
}

.tier {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 5px;
  background: var(--base2);
  color: var(--text1);
  font-size: 1rem;
  font-weight: bold;
  letter-spacing: 0.5px;
  border: 1px solid var(--accent3);
  text-transform: uppercase;
  vertical-align: middle;
  cursor: default;
}


/* Mobile version */
@media (max-width: 1150px) {
  .settingsbtn {
    display: none;
  }

  #main {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .sidebar {
    display: flex;
    flex-direction: row;
    justify-content: center;
    height: 30%;
    width: 100%;
    background-color: var(--base2);
    padding: 0;
  }

  .content {
    display: flex;
    flex-direction: row;
    height: 70%;
    width: 100%;
    background-color: var(--base4);
    text-align: center;
    
  }

  .user-wrapper {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    align-content: center;
    width: 90%;
    /* 70% of the viewport width */
    margin: 0 auto;
    padding: 1.5rem;
  }

  .user {
    color: var(--accent3);
    font-size: 2.5rem;
    margin: 0;
    padding: 0;
  }

  .subscription-remaining {
    color: var(--text2);
    font-size: 1.2rem;
    margin: 0;
    padding: 0;
  }

  .menu-wrapper {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    width: 100%;
    /* 70% of the viewport width */
    margin: 0 auto;
  }

  .menu {
    margin-top: 5px;
    display: flex;
    justify-content: center;
    /* added justify-content: center */
    align-items: center;
    /* already present */
    background-color: rgba(var(--base4), 0.9);
    padding: 10px;
    color: var(--text1);
    font-size: 1.2rem;
    cursor: pointer;
    border-radius: 5px;
    transition: background-color 0.3s ease-in-out;
    opacity: 0.80;
    height: 3rem;
  }

  .menu:hover {
    background-color: var(--accent1);
    opacity: 1;
  }

  .menu.selected {
    background-color: var(--accent1);
    opacity: 1;
  }

  .inner {
    display: flex;
    flex-direction: column;
  }

  .icon {
    width: 15px;
    height: 15px;
    margin-right: 7px;
  }

  .userdiv {
    background-color: var(--base2);
    width: 80%;
    border-radius: 10px;
    margin-right: 11%
  }

  /* buttons for settings */
  .userbtn {
    background-color: var(--accent1);
    color: var(--text1);
    border-radius: 5px;
    border: none;
    outline: none;
    padding: 10px;
    margin: 5px;
    width: 40%;
    cursor: pointer;
    /* Pointer cursor on hover */
    transition: all 0.3s ease;
    /* Smooth transition for hover effects */
  }

  .userbtn:hover {
    background-color: var(--accent2);
    /* Background color on hover */
  }

  /* inputs for settings */
  .userinput {
    border-radius: 5px;
    position: relative;
    padding: 10px 10px 10px 15px;
    margin: 7px;
    width: 50%;
    outline: none;
    color: var(--base3);
    /* Dark text color */
    transition: border-color 0.3s, box-shadow 0.3s;
    /* Smooth transition for focus effects */
    border: solid 1px var(--base4);
    background-color: var(--base4);
  }

  .userinput:focus {
    border-color: var(--accent1);
    ;
    /* Change border color on focus */
    box-shadow: 0 0 5px rgba(140, 141, 254, 0.5);
    /* Subtle shadow effect */
    outline: none;
    /* Remove default outline */
  }

  .changepassword {
    display: flex;
    justify-content: center;
    flex-direction: column;
  }

  .password-toggle {
    position: absolute;
    right: 25%;
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
    right: 15%;
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
    right: 15%;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    font-size: 10px;
    color: var(--text1);
    opacity: 0.60;
  }

  .user-wrapper2 {
    display: flex;
    flex-direction: column;
  }

  .theme-buttons {
  position: absolute;
  top: 50%;
  left: 46%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 70%;
}

.theme-buttons button {
  height: 70px;
  font-size: 1.5rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  background-color: var(--base2);
}

.theme-buttons button.active {
  background-color: var(--accent1);
  color: var(--text1);
}

.theme-buttons button:hover {
  background-color: var(--accent2);
}

.twofa-container {
  max-width: 400px;
  width: 30rem;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: 40px auto;
  padding: 20px;
  background-color: var(--base2);
  border: 1px solid var(--text2);
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.twofa-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
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
}

}
</style>