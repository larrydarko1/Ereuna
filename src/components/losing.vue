<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <button class="close-x" @click="close" aria-label="Close">&times;</button>
      <h2>How to Lose Money: Common Archetypes</h2>
      <div class="losses-list">
        <div v-for="loss in losses" :key="loss.name" class="loss-item">
          <h3>{{ loss.name }}</h3>
          <p>{{ loss.desc }}</p>
        </div>
      </div>
      <div class="modal-actions">
        <button class="trade-btn" @click="close">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['close'])
function close() { emit('close') }

const losses = [
  {
    name: "The Boom & Buster",
    desc: "Goes all-in with leverage, riding big wins—until one loss wipes out everything."
  },
  {
    name: "The Stopless Hero",
    desc: "Refuses to use stop-losses, letting small losses snowball into disasters."
  },
  {
    name: "The FOMO Chaser",
    desc: "Buys tops and sells bottoms, always late to the party, driven by hype and fear of missing out."
  },
  {
    name: "The Averager",
    desc: "Keeps doubling down on losers, hoping for a turnaround that rarely comes."
  },
  {
    name: "The Risk Ignorer",
    desc: "Puts too much on one trade or ignores diversification, exposing themselves to huge drawdowns."
  },
  {
    name: "The Planless Gambler",
    desc: "Trades on gut feeling, rumors, or tips—never with a real plan or system."
  },
  {
    name: "The Revenge Trader",
    desc: "Tries to win back losses with bigger, riskier bets, digging the hole deeper."
  },
  {
    name: "The Emotional Reactor",
    desc: "Lets fear, greed, or frustration dictate every move, abandoning logic and discipline."
  },
  {
    name: "The Market Ignorer",
    desc: "Uses the same strategy in all conditions, never adapting to volatility or trends."
  },
  {
    name: "The Overtrader",
    desc: "Trades too often, chasing every move and racking up fees and mistakes."
  }
]
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(24, 25, 38, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}
.modal-content {
  position: relative;
  background: var(--base2);
  color: var(--text1);
  border-radius: 18px;
  padding: 36px 32px 28px 32px;
  min-width: 340px;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px 0 rgba(0,0,0,0.18), 0 1.5px 8px 0 var(--accent4);
  display: flex;
  flex-direction: column;
  gap: 18px;
  animation: popup-in 0.18s cubic-bezier(.4,1.4,.6,1) backwards;
}
.close-x {
  position: absolute;
  top: 18px;
  right: 18px;
  background: none;
  border: none;
  color: var(--text2);
  font-size: 1.7rem;
  cursor: pointer;
  transition: color 0.15s;
  line-height: 1;
  padding: 0;
}
.close-x:hover { color: var(--accent1); }
h2 { margin: 0 0 12px 0; font-size: 1.25rem; font-weight: 700; color: var(--accent1);}
.losses-list { display: flex; flex-direction: column; gap: 16px; }
.loss-item h3 { margin: 0 0 2px 0; color: var(--accent2); font-size: 1.08rem; }
.loss-item p { margin: 0; color: var(--text2); font-size: 0.98rem; }
.modal-actions { display: flex; justify-content: flex-end; margin-top: 12px; }
.trade-btn {
  background: var(--accent1);
  color: var(--text1);
  border: none;
  border-radius: 7px;
  padding: 10px 24px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.18s;
}
.trade-btn:hover { background: var(--accent2); }
</style>