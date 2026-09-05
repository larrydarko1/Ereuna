<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppField from '@/components/ui/AppField.vue';
import AppSpinner from '@/components/ui/AppSpinner.vue';
import PasswordField from '@/components/ui/PasswordField.vue';
import AuthLayout from '@/components/auth/AuthLayout.vue';
import TwoFactorPrompt from '@/components/auth/TwoFactorPrompt.vue';
import { login, validateTwoFactor } from '@/api/auth';
import { apiErrorMessage } from '@/api/client';
import { notifyError } from '@/composables/ui/useNotifications';
import { useTheme } from '@/composables/ui/useTheme';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { syncTheme } = useTheme();

const username = ref('');
const password = ref('');
const rememberMe = ref(false);
const pending = ref(false);

/** Set only when the account has 2FA on. Its presence is what shows the prompt. */
const tempToken = ref<string | null>(null);
const twoFactor = useTemplateRef<InstanceType<typeof TwoFactorPrompt>>('twoFactor');

// Sign-in failures are never per-field: the API answers an unknown username and
// a wrong password with one code, deliberately, so that neither can be used to
// discover which accounts exist. Marking a field would give that away.
const canSubmit = computed(() => username.value.trim() !== '' && password.value !== '' && !pending.value);

async function submit(): Promise<void> {
    if (!canSubmit.value) return;
    pending.value = true;

    try {
        const result = await login(username.value.trim(), password.value, { rememberMe: rememberMe.value });
        if (result.requires2FA) {
            tempToken.value = result.tempToken;
            return;
        }
        await enter();
    } catch (err) {
        notifyError(apiErrorMessage(err, t('auth.invalidCredentials')));
    } finally {
        pending.value = false;
    }
}

async function verify(code: string): Promise<void> {
    if (tempToken.value === null) return;
    pending.value = true;

    try {
        await validateTwoFactor(tempToken.value, code, { rememberMe: rememberMe.value });
        await enter();
    } catch (err) {
        notifyError(apiErrorMessage(err, t('errors.INVALID_TWO_FA_CODE')));
        twoFactor.value?.reset();
    } finally {
        pending.value = false;
    }
}

function cancelTwoFactor(): void {
    // Dropping the temp token is the whole cancellation: without it the
    // half-finished login cannot be completed from this page or any other.
    tempToken.value = null;
    password.value = '';
}

/**
 * Enter the app.
 * The theme is synced first: the user's saved theme arrives with the session,
 * and applying it before the navigation means the dashboard's first paint is
 * already in their colours rather than flashing whatever this browser had.
 */
async function enter(): Promise<void> {
    await syncTheme();
    await router.push(destination());
}

/**
 * Where to land after signing in.
 * The guard puts the blocked path in `?redirect`, so a session that expired
 * mid-task resumes where it left off. Only same-origin paths are honoured:
 * `redirect` comes from the URL bar, and following an absolute one would turn
 * this page into an open redirect that a phishing link could point anywhere.
 */
function destination(): { name: string } | string {
    const target = route.query.redirect;
    if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) return target;
    return { name: 'Dashboard' };
}
</script>

<template>
    <AuthLayout
        :title="t('auth.signInTitle')"
        :subtitle="t('auth.signInSubtitle')">
        <form
            class="login"
            novalidate
            @submit.prevent="submit">
            <AppField
                v-model="username"
                :label="t('auth.username')"
                :placeholder="t('auth.usernamePlaceholder')"
                autocomplete="username" />
            <PasswordField
                v-model="password"
                :label="t('auth.password')"
                :placeholder="t('auth.passwordPlaceholder')"
                autocomplete="current-password" />

            <label class="login__remember">
                <input
                    v-model="rememberMe"
                    type="checkbox" />
                <span>{{ t('auth.rememberMe') }}</span>
            </label>

            <button
                type="submit"
                class="login__submit"
                :disabled="!canSubmit">
                <AppSpinner
                    v-if="pending"
                    size="sm"
                    :label="t('auth.submitting')" />
                <span v-else>{{ t('auth.signIn') }}</span>
            </button>

            <p class="login__links">
                <RouterLink to="/recovery">{{ t('auth.useRecoveryCode') }}</RouterLink>
                <span aria-hidden="true">·</span>
                <RouterLink to="/signup">{{ t('auth.dontHaveAccount') }}</RouterLink>
            </p>
        </form>

        <TwoFactorPrompt
            v-if="tempToken !== null"
            ref="twoFactor"
            :pending="pending"
            @submit="verify"
            @cancel="cancelTwoFactor" />
    </AuthLayout>
</template>

<style lang="scss" scoped>
.login {
    display: flex;
    flex-direction: column;
    gap: $space-4;
}

.login__remember {
    display: flex;
    align-items: center;
    gap: $space-2;
    font-size: $font-size-sm;
    color: $color-text-muted;
    cursor: pointer;
}

.login__submit {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    border: none;
    border-radius: $radius-md;
    background: $color-accent-1;
    color: $color-text-inverted;
    font-size: $font-size-base;
    font-weight: $font-weight-medium;

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
}

.login__links {
    display: flex;
    justify-content: center;
    gap: $space-2;
    margin: 0;
    font-size: $font-size-sm;
    color: $color-text-muted;
}
</style>
