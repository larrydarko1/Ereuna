<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { logout } from '@/api/auth';
import IconAccount from '@/components/icons/IconAccount.vue';
import IconCharts from '@/components/icons/IconCharts.vue';
import IconDashboard from '@/components/icons/IconDashboard.vue';
import IconLogout from '@/components/icons/IconLogout.vue';
import IconPortfolio from '@/components/icons/IconPortfolio.vue';
import IconScreener from '@/components/icons/IconScreener.vue';

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
                <IconDashboard />
                <span class="header__label">{{ t('header.nav.dashboard') }}</span>
            </RouterLink>

            <RouterLink
                to="/account"
                class="header__link"
                :title="t('header.nav.account')">
                <IconAccount />
                <span class="header__label">{{ t('header.nav.account') }}</span>
            </RouterLink>

            <RouterLink
                to="/portfolio"
                class="header__link"
                :title="t('header.nav.portfolio')">
                <IconPortfolio />
                <span class="header__label">{{ t('header.nav.portfolio') }}</span>
            </RouterLink>

            <RouterLink
                to="/charts"
                class="header__link"
                :title="t('header.nav.charts')">
                <IconCharts />
                <span class="header__label">{{ t('header.nav.charts') }}</span>
            </RouterLink>

            <RouterLink
                to="/screener"
                class="header__link"
                :title="t('header.nav.screener')">
                <IconScreener />
                <span class="header__label">{{ t('header.nav.screener') }}</span>
            </RouterLink>

            <button
                type="button"
                class="header__link header__link--button"
                :title="t('header.nav.logout')"
                :disabled="signingOut"
                @click="signOut">
                <IconLogout />
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
