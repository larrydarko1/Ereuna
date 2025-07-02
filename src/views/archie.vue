<template>
  <Header />
  <Assistant />
  <section class="archie-hero">
    <div class="e-card playing archie-card">
      <div class="wave"></div>
      <div class="wave"></div>
      <div class="wave"></div>
      <div class="infotop">
        <span class="archie-title">Meet <span class="archie-name">Archie</span></span>
        <div class="archie-tagline">Your Adaptive AI Trading Agent</div>
        <div class="archie-loader">
          <span class="loader-line"></span>
          <span class="loader-text">Archie is in training...</span>
        </div>
        <p class="archie-desc">
          Archie is powered by deep learning and trained on millions of financial documents.<br>
          He recognizes patterns, adapts to your style, and suggests the best trading strategies for you.<br>
          <span class="archie-highlight">Coming soon: AI-generated trades, market insights, and personalized
            strategies.</span>
        </p>
        <div class="archie-disclaimer">
          <strong>Disclaimer:</strong> Archie is an experimental AI agent. All suggestions are for informational
          purposes only and do not constitute legal financial advice. Use of Archie is optional and available to all
          subscription tiers; however, performance may be limited for Core subscribers. Ereuna assumes no responsibility
          for trading outcomes.
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import Assistant from '@/components/assistant.vue';
import Header from '@/components/Header.vue'
</script>

<style scoped>
.archie-hero {
  min-height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(120deg, var(--base4) 0%, var(--base2) 100%);
  position: relative;
  z-index: 0;
}

.e-card.archie-card {
  background: transparent;
  box-shadow: 0px 8px 28px -9px rgba(0, 0, 0, 0.45);
  position: relative;
  width: 500px;
  height: 330px;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wave {
  position: absolute;
  width: 700px;
  height: 700px;
  opacity: 0.6;
  left: 0;
  top: 0;
  margin-left: -50%;
  margin-top: -70%;
  background: linear-gradient(744deg, var(--base1), var(--base2) 60%, var(--base3));
  border-radius: 40%;
  animation: wave 300s infinite linear;
}

.wave:nth-child(2),
.wave:nth-child(3) {
  top: 210px;
}

.e-card.playing .wave {
  animation: wave 9000ms infinite linear;
}

.e-card.playing .wave:nth-child(2) {
  animation-duration: 12000ms;
}

.e-card.playing .wave:nth-child(3) {
  animation-duration: 15000ms;
}

.wave:nth-child(2) {
  animation-duration: 300s;
}

.wave:nth-child(3) {
  animation-duration: 270s;
}

@keyframes wave {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.icon {
  width: 3em;
  margin-top: -1em;
  padding-bottom: 1em;
  color: var(--accent1);
}

.infotop {
  text-align: center;
  font-size: 20px;
  position: absolute;
  left: 0;
  right: 0;
  color: rgb(255, 255, 255);
  font-weight: 600;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
}

.archie-title {
  font-size: 3rem;
  font-weight: 800;
  color: var(--text1);
  margin-bottom: 0.2em;
  letter-spacing: 0.01em;
}

.archie-name {
  color: var(--accent1);
  font-size: 2.2rem;
  font-weight: 800;
}

.archie-tagline {
  color: var(--accent2);
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 12px 0;
  letter-spacing: 0.01em;
}

.archie-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.loader-line {
  width: 36px;
  height: 4px;
  background: var(--accent1);
  border-radius: 2px;
  animation: spin 1s linear infinite;
  margin-right: 12px;
}

@keyframes spin {
  0% {
    transform: scaleX(1);
  }

  50% {
    transform: scaleX(0.5);
  }

  100% {
    transform: scaleX(1);
  }
}

.loader-text {
  color: var(--text2);
  font-size: 1.01rem;
  font-style: italic;
}

.archie-desc {
  color: var(--text2);
  font-size: 1.01rem;
  text-align: center;
  margin-bottom: 12px;
}

.archie-highlight {
  color: var(--accent3);
  font-weight: 700;
  font-size: 1.05em;
}

.archie-disclaimer {
  color: var(--text2);
  background: rgba(40, 42, 60, 0.85);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.93rem;
  margin-top: 10px;
  text-align: left;
  border-left: 4px solid var(--accent1);
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.07);
}
</style>