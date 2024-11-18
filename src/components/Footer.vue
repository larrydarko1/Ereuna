<template>
  <footer>
    <p>Ereuna Platform / Version 1.0.0 / Copyright &copy; 2024</p>
  </footer>
</template>

<script>
export default {
  name: 'Footer',
}
</script>


<style scoped>
footer {
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
  background-color: #0f0f1b;
  color: white;
  text-align: center;
  padding: 0px;
  z-index: 1000;
}

p {
  opacity: 0.5;
  color: white;
  font-size: 6px;
  border: none;
}
</style>