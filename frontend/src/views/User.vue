<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getAccount } from '@/api/account';
import { setSessionUser, type SessionUser } from '@/api/client';
import AppSpinner from '@/components/ui/AppSpinner.vue';
import DeleteAccount from '@/components/user/DeleteAccount.vue';
import LanguageSetting from '@/components/user/LanguageSetting.vue';
import PasswordForm from '@/components/user/PasswordForm.vue';
import SecurityPanel from '@/components/user/SecurityPanel.vue';
import ThemePicker from '@/components/user/ThemePicker.vue';
import UsernameForm from '@/components/user/UsernameForm.vue';
import { useResource } from '@/composables/data/useResource';

type Section = 'account' | 'appearance' | 'security';

const SECTIONS: readonly Section[] = ['account', 'appearance', 'security'];

const { t } = useI18n();

const section = ref<Section>('account');

const { data: account, pending, error, mutate } = useResource(
    () => null,
    async () => (await getAccount()).data,
);

/**
 * Adopt an account the server has just returned.
 * The session hint in localStorage is what the app boots from, so a rename has
 * to reach it as well as this page — otherwise the next reload shows the old
 * name until something else refreshes it.
 */
function adopt(user: SessionUser): void {
    setSessionUser(user);
    mutate(user);
}

function setTwoFactor(enabled: boolean): void {
    if (account.value === null) return;
    mutate({ ...account.value, twoFactorEnabled: enabled });
}
</script>

<template>
    <main class="page account">
        <h1 class="account__heading">{{ t('user.title') }}</h1>

        <!-- Tabs, not a menu: each one swaps the region below it -->
        <div class="account__tabs" role="tablist" :aria-label="t('user.title')">
            <button
                v-for="entry in SECTIONS"
                :id="`account-tab-${entry}`"
                :key="entry"
                type="button"
                role="tab"
                class="account__tab"
                :class="{ 'account__tab--active': section === entry }"
                :aria-selected="section === entry"
                :aria-controls="`account-panel-${entry}`"
                @click="section = entry"
            >
                {{ t(`user.nav.${entry}`) }}
            </button>
        </div>

        <AppSpinner v-if="pending && account === null" />

        <p v-else-if="error !== null" class="form-error" role="alert">{{ error }}</p>

        <div
            v-else-if="account !== null"
            :id="`account-panel-${section}`"
            class="stack"
            role="tabpanel"
            :aria-labelledby="`account-tab-${section}`"
        >
            <template v-if="section === 'account'">
                <LanguageSetting />
                <UsernameForm :username="account.username" @renamed="adopt" />
                <PasswordForm />
                <DeleteAccount />
            </template>

            <ThemePicker v-else-if="section === 'appearance'" />

            <SecurityPanel
                v-else
                :enabled="account.twoFactorEnabled"
                @changed="setTwoFactor"
            />
        </div>
    </main>
</template>

<style lang="scss" scoped>
.account {
    display: grid;
    gap: $space-4;
    align-content: start;
}

.account__heading {
    margin: 0;
    font-size: $font-size-xl;
    font-weight: $font-weight-medium;
    color: $color-text;
}

/* –––––– Section tabs –––––– */

.account__tabs {
    display: flex;
    flex-wrap: wrap;
    gap: $space-1;
    padding-bottom: $space-2;
    border-bottom: $border-width solid $color-elevated;
}

.account__tab {
    padding: $space-2 $space-4;
    border: 0;
    border-radius: $radius-sm;
    background: transparent;
    color: $color-text-muted;
    font-size: $font-size-sm;
    cursor: pointer;
    transition: color $duration-fast $ease-out;

    &:hover {
        color: $color-text;
    }
}

.account__tab--active {
    background: $color-surface;
    color: $color-accent-1;
}
</style>
