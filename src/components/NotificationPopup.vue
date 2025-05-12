<template>
    <div v-if="visible" class="notification-popup" @click="close">
      <div class="notification-content">
        <img style="width: 20px;" src="@/assets/icons/info.png" alt="">
        <p style="margin-left: 10px;">{{ message }}</p>
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
  background: var(--accent1); 
  border-radius: 5px;
  padding: 10px;
  z-index: 1000;
  transition: opacity 0.3s ease;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); // Add a subtle shadow
  color: var(--text1); 
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
  opacity: 0.80;
}

.ntfbtn:hover {
  cursor: pointer;
  opacity: 1;
}

p{
  color: var(--text1);
}
</style>