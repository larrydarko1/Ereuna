<template>
 <div class="center-container">
  <h1>Change Username</h1>
  <p>To change your username on Ereuna, follow these steps:</p>
  <p>1. Log in to your account and navigate to the Account section at <a href="https://ereuna.io/account" target="_blank">https://ereuna.io/account</a>. The Account subsection should be the default view.</p>
  <p>2. Locate the 'Change Username' subsection.</p>
  <img class="img" src="@/assets/images/docs/change-username.png" alt="Change Username Screenshot" />
  <p>3. Enter your new desired username in the input field and click the Confirm button.</p>
  <p>If the username is available, the change will be applied immediately. No password is required for this action. You will be logged out and prompted to log in with the new username.</p>
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
    background-color: $base2;
    border: 1px solid $accent1;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-top: 2rem;
}

.disclaimer-box p {
    margin-bottom: 0;
}

.img {
    width: 100%;
    margin-bottom: 1rem;
}
</style>