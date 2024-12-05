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

<style scoped>
.notification-popup {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #8c8dfe;
  color: whitesmoke;
  border: 1px solid #8687ee;
  border-radius: 5px;
  padding: 10px;
  z-index: 1000;
  transition: opacity 0.3s ease;
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