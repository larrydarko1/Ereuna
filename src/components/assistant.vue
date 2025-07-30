<template>
  <div>
    <!-- Floating Sphere Button -->
    <div
      :class="['assistant-sphere', { expanded, chatting: expanded && messages.length > 0 }]"
      @click="!expanded && expand()"
    >
      <transition name="icon-fade">
        <span
          v-if="!expanded && !iconHidden"
          class="icon"
          key="icon"
        >
          <svg class="archetype-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <g id="SVGRepo_iconCarrier">
              <circle cx="34.52" cy="11.43" r="5.82" stroke="var(--text2)" fill="var(--text2)"/>
              <circle cx="53.63" cy="31.6" r="5.82" stroke="var(--text2)" fill="var(--text2)"/>
              <circle cx="34.52" cy="50.57" r="5.82" stroke="var(--text2)" fill="var(--text2)" />
              <circle cx="15.16" cy="42.03" r="5.82" stroke="var(--text2)" fill="var(--text2)" />
              <circle cx="15.16" cy="19.27" r="5.82" stroke="var(--text2)" fill="var(--text2)" />
              <circle cx="34.51" cy="29.27" r="4.7" stroke="var(--text2)" fill="var(--text2)" />
              <line x1="20.17" y1="16.3" x2="28.9" y2="12.93" stroke="var(--text2)" stroke-width="2.2" />
              <line x1="38.6" y1="15.59" x2="49.48" y2="27.52" stroke="var(--text2)" stroke-width="2.2" />
              <line x1="50.07" y1="36.2" x2="38.67" y2="46.49" stroke="var(--text2)" stroke-width="2.2" />
              <line x1="18.36" y1="24.13" x2="30.91" y2="46.01" stroke="var(--text2)" stroke-width="2.2" />
              <line x1="20.31" y1="44.74" x2="28.7" y2="48.63" stroke="var(--text2)" stroke-width="2.2" />
              <line x1="17.34" y1="36.63" x2="31.37" y2="16.32" stroke="var(--text2)" stroke-width="2.2" />
              <line x1="20.52" y1="21.55" x2="30.34" y2="27.1" stroke="var(--text2)" stroke-width="2.2" />
              <line x1="39.22" y1="29.8" x2="47.81" y2="30.45" stroke="var(--text2)" stroke-width="2.2" />
              <line x1="34.51" y1="33.98" x2="34.52" y2="44.74" stroke="var(--text2)" stroke-width="2.2" />
            </g>
          </svg>
        </span>
      </transition>
      <transition name="input-expand">
        <div v-if="expanded" class="assistant-input-inner" :class="{ 'with-chat': messages.length > 0 }" @click.stop>
          <span v-if="!iconHidden" class="icon input-icon">
            <svg class="archetype-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
              <g id="SVGRepo_iconCarrier">
                <circle cx="34.52" cy="11.43" r="5.82" stroke="var(--text2)" fill="var(--text2)"/>
                <circle cx="53.63" cy="31.6" r="5.82" stroke="var(--text2)" fill="var(--text2)"/>
                <circle cx="34.52" cy="50.57" r="5.82" stroke="var(--text2)" fill="var(--text2)" />
                <circle cx="15.16" cy="42.03" r="5.82" stroke="var(--text2)" fill="var(--text2)" />
                <circle cx="15.16" cy="19.27" r="5.82" stroke="var(--text2)" fill="var(--text2)" />
                <circle cx="34.51" cy="29.27" r="4.7" stroke="var(--text2)" fill="var(--text2)" />
                <line x1="20.17" y1="16.3" x2="28.9" y2="12.93" stroke="var(--text2)" stroke-width="2.2" />
                <line x1="38.6" y1="15.59" x2="49.48" y2="27.52" stroke="var(--text2)" stroke-width="2.2" />
                <line x1="50.07" y1="36.2" x2="38.67" y2="46.49" stroke="var(--text2)" stroke-width="2.2" />
                <line x1="18.36" y1="24.13" x2="30.91" y2="46.01" stroke="var(--text2)" stroke-width="2.2" />
                <line x1="20.31" y1="44.74" x2="28.7" y2="48.63" stroke="var(--text2)" stroke-width="2.2" />
                <line x1="17.34" y1="36.63" x2="31.37" y2="16.32" stroke="var(--text2)" stroke-width="2.2" />
                <line x1="20.52" y1="21.55" x2="30.34" y2="27.1" stroke="var(--text2)" stroke-width="2.2" />
                <line x1="39.22" y1="29.8" x2="47.81" y2="30.45" stroke="var(--text2)" stroke-width="2.2" />
                <line x1="34.51" y1="33.98" x2="34.52" y2="44.74" stroke="var(--text2)" stroke-width="2.2" />
              </g>
            </svg>
          </span>
          <div v-if="messages.length > 0" class="assistant-chat">
            <div v-for="(msg, i) in messages" :key="i" :class="['chat-msg', msg.role]">
              <template v-if="msg.role === 'bot' && msg.type === 'chart'">
                <!-- Chat Placeholder -->
                <div class="chart-placeholder">[Chart Placeholder]</div>
              </template>
              <template v-else>
                {{ msg.text }}
              </template>
            </div>
          </div>
          <input
            ref="input"
            v-model="inputValue"
            class="assistant-input"
            type="text"
            placeholder="Ask me anything..."
            @blur="collapse"
            @keyup.enter="submit"
          />
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';

const expanded = ref(false);
const inputValue = ref('');
const input = ref(null);
const iconHidden = ref(false);
let iconTimeout = null;

// Chat state
const messages = ref([]);

function expand() {
  expanded.value = true;
  iconHidden.value = true;
  clearTimeout(iconTimeout);
  iconTimeout = setTimeout(() => {
    iconHidden.value = false;
    nextTick(() => {
      if (input.value) input.value.focus();
    });
  }, 300);
}

function collapse() {
  expanded.value = false;
  iconHidden.value = true;
  clearTimeout(iconTimeout);
  iconTimeout = setTimeout(() => {
    iconHidden.value = false;
  }, 600);
  inputValue.value = '';
}

function submit() {
  const text = inputValue.value.trim();
  if (!text) return;
  messages.value.push({ role: 'user', text, type: 'text' });

  // Predefined Q&A logic
  const lower = text.toLowerCase();
  let botMsg;
  if (/^(hello|hi|hey)[!\s,.]*$/i.test(lower)) {
    botMsg = { role: 'bot', text: "Hello!! I'm Archie, AI Trader, nice to meet you!", type: 'text' };
  } else if (/what can you do\??/i.test(lower)) {
    botMsg = { role: 'bot', text: "I'm trained on millions of documents related to the financial markets.", type: 'text' };
  } else if (/how do i use you|how to use|help/i.test(lower)) {
    botMsg = { role: 'bot', text: "Just ask me anything about stocks, crypto, or finance!", type: 'text' };
  } else if (/show (me )?(a )?chart|chart|graph|plot/i.test(lower)) {
    botMsg = { role: 'bot', text: '', type: 'chart' };
  } else if (/what markets do you cover|which markets|supported markets/i.test(lower)) {
    botMsg = { role: 'bot', text: "I cover stocks, cryptocurrencies, forex, and more!", type: 'text' };
  } else if (/can you give advice|financial advice|should i buy|should i sell/i.test(lower)) {
    botMsg = { role: 'bot', text: "I can't give personalized financial advice, but I can provide data and insights!", type: 'text' };
  } else if (/who made you|who are you|about you/i.test(lower)) {
    botMsg = { role: 'bot', text: "I'm Archie, your AI assistant for financial markets, created by Ereuna!", type: 'text' };
  } else {
    botMsg = { role: 'bot', text: "I'm here to help with finance and trading questions! (Try: 'What can you do?')", type: 'text' };
  }
  setTimeout(() => {
    messages.value.push(botMsg);
  }, 400);

  inputValue.value = '';
}
</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

.assistant-sphere {
  position: fixed;
  left: 32px;
  bottom: 32px;
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, var(--base1) 60%, var(--base2) 100%);
  border-radius: 50%;
  box-shadow: 0 4px 24px rgba(0,0,0,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1000;
  transition: all 0.45s cubic-bezier(.23,1.02,.32,1);
  overflow: visible;
  animation: assistant-idle-bounce 4.4s cubic-bezier(.4,0,.2,1) infinite alternate;
}
.assistant-sphere.expanded {
  left: 50%;
  bottom: 40px;
  transform: translateX(-50%);
  width: 370px;
  height: 64px;
  border-radius: 16px;
  background: var(--base1);
  box-shadow: 0 8px 32px rgba(0,0,0,0.22);
  padding: 0 24px 0 16px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  animation: none;
}
.assistant-sphere.expanded.chatting {
  height: 340px;
  min-height: 220px;
  max-height: 80vh;
  flex-direction: column;
  align-items: stretch;
  padding: 18px 24px 18px 16px;
}
.assistant-input-inner {
  display: flex;
  align-items: center;
  width: 100%;
  background: transparent;
  transition: min-height 0.3s;
}
.assistant-input-inner.with-chat {
  flex-direction: column;
  align-items: stretch;
  min-height: 50px;
  height: 100%;
  gap: 8px;
}
.input-icon {
  margin-right: 12px;
}
.assistant-input {
  border: none;
  outline: none;
  font-size: 1.1rem;
  flex: 1;
  background: transparent;
  padding: 8px 0;
  color: var(--text1);
  transition: background 0.2s, height 0.2s;
}
.assistant-input-inner.with-chat .assistant-input {
  background: var(--base2);
  border-radius: 8px;
  height: 34px;
  padding: 6px 10px;
  font-size: 1rem;
  flex: 0 0 auto;
}
.assistant-chat {
  flex: 1 1 auto;
  max-height: unset;
  min-height: 0;
  overflow-y: auto;
  margin-bottom: 4px;
  padding-right: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.chat-msg {
  margin-bottom: 6px;
  padding: 7px 12px;
  border-radius: 12px;
  font-size: 1rem;
  max-width: 80%;
  word-break: break-word;
}
.chat-msg.user {
  align-self: flex-end;
  background: var(--base2, #e0e7ff);
  color: var(--text1, #222);
}
.chat-msg.bot {
  align-self: flex-start;
  background: var(--base1, #fff);
  color: var(--text2, #444);
}
.chart-placeholder {
  width: 220px;
  height: 120px;
  background: repeating-linear-gradient(135deg, #e0e7ff, #e0e7ff 10px, #fff 10px, #fff 20px);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  font-size: 1.1rem;
  margin: 4px 0;
  border: 1px solid #d1d5db;
}
.icon-fade-enter-active, .icon-fade-leave-active {
  transition: opacity 0.25s cubic-bezier(.23,1.02,.32,1);
}
.icon-fade-enter-from, .icon-fade-leave-to {
  opacity: 0;
}
.input-expand-enter-active, .input-expand-leave-active {
  transition: opacity 0.25s 0.15s, transform 0.45s cubic-bezier(.23,1.02,.32,1);
}
.input-expand-enter-from, .input-expand-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.95);
}
@keyframes assistant-idle-bounce {
  0% {
    transform: none;
    box-shadow: 0 4px 24px rgba(0,0,0,0.18);
  }
  60% {
    transform: translateY(-8px) scale(1.04);
    box-shadow: 0 12px 32px rgba(0,0,0,0.22);
  }
  100% {
    transform: none;
    box-shadow: 0 4px 24px rgba(0,0,0,0.18);
  }
}
.archetype-icon {
  display: block;
  width: 32px;
  height: 32px;
  min-width: 28px;
  min-height: 28px;
  max-width: 100%;
  max-height: 100%;
}
</style>
