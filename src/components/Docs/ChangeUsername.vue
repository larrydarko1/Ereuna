<template>
 <div class="center-container">
  <h3>STEP 1: Log in to your account, go to <a href="https://ereuna.io/account" target="_blank">https://ereuna.io/account</a>, and click on the Account subsection (it should be the default).</h3>
  <img class="img" src="@/assets/images/docs/image4.png" alt="">
  <h3>STEP 2: Find the 'Change Username' section.</h3>
  <h3>STEP 3: Enter a new username and click Confirm.</h3>
  <p>If the new username is available, you will successfully change it. Note: You will be logged out of your account and prompted to enter the new username.</p>
  <h3>STEP 4: Done! You have successfully changed your username.</h3>
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

.center-container h3{
    font-size: 1.7rem;
    color: $text2;
    margin-bottom: 1rem;
}

.center-container p{
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container a{
    font-size: 1.7rem;
    color: $accent2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.img {
    width: 100%;
}
</style>