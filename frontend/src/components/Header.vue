<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { logout } from '@/api/auth';

const { t } = useI18n();
const router = useRouter();
const signingOut = ref(false);

async function signOut(): Promise<void> {
    if (signingOut.value) return;
    signingOut.value = true;
    // `logout` clears local state even when the request fails, so there is no
    // failure path here that should leave the user on a signed-in page.
    await logout();
    await router.push({ name: 'Login' });
    signingOut.value = false;
}
</script>

<template>
    <header class="header">
        <div class="header__mark" />

        <nav
            class="header__nav"
            :aria-label="t('common.mainNavigation')">
            <RouterLink
                to="/dashboard"
                class="header__link"
                :title="t('header.nav.dashboard')">
                <svg
                    aria-hidden="true"
                    focusable="false"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg">
                    <g stroke-width="0"></g>
                    <g
                        stroke-linecap="round"
                        stroke-linejoin="round"></g>
                    <g>
                        <rect
                            x="2"
                            y="2"
                            width="9"
                            height="9"
                            rx="2"
                            fill="currentColor" />
                        <rect
                            x="13"
                            y="2"
                            width="9"
                            height="9"
                            rx="2"
                            fill="currentColor" />
                        <rect
                            x="2"
                            y="13"
                            width="9"
                            height="9"
                            rx="2"
                            fill="currentColor" />
                        <rect
                            x="13"
                            y="13"
                            width="9"
                            height="9"
                            rx="2"
                            fill="currentColor" />
                    </g>
                </svg>
                <span class="header__label">{{ t('header.nav.dashboard') }}</span>
            </RouterLink>

            <RouterLink
                to="/account"
                class="header__link"
                :title="t('header.nav.account')">
                <svg
                    aria-hidden="true"
                    focusable="false"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor">
                    <path
                        d="M9.6,3.32a3.86,3.86,0,1,0,3.86,3.85A3.85,3.85,0,0,0,9.6,3.32M16.35,11a.26.26,0,0,0-.25.21l-.18,1.27a4.63,4.63,0,0,0-.82.45l-1.2-.48a.3.3,0,0,0-.3.13l-1,1.66a.24.24,0,0,0,.06.31l1,.79a3.94,3.94,0,0,0,0,1l-1,.79a.23.23,0,0,0-.06.3l1,1.67c.06.13.19.13.3.13l1.2-.49a3.85,3.85,0,0,0,.82.46l.18,1.27a.24.24,0,0,0,.25.2h1.93a.24.24,0,0,0,.23-.2l.18-1.27a5,5,0,0,0,.81-.46l1.19.49c.12,0,.25,0,.32-.13l1-1.67a.23.23,0,0,0-.06-.3l-1-.79a4,4,0,0,0,0-.49,2.67,2.67,0,0,0,0-.48l1-.79a.25.25,0,0,0,.06-.31l-1-1.66c-.06-.13-.19-.13-.31-.13L19.5,13a4.07,4.07,0,0,0-.82-.45l-.18-1.27a.23.23,0,0,0-.22-.21H16.46M9.71,13C5.45,13,2,14.7,2,16.83v1.92h9.33a6.65,6.65,0,0,1,0-5.69A13.56,13.56,0,0,0,9.71,13m7.6,1.43a1.45,1.45,0,1,1,0,2.89,1.45,1.45,0,0,1,0-2.89Z"
                        fill="currentColor"></path>
                </svg>
                <span class="header__label">{{ t('header.nav.account') }}</span>
            </RouterLink>

            <RouterLink
                to="/portfolio"
                class="header__link"
                :title="t('header.nav.portfolio')">
                <svg
                    aria-hidden="true"
                    focusable="false"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg">
                    <g>
                        <path
                            d="M21.6702 6.94942C21.0302 4.77942 19.2202 2.96942 17.0502 2.32942C15.4002 1.84942 14.2602 1.88942 13.4702 2.47942C12.5202 3.18942 12.4102 4.46942 12.4102 5.37942V7.86942C12.4102 10.3294 13.5302 11.5794 15.7302 11.5794H18.6002C19.5002 11.5794 20.7902 11.4694 21.5002 10.5194C22.1102 9.73942 22.1602 8.59942 21.6702 6.94942Z"
                            fill="currentColor"></path>
                        <path
                            d="M18.9094 13.3611C18.6494 13.0611 18.2694 12.8911 17.8794 12.8911H14.2994C12.5394 12.8911 11.1094 11.4611 11.1094 9.70113V6.12113C11.1094 5.73113 10.9394 5.35113 10.6394 5.09113C10.3494 4.83113 9.94941 4.71113 9.56941 4.76113C7.21941 5.06113 5.05941 6.35113 3.64941 8.29113C2.22941 10.2411 1.70941 12.6211 2.15941 15.0011C2.80941 18.4411 5.55941 21.1911 9.00941 21.8411C9.55941 21.9511 10.1094 22.0011 10.6594 22.0011C12.4694 22.0011 14.2194 21.4411 15.7094 20.3511C17.6494 18.9411 18.9394 16.7811 19.2394 14.4311C19.2894 14.0411 19.1694 13.6511 18.9094 13.3611Z"
                            fill="currentColor"></path>
                    </g>
                </svg>
                <span class="header__label">{{ t('header.nav.portfolio') }}</span>
            </RouterLink>

            <RouterLink
                to="/charts"
                class="header__link"
                :title="t('header.nav.charts')">
                <svg
                    aria-hidden="true"
                    focusable="false"
                    viewBox="0 0 32 32"
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor">
                    <g>
                        <path
                            d="M29.5 7c-1.381 0-2.5 1.12-2.5 2.5 0 0.284 0.058 0.551 0.144 0.805l-6.094 5.247c-0.427-0.341-0.961-0.553-1.55-0.553-0.68 0-1.294 0.273-1.744 0.713l-4.774-2.39c-0.093-1.296-1.162-2.323-2.482-2.323-1.38 0-2.5 1.12-2.5 2.5 0 0.378 0.090 0.732 0.24 1.053l-4.867 5.612c-0.273-0.102-0.564-0.166-0.873-0.166-1.381 0-2.5 1.119-2.5 2.5s1.119 2.5 2.5 2.5c1.381 0 2.5-1.119 2.5-2.5 0-0.332-0.068-0.649-0.186-0.939l4.946-5.685c0.236 0.073 0.48 0.124 0.74 0.124 0.727 0 1.377-0.316 1.834-0.813l4.669 2.341c0.017 1.367 1.127 2.471 2.497 2.471 1.381 0 2.5-1.119 2.5-2.5 0-0.044-0.011-0.086-0.013-0.13l6.503-5.587c0.309 0.137 0.649 0.216 1.010 0.216 1.381 0 2.5-1.119 2.5-2.5s-1.119-2.5-2.5-2.5z"
                            fill="currentColor"></path>
                    </g>
                </svg>
                <span class="header__label">{{ t('header.nav.charts') }}</span>
            </RouterLink>

            <RouterLink
                to="/screener"
                class="header__link"
                :title="t('header.nav.screener')">
                <svg
                    aria-hidden="true"
                    focusable="false"
                    viewBox="0 0 512 512"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor">
                    <g>
                        <path
                            d="M256,256c-13.47,0-26.94-2.39-37.44-7.17l-148-67.49C63.79,178.26,48,169.25,48,152.24s15.79-26,22.58-29.12L219.86,55.05c20.57-9.4,51.61-9.4,72.19,0l149.37,68.07c6.79,3.09,22.58,12.1,22.58,29.12s-15.79,26-22.58,29.11l-148,67.48C282.94,253.61,269.47,256,256,256ZM432.76,155.14h0Z"
                            fill="currentColor"></path>
                        <path
                            d="M441.36,226.81,426.27,220,387.5,237.74l-94,43c-10.5,4.8-24,7.19-37.44,7.19s-26.93-2.39-37.42-7.19l-94.07-43L85.79,220l-15.22,6.84C63.79,229.93,48,239,48,256s15.79,26.08,22.56,29.17l148,67.63C229,357.6,242.49,360,256,360s26.94-2.4,37.44-7.19L441.31,285.2C448.12,282.11,464,273.09,464,256S448.23,229.93,441.36,226.81Z"
                            fill="currentColor"></path>
                        <path
                            d="M441.36,330.8,426.27,324,387.5,341.73l-94,42.95c-10.5,4.78-24,7.18-37.44,7.18s-26.93-2.39-37.42-7.18l-94.07-43L85.79,324l-15.22,6.84C63.79,333.93,48,343,48,360s15.79,26.07,22.56,29.15l148,67.59C229,461.52,242.54,464,256,464s26.88-2.48,37.38-7.27l147.92-67.57C448.12,386.08,464,377.06,464,360S448.23,333.93,441.36,330.8Z"
                            fill="currentColor"></path>
                    </g>
                </svg>
                <span class="header__label">{{ t('header.nav.screener') }}</span>
            </RouterLink>

            <button
                type="button"
                class="header__link header__link--button"
                :title="t('header.nav.logout')"
                :disabled="signingOut"
                @click="signOut">
                <svg
                    aria-hidden="true"
                    focusable="false"
                    viewBox="0 0 1024 1024"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor">
                    <g>
                        <path
                            d="M106.667 512c0-200.295 162.371-362.667 362.667-362.667 57.937 0 112.644 13.57 161.173 37.687 10.551 5.243 23.356.941 28.599-9.61 5.239-10.551.939-23.355-9.613-28.599-54.293-26.982-115.486-42.144-180.16-42.144C245.473 106.667 64 288.141 64 512s181.474 405.333 405.333 405.333c64.674 0 125.867-15.164 180.16-42.146 10.551-5.244 14.852-18.044 9.613-28.595-5.244-10.551-18.048-14.857-28.599-9.613-48.529 24.115-103.236 37.687-161.173 37.687-200.295 0-362.667-162.372-362.667-362.667z"
                            fill="currentColor"></path>
                        <path
                            d="M783.087 326.249c-8.333-8.332-21.841-8.332-30.174 0-8.329 8.331-8.329 21.839 0 30.17l134.251 134.249h-353.83c-11.78 0-21.333 9.553-21.333 21.333s9.553 21.333 21.333 21.333h353.83L752.913 667.58c-8.329 8.333-8.329 21.841 0 30.174 8.333 8.329 21.841 8.329 30.174 0l170.667-170.667a21.29 21.29 0 004.655-6.985A21.31 21.31 0 00960 512a21.252 21.252 0 00-5.79-14.613l-.512-.525-170.611-170.613z"
                            fill="currentColor"></path>
                    </g>
                </svg>
                <span class="header__label">{{ t('header.nav.logout') }}</span>
            </button>
        </nav>
    </header>
</template>

<style lang="scss" scoped>
.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space-2;
    padding: $space-1 $space-3;
    background: $color-bg;
}

.header__mark {
    flex-shrink: 0;
    width: 40px;
    aspect-ratio: 1;
    background: $color-text;
    mask: url('/mark.svg') no-repeat center / contain;
    opacity: 0.3;
}

.header__nav {
    display: flex;
    align-items: center;

    // The nav scrolls rather than wrapping or overflowing when six items will
    // not fit; the header itself must stay one row tall.
    overflow-x: auto;
    scrollbar-width: none;
}

.header__link {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0;
    margin: $space-1;
    padding: $space-1 $space-2;
    border: none;
    border-radius: $radius-sm;
    background: none;
    color: $color-text;
    text-decoration: none;
    transition: background-color $duration-base $ease-out;

    &:hover {
        background: $color-surface;
        text-decoration: none;
    }

    svg {
        flex-shrink: 0;
        width: 26px;
        height: 26px;
    }

    @include above($bp-xl) {
        gap: $space-2;
    }
}

// vue-router sets this itself, on the link whose route is active. It is the
// whole active-state mechanism — there is nothing to compute in the template.
.header__link.router-link-active {
    background: $color-surface;
    color: $color-accent-1;
}

.header__link--button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

// Mobile-first: below $bp-xl the labels are simply absent and the icons carry
// the nav, with each link's `title` and accessible name doing the naming. The
// text is layered back on when there is room, rather than hidden when there is
// not.
.header__label {
    display: none;
    font-size: $font-size-base;
    user-select: none;
    white-space: nowrap;

    @include above($bp-xl) {
        display: inline;
    }
}
</style>
