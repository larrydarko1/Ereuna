<template>
<div class="center-container">
  <p>
    In the <b>Account</b> section, under the <b>Themes</b> subsection, you can personalize your experience by changing the appearance of the app.
  </p>
  <p>
    Simply select your preferred theme from the available options. Your app's look and feel will update instantly.
  </p>

  <h3>STEP 1: Log in to your account and go to <a style="font-size: 1.7rem;" href="https://ereuna.io/account" target="_blank">https://ereuna.io/account</a>. Open the <b>Themes</b> subsection.</h3>
  <img class="img" src="@/assets/images/docs/image10.png" alt="Themes section screenshot">

  <h3>STEP 2: Browse the available themes and click on the one you prefer.</h3>
  <img class="img" src="@/assets/images/docs/image11.gif" alt="Theme selection screenshot">
 <p>
   More themes will be added in the future, so stay tuned for updates!
  </p>
  <h3>STEP 3: Done! The app will immediately apply your selected theme.</h3>
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

.center-container p strong,
.center-container b {
    font-size: inherit;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container p {
    color: $text2;
    overflow-wrap: anywhere;
    font-size: 1.4rem;
}

.center-container a {
    color: $accent2;
    overflow-wrap: anywhere;
    font-size: inherit;
}

.img {
    width: 100%;
}
</style>