<template>
    <div v-if="visible" class="notification-popup" @click="close">
      <div class="notification-content">
        <p>{{ message }}</p>
        <button class="ntfbtn" @click="close">
          <img class="close-button-img" src="@/assets/icons/close.png" alt="">
        </button>
      </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';

const visible = ref(false);
const message = ref('');

const show = (msg) => {
  message.value = msg;
  visible.value = true;
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
  background: rgba($accent1, 0.2); // Original background color with 20% opacity
  backdrop-filter: blur(10px); // Blur the background
  border: 1px solid rgba($accent2, 0.5); // Original border color with 50% opacity
  border-radius: 5px;
  padding: 10px;
  z-index: 1000;
  transition: opacity 0.3s ease;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); // Add a subtle shadow
  color: $text2; // Keep the original text color
}

.notification-content {
  position: relative; 
  display: flex;
  justify-content: flex-start; 
  align-items: center;
}

.close-button-img {
  background-color: transparent;
  width: 10px;
  height: 10px;
  border: none;
}

.ntfbtn {
  position: absolute; 
  top: -5px; 
  right: -10px; 
  border: none;
  background-color: transparent;
}

.ntfbtn:hover {
  cursor: pointer;
}
</style>