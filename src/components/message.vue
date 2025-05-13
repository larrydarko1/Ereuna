<template>
  <div v-if="showPopup" class="overlay" role="dialog" aria-modal="true" aria-labelledby="popup-title" aria-describedby="popup-message">
    <div class="popup-container">
      <h2 id="popup-title">Mobile Experience Notice</h2>
      <p id="popup-message">
        This application is not fully optimized for mobile devices. For the best experience, please use a desktop computer.
      </p>
      <button class="close-btn" @click="closePopup" aria-label="Close popup">&times;</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const showPopup = ref(false);

const closePopup = () => {
  showPopup.value = false;
};

onMounted(() => {
  if (window.innerWidth <= 768) {
    showPopup.value = true;
  }
});
</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 1rem;
  box-sizing: border-box;
  overflow-y: auto;
}

/* Popup container styling */
.popup-container {
  background: var(--base2);
  max-width: 400px;
  width: 100%;
  padding: 2rem 2rem 2.5rem;
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.2);
  position: relative;
  text-align: center;
  color: var(--text2);
}

/* Heading style */
.popup-container h2 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text1);
}

/* Paragraph styling */
.popup-container p {
  font-size: 1.125rem;
  line-height: 1.5;
  margin-bottom: 2rem;
  color: var(--text2);
}

/* Close button styling */
.close-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  border: none;
  background: transparent;
  font-size: 2rem;
  font-weight: 700;
  color: var(--text1);
  cursor: pointer;
  transition: color 0.3s ease;
  line-height: 1;
  user-select: none;
}

.close-btn:hover,
.close-btn:focus {
  color: var(--accent1);
  outline: none;
}

/* Responsive improvements (optional) */
@media (max-width: 400px) {
  .popup-container {
    padding: 1.5rem 1.5rem 2rem;
  }

  .popup-container h2 {
    font-size: 1.25rem;
  }

  .popup-container p {
    font-size: 1rem;
  }
}
</style>
