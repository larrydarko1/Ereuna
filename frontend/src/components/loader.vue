<template>
  <div class="loader">
    <svg class="spinner" viewBox="0 0 50 50">
      <circle
        class="path"
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke-width="5"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">

</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

.loader {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80px;
}

.spinner {
  animation: rotate 2s linear infinite;
  width: 50px;
  height: 50px;
}

.path {
  stroke: linear-gradient(45deg, #e8e8e8, #cdcdcd);
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
  stroke: var(--accent1);
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}
</style>
