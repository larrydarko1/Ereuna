<template>
<div class="center-container">
  <p><strong>Important:</strong> Your <b>Recovery Key</b> is crucial for account recovery. It allows you to reset your password if you ever forget it. <b>Store your Recovery Key securely</b>—if you lose it, you may not be able to recover your account. If you have lost your Recovery Key, contact support at <a href="mailto:contact@ereuna.io">contact@ereuna.io</a> for assistance.</p>
  
  <h3>STEP 1: Log in to your account, go to <a style="font-size: 1.7rem;" href="https://ereuna.io/account" target="_blank">https://ereuna.io/account</a>, and click on the Account subsection (it should be the default).</h3>
  <img class="img" src="@/assets/images/docs/image7.png" alt="">
  
  <h3>STEP 2: Find the 'Recovery/Authentication Key' section.</h3>
  
  <h3>STEP 3: Enter your password and click the 'Generate New Key' button.</h3>
  <img class="img" src="@/assets/images/docs/image8.gif" alt="">
  
  <h3>STEP 4: If successful, a download will begin with your new Recovery Key in a text file. <b style="font-size: 1.7rem;" >Store this file securely!</b></h3>
  
  <h3>STEP 5: Done! You have generated a new Recovery Key for your account.</h3>
</div>
</template>

<script setup>
</script>

<style scoped lang="scss">
@use '@/style.scss' as *;

.center-container {
    display: flex;
    flex-direction: column;
    text-align: left;
}

.center-container h3 {
    font-size: 1.7rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container p,
.center-container p strong,
.center-container b {
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container a {
    color: $accent2;
    overflow-wrap: anywhere;
    font-size: 1.4rem;
}

.img {
    width: 100%;
}
</style>