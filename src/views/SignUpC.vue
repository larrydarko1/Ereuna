<template>
  <div class="beta-announcement">
    <div class="content">
      <div class="logo">
        <img class="icon" src="@/assets/icons/ereuna.png" alt="Owl Icon" draggable="false">
      </div>
      <h2>Open Beta Coming Soon</h2>
      <p class="description">
        The open beta will launch shortly.<br>
        Sign-ups will reopen soon – stay tuned for updates!
      </p>
      <div class="nav-menu">
        <router-link to="/" class="nav-link">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="nav-icon">
            <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
            <g id="SVGRepo_iconCarrier">
              <path d="M2 12.2039C2 9.91549 2 8.77128 2.5192 7.82274C3.0384 6.87421 3.98695 6.28551 5.88403 5.10813L7.88403 3.86687C9.88939 2.62229 10.8921 2 12 2C13.1079 2 14.1106 2.62229 16.116 3.86687L18.116 5.10812C20.0131 6.28551 20.9616 6.87421 21.4808 7.82274C22 8.77128 22 9.91549 22 12.2039V13.725C22 17.6258 22 19.5763 20.8284 20.7881C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.7881C2 19.5763 2 17.6258 2 13.725V12.2039Z" stroke="currentColor" stroke-width="1.5"></path>
              <path d="M15 18H9" stroke="black" stroke-width="1.5" stroke-linecap="round"></path>
            </g>
          </svg>
          Home
        </router-link>
        <router-link to="/about" class="nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="nav-icon">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 8v4M12 16h.01" stroke="black" stroke-width="2" stroke-linecap="round"/>
          </svg>
          About
        </router-link>
        <router-link to="/documentation" class="nav-link">
          <svg fill="currentColor" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg" class="nav-icon">
            <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
            <g id="SVGRepo_iconCarrier">
              <path d="M24 0h-11c-1.104 0-2 0.895-2 2h11v8h8v16h-7v2h7c1.105 0 2-0.895 2-2v-18zM24 8v-5.172l5.171 5.172h-5.171zM2 4c-1.105 0-2 0.896-2 2v24c0 1.105 0.895 2 2 2h17c1.105 0 2-0.895 2-2v-18l-8-8.001h-11zM19 30h-17v-24h9v8h8v16zM13 12v-5.172l5.171 5.172h-5.171z"></path>
            </g>
          </svg>
          Docs
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
// No script needed for this static announcement
</script>

<style scoped>
.beta-announcement {
  height: 100vh;
  background: linear-gradient(135deg, var(--base1) 0%, var(--base2) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

.content {
  text-align: center;
  color: var(--text1);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 6rem 4rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.logo .icon {
  height: 80px;
  opacity: 0.7;
  margin-bottom: 2rem;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  transition: all 0.3s ease;
}

.logo{
  opacity: 0.9;
  transform: scale(1.05);
}

h2 {
  font-size: 2.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--text1);
  line-height: 1.2;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  background: linear-gradient(135deg, var(--text1) 0%, rgba(255, 255, 255, 0.8) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.description {
  font-size: 1.2rem;
  line-height: 1.6;
  margin-bottom: 3rem;
  color: var(--text2);
  opacity: 0.9;
}

.nav-menu {
  display: flex;
  gap: 2rem;
  align-items: center;
  justify-content: center;
  margin-top: 2rem;
}

.nav-link {
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--text1);
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.80;
  text-decoration: none;
}

.nav-link:hover {
  opacity: 1;
  transform: translateY(-2px);
}

.nav-icon {
  width: 20px;
  height: 20px;
  margin-right: 0.5rem;
  opacity: 0.8;
  transition: opacity 0.3s ease;
  fill: currentColor;
  stroke: currentColor;
}

.nav-link:hover .nav-icon {
  opacity: 1;
}

.features-preview {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin: 2rem 0;
  flex-wrap: wrap;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  transition: all 0.3s ease;
  min-width: 120px;
}

.feature-item:hover {
  transform: translateY(-3px);
  background: rgba(255, 255, 255, 0.1);
}

.feature-icon {
  width: 32px;
  height: 32px;
  opacity: 0.7;
}

.feature-item span {
  font-size: 0.9rem;
  color: var(--text2);
  font-weight: 500;
}

.social-links {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 2rem;
}

.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  transition: all 0.3s ease;
  text-decoration: none;
}

.social-link:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.2);
}

.social-icon {
  width: 20px;
  height: 20px;
  opacity: 0.7;
}

.social-link:hover .social-icon {
  opacity: 1;
}

.background-elements {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
}

.floating-shape {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  animation: float 6s ease-in-out infinite;
}

.shape-1 {
  width: 200px;
  height: 200px;
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.shape-2 {
  width: 150px;
  height: 150px;
  top: 60%;
  right: 15%;
  animation-delay: 2s;
}

.shape-3 {
  width: 100px;
  height: 100px;
  bottom: 20%;
  left: 20%;
  animation-delay: 4s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

@media (max-width: 768px) {
  .content {
    padding: 2rem 1.5rem;
    margin: 1rem;
  }

  .logo .icon {
    height: 60px;
  }
  
  h2 {
    font-size: 2rem;
  }
  
  .description {
    font-size: 1rem;
  }

  .nav-menu {
    flex-direction: column;
    gap: 1rem;
  }

  .nav-link {
    font-size: 0.9rem;
    padding: 0.6rem 1.2rem;
  }

  .features-preview {
    gap: 1rem;
  }

  .feature-item {
    min-width: 100px;
    padding: 0.75rem;
  }

  .feature-icon {
    width: 24px;
    height: 24px;
  }

  .social-links {
    gap: 1rem;
  }

  .social-link {
    width: 35px;
    height: 35px;
  }

  .social-icon {
    width: 16px;
    height: 16px;
  }
}
</style>