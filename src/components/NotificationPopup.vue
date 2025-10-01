<template>
    <div v-if="visible" class="notification-popup" @click="close" role="alert" aria-live="assertive">
      <div class="notification-content">
       <svg height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22ZM12 17.75C12.4142 17.75 12.75 17.4142 12.75 17V11C12.75 10.5858 12.4142 10.25 12 10.25C11.5858 10.25 11.25 10.5858 11.25 11V17C11.25 17.4142 11.5858 17.75 12 17.75ZM12 7C12.5523 7 13 7.44772 13 8C13 8.55228 12.5523 9 12 9C11.4477 9 11 8.55228 11 8C11 7.44772 11.4477 7 12 7Z" fill="currentColor"></path> </g></svg>
        <p style="margin-left: 10px;">{{ message }}</p>
        <button class="ntfbtn" @click="close" aria-label="Close notification">
          <svg class="close-button-img" alt="Close notification" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
          </svg>
        </button>
  <audio ref="audioRef" src="/notification.mp3" preload="auto" style="display: none"></audio>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';

const visible = ref(false);
const message = ref('');

const audioRef = ref<HTMLAudioElement | null>(null);

const playNotificationSound = () => {
  if (audioRef.value) {
    audioRef.value.currentTime = 0;
    audioRef.value.play().catch(() => {});
  }
};

// Defensive extractor: accept string, object, array, or unknown and return a readable message
function extractMessage(msg: unknown): string {
  if (typeof msg === 'string') return msg;
  if (msg == null) return '';
  if (Array.isArray(msg)) {
    const strings = msg.filter((x) => typeof x === 'string') as string[];
    if (strings.length) return strings.join('; ');
    try {
      return JSON.stringify(msg);
    } catch {
      return String(msg);
    }
  }
  if (typeof msg === 'object') {
    const anyMsg = msg as any;
    // Common locations for human-readable messages
    const candidates = [anyMsg.message, anyMsg.msg, anyMsg.error, anyMsg.data?.message, anyMsg.data?.error];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim().length > 0) return c;
    }
    // If it's an Error-like object
    if (anyMsg instanceof Error && typeof anyMsg.message === 'string') return anyMsg.message;
    try {
      return JSON.stringify(msg);
    } catch {
      return String(msg);
    }
  }
  return String(msg);
}

const show = (msg: unknown) => {
  message.value = extractMessage(msg);
  visible.value = true;
  if (audioRef.value) {
    playNotificationSound();
  } else {
    nextTick(() => {
      if (audioRef.value) playNotificationSound();
    });
  }
  setTimeout(close, 5000);
};

const close = () => {
  visible.value = false;
};

defineExpose({ show });
</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

.notification-popup {
  position: fixed;
  top: 20px;
  right: 20px;
  background: var(--accent1); 
  border-radius: 5px;
  padding: 10px;
  z-index: 1000;
  transition: opacity 0.3s ease;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); 
  color: var(--text3); 
}

.notification-content {
  position: relative; 
  display: flex;
  justify-content: flex-start; 
  align-items: center;
  padding: 10px;
}

.close-button-img {
  background-color: transparent;
  width: 12px;
  height: 12px;
  border: none;
  color: var(--text3);
}

.ntfbtn {
  position: absolute; 
  top: -5px; 
  right: -10px; 
  border: none;
  background-color: transparent;
  opacity: 0.80;
  color: var(--text3);
}

.ntfbtn:hover {
  cursor: pointer;
  opacity: 1;
}

p{
  color: var(--text3);
  font-weight: 600;
}
</style>