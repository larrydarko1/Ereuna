<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import AppField from '@/components/ui/AppField.vue';
import AppSpinner from '@/components/ui/AppSpinner.vue';
import AuthLayout from '@/components/auth/AuthLayout.vue';
import { recover } from '@/api/auth';
import { apiErrorMessage } from '@/api/client';
import { notifyError, notify } from '@/composables/ui/useNotifications';
import { useTheme } from '@/composables/ui/useTheme';

const { t } = useI18n();
const router = useRouter();
const { syncTheme } = useTheme();

const username = ref('');
const code = ref('');
const pending = ref(false);

const canSubmit = computed(() => username.value.trim() !== '' && code.value.trim() !== '' && !pending.value);

async function submit(): Promise<void> {
    if (!canSubmit.value) return;
    pending.value = true;

    try {
        // rememberMe is false: recovery is an emergency route in, not a device
        // the user is declaring as trusted.
        await recover(username.value.trim(), code.value.trim(), false);
        await syncTheme();
        notify(t('auth.recoverySpent'));
        // The session has no password behind it until this is done
        await router.push({ name: 'SetPassword' });
    } catch (err) {
        notifyError(apiErrorMessage(err, t('auth.invalidCredentials')));
    } finally {
        pending.value = false;
    }
}
</script>

<template>
    <AuthLayout
        :title="t('auth.recoverTitle')"
        :subtitle="t('auth.recoverSubtitle')">
        <form
            class="recovery"
            novalidate
            @submit.prevent="submit">
            <AppField
                v-model="username"
                :label="t('auth.username')"
                :placeholder="t('auth.usernamePlaceholder')"
                autocomplete="username"
                autofocus />
            <AppField
                v-model="code"
                :label="t('auth.recoveryCode')"
                :placeholder="t('auth.recoveryCodePlaceholder')"
                autocomplete="one-time-code" />

            <button
                type="submit"
                class="recovery__submit"
                :disabled="!canSubmit">
                <AppSpinner
                    v-if="pending"
                    size="sm"
                    :label="t('auth.submitting')" />
                <span v-else>{{ t('auth.signIn') }}</span>
            </button>

            <p class="recovery__links">
                <RouterLink to="/login">{{ t('auth.backToSignIn') }}</RouterLink>
            </p>
        </form>
    </AuthLayout>
</template>

<style lang="scss" scoped>
.recovery {
    display: flex;
    flex-direction: column;
    gap: $space-4;
}

.recovery__submit {
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

.recovery__links {
    display: flex;
    justify-content: center;
    margin: 0;
    font-size: $font-size-sm;
    color: $color-text-muted;
}
</style>
