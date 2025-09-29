<template>
  <div class="careers-page">
    <section class="hero">
      <div class="hero-content">
        <img src="@/assets/icons/ereuna.png" alt="Ereuna Logo" class="hero-logo" draggable="false" />
        <div class="hero-text">
          <h1>Careers at Ereuna</h1>
          <p>Join us in building the future of financial intelligence.</p>
        </div>
      </div>
    </section>

    <div class="careers-row">
      <section class="jobs">
        <h2>Job Openings</h2>
        <div class="no-jobs">
          No job openings at the moment.<br>
          We welcome unsolicited applications!<br>
          Send your CV and cover letter to careers@ereuna.io
        </div>
      </section>
      <section class="agents-coming-soon">
        <h2>Agents Program <span class="coming-soon">(Coming Soon)</span></h2>
        <p>
          Become an Ereuna Agent and earn recurring revenue by referring new users!<br>
          Share your unique code at signup. For every user who registers and subscribes with your code, you receive a share of the profit—recurring for every renewal.<br>
          <br>
          <strong>Commission Structure:</strong><br>
          • 5% for your first 100 users<br>
          • Increases by 5% for every additional 100 users<br>
          • Up to 50% for 1000+ users (capped)<br>
          • After 1000 users, all new clients earn you a fixed 50% share
        </p>
        <div class="agents-note">More details and sign-up coming soon.</div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
// Minimal logic for now
</script>

<style scoped>
.careers-page {
  background: var(--base2);
  color: var(--text2);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.hero {
  width: 100%;
  background: var(--base2);
  color: var(--text1);
  display: flex;
  justify-content: center;
  align-items: center;
}
.hero-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0px 10px;
}
.hero-logo {
  width: 150px;
  object-fit: contain;
}
.hero-text {
  text-align: right;
}
.hero-text h1 {
  font-size: 2rem;
  font-weight: bold;
}
.hero-text p {
  font-size: 1.2rem;
}
.jobs {
  width: 100%;
  min-height: 100vh;
  background: var(--base1);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  text-align: center;
  margin-bottom: 5px;
  overflow: hidden;
}
.jobs h2 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--text1);
}
.no-jobs {
  color: var(--text2);
  font-size: 1.1rem;
  opacity: 0.8;
}

.agents-coming-soon {
  width: 100%;
  min-height: 100vh;
  /* Animated dark gradient background using theme variables */
  background: linear-gradient(120deg, var(--base1), var(--base2), var(--base4), var(--base2), var(--base1));
  background-size: 300% 300%;
  animation: agents-bg-animate 8s ease-in-out infinite;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
}

@keyframes agents-bg-animate {
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
.agents-coming-soon h2 {
  font-size: 1.5rem;
  margin-bottom: 0.7rem;
  color: var(--text1);
  max-width: 600px;
  padding: 0 32px;
  margin-left: auto;
  margin-right: auto;
}
.coming-soon {
  font-size: 1rem;
  color: var(--text2);
  font-weight: 600;
}
.agents-coming-soon p {
  font-size: 1.1rem;
  color: var(--text1);
  margin-bottom: 1.2rem;
  max-width: 600px;
  padding: 0 32px;
  margin-left: auto;
  margin-right: auto;
}
.agents-note {
  color: var(--text2);
  font-size: 1rem;
  opacity: 0.8;
}

/* Flex row for jobs and agents */
.careers-row {
  display: flex;
  flex-direction: row;
  width: 100vw;
  height: 100%;
  min-height: 400px;
  margin: 0;
  padding: 0;
  gap: 0;
  max-width: 100vw;
  justify-content: stretch;
  align-items: stretch;
}
.jobs, .agents-coming-soon {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  border-radius: 0;
  margin: 0;
  box-shadow: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
@media (max-width: 900px) {
  .careers-row {
    flex-direction: column;
    width: 100vw;
    min-height: 600px;
    max-width: 100vw;
    gap: 0;
  }
  .jobs, .agents-coming-soon {
    width: 100vw;
    min-height: 320px;
  }
}
</style>
