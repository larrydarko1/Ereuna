<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { countRecoveryCodes, disableTwoFactor, regenerateRecoveryCodes } from '@/api/account';
import { apiErrorMessage } from '@/api/client';
import ReauthDialog from '@/components/user/ReauthDialog.vue';
import type { Credentials } from '@/types/user';
import RecoveryCodesDialog from '@/components/user/RecoveryCodesDialog.vue';
import SettingCard from '@/components/user/SettingCard.vue';
import { useResource } from '@/composables/data/useResource';

type Dialog = 'enrol' | 'disable' | 'regenerate' | 'codes';

const { enabled } = defineProps<{ enabled: boolean }>();

const emit = defineEmits<{ changed: [enabled: boolean] }>();

const { t } = useI18n();

// Loaded on demand: it carries the QR encoder, which is a third of this page's
// JavaScript and is wanted once in the life of an account
const TwoFactorDialog = defineAsyncComponent(() => import('@/components/user/TwoFactorDialog.vue'));

const dialog = ref<Dialog | null>(null);
const codes = ref<string[]>([]);
const pending = ref(false);
const error = ref<string | null>(null);

// Only meaningful while 2FA is on: disabling it discards the codes server-side
const { data: remaining, reload: reloadRemaining } = useResource(
    () => enabled,
    async () => (await countRecoveryCodes()).data.remaining,
    { enabled: (on): boolean => on },
);

function open(next: Dialog): void {
    error.value = null;
    dialog.value = next;
}

function enrolled(issued: string[]): void {
    codes.value = issued;
    dialog.value = 'codes';
    emit('changed', true);
}

async function disable({ password, code }: Credentials): Promise<void> {
    if (pending.value) return;
    pending.value = true;
    error.value = null;
    try {
        await disableTwoFactor(password, code);
        dialog.value = null;
        emit('changed', false);
    } catch (err) {
        error.value = apiErrorMessage(err, t('errors.INTERNAL'));
    } finally {
        pending.value = false;
    }
}

async function regenerate({ password }: Credentials): Promise<void> {
    if (pending.value) return;
    pending.value = true;
    error.value = null;
    try {
        codes.value = (await regenerateRecoveryCodes(password)).data.recoveryCodes;
        dialog.value = 'codes';
        await reloadRemaining();
    } catch (err) {
        error.value = apiErrorMessage(err, t('errors.INTERNAL'));
    } finally {
        pending.value = false;
    }
}
</script>

<template>
    <div class="stack">
        <SettingCard
            :title="t('user.security.title')"
            :description="t('user.security.description')">
            <p class="security__status">
                <span
                    class="security__dot"
                    :class="{ 'security__dot--on': enabled }"
                    aria-hidden="true"></span>
                {{ enabled ? t('user.security.statusOn') : t('user.security.statusOff') }}
            </p>

            <div class="cluster">
                <button
                    v-if="!enabled"
                    type="button"
                    class="btn btn--primary"
                    @click="open('enrol')">
                    {{ t('user.security.enable') }}
                </button>
                <button
                    v-else
                    type="button"
                    class="btn btn--danger"
                    @click="open('disable')">
                    {{ t('user.security.disable') }}
                </button>
            </div>
        </SettingCard>

        <!-- Recovery codes only exist alongside an enabled authenticator -->
        <SettingCard
            v-if="enabled"
            :title="t('user.security.codes.title')"
            :description="t('user.security.codes.panelDescription')">
            <p class="form-hint">
                {{
                    remaining === null ? t('common.loading') : t('user.security.codes.remaining', { count: remaining })
                }}
            </p>

            <div class="cluster">
                <button
                    type="button"
                    class="btn"
                    @click="open('regenerate')">
                    {{ t('user.security.codes.regenerate') }}
                </button>
            </div>
        </SettingCard>

        <TwoFactorDialog
            v-if="dialog === 'enrol'"
            @enrolled="enrolled"
            @close="dialog = null" />

        <!-- Both factors to drop the second one, the password alone to reissue codes -->
        <ReauthDialog
            v-if="dialog === 'disable'"
            :title="t('user.security.disableTitle')"
            :message="t('user.security.disableMessage')"
            :confirm-label="t('user.security.disable')"
            needs-password
            needs-code
            :pending="pending"
            :error="error"
            danger
            @submit="disable"
            @close="dialog = null" />

        <ReauthDialog
            v-if="dialog === 'regenerate'"
            :title="t('user.security.codes.regenerateTitle')"
            :message="t('user.security.codes.regenerateMessage')"
            :confirm-label="t('user.security.codes.regenerate')"
            needs-password
            :pending="pending"
            :error="error"
            @submit="regenerate"
            @close="dialog = null" />

        <RecoveryCodesDialog
            v-if="dialog === 'codes'"
            :codes="codes"
            @close="dialog = null" />
    </div>
</template>

<style lang="scss" scoped>
.security__status {
    display: flex;
    align-items: center;
    gap: $space-2;
    margin: 0;
    font-size: $font-size-sm;
    color: $color-text;
}

.security__dot {
    width: 8px;
    height: 8px;
    border-radius: $radius-pill;
    background: $color-text-muted;
}

.security__dot--on {
    background: $color-positive;
}
</style>
