<template>
  <Header />
  <div id="main">
    <div class="sidebar">
      <div class="inner2">
        <div class="menu-wrapper" role="menu" aria-label="User settings menu">
          <div
            class="menu"
            :class="{ selected: selectedIndex === 0 }"
            role="menuitem"
            :aria-label="t('user.menu.account')"
            tabindex="0"
            @click="selectMenu(0, $event)"
            @keydown.enter="selectMenu(0, $event)"
          >
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="20"
              height="20" aria-hidden="true" focusable="false">
              <path
                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            {{ t('user.menu.account') }}
          </div>
          <div
            class="menu"
            :class="{ selected: selectedIndex === 1 }"
            role="menuitem"
            :aria-label="t('user.menu.subscription')"
            tabindex="0"
            @click="selectMenu(1, $event)"
            @keydown.enter="selectMenu(1, $event)"
          >
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="20"
              height="20" aria-hidden="true" focusable="false">
              <path
                d="M20 4H4c-1.1 0-2 .9-2 2v2h20V6c0-1.1-.9-2-2-2zM2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-6H2v6zm4-3h4v2H6v-2z" />
            </svg>
            {{ t('user.menu.subscription') }}
          </div>
          <div
            class="menu"
            :class="{ selected: selectedIndex === 2 }"
            role="menuitem"
            :aria-label="t('user.menu.themes')"
            tabindex="0"
            @click="selectMenu(2, $event)"
            @keydown.enter="selectMenu(2, $event)"
          >
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
            {{ t('user.menu.themes') }}
          </div>
          <div
            class="menu"
            :class="{ selected: selectedIndex === 3 }"
            role="menuitem"
            :aria-label="t('user.menu.security2fa')"
            tabindex="0"
            @click="selectMenu(3, $event)"
            @keydown.enter="selectMenu(3, $event)"
          >
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
            </svg>{{ t('user.menu.security2fa') }}
          </div>
        </div>
      </div>
    </div>
    <div class="content">
      <div v-if="selectedIndex === 0">
        <AccountSettings
          v-if="!loading.account"
          :user="user?.Username ?? ''"
          :apiKey="apiKey"
          :formatDate="formatDate"
           @notify="showNotification"
        />
        <Loader v-else />
      </div>
      <div v-if="selectedIndex === 1">
        <Subscription
          v-if="!loading.subscription"
          :user="user?.Username ?? ''"
          :apiKey="apiKey"
          :formatDate="formatDate"
        />
        <Loader v-else />
      </div>
      <div v-if="selectedIndex === 2">
        <Themes
          v-if="!loading.themes"
          :apiKey="apiKey"
          :user="user?.Username ?? ''"
          @notify="showNotification"
        />
        <Loader v-else />
      </div>
      <div v-if="selectedIndex === 3">
        <TwoFA
          v-if="!loading.twofa"
          :apiKey="apiKey"
          :user="user?.Username ?? ''"
          @notify="showNotification"
        />
        <Loader v-else />
      </div>
    </div>
  </div>
  <NotificationPopup ref="notification" />
</template>

<script setup lang="ts">
import Header from '@/components/Header.vue'
import { useUserStore } from '@/store/store';
import { ref, computed, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import NotificationPopup from '@/components/NotificationPopup.vue';
import Loader from '@/components/loader.vue';

const { t } = useI18n();

// Component Sections
import TwoFA from '@/components/User/2FA.vue';
import Themes from '@/components/User/Themes.vue';
import Subscription from '@/components/User/Subscription.vue';
import AccountSettings from '@/components/User/AccountSettings.vue';

const userStore = useUserStore();
const user = computed(() => userStore.getUser);
const apiKey = import.meta.env.VITE_EREUNA_KEY;

// for popup notifications
const notification = ref<InstanceType<typeof NotificationPopup> | null>(null);
const showNotification = (msg: string) => {
  if (notification.value) {
    notification.value.show(msg);
  }
};


let selectedIndex = ref(0);
// Loading and error state for each section
const loading = ref({
  account: false,
  subscription: false,
  themes: false,
  communications: false,
  twofa: false
});
const error = ref({
  account: '',
  subscription: '',
  themes: '',
  communications: '',
  twofa: ''
});

type SectionKey = 'account' | 'subscription' | 'themes' | 'twofa';
const sectionKeys: SectionKey[] = ['account', 'subscription', 'themes', 'twofa'];

function selectMenu(index: number, event?: MouseEvent | KeyboardEvent) {
  selectedIndex.value = index;
  const key = sectionKeys[index];
  if (key) {
    loading.value[key] = true;
    error.value[key] = '';
    setTimeout(() => {
      loading.value[key] = false;
    }, 500);
  }
}


function formatDate(bsonDate: string | number | Date) {
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

// Watch for errors and show notification if any
watchEffect(() => {
  Object.entries(error.value).forEach(([key, val]) => {
    if (val) {
      showNotification(val);
    }
  });
});

</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

#main {
  display: flex;
  flex-direction: row;
  min-height: 100vh;
  width: 100vw;
  box-sizing: border-box;
  background-color: var(--base1);
  overflow-x: scroll;
  padding: 5px 10px 10px 10px;
  gap: 5px;
}

.sidebar {
  display: flex;
  flex-direction: column;
  width: 15%;
  background: var(--base2);
  padding: 22px;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(10, 20, 30, 0.08);
  border: 1px solid rgba(0,0,0,0.04);
  transition: transform 0.14s ease, box-shadow 0.14s ease;
  overflow-y: auto;
}

.content {
  display: flex;
  position: relative;
  flex-direction: column;
  width: 100%;
  background: var(--base2);
  padding: 22px;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(10, 20, 30, 0.08);
  border: 1px solid rgba(0,0,0,0.04);
  transition: transform 0.14s ease, box-shadow 0.14s ease;
  text-align: center;
  overflow-y: auto;
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
  transition: background-color 0.3s ease-in-out, transform 0.14s ease, box-shadow 0.14s ease;
  opacity: 0.80;
}

.menu:hover {
  cursor: pointer;
  background-color: var(--accent1);
  opacity: 1;
  color: var(--text3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(10, 20, 30, 0.06);
}

.menu.selected {
  background-color: var(--accent1);
  opacity: 1;
  color: var(--text3);
  box-shadow: 0 4px 12px rgba(10, 20, 30, 0.06);
}

.icon {
  width: 20px;
  height: 20px;
  margin-right: 10px;
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

/* buttons for settings */
.userbtn {
  background-color: var(--accent1);
  color: var(--text3);
  border-radius: 5px;
  border: none;
  outline: none;
  padding: 10px;
  margin: 5px;
  width: 150px;
  cursor: pointer;
  transition: all 0.3s ease, transform 0.14s ease, box-shadow 0.14s ease;
  box-shadow: 0 2px 8px rgba(10, 20, 30, 0.04);
}

.userbtn:disabled , .userbtn:disabled:hover {
  cursor: not-allowed;
  background-color: var(--base3);
  transform: none;
  box-shadow: none;
}

.userbtn:hover {
  background-color: var(--accent2);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(10, 20, 30, 0.06);
}

/* inputs for settings */
.userinput {
  border-radius: 5px;
  padding: 10px 10px 10px 15px;
  margin: 7px;
  width: 160px;
  outline: none;
  color: var(--base3);
  transition: border-color 0.3s, box-shadow 0.3s;
  border: solid 1px var(--base4);
  background-color: var(--base4);
  box-shadow: 0 2px 8px rgba(10, 20, 30, 0.04);
}

.userinput:focus {
  border-color: var(--accent1);
  outline: none;
  box-shadow: 0 4px 12px rgba(10, 20, 30, 0.06);
}

@media (max-width: 1150px) {
  .sidebar {
    width: 60px;
    min-width: 60px;
    padding: 22px 10px;
    align-items: center;
  }
  .menu {
    width: 40px;
    min-width: 40px;
    justify-content: center;
    padding: 10px 0;
  }
  .menu .icon {
    margin-right: 0;
  }
  .menu {
    font-size: 0;
  }
  .menu .icon {
    font-size: 20px;
    width: 24px;
    height: 24px;
  }
}
</style>