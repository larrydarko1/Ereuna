<template>
    <div class="navbar" style="min-width: 1150px;">
  <img class="icon" src="@/assets/icons/owl.png" alt="Owl Icon">
  <div class="nav-links">
    <div class="navbtn" @click="scrollToSection('about')">About</div>
    <div class="navbtn" @click="scrollToSection('features')">Features</div>
    <div class="navbtn" @click="scrollToSection('pricing')">Pricing</div>
    <div class="navbtn">
      <router-link to="/signup" style="color: whitesmoke; text-decoration: none; font-size: 12px;">Sign Up</router-link>
    </div>
    <div class="navbtn2" @click="$router.push('/login')">
  <router-link to="/login" style="color: whitesmoke; text-decoration: none; font-size: 12px; background-color: transparent;">Login</router-link>
</div>
  </div>
</div>
  <div class="hero">
    <div class="content">
      <p class="description"><span style="color: #8c8dfe; font-size: 40px ;">Ereuna</span>'s invite-only beta test is now live.</p>
      <p class="call-to-action">Join the beta program by emailing <a href="mailto:contact@ereuna.co" style="font-size: 18px;">contact@ereuna.co</a> to request access.</p>
      <br>
      <br>
      <span class="already-have-invite">Already have an invite?</span>
      <button class="login-button" @click="redirectToLogin">Login Now &rarr;</button>
    </div>
    <div class="video-container">
      <video class="hero-video" autoplay muted loop>
    <source src="@/assets/videos/heroAnimation.mp4" type="video/mp4">
    Your browser does not support the video tag.
  </video>
      <div class="beta-tag-on-video">
        <span class="title">Beta Now Available</span>
      </div>
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  background-color: $base1;
  color: $text1;
}

.video-container {
  position: relative;
  padding: 5%;
}

.hero-video {
  width: 450px;
  border-radius: 10px;
  border: solid 1px $accent3;
}

.beta-tag-on-video {
  position: absolute;
  top: 70%;
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
  margin-top: 20px;
  font-size: 20px;
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
  text-align: left;
  z-index: 1;
  padding: 5%;
  
}

.title {
  font-size: 18px;
  margin: 0;
}

.description {
  font-size: 40px;
  font-weight: bold;
  margin: 0;
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

.icon {
    width: 30px; /* Increased size for better visibility */
    height: 30px; /* Increased size for better visibility */
    opacity: 0.50;
  }

  .navbar {
  display: flex;
  justify-content: space-between; /* Push logo to the left and buttons to the right */
  align-items: center;
  background-color: transparent;
  border-radius: 10px;
  color: #f5f5f5;
  padding: 10px 20px; /* Add horizontal padding for better spacing */
  position: fixed;
  top: 2%;
  left: 2%;
  right: 2%;
  z-index: 1000;
  opacity: 0.90;
}

.nav-links {
  display: flex;
  gap: 80px; /* Space between buttons */
  align-items: center;
}

a{
  color: whitesmoke;
  opacity: 0.90;
  cursor: pointer;
}

a:hover{
  opacity: 1;
}
  
  .navbtn{
    border: none;
    background-color: transparent;
    color: whitesmoke;
    opacity: 0.70;
    font-size: 12px;
  }

  .navbtn:hover{
     background-color: transparent;
     opacity: 1;
     cursor: pointer;
  }

  .navbtn2 {
  border: none; /* Remove default border */
  border-radius: 5px; /* Rounded corners */
  background-color: transparent; /* Button background color */
  color: whitesmoke; /* Text color */
  padding: 10px 20px; /* Padding for better spacing */
  font-size: 16px; /* Font size */
  cursor: pointer; /* Pointer cursor on hover */
  position: relative; /* For pseudo-element positioning */
  overflow: hidden; /* Hide overflow for pseudo-element */
  z-index: 100; /* Ensure text is above the gradient */
  transition: color 0.3s ease; /* Smooth text color transition */
  display: flex; /* Use flexbox for centering */
  align-items: center; /* Center vertically */
  justify-content: center; /* Center horizontally */
}

/* Gradient border animation */
.navbtn2::before {
  content: '';
  position: absolute; /* Position it absolutely */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1; /* Place it behind the content */
  border-radius: 5px; /* Match the border radius of the parent */
  background: linear-gradient(270deg, #8c8dfe, #4c4d8f, #494bb9); /* Gradient colors */
  padding: 2px; /* Space for the border effect */
  -webkit-mask: linear-gradient(white, white) content-box, linear-gradient(white, white); /* For masking */
  -webkit-mask-composite: source-out; /* For masking */
  animation: border-animation 5s linear infinite;
  mask-composite: exclude; /* For masking */
  background-size: 300% 300%; 
}

.navbtn2:hover::before {
  -webkit-mask: none; /* Remove the mask on hover */
  mask: none; /* Remove the mask on hover */
  padding: 0; /* Remove padding to fill the entire button */
}

/* Keyframes for gradient animation */
@keyframes border-animation {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.logo{
  height: 30px;
}

</style>