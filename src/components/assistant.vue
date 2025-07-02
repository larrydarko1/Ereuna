<template>
  <div>
    <!-- Floating Sphere Button -->
    <div
      :class="['assistant-sphere', { expanded }]"
      @click="!expanded && expand()"
    >
      <transition name="icon-fade">
        <span
          v-if="!expanded && !iconHidden"
          class="icon"
          key="icon"
        >
          <!-- AI SVG Icon -->
          <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="32" height="32"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>ai-solid</title> <g id="Layer_2" data-name="Layer 2"> <g id="invisible_box" data-name="invisible box"> <rect width="48" height="48" fill="none"></rect> </g> <g id="Q3_icons" data-name="Q3 icons"> <g> <path d="M17.9,2h-.4L7.6,6.6a1,1,0,0,0-.6.9v7.4l-.6.5-4,3.3a.8.8,0,0,0-.4.8v9a.9.9,0,0,0,.4.8l4,3.3.6.5v7.4a1,1,0,0,0,.6.9l9.9,4.5h.4l.6-.2,4-2.7V25.5H21a1.5,1.5,0,0,1,0-3h1.5V4.9l-4-2.7ZM9,13.5l2.8,1.9a1.5,1.5,0,0,1,.4,2.1,1.4,1.4,0,0,1-1.2.7,1.1,1.1,0,0,1-.8-.3L9,17.1Zm-5,9H7.5a1.5,1.5,0,0,1,0,3H4Zm5,8.4,1.2-.8a1.4,1.4,0,0,1,2,.4,1.5,1.5,0,0,1-.4,2.1L9,34.5ZM19.5,18.6l-4,4v2.8l4,4v5.2l-3.4,3.5a2.1,2.1,0,0,1-1.1.4,2.1,2.1,0,0,1-1.1-.4,1.6,1.6,0,0,1,0-2.2l2.6-2.5V30.6l-4-4V21.4l4-4V14.6l-2.6-2.5a1.6,1.6,0,1,1,2.2-2.2l3.4,3.5Z"></path> <path d="M45.6,18.7l-4-3.3-.6-.5V7.5a1,1,0,0,0-.6-.9L30.5,2.1h-.4l-.6.2-4,2.7V22.5H27a1.5,1.5,0,0,1,0,3H25.5V43.1l4,2.7.6.2h.4l9.9-4.5a1,1,0,0,0,.6-.9V33.1l.6-.5,4-3.3a.9.9,0,0,0,.4-.8v-9A.8.8,0,0,0,45.6,18.7ZM39,17.1l-1.2.8a1.1,1.1,0,0,1-.8.3,1.4,1.4,0,0,1-1.2-.7,1.5,1.5,0,0,1,.4-2.1L39,13.5ZM28.5,29.4l4-4V22.6l-4-4V13.4l3.4-3.5a1.6,1.6,0,0,1,2.2,2.2l-2.6,2.5v2.8l4,4v5.2l-4,4v2.8l2.6,2.5a1.6,1.6,0,0,1,0,2.2,1.7,1.7,0,0,1-2.2,0l-3.4-3.5ZM39,34.5l-2.8-1.9a1.5,1.5,0,0,1-.4-2.1,1.4,1.4,0,0,1,2-.4l1.2.8Zm5-9H40.5a1.5,1.5,0,0,1,0-3H44Z"></path> </g> </g> </g> </g></svg>
        </span>
      </transition>
      <transition name="input-expand">
        <div v-if="expanded" class="assistant-input-inner" @click.stop>
          <span v-if="!iconHidden" class="icon input-icon">
            <!-- AI SVG Icon -->
            <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="28" height="28"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>ai-solid</title> <g id="Layer_2" data-name="Layer 2"> <g id="invisible_box" data-name="invisible box"> <rect width="48" height="48" fill="none"></rect> </g> <g id="Q3_icons" data-name="Q3 icons"> <g> <path d="M17.9,2h-.4L7.6,6.6a1,1,0,0,0-.6.9v7.4l-.6.5-4,3.3a.8.8,0,0,0-.4.8v9a.9.9,0,0,0,.4.8l4,3.3.6.5v7.4a1,1,0,0,0,.6.9l9.9,4.5h.4l.6-.2,4-2.7V25.5H21a1.5,1.5,0,0,1,0-3h1.5V4.9l-4-2.7ZM9,13.5l2.8,1.9a1.5,1.5,0,0,1,.4,2.1,1.4,1.4,0,0,1-1.2.7,1.1,1.1,0,0,1-.8-.3L9,17.1Zm-5,9H7.5a1.5,1.5,0,0,1,0,3H4Zm5,8.4,1.2-.8a1.4,1.4,0,0,1,2,.4,1.5,1.5,0,0,1-.4,2.1L9,34.5ZM19.5,18.6l-4,4v2.8l4,4v5.2l-3.4,3.5a2.1,2.1,0,0,1-1.1.4,2.1,2.1,0,0,1-1.1-.4,1.6,1.6,0,0,1,0-2.2l2.6-2.5V30.6l-4-4V21.4l4-4V14.6l-2.6-2.5a1.6,1.6,0,1,1,2.2-2.2l3.4,3.5Z"></path> <path d="M45.6,18.7l-4-3.3-.6-.5V7.5a1,1,0,0,0-.6-.9L30.5,2.1h-.4l-.6.2-4,2.7V22.5H27a1.5,1.5,0,0,1,0,3H25.5V43.1l4,2.7.6.2h.4l9.9-4.5a1,1,0,0,0,.6-.9V33.1l.6-.5,4-3.3a.9.9,0,0,0,.4-.8v-9A.8.8,0,0,0,45.6,18.7ZM39,17.1l-1.2.8a1.1,1.1,0,0,1-.8.3,1.4,1.4,0,0,1-1.2-.7,1.5,1.5,0,0,1,.4-2.1L39,13.5ZM28.5,29.4l4-4V22.6l-4-4V13.4l3.4-3.5a1.6,1.6,0,0,1,2.2,2.2l-2.6,2.5v2.8l4,4v5.2l-4,4v2.8l2.6,2.5a1.6,1.6,0,0,1,0,2.2,1.7,1.7,0,0,1-2.2,0l-3.4-3.5ZM39,34.5l-2.8-1.9a1.5,1.5,0,0,1-.4-2.1,1.4,1.4,0,0,1,2-.4l1.2.8Zm5-9H40.5a1.5,1.5,0,0,1,0-3H44Z"></path> </g> </g> </g> </g></svg>
          </span>
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
import { ref, nextTick, watch } from 'vue';

const expanded = ref(false);
const inputValue = ref('');
const input = ref(null);
const iconHidden = ref(false);
let iconTimeout = null;

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
  // Handle input submission here
  collapse();
}
</script>

<style scoped>
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
.assistant-input-inner {
  display: flex;
  align-items: center;
  width: 100%;
  background: transparent;
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
</style>
