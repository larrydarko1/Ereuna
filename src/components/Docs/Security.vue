<template>
   <div class="center-container">
    <h1>Security & 2FA</h1>
    <p>Ereuna supports two-factor authentication (2FA) via authenticator apps like 2FAS. SMS or email-based 2FA is not available at this time.</p>
    <p>To enable 2FA, follow these steps:</p>
    <img src="/docs/MFA-enable.gif" alt="Enable 2FA Process" class="mfa-gif" />
    <p>1. In the Account section, navigate to the Security subsection.</p>
    <p>2. Toggle the 2FA switch to enable it.</p>
    <p>3. A QR code will be generated. Scan it with your authenticator app.</p>
    <p>4. Enter the 6-digit code from the app into the input field below the QR code.</p>
    <p>5. Click the confirm button. If successful, 2FA will be activated.</p>
    <p>To disable 2FA, simply toggle the switch off.</p>
    <p>When logging in, after entering your password, you will be prompted with a popup to enter the 6-digit code from your authenticator app.</p>
    <img src="/docs/MFA-login.gif" alt="2FA Login Process" class="mfa-gif" />
</div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">

.center-container {
    display: flex;
    flex-direction: column;
    text-align: left;
    width: 100%;
    padding: 2rem 0;
}

.center-container h1 {
    font-size: 2.5rem;
    color: var(--brand-text-primary);
    margin-bottom: 1.5rem;
    text-align: center;
}

.center-container p,
.center-container strong,
.center-container b {
    font-size: 1.4rem;
    color: var(--brand-text-secondary);
    margin-bottom: 1rem;
    line-height: 1.6;
    overflow-wrap: anywhere;
}

.center-container a {
    color: var(--brand-gradient-end);
    text-decoration: underline;
    font-size: 1.4rem;
    overflow-wrap: anywhere;
}

.mfa-gif {
    display: block;
    margin: 0 auto 2rem;
    max-width: 100%;
    height: auto;
}
</style>