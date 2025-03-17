<template>
  <div class="hero">
    <div class="content">
      <div class="logo-container">
        <img class="logo" style="margin-bottom: 30px;" src="@/assets/icons/owl.png" alt="">
        <div class="beta-tag">
          <span class="title">Beta Now Available</span>
        </div>
      </div>
      <p class="description">Ereuna's invite-only beta test is now live.</p>
      <p class="call-to-action">Join the beta program by emailing <a href="mailto:contact@ereuna.co" style="font-size: 18px;">contact@ereuna.co</a> to request access.</p>
      <br>
      <br>
      <br>
      <br>
      <span class="already-have-invite">Already have an invite?</span>
      <button class="login-button" @click="redirectToLogin">Login Now &rarr;</button>
    </div>
  </div>
  <div class="sphere-gradient"></div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { ref } from 'vue';

const router = useRouter();

function redirectToLogin() {
  router.push('/login');
}
</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

.hero {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: $base1;
  color: $text1;
  padding: 15px;
}

.sphere-gradient {
  position: fixed;
  top: 110%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, #8c8dfe 0%, 
    #8c8dfe 30%, 
    #a3a4fe 50%, 
    #c5c6fe 70%, 
    #fff 100%);
  filter: blur(100px);
  z-index: 0;
  opacity: 0.20;
}

.content {
  text-align: center;
  z-index: 1;
}

.logo-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  margin-bottom: 50px;
}

.logo {
  width: 90px;
  margin: 10px;
}

.beta-tag {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%) rotate(-5deg);
  border: solid 2px $accent1;
  width: 150px;
  border-radius: 5px;
  color: $accent1;
  text-align: center;
  letter-spacing: 2px;
  font-weight: bold;
  padding: 3px;
  margin-top: 90px;
  min-width: 220px;
}

.title {
  font-size: 18px;
  margin: 0;
}

.description {
  font-size: 26px;
  font-weight: bold;
}

.call-to-action {
  font-size: 18px;
  color: #dcdcdc;
  a {
    color: $accent1;
    text-decoration: none;
    &:hover {
      color: $accent2;
    }
  }
}

.already-have-invite {
  font-size: 12px;
  margin-bottom: 10px;
  display: block;
  color: #dcdcdc;
}

.login-button {
  background-color: transparent;
  color: $text1;
  border: solid 2px $accent1;
  padding: 10px 20px;
  font-size: 18px;
  cursor: pointer;
  border-radius: 5px;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: $accent1;
  }
}

.hero-video{
  width: 500px;
  border-radius: 10px;
  border: solid 1px $accent3;
}
</style>