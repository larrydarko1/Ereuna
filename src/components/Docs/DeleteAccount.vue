<template>
<div class="center-container">
  <p>
    <strong>Warning:</strong> Deleting your account is a <b>permanent action</b> and <b>cannot be undone</b>. All data associated with your account—including your profile, settings, saved content, and any other information—will be <b>permanently deleted</b>. This process is <b>irreversible</b>.
  </p>
  <p>
    If you are sure you want to proceed, please follow the steps below. If you have any questions or need assistance, contact support at <a href="mailto:contact@ereuna.io">contact@ereuna.io</a>.
  </p>

  <h3>STEP 1: Log in to your account and go to <a style="font-size: 1.7rem;" href="https://ereuna.io/account" target="_blank">https://ereuna.io/account</a>. Open the Account subsection (default view).</h3>
  <img class="img" src="@/assets/images/docs/image9.png" alt="Account section screenshot">

  <h3>STEP 2: Scroll down to the <b style="font-size: 1.7rem;" >'Delete Account'</b> section.</h3>

  <h3>STEP 3: Enter your password to confirm your identity, then click the <b style="font-size: 1.7rem;">'Delete Account'</b> button.</h3>

  <h3>STEP 4: Done. Your account has been deleted. You will no longer be able to access any data or services associated with your account.</h3>
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