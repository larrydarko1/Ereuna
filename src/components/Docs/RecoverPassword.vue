<template>
  <div class="center-container">
    <h1>Recovering Your Password</h1>
    <div class="disclaimer-box">
      <h4>Important Note</h4>
      <p>You <b>need</b> a <strong>Recovery Key</strong> to restore your account. If you don't have or have lost your Recovery Key, contact support at <a href="mailto:contact@ereuna.io">contact@ereuna.io</a> for assistance.</p>
    </div>
    <p>To recover your password, navigate to the recovery page at <a href="https://ereuna.io/recovery" target="_blank">https://ereuna.io/recovery</a>.</p>
    <img class="img" src="@/assets/images/docs/recovery.png" alt="">
    <p>Once there, paste your Recovery Key (which you downloaded from the Account section) into the input field and click 'Recover Account'. Your Recovery Key should look something like this: <code>5031ed70814d33f43a9b9aabc3ecf473b087a4cc357d40e6699eae7d8b7cb1a12605b017333fcf8410da50ff0783b49b7245b7a6d556be7f99589783729255ff</code>. If the key is valid, you'll be prompted to enter and confirm a new password.</p>
    <p>After successfully setting your new password, you'll regain access to your account. Remember to download a new Recovery Key from your Account section for future use to ensure continued security.</p>
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

.center-container h3 {
    font-size: 1.8rem;
    color: $text1;
    margin-bottom: 1rem;
    margin-top: 2rem;
    overflow-wrap: anywhere;
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

.center-container ul {
    margin-bottom: 1rem;
    padding-left: 2rem;
}

.center-container li {
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 0.5rem;
    line-height: 1.6;
    overflow-wrap: anywhere;
}

.center-container a {
    color: $accent2;
    text-decoration: underline;
    font-size: 1.4rem;
    overflow-wrap: anywhere;
}

.center-container code {
    background: $base3;
    padding: 0.5rem;
    border-radius: 4px;
    font-family: monospace;
    overflow-wrap: anywhere;
}

.center-container h3 a {
    font-size: 1.8rem;
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
}
</style>