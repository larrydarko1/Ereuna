<template>
  <footer>
    <p>Ereuna Platform / Version 1.0.2 / Copyright &copy; 2025</p>
  </footer>
</template>

<script>
export default {
  name: 'Footer',
}
</script>


<style lang="scss">
@use '../style.scss' as *;

footer {
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
  background-color: $base1;
  color: $text1;
  text-align: center;
  padding: 0px;
  z-index: 1000;
  min-width: 1400px;
}

p {
  opacity: 0.5;
  color: $text1;
  font-size: 10px;
  border: none;
}
</style>