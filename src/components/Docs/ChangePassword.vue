<template>
<div class="center-container">
  <h1>Change Password</h1>
  <p>To change your password on Ereuna, follow these steps:</p>
  <p>1. Log in to your account and navigate to the Account section at <a href="https://ereuna.io/account" target="_blank">https://ereuna.io/account</a>. The Account subsection should be the default view.</p>
  <p>2. Locate the 'Change Password' subsection.</p>
    <img class="img" src="/docs/change-password.png" alt="Account Section Screenshot" />
  <p>3. Enter your old password in the first input field, your new password in the second, and confirm the new password in the third. Then click the 'Change Password' button.</p>
  <p>4. Your password has been successfully changed.</p>
  <div class="disclaimer-box">
    <p><strong>Disclaimer:</strong> Ensure your new password is strong and secure. Password changes are immediate and cannot be undone. If you forget your password, the only easy way to recover your account is to generate and use the recovery key, which you can download in this Account Section.</p>
  </div>
</div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">
@use '@/style.scss' as *;

.center-container {
    display: flex;
    flex-direction: column;
    text-align: left;
    width: 100%;
    padding: 2rem 0;
}

.center-container h1 {
    font-size: 2.5rem;
    color: $text1;
    margin-bottom: 1.5rem;
    text-align: center;
}

.center-container p,
.center-container strong,
.center-container b {
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 1rem;
    line-height: 1.6;
    overflow-wrap: anywhere;
}

.center-container a {
    color: $accent2;
    text-decoration: underline;
    font-size: 1.4rem;
    overflow-wrap: anywhere;
}

.disclaimer-box {
    background: $base2;
    border-radius: 5px;
    padding: 1.5rem;
    margin: 0 0 2rem 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.disclaimer-box h4 {
    font-size: 1.6rem;
    color: $accent1;
    margin-bottom: 1rem;
    margin-top: 0;
    font-weight: bold;
    overflow-wrap: anywhere;
}

.disclaimer-box p {
    font-size: 1.4rem;
    color: $text2;
    margin: 0;
    overflow-wrap: anywhere;
}

.img {
    width: 100%;
    margin-bottom: 1rem;
}
</style>