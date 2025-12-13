<template>
  <div v-if="visible" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <button class="modal-close" @click="close" aria-label="Close">&times;</button>
      <div style="display: flex;">
         <img class="icon" src="@/assets/icons/ereuna.png" alt="Owl Icon" draggable="false">
         <h2 class="contract-header">Terms of Service & Privacy Policy</h2>
      </div>
      <div class="modal-body">
        <h2 class="contract-title">1. INTRODUCTION</h2>
        <p>These Terms and Conditions and Privacy Policy ("Terms") govern the use of the Ereuna platform ("Platform") and the services provided by Ereuna Ltd. ("Company"). By using the Platform, you ("User") agree to be bound by these Terms.</p>

        <h2 class="contract-title">2. DATA AGGREGATION SERVICES</h2>
        <p>The Company provides financial data aggregation services using data supplied by Tiingo.com, as well as internally calculated formulas using the data provided by Tiingo. Core data, including End-of-Day (EOD) and financial data, is provided by Tiingo and their third-party providers. The Company does not assume any responsibility for inaccuracies in the core data. The responsibility for any inaccuracies lies with Tiingo and their third-party partners.</p>

        <h2 class="contract-title">3. USER INFORMATION AND PRIVACY</h2>
        <p>The Company is committed to collecting the minimum amount of user information necessary to anonymize users to the greatest extent possible and to store only the information that is essential for the functioning of the application. The Company does not implement any tracking systems, except for those necessary to authenticate user sessions or for minimal logging purposes to ensure the platform's functionality and security. IP addresses and fingerprints may be logged. The Company does not sell user information to third parties, and does not store payment information, full legal names, email addresses, or phone numbers in its database.</p>

        <h2 class="contract-title">4. PAYMENT TERMS</h2>
        <p>Payment can be made using a credit card through Stripe. Credit card information will not be stored in the Company's database. The Company offers a subscription with four tiers: 1 month, 4 months, 6 months, and 1 year. The amount will be €5.99 per month, plus any applicable value-added taxes based on the client's location.</p>

        <h2 class="contract-title">5. REFUND POLICY</h2>
        <p>The client can request a refund within the first 15 days of their initial subscription. For subsequent recharge payments, the client can request a refund within the first 48 hours. Please note that this refund policy only applies to the initial subscription and subsequent recharge payments, and not to any other circumstances.</p>

        <h2 class="contract-title">6. SECURITY AND ACCESS</h2>
        <p>Users are strictly prohibited from attempting to access the server, API, or other services reserved for the Company, regardless of their intentions. Additionally, users are not permitted to resell data or scrape the platform in any way. Any attempts to bypass security measures or exploit the platform for unauthorized purposes will be considered a serious breach of these Terms.</p>

        <h2 class="contract-title">7. RECOVERY METHODS</h2>
        <p>The Company offers a two-factor authentication verification using an authenticator app with a QR code. For password recovery, a code can be entered to reset the password. The recovery code can be downloaded during the registration process or regenerated and downloaded during a user's session. No other recovery methods will be used. It is the user's responsibility to securely store their recovery code, as it will be the only means of regaining access to their account in the event of a lost or forgotten password.</p>

        <h2 class="contract-title">8. MODIFICATION OF TERMS</h2>
        <p>The Company reserves the right to modify these Terms, provided that it notifies all users on the platform and they must re-accept the new conditions or terminate their use of the service. Users will be informed of any changes to these Terms, and it is their responsibility to review and agree to the updated Terms. If a user does not agree to the new Terms, they must cancel their subscription and cease using the service.</p>

        <h2 class="contract-title">9. DATA UPDATE AND MAINTENANCE</h2>
        <p>New data and formulas will be updated approximately 2 hours after the US markets close on each business day (due to the provider's schedule) and there will be a maintenance period during which the platform will be temporarily unavailable to allow new data to be uploaded into the platform. This maintenance period typically lasts around 20 minutes, after which the platform will be available again.</p>

        <h2 class="contract-title">10. SUPPORT AND CONTACT</h2>
        <p>For any questions or support, you can contact the Company at the email address contact@ereuna.io. The Company will respond to inquiries and provide assistance to the best of its abilities.</p>

        <h2 class="contract-title">11. LEGAL BASIS AND JURISDICTION</h2>
        <p>The Platform is legally based in Malta and is subject to the laws and regulations of Malta. As required by applicable laws, logs will be kept for a period of up to 18 months. After this period, the logs will be deleted. The Platform will comply with all applicable requirements, including those related to data retention and privacy.</p>

        <h2 class="contract-title">12. ACCOUNT CANCELLATION</h2>
        <p>The user can cancel their account at any time through the dashboard session on the platform. Upon account cancellation, all user data will be deleted within 48 hours (except for logs, which will be retained for 18 months as previously mentioned). A refund can be applicable, taking into account the remaining time, calculated on the basis of remaining subscription days, where 30 days equal €5.99.</p>

        <h2 class="contract-title">13. DATA BREACH NOTIFICATION</h2>
        <p>The Company is obligated to notify users in the event of a data breach. As previously stated, no sensitive data is stored on the platform, and data minimization is implemented. All data is encrypted to ensure its confidentiality and security. In the event of a data breach, the Company will notify affected users promptly and provide them with information on the measures being taken to mitigate the breach and prevent future incidents.</p>

        <h2 class="contract-title">14. LIMITATION OF LIABILITY</h2>
        <p>In no event shall the Company be liable for any damages, including but not limited to incidental, consequential, or punitive damages, arising out of or in connection with the use of the Platform. The User agrees to hold harmless the Company from any claims, demands, or actions arising out of or in connection with the use of the Platform.</p>

        <p>By using the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({ visible: Boolean })
const emit = defineEmits(['close'])
const close = () => emit('close')
</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(30, 32, 38, 0.85); /* Dark overlay, DON'T modify */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.modal-content {
  background: $base1;
  color: $text2;
  border-radius: 18px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
  max-width: 700px;
  width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  padding: 2.5rem 2rem 2rem 2rem;
  position: relative;
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
  animation: popIn 0.25s;
}

@keyframes popIn {
  from { transform: scale(0.96); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

.modal-close {
  position: absolute;
  top: 1.2rem;
  right: 1.5rem;
  background: none;
  border: none;
  font-size: 2rem;
  color: $text2;
  cursor: pointer;
  transition: color 0.2s;
  &:hover { color: $accent1; }
}

.contract-title {
  font-size: 1.2rem;
  color: $accent3;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.contract-header {
  font-size: 1.5rem;
  color: $text1;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.modal-body {
  margin-top: 1.5rem;
  font-size: 1rem;
  line-height: 1.7;
  color: $text2;
  p { margin-bottom: 1.1rem; }
}

.icon {
    height: 60px; 
  }
</style>