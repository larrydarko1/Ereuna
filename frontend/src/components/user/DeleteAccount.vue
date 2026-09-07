<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { deleteAccount } from '@/api/account';
import { apiErrorMessage, clearAuth } from '@/api/client';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PasswordField from '@/components/ui/PasswordField.vue';
import SettingCard from '@/components/user/SettingCard.vue';

const { t } = useI18n();
const router = useRouter();

const password = ref('');
const confirming = ref(false);
const pending = ref(false);
const error = ref<string | null>(null);

async function confirm(): Promise<void> {
    if (pending.value) return;
    pending.value = true;
    error.value = null;
    try {
        await deleteAccount(password.value);
        clearAuth();
        await router.push({ name: 'Login' });
    } catch (err) {
        error.value = apiErrorMessage(err, t('errors.INTERNAL'));
        confirming.value = false;
    } finally {
        pending.value = false;
    }
}
</script>

<template>
    <SettingCard
        :title="t('user.delete.title')"
        :description="t('user.delete.description')"
        tone="danger">
        <p class="delete__lead"
            ><strong>{{ t('user.delete.warning') }}</strong> {{ t('user.delete.warningDetails') }}</p
        >
        <p class="form-hint">{{ t('user.delete.exportFirst') }}</p>

        <PasswordField
            v-model="password"
            :label="t('user.password.current')"
            autocomplete="current-password" />

        <p
            v-if="error !== null"
            class="form-error"
            role="alert"
            >{{ error }}</p
        >

        <div>
            <button
                type="button"
                class="btn btn--danger"
                :disabled="password === '' || pending"
                @click="confirming = true">
                {{ t('user.delete.submit') }}
            </button>
        </div>

        <!-- Second step: the button above only opens this -->
        <ConfirmDialog
            v-if="confirming"
            :title="t('user.delete.confirmTitle')"
            :message="t('user.delete.confirmMessage')"
            :confirm-label="t('user.delete.submit')"
            :pending="pending"
            @confirm="confirm"
            @close="confirming = false" />
    </SettingCard>
</template>

<style lang="scss" scoped>
.delete__lead {
    margin: 0;
    font-size: $font-size-sm;
    line-height: $line-height-body;
    color: $color-text;
}
</style>
