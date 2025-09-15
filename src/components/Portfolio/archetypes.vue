<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <button class="close-x" @click="close" aria-label="Close">&times;</button>
      <h2>Trader & Investor Archetypes: Pros and Cons</h2>
      <div class="archetypes-list">
        <div v-for="arch in archetypes" :key="arch.name" class="archetype-item">
          <h3>{{ arch.name }}</h3>
          <p>{{ arch.desc }}</p>
          <div class="pros-cons">
            <div class="pros">
              <strong>Pros:</strong>
              <ul>
                <li v-for="pro in arch.pros" :key="pro">{{ pro }}</li>
              </ul>
            </div>
            <div class="cons">
              <strong>Cons:</strong>
              <ul>
                <li v-for="con in arch.cons" :key="con">{{ con }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="trade-btn" @click="close">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['close'])
function close() { emit('close') }

const archetypes = [
  {
    name: "The Boom & Buster",
    desc: "Goes all-in with leverage, riding big wins—until one loss wipes out everything.",
    pros: ["Can achieve rapid gains in bull markets."],
    cons: ["High risk of total loss due to leverage."]
  },
  {
    name: "The Stopless Hero",
    desc: "Refuses to use stop-losses, letting small losses snowball into disasters.",
    pros: ["May avoid being stopped out by market noise."],
    cons: ["Small losses can become catastrophic."]
  },
  {
    name: "The FOMO Chaser",
    desc: "Buys tops and sells bottoms, always late to the party, driven by hype and fear of missing out.",
    pros: ["Catches strong trends if timed right."],
    cons: ["Often buys tops and sells bottoms."]
  },
  {
    name: "The Averager",
    desc: "Keeps doubling down on losers, hoping for a turnaround that rarely comes.",
    pros: ["Can lower average entry price in consolidating markets."],
    cons: ["Can compound losses in trending markets."]
  },
  {
    name: "The Risk Ignorer",
    desc: "Puts too much on one trade or ignores diversification, exposing themselves to huge drawdowns.",
    pros: ["Potential for outsized gains if concentrated bet succeeds."],
    cons: ["Vulnerable to large drawdowns."]
  },
  {
    name: "The Planless Gambler",
    desc: "Trades on gut feeling, rumors, or tips—never with a real plan or system.",
    pros: ["Sometimes benefits from luck or intuition."],
    cons: ["Lacks consistency and discipline."]
  },
  {
    name: "The Revenge Trader",
    desc: "Tries to win back losses with bigger, riskier bets, digging the hole deeper.",
    pros: ["Can recover losses if market turns."],
    cons: ["Often leads to bigger losses."]
  },
  {
    name: "The Emotional Reactor",
    desc: "Lets fear, greed, or frustration dictate every move, abandoning logic and discipline.",
    pros: ["Quick to respond to market changes."],
    cons: ["Decisions driven by emotion, not logic."]
  },
  {
    name: "The Market Ignorer",
    desc: "Uses the same strategy in all conditions, never adapting to volatility or trends.",
    pros: ["Sticks to a system, avoids overreacting."],
    cons: ["Fails to adapt to changing conditions."]
  },
  {
    name: "The Overtrader",
    desc: "Trades too often, chasing every move and racking up fees and mistakes.",
    pros: ["Gains experience quickly."],
    cons: ["High fees and frequent mistakes."]
  },
  {
    name: "The Disciplined Planner",
    desc: "Follows a tested strategy, manages risk well, and sticks to the plan.",
    pros: ["Follows a tested strategy, manages risk well."],
    cons: ["May miss out on big moves due to strict rules."]
  },
  {
    name: "The Adaptive Strategist",
    desc: "Adjusts to market conditions, maximizes opportunities, and learns from mistakes.",
    pros: ["Adjusts to market conditions, maximizes opportunities."],
    cons: ["Requires constant learning and attention."]
  },
  {
    name: "The Patient Investor",
    desc: "Benefits from compounding and long-term trends, rarely trades on emotion.",
    pros: ["Benefits from compounding and long-term trends."],
    cons: ["May underperform in short-term volatility."]
  },
  {
    name: "The Diversifier",
    desc: "Reduces risk through diversification across assets and strategies.",
    pros: ["Reduces risk through diversification."],
    cons: ["May dilute returns if over-diversified."]
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
  border-radius: 22px;
  padding: 40px 36px 32px 36px;
  min-width: 340px;
  max-width: 540px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 12px 40px 0 rgba(0,0,0,0.22), 0 2px 12px 0 var(--accent4);
  display: flex;
  flex-direction: column;
  gap: 22px;
  animation: popup-in 0.18s cubic-bezier(.4,1.4,.6,1) backwards;
}
.close-x {
  position: absolute;
  top: 18px;
  right: 18px;
  background: none;
  border: none;
  color: var(--text2);
  font-size: 2rem;
  cursor: pointer;
  transition: color 0.15s, transform 0.12s;
  line-height: 1;
  padding: 0;
}
.close-x:hover { color: var(--accent1); transform: scale(1.15); }
h2 {
  margin: 0 0 18px 0;
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--accent1);
  letter-spacing: 0.5px;
}
.archetypes-list {
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.archetype-item {
  background: rgba(255,255,255,0.04);
  border-radius: 14px;
  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.07);
  padding: 18px 20px 14px 20px;
  transition: box-shadow 0.18s, background 0.18s;
  border: 1px solid var(--accent4);
}
.archetype-item:hover {
  background: rgba(255,255,255,0.09);
  box-shadow: 0 4px 16px 0 rgba(0,0,0,0.13);
}
.archetype-item h3 {
  margin: 0 0 4px 0;
  color: var(--accent2);
  font-size: 1.13rem;
  font-weight: 700;
  letter-spacing: 0.2px;
}
.archetype-item p {
  margin: 0 0 10px 0;
  color: var(--text2);
  font-size: 1.01rem;
}
.pros-cons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 4px;
}
.pros, .cons {
  min-width: 120px;
}
.pros ul, .cons ul {
  margin: 0;
  padding-left: 18px;
  font-size: 0.97rem;
}
.pros strong {
  color: var(--accent3);
  font-weight: 600;
}
.cons strong {
  color: var(--accent1);
  font-weight: 600;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}
.trade-btn {
  background: linear-gradient(90deg, var(--accent1) 60%, var(--accent2) 100%);
  color: var(--text1);
  border: none;
  border-radius: 8px;
  padding: 12px 30px;
  font-weight: 700;
  font-size: 1.08rem;
  cursor: pointer;
  transition: background 0.18s, box-shadow 0.18s, transform 0.12s;
  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.10);
}
.trade-btn:hover {
  background: linear-gradient(90deg, var(--accent2) 60%, var(--accent1) 100%);
  transform: translateY(-2px) scale(1.04);
  box-shadow: 0 4px 16px 0 rgba(0,0,0,0.16);
}
@media (max-width: 600px) {
  .modal-content {
    padding: 18px 6vw 18px 6vw;
    min-width: unset;
    max-width: 98vw;
  }
  .archetype-item {
    padding: 12px 8px 10px 8px;
  }
  .pros-cons {
    gap: 12px;
  }
}
</style>