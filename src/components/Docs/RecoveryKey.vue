<template>
<div class="center-container">
  <h1>Generating a Recovery Key</h1>
  <div class="disclaimer-box">
    <h4>Important Security Notice</h4>
    <p>Your <b>Recovery Key</b> is crucial for account recovery. It allows you to reset your password if you ever forget it. <b>Store your Recovery Key securely</b>—if you lose it, you may not be able to recover your account. Never share your Recovery Key with anyone. If you have lost your Recovery Key, contact support at <a href="mailto:contact@ereuna.io">contact@ereuna.io</a> for assistance.</p>
  </div>
  
  <p>To generate a Recovery Key for your Ereuna account, follow these steps:</p>
  <p>1. Log in to your account and navigate to the Account section at <a href="https://ereuna.io/account" target="_blank">https://ereuna.io/account</a>. The Account subsection should be the default view.</p>
  <p>2. Locate the 'Recovery/Authentication Key' section.</p>
    <img class="img" src="@/assets/images/docs/recovery-key.png" alt="Account Section Screenshot" />
  <p>3. Enter your password and click the 'Generate New Key' button. If successful, a download will begin with your new Recovery Key in a text file. <b>Store this file securely!</b></p>
  <p>4. You have successfully generated a new Recovery Key for your account.</p>
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
    margin-top: 0px;
    font-weight: bold;
    overflow-wrap: anywhere;
}

.disclaimer-box p {
    font-size: 1.4rem;
    color: $text2;
    margin: 0;
    line-height: 1.6;
    overflow-wrap: anywhere;
}


.img {
    width: 100%;
    margin-bottom: 1rem;
}
</style>