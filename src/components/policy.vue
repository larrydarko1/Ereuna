<template>
  <div v-if="visible" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <button class="modal-close" @click="close" aria-label="Close">&times;</button>
      <div class="modal-header">
        <div style="display: flex;">
          <img class="icon" src="@/assets/icons/ereuna.png" alt="Owl Icon" draggable="false">
          <h2 class="contract-header" style="margin-right: 1rem;">|</h2>
          <h2 class="contract-header">Open Beta Terms & Privacy Policy</h2>
        </div>
      </div>
      <div class="modal-body">
        <h2 class="contract-title">1. OPEN BETA INTRODUCTION</h2>
        <p>Welcome to the Ereuna Open Beta. These Terms and Conditions and Privacy Policy ("Terms") govern your use of the Ereuna platform ("Platform") during the open beta period. By using the Platform, you ("User") agree to be bound by these Terms. This is a free beta program provided "AS IS" with no guarantees or warranties of any kind.</p>

        <h2 class="contract-title">2. FREE BETA - NO CHARGES</h2>
        <p>The Platform is currently offered completely free of charge during the open beta period. There are no subscription fees, no payment requirements, and no strings attached. You will never be charged without your explicit consent. The beta program will continue until a predetermined user threshold is reached or until otherwise announced.</p>

        <h2 class="contract-title">3. RIGHT TO TRANSITION TO PAID SERVICE</h2>
        <p>The Platform operator reserves the right to transition from the free open beta to a paid subscription service at any time. In such event, users will be notified at least one week (7 days) in advance through an announcement on the website. Users will have the choice to subscribe to the paid service or discontinue using the Platform. No charges will ever be forced upon users, and you are free to leave at any time without penalty.</p>

        <h2 class="contract-title">4. RIGHT TO INTERRUPT OR TERMINATE SERVICE</h2>
        <p>The Platform operator reserves the absolute right to interrupt, suspend, or terminate the service at any time, for any reason, with or without notice. This includes but is not limited to technical issues, maintenance, data provider limitations, or the decision to discontinue the beta program. Users acknowledge and accept this risk by participating in the open beta.</p>

        <h2 class="contract-title">5. DATA SOURCES AND LICENSING</h2>
        <p>The Platform provides financial data aggregation services using data supplied by Tiingo.com under a valid licensing and distribution agreement. Core data, including End-of-Day (EOD) and financial data, is provided by Tiingo and their third-party providers. Additionally, the Platform includes internally calculated metrics and formulas derived from Tiingo's core data, as well as some manually reviewed and edited data points. The Platform operator makes no warranties regarding the accuracy, completeness, or timeliness of any data.</p>

        <h2 class="contract-title">6. NO RESPONSIBILITY FOR DATA INTEGRITY</h2>
        <p>THE PLATFORM OPERATOR ASSUMES NO RESPONSIBILITY WHATSOEVER FOR DATA INTEGRITY, ACCURACY, COMPLETENESS, OR AVAILABILITY. All data is provided "AS IS" without any warranties, express or implied. Users acknowledge that financial data may contain errors, omissions, or delays, and should not be relied upon for investment decisions. The Platform operator is not liable for any losses, damages, or consequences resulting from the use of or reliance on data provided through the Platform.</p>

        <h2 class="contract-title">7. USER INFORMATION AND PRIVACY</h2>
        <p>The Platform is committed to collecting the minimum amount of user information necessary to operate the service. Authentication is performed using username and password only. The Platform does not collect or store email addresses or phone numbers. Optional two-factor authentication (2FA) is available using an authenticator app. The Platform does not implement tracking systems beyond those necessary for user session authentication and minimal security logging. IP addresses and session fingerprints may be logged for security purposes. No user information is sold to third parties. No payment information is collected during the beta period.</p>

        <h2 class="contract-title">8. PROHIBITED ACTIVITIES</h2>
        <p>Users are strictly prohibited from: (a) attempting to access the server, API, or backend services through unauthorized means; (b) reselling, redistributing, or commercializing data obtained from the Platform; (c) scraping, harvesting, or extracting data through automated means; (d) reverse engineering or attempting to circumvent security measures; (e) using the Platform for any illegal or unauthorized purposes. Violation of these terms may result in immediate termination of access without notice.</p>

        <h2 class="contract-title">9. ACCOUNT SECURITY AND RECOVERY</h2>
        <p>The Platform offers optional two-factor authentication using an authenticator app. Password recovery is available through a recovery code that can be generated and downloaded from the Account section after registration. It is solely the user's responsibility to securely store their recovery code. The Platform operator is not responsible for account access issues resulting from lost credentials or recovery codes.</p>

        <h2 class="contract-title">10. DATA UPDATES AND MAINTENANCE</h2>
        <p>Basic End-of-Day (EOD) pricing data and real-time data are available at market close. Real-time data support is provided, with the exception of intraday volume data which requires a separate IEX custom agreement. Calculated formulas and aggregated data are typically updated between 3-4 hours after US markets close on each business day, subject to Tiingo data availability and processing time. Maintenance periods may occur during which the Platform will be temporarily unavailable. No guarantees are made regarding update schedules or platform availability during this beta period.</p>

        <h2 class="contract-title">11. MODIFICATION OF TERMS</h2>
        <p>The Platform operator reserves the right to modify these Terms at any time. Users will be notified of material changes through the Platform, and continued use of the Platform constitutes acceptance of the modified Terms. If you do not agree to the modified Terms, you must discontinue use of the Platform.</p>

        <h2 class="contract-title">12. ACCOUNT CANCELLATION AND DATA DELETION</h2>
        <p>Users can cancel their account at any time through the Platform's dashboard. Upon account cancellation, user data will be deleted within 48 hours, except for security logs which may be retained for up to 18 months for security and legal compliance purposes.</p>

        <h2 class="contract-title">13. SUPPORT</h2>
        <p>Limited support may be available during the open beta at contact@ereuna.io. Responses and support are provided on a best-effort basis with no guaranteed response times or resolution.</p>

        <h2 class="contract-title">14. DISCLAIMER OF WARRANTIES</h2>
        <p>THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR UNINTERRUPTED ACCESS. THE PLATFORM OPERATOR MAKES NO WARRANTIES REGARDING THE ACCURACY, RELIABILITY, OR AVAILABILITY OF THE PLATFORM OR ITS DATA.</p>

        <h2 class="contract-title">15. LIMITATION OF LIABILITY</h2>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE PLATFORM OPERATOR SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, PUNITIVE, OR EXEMPLARY DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE PLATFORM, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, BUSINESS OPPORTUNITIES, OR INVESTMENT LOSSES. THIS LIMITATION APPLIES REGARDLESS OF THE LEGAL THEORY UPON WHICH THE CLAIM IS BASED. YOU AGREE TO INDEMNIFY AND HOLD HARMLESS THE PLATFORM OPERATOR FROM ANY CLAIMS, DEMANDS, OR ACTIONS ARISING FROM YOUR USE OF THE PLATFORM.</p>

        <h2 class="contract-title">16. NO FIDUCIARY RELATIONSHIP</h2>
        <p>Nothing in the Platform or these Terms creates any advisory, fiduciary, or professional relationship between the Platform operator and users. The Platform is for informational purposes only and does not constitute investment advice, financial advice, or recommendations of any kind.</p>

        <p><strong>By using the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms. You further acknowledge that this is a free beta service provided without warranties or guarantees, and you use it entirely at your own risk.</strong></p>
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
  display: flex;
  flex-direction: column;
  position: relative;
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
  animation: popIn 0.25s;
  overflow: hidden;
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
  margin-top: 2rem;
  font-size: 1.2rem;
  color: $accent3;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.contract-header {
  margin-top: 2rem;
  font-size: 1.5rem;
  color: $text1;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.modal-header {
  padding: 2.5rem 2rem 1rem 2rem;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2rem 2rem 2rem;
  font-size: 1rem;
  line-height: 1.7;
  color: $text2;
  
  p { margin-bottom: 1.1rem; }
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

.icon {
    height: 60px; 
  }
</style>