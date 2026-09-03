<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { changeUsername } from '@/api/account';
import { apiErrorMessage, type SessionUser } from '@/api/client';
import AppField from '@/components/ui/AppField.vue';
import PasswordField from '@/components/ui/PasswordField.vue';
import SettingCard from '@/components/user/SettingCard.vue';
import { notifySuccess } from '@/composables/ui/useNotifications';
import { allValid, validateUsername } from '@/utils/validation';

const { username } = defineProps<{ username: string }>();

const emit = defineEmits<{ renamed: [user: SessionUser] }>();

const { t } = useI18n();

const next = ref('');
const password = ref('');
const pending = ref(false);
const error = ref<string | null>(null);
const submitted = ref(false);

const nameError = computed(() => {
    if (!submitted.value) return null;
    if (next.value.trim() === username) return t('user.username.sameAsCurrent');
    return validateUsername(next.value);
});

async function submit(): Promise<void> {
    submitted.value = true;
    error.value = null;
    if (pending.value || !allValid([nameError.value]) || password.value === '') return;

    pending.value = true;
    try {
        const { data } = await changeUsername(password.value, next.value.trim());
        emit('renamed', data);
        notifySuccess(t('user.username.changed'));
        next.value = '';
        password.value = '';
        submitted.value = false;
    } catch (err) {
        error.value = apiErrorMessage(err, t('errors.INTERNAL'));
    } finally {
        pending.value = false;
    }
}
</script>

<template>
    <SettingCard :title="t('user.username.title')" :description="t('user.username.description')">
        <p class="form-hint">{{ t('user.username.current', { username }) }}</p>

        <form class="username-form" novalidate @submit.prevent="submit">
            <AppField
                v-model="next"
                :label="t('user.username.new')"
                :error="nameError"
                autocomplete="username"
            />
            <PasswordField
                v-model="password"
                :label="t('user.password.current')"
                autocomplete="current-password"
            />

            <p v-if="error !== null" class="form-error" role="alert">{{ error }}</p>

            <div>
                <button type="submit" class="btn btn--primary" :disabled="pending">
                    {{ pending ? t('common.processing') : t('user.username.submit') }}
                </button>
            </div>
        </form>
    </SettingCard>
</template>

<style lang="scss" scoped>
.username-form {
    display: grid;
    gap: $space-3;
}
</style>
