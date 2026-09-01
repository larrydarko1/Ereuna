<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import AppField from '@/components/ui/AppField.vue';
import AppSpinner from '@/components/ui/AppSpinner.vue';
import PasswordField from '@/components/ui/PasswordField.vue';
import AuthLayout from '@/components/auth/AuthLayout.vue';
import { register } from '@/api/auth';
import { apiErrorMessage } from '@/api/client';
import { notifyError, notifySuccess } from '@/composables/ui/useNotifications';
import { allValid, validatePassword, validatePasswordConfirmation, validateUsername } from '@/utils/validation';

const { t } = useI18n();
const router = useRouter();

const username = ref('');
const password = ref('');
const confirmation = ref('');
const agreed = ref(false);
const pending = ref(false);

// Errors appear only after a submit attempt. Validating as the user types means
// telling someone their password is too short while they are still typing it.
const submitted = ref(false);

const usernameError = computed(() => (submitted.value ? validateUsername(username.value) : null));
const passwordError = computed(() => (submitted.value ? validatePassword(password.value) : null));
const confirmationError = computed(() =>
    submitted.value ? validatePasswordConfirmation(password.value, confirmation.value) : null,
);

async function submit(): Promise<void> {
    submitted.value = true;
    if (pending.value) return;

    if (!agreed.value) {
        notifyError(t('auth.agreeRequired'));
        return;
    }

    const results = [
        validateUsername(username.value),
        validatePassword(password.value),
        validatePasswordConfirmation(password.value, confirmation.value),
    ];
    if (!allValid(results)) return;

    pending.value = true;
    try {
        await register(username.value.trim(), password.value);
        notifySuccess(t('auth.accountCreated'));
        await router.push({ name: 'Dashboard' });
    } catch (err) {
        notifyError(apiErrorMessage(err, t('validation.unexpectedError')));
    } finally {
        pending.value = false;
    }
}
</script>

<template>
    <AuthLayout :title="t('auth.signUpTitle')" :subtitle="t('auth.signUpSubtitle')">
        <form class="signup" novalidate @submit.prevent="submit">
            <AppField
                v-model="username"
                :label="t('auth.username')"
                :placeholder="t('auth.usernamePlaceholder')"
                :error="usernameError"
                autocomplete="username"
                autofocus
            />
            <PasswordField
                v-model="password"
                :label="t('auth.password')"
                :placeholder="t('auth.passwordPlaceholder')"
                :error="passwordError"
                autocomplete="new-password"
            />
            <PasswordField
                v-model="confirmation"
                :label="t('auth.confirmPassword')"
                :placeholder="t('auth.confirmPasswordPlaceholder')"
                :error="confirmationError"
                autocomplete="new-password"
            />

            <label class="signup__terms">
                <input v-model="agreed" type="checkbox" />
                <span>{{ t('auth.agreeToTerms') }}</span>
            </label>

            <button type="submit" class="signup__submit" :disabled="pending">
                <AppSpinner v-if="pending" size="sm" :label="t('auth.creating')" />
                <span v-else>{{ t('auth.signUp') }}</span>
            </button>

            <p class="signup__links">
                <span>{{ t('auth.alreadyHaveAccount') }}</span>
                <RouterLink to="/login">{{ t('auth.signIn') }}</RouterLink>
            </p>
        </form>
    </AuthLayout>
</template>

<style lang="scss" scoped>
.signup {
    display: flex;
    flex-direction: column;
    gap: $space-4;
}

.signup__terms {
    display: flex;
    align-items: center;
    gap: $space-2;
    font-size: $font-size-sm;
    color: $color-text-muted;
    cursor: pointer;
}

.signup__submit {
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

.signup__links {
    display: flex;
    justify-content: center;
    gap: $space-2;
    margin: 0;
    font-size: $font-size-sm;
    color: $color-text-muted;
}
</style>
