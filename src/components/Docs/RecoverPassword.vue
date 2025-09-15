<template>
  <div class="center-container">
    <p><strong>Note:</strong> You <b>need</b> a <a href="">Recovery Key</a> to restore your account. If you don't have or have lost your Recovery Key, contact support at <a href="mailto:contact@ereuna.io">contact@ereuna.io</a> for assistance.</p>
    <h3>STEP 1: Go to <span href="https://ereuna.io/recovery" target="_blank">https://ereuna.io/recovery</span></h3>
    <img class="img" src="@/assets/images/docs/image1.png" alt="">
    <h3>STEP 2: Paste your Recovery Key into the input and press 'Recover Account'.</h3>
    <p>Your key should look something like this: <code>5031ed70814d33f43a9b9aabc3ecf473b087a4cc357d40e6699eae7d8b7cb1a12605b017333fcf8410da50ff0783b49b7245b7a6d556be7f99589783729255ff</code>. If correct, you'll move to the next step.</p>
    <img class="img" src="@/assets/images/docs/image2.gif" alt="">
    <h3>STEP 3: If the key is correct, you'll be prompted to enter and confirm a new password.</h3>
    <img class="img" src="@/assets/images/docs/image3.gif" alt="">
    <h3>STEP 4: Done! Now you'll be able to log in to your account with the new password.</h3>
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

.center-container strong{
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container b{
    font-size: 1.4rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container a{
    font-size: 1.4rem;
    color: $accent2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.center-container span{
    font-size: 1.7rem;
    color: $accent2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.img {
    width: 100%;
}
</style>