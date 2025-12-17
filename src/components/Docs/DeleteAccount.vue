<template>
<div class="center-container">
  <h1>Delete Account</h1>
  <div class="disclaimer-box">
    <h4>Warning</h4>
    <p>Deleting your account is a <b>permanent action</b> and <b>cannot be undone</b>. All data associated with your account—including your profile, settings, saved content, and any other information—will be <b>permanently deleted</b>. This process is <b>irreversible</b>.</p>
    <p>If you are sure you want to proceed, please follow the steps below. If you have any questions or need assistance, contact support at <a href="mailto:contact@ereuna.io">contact@ereuna.io</a>.</p>
  </div>
  <p>To delete your Ereuna account, follow these steps:</p>
  <p>1. Log in to your account and navigate to the Account section at <a href="https://ereuna.io/account" target="_blank">https://ereuna.io/account</a>. The Account subsection should be the default view.</p>
  <p>2. Scroll down to the 'Delete Account' section.</p>
  <img class="img" src="/docs/delete-account.png" alt="Account Section Screenshot" />
  <p>3. Enter your password to confirm your identity, then click the 'Delete Account' button.</p>
  <p>4. Your account has been deleted. You will no longer be able to access any data or services associated with your account.</p>
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

.disclaimer-box {
    background: var(--brand-bg-secondary);
    border-radius: 5px;
    padding: 1.5rem;
    margin: 0 0 2rem 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.disclaimer-box h4 {
    font-size: 1.6rem;
    color: var(--brand-gradient-start);
    margin-bottom: 1rem;
    margin-top: 0;
    font-weight: bold;
    overflow-wrap: anywhere;
}

.disclaimer-box p {
    font-size: 1.4rem;
    color: var(--brand-text-secondary);
    margin: 0;
    overflow-wrap: anywhere;
}
.img {
    width: 100%;
    margin-bottom: 1rem;
}
</style>