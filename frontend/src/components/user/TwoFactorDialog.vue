<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import QrcodeVue from 'qrcode.vue';
import { beginTwoFactor, confirmTwoFactor, type TotpEnrolment } from '@/api/account';
import { apiErrorMessage } from '@/api/client';
import AppDialog from '@/components/ui/AppDialog.vue';
import AppSpinner from '@/components/ui/AppSpinner.vue';

const emit = defineEmits<{ enrolled: [codes: string[]]; close: [] }>();

const { t } = useI18n();

const enrolment = ref<TotpEnrolment | null>(null);
const code = ref('');
const pending = ref(false);
const error = ref<string | null>(null);

// Enrolment is two-step server-side: this writes a pending secret that only
// becomes the account's on a code proving the authenticator has it
onMounted(async () => {
    pending.value = true;
    try {
        enrolment.value = (await beginTwoFactor()).data;
    } catch (err) {
        error.value = apiErrorMessage(err, t('errors.INTERNAL'));
    } finally {
        pending.value = false;
    }
});

async function confirm(): Promise<void> {
    if (pending.value || code.value.trim() === '') return;
    pending.value = true;
    error.value = null;
    try {
        const { data } = await confirmTwoFactor(code.value.trim());
        emit('enrolled', data.recoveryCodes);
    } catch (err) {
        error.value = apiErrorMessage(err, t('errors.INTERNAL'));
    } finally {
        pending.value = false;
    }
}
</script>

<template>
    <AppDialog :title="t('user.security.enrol.title')" :dismissible="false" @close="emit('close')">
        <AppSpinner v-if="enrolment === null && error === null" />

        <p v-else-if="enrolment === null" class="form-error" role="alert">{{ error }}</p>

        <form v-else class="enrol" novalidate @submit.prevent="confirm">
            <!-- Step one: put the secret into an authenticator -->
            <p class="enrol__step">{{ t('user.security.enrol.scan') }}</p>

            <!-- Fixed black on white, not theme tokens: a reader needs the
                 contrast, and half the palettes would not give it -->
            <div class="enrol__qr">
                <QrcodeVue
                    :value="enrolment.uri"
                    render-as="svg"
                    :size="176"
                    :margin="2"
                    level="M"
                    background="#ffffff"
                    foreground="#000000"
                />
            </div>

            <p class="form-hint">{{ t('user.security.enrol.manual') }}</p>
            <code class="enrol__secret">{{ enrolment.secret }}</code>

            <!-- Step two: prove it arrived -->
            <label class="form-field enrol__field">
                <span class="form-label">{{ t('user.security.enrol.confirmLabel') }}</span>
                <input
                    v-model="code"
                    class="form-input enrol__code"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    maxlength="6"
                    :placeholder="t('user.security.codePlaceholder')"
                />
            </label>

            <p v-if="error !== null" class="form-error" role="alert">{{ error }}</p>
        </form>

        <template #footer>
            <button type="button" class="btn" @click="emit('close')">{{ t('common.cancel') }}</button>
            <button
                type="button"
                class="btn btn--primary"
                :disabled="enrolment === null || pending || code.trim() === ''"
                @click="confirm"
            >
                {{ pending ? t('common.processing') : t('user.security.enrol.submit') }}
            </button>
        </template>
    </AppDialog>
</template>

<style lang="scss" scoped>
.enrol {
    display: grid;
    gap: $space-3;
    justify-items: center;
}

.enrol__step {
    margin: 0;
    font-size: $font-size-sm;
    line-height: $line-height-body;
    color: $color-text;
    text-align: center;
}

.enrol__qr {
    display: flex;
    padding: $space-2;
    border-radius: $radius-sm;

    // The quiet zone belongs to the code, not to the page. A themed background
    // here is a reader failure on half the palettes, so this one is literal.
    // stylelint-disable-next-line scale-unlimited/declaration-strict-value
    background: #fff;
}

.enrol__secret {
    padding: $space-2;
    border-radius: $radius-sm;
    background: $color-sunken;
    font-family: $font-mono;
    font-size: $font-size-sm;
    color: $color-text;
    word-break: break-all;
}

.enrol__code {
    letter-spacing: 0.3em;
    text-align: center;
}

.enrol__field {
    width: 100%;
}
</style>
