<template>
  <div class="modal-backdrop" @click.self="$emit('close')" role="dialog" aria-modal="true" aria-labelledby="refund-title">
    <div class="modal-content">
      <button class="close-x" @click="$emit('close')" :aria-label="t('common.close')">&times;</button>
      <h2 id="refund-title">{{ t('refund.title') }}</h2>
      <div class="refund-section">
        <div>
          <div class="eligible-msg-block">
              <div class="disclaimer" style="margin-bottom:10px;">
          <strong>{{ t('refund.important') }}</strong> {{ t('refund.importantText') }}<br>
          <span style="color:var(--text1);font-weight:600;">{{ t('refund.downloadDataWarning') }}</span>
        </div>
            <p class="eligible-msg">
              {{ t('refund.eligible') }}
            </p>
            <div class="refund-details">
              <div><strong>{{ t('refund.moneyLeft') }}:</strong> <span class="refund-amount">{{ expirationDays !== null ? ((14.99 / 30) * expirationDays).toFixed(2) : '0.00' }}€</span></div>
              <div><strong>{{ t('refund.daysLeftInSubscription') }}:</strong> <span class="refund-days">{{ daysLeft }}</span></div>
            </div>
          </div>
        </div>
        <div class="disclaimer">
          <strong>{{ t('refund.disclaimer') }}</strong> {{ t('refund.disclaimerText') }}
        </div>
        <button
          class="userbtn"
          :disabled="!eligible || isLoading"
          @click="handleRefund"
          :aria-label="t('refund.requestButton')"
        >
          <span class="btn-content-row">
            <span v-if="isLoading" class="loader4">
              <svg class="spinner" viewBox="0 0 50 50">
                <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5" />
              </svg>
            </span>
            <span v-if="!isLoading">{{ t('refund.requestButton') }}</span>
            <span v-else style="margin-left: 8px;">{{ t('common.processing') }}</span>
          </span>
        </button>
      </div>
  <NotificationPopup ref="notification" role="alert" aria-live="polite" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// LogOut function as provided by user
async function LogOut() {
  try {
    localStorage.clear();
    setTimeout(() => {
      location.reload();
    }, 100);
  } catch (error) {
    console.error('Error logging out:', error);
  }
}
import NotificationPopup from '@/components/NotificationPopup.vue';

const props = defineProps({
  amountPaid: { type: Number, required: true }, // in euros
  daysLeft: { type: Number, required: true },
  vatPercent: { type: Number, required: true },
  eligible: { type: Boolean, required: true },
  user: { type: String, required: true },
  apiKey: { type: String, required: true },
  paymentIntentId: { type: String, required: true },
});

const isLoading = ref(false);
const notification = ref<InstanceType<typeof NotificationPopup> | null>(null);
const showNotification = (msg: string) => {
  if (notification.value) notification.value.show(msg);
};

const expirationDays = computed(() => {
  return typeof props.daysLeft === 'number' ? props.daysLeft : null;
});

const refundAmount = computed(() => {
  if (expirationDays.value !== null) {
    return ((14.99 / 30) * expirationDays.value).toFixed(2);
  }
  return '0.00';
});

async function handleRefund() {
  if (!props.eligible || isLoading.value) return;
  isLoading.value = true;
  try {
    const response = await fetch('/api/request-refund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
      body: JSON.stringify({
  user: props.user,
  amount: Math.round(parseFloat(refundAmount.value) * 100),
  paymentIntentId: props.paymentIntentId,
}),
    });
    const result = await response.json();
    if (response.ok && result.success) {
      showNotification(t('refund.success'));
      setTimeout(() => {
        // @ts-ignore
        if (typeof $emit === 'function') $emit('close');
        // Log out the user after a short delay
        setTimeout(() => {
          LogOut();
        }, 1200);
      }, 1800);
    } else {
      showNotification(result.message || t('refund.failed'));
    }
  } catch (err) {
    showNotification(t('errors.networkError'));
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(24, 25, 38, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}
.modal-content {
  position: relative;
  background: var(--base2);
  color: var(--text1);
  border-radius: 18px;
  padding: 36px 32px 28px 32px;
  min-width: 340px;
  max-width: 450px;
  box-shadow: 0 8px 32px 0 rgba(0,0,0,0.18), 0 1.5px 8px 0 var(--accent4);
  display: flex;
  flex-direction: column;
  gap: 18px;
  animation: popup-in 0.18s cubic-bezier(.4,1.4,.6,1) backwards;
  font-size: 1.18rem;
}
@keyframes popup-in {
  from { transform: translateY(30px) scale(0.98); opacity: 0; }
  to   { transform: none; opacity: 1; }
}
.close-x {
  position: absolute;
  top: 18px;
  right: 18px;
  background: none;
  border: none;
  color: var(--text2);
  font-size: 2.1rem;
  cursor: pointer;
  transition: color 0.15s;
  line-height: 1;
  padding: 0;
}
.close-x:hover {
  color: var(--accent1);
}
h2 {
  margin: 0 0 12px 0;
  font-size: 1.7rem;
  font-weight: 700;
  color: var(--accent1);
  letter-spacing: 0.01em;
}
.btn-content-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
}
.loader4 {
  display: flex;
  align-items: center;
  height: 20px;
  margin-right: 10px;
}
.spinner {
  animation: rotate 2s linear infinite;
  width: 25px;
  height: 25px;
}
.path {
  stroke: #000000;
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
}
@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}
@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}
.refund-section {
  background-color: var(--base1);
  border-radius: 12px;
  padding: 24px;
  margin: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 32px;
  font-size: 1.22rem;
}
.refund-section strong {
  font-size: 1.22em;
}
.refund-section p {
  font-size: 1.13em;
}
.userbtn {
  background: var(--accent1);
  color: var(--text3);
  border: none;
  border-radius: 7px;
  padding: 12px 28px;
  font-weight: 600;
  font-size: 1.13rem;
  cursor: pointer;
  transition: background 0.18s;
  margin-top: 18px;
}
.userbtn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.userbtn:hover:not(:disabled) {
  background: var(--accent2);
}
.not-eligible-msg {
  color: var(--accent1);
  font-weight: 600;
  margin-bottom: 18px;
  font-size: 1.35em;
  line-height: 1.5;
}
.eligible-msg-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 18px;
}
.eligible-msg {
  color: var(--text1);
  font-weight: 700;
  font-size: 2.2rem;
  margin-bottom: 10px;
  line-height: 1.3;
}
.refund-details {
  font-size: 1.25rem;
  color: var(--text1);
  display: flex;
  flex-direction: column;
  text-align: left;
  gap: 8px;
}
.refund-amount, .refund-days {
  font-size: 1.25em;
  font-weight: 600;
  color: var(--accent1);
}
.disclaimer {
  font-size: 1.08rem;
  color: var(--text2);
  background: var(--base2);
  border-radius: 8px;
  padding: 14px 16px;
  line-height: 1.6;
}
</style>